import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

// ---------------------------------------------------------------------------
// In-process conversation store (simple Map — persists per server instance).
// If UPSTASH_REDIS_REST_URL is configured it will use Redis instead.
// ---------------------------------------------------------------------------

type ChatMessage = { role: "user" | "assistant"; content: string };
const inMemoryStore = new Map<string, ChatMessage[]>();

async function getHistory(conversationId: string): Promise<ChatMessage[]> {
  // Try Upstash Redis first
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/get/coach:${conversationId}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) return JSON.parse(data.result) as ChatMessage[];
      }
    } catch {
      // fall through to in-memory
    }
  }

  return inMemoryStore.get(conversationId) ?? [];
}

async function saveHistory(conversationId: string, history: ChatMessage[]) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      // Keep 24 hours TTL (86400 seconds)
      await fetch(`${redisUrl}/set/coach:${conversationId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: JSON.stringify(history), ex: 86400 }),
      });
      return;
    } catch {
      // fall through to in-memory
    }
  }

  inMemoryStore.set(conversationId, history);
}

async function deleteHistory(conversationId: string) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/del/coach:${conversationId}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    } catch {}
  }

  inMemoryStore.delete(conversationId);
}

// ---------------------------------------------------------------------------
// Retry fetch with exponential back-off on 429
// ---------------------------------------------------------------------------
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    console.warn(`Rate-limit hit, retrying in ${delay}ms…`);
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  return fetch(url, options);
}

// ---------------------------------------------------------------------------
// Build rich context from DB — skills, projects, experiences, certs, targets
// ---------------------------------------------------------------------------
async function buildUserContext(userId: string): Promise<string> {
  try {
    const [skills, projects, experiences, certificates, targets] = await Promise.all([
      db.skill.findMany({ where: { userId }, orderBy: { proficiency: "desc" }, take: 30 }),
      db.project.findMany({ where: { userId }, take: 10 }),
      db.experience.findMany({ where: { userId }, take: 10, orderBy: { startDate: "desc" } }),
      db.certificate.findMany({ where: { userId }, take: 10 }),
      db.careerTarget.findMany({ where: { userId }, take: 5 }),
    ]);

    const skillSummary = skills.length
      ? skills
          .map((s) => `• ${s.name} (${s.category}, ${s.proficiency}% proficiency)`)
          .join("\n")
      : "No skills recorded yet.";

    const projectSummary = projects.length
      ? projects
          .map((p) => {
            let techs: string[] = [];
            try { techs = JSON.parse(p.technologies); } catch {}
            return `• ${p.name} [${p.complexity}] — ${p.description ?? "No description"} | Tech: ${techs.join(", ") || "N/A"}`;
          })
          .join("\n")
      : "No projects recorded yet.";

    const expSummary = experiences.length
      ? experiences
          .map((e) => `• ${e.title}${e.company ? ` at ${e.company}` : ""} (${new Date(e.startDate).getFullYear()}–${e.endDate ? new Date(e.endDate).getFullYear() : "Present"})`)
          .join("\n")
      : "No experience recorded yet.";

    const certSummary = certificates.length
      ? certificates.map((c) => `• ${c.title}${c.issuingOrg ? ` by ${c.issuingOrg}` : ""}`).join("\n")
      : "No certificates recorded yet.";

    const targetSummary = targets.length
      ? targets.map((t) => `• ${t.role}${t.company ? ` at ${t.company}` : ""}${t.deadline ? ` (target: ${new Date(t.deadline).toLocaleDateString()})` : ""}`).join("\n")
      : "No career targets set yet.";

    return `=== USER CAREER PROFILE (RAG Context) ===

SKILLS (${skills.length} total, sorted by proficiency):
${skillSummary}

PROJECTS (${projects.length} total):
${projectSummary}

WORK EXPERIENCE (${experiences.length} total):
${expSummary}

CERTIFICATES & CREDENTIALS (${certificates.length} total):
${certSummary}

CAREER TARGETS (${targets.length} total):
${targetSummary}

=== END OF PROFILE ===`;
  } catch {
    return "=== USER PROFILE: Could not load profile data at this time ===";
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/coach — chat with AI career coach
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { message, conversationId: incomingId } = await request.json();
    if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    // Generate or reuse a conversation ID
    const conversationId = incomingId ?? `${userId}-${Date.now()}`;

    // Retrieve history + build RAG context
    const [history, userContext] = await Promise.all([
      getHistory(conversationId),
      buildUserContext(userId),
    ]);

    const systemPrompt = `You are an expert AI Career Coach embedded inside SkillGraph, an AI-powered career intelligence platform.

Your role is to give personalized, actionable, encouraging career advice SPECIFICALLY based on the user's real profile data provided below. Always reference specific skills, projects, or experience from their profile when giving advice. Use bullet points and clear formatting for lists.

${userContext}

Guidelines:
- Be concise, warm, and specific to their data.
- Suggest concrete next steps (e.g., specific skills to learn, project ideas that use their current stack).
- When asked about readiness, estimate realistically using their proficiency scores.
- Use markdown formatting: bold key points, use bullet lists for steps, code blocks for tech.
- Never make up skills or experience not in their profile.
- If the user asks something unrelated to career/skills, gently redirect them.`;

    // Build messages array for the conversation
    const conversationMessages: ChatMessage[] = [
      ...history,
      { role: "user", content: message.trim() },
    ];

    // Keep last 20 messages to stay within token limits
    const trimmedHistory = conversationMessages.slice(-20);

    let aiResponse = "";

    // ---- PIPELINE STEP 1: Gemini (Primary) ----
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const geminiContents = trimmedHistory.map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        }));

        const res = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: geminiContents,
              generationConfig: { maxOutputTokens: 1200, temperature: 0.7 },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        } else {
          console.warn(`Gemini coach returned ${res.status}`);
        }
      } catch (err) {
        console.error("Gemini coach failed, falling back:", err);
      }
    }

    // ---- PIPELINE STEP 2: Groq (Fallback) ----
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!aiResponse && groqApiKey) {
      try {
        const groqMessages = [
          { role: "system", content: systemPrompt },
          ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
        ];

        const res = await fetchWithRetry(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: groqMessages,
              max_tokens: 1200,
              temperature: 0.7,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          aiResponse = data.choices?.[0]?.message?.content ?? "";
        } else {
          const errText = await res.text();
          console.error(`Groq API returned status ${res.status}: ${errText}`);
        }
      } catch (err) {
        console.error("Groq fallback gap analysis failed:", err);
      }
    }

    // ---- Final fallback if both fail ----
    if (!aiResponse) {
      aiResponse =
        "I'm sorry, I'm having trouble connecting to the AI service right now. Please check that your `GEMINI_API_KEY` or `GROQ_API_KEY` is set in the `.env` file and try again.";
    }

    // Save updated conversation history
    const updatedHistory: ChatMessage[] = [
      ...trimmedHistory,
      { role: "assistant", content: aiResponse },
    ];
    await saveHistory(conversationId, updatedHistory);

    return NextResponse.json({ response: aiResponse, conversationId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Coach error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/ai/coach — clear conversation history
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { conversationId } = await request.json();
    if (conversationId) {
      await deleteHistory(conversationId);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear conversation" }, { status: 500 });
  }
}