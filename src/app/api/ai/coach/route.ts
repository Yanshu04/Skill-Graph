import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

const conversations = new Map<string, { role: string; content: string }[]>();

async function getZAI() {
  return ZAI.create();
}

async function buildSystemPrompt(userId: string) {
  const [skills, projects, experiences, certificates] = await Promise.all([
    db.skill.findMany({ where: { userId } }),
    db.project.findMany({ where: { userId } }),
    db.experience.findMany({ where: { userId } }),
    db.certificate.findMany({ where: { userId } }),
  ]);

  const user = await db.user.findUnique({ where: { id: userId } });

  return `You are SkillGraph AI Career Coach — an expert career intelligence assistant. You help users understand their skills, plan their career growth, and become job-ready.

ABOUT THE USER:
- Name: ${user?.name || "Unknown"}
- Headline: ${user?.headline || "Not set"}
- Bio: ${user?.bio || "Not set"}

THEIR SKILLS (${skills.length} total):
${skills.map((s) => `• ${s.name} (${s.category}, proficiency: ${s.proficiency}/100, verified: ${s.verification})`).join("\n") || "No skills added yet"}

THEIR PROJECTS (${projects.length} total):
${projects.map((p) => `• ${p.name}: ${p.description || "No description"} [${p.technologies}]`).join("\n") || "No projects added yet"}

THEIR EXPERIENCE (${experiences.length} total):
${experiences.map((e) => `• ${e.title} at ${e.company || "Unknown"} (${e.startDate?.getFullYear() || "?"} - ${e.endDate?.getFullYear() || "Present"})`).join("\n") || "No experience added yet"}

THEIR CERTIFICATES (${certificates.length} total):
${certificates.map((c) => `• ${c.title} from ${c.issuingOrg || "Unknown"} (${c.completionDate?.getFullYear() || "?"})`).join("\n") || "No certificates yet"}

GUIDELINES:
- Be specific and actionable. Reference their actual skills and projects.
- If they ask about readiness for a role, compare their skills against typical requirements.
- Suggest specific projects or learning paths based on their current graph.
- Be encouraging but honest about gaps.
- Format responses with clear sections, bullet points, and actionable steps.
- When suggesting skills, explain WHY each skill matters for their goals.
- Keep responses concise but informative — aim for quality over length.`;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { message, conversationId = "default" } = await request.json();
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const key = `${userId}:${conversationId}`;
    let history = conversations.get(key);

    if (!history) {
      const systemPrompt = await buildSystemPrompt(userId);
      history = [{ role: "assistant", content: systemPrompt }];
      conversations.set(key, history);
    }

    history.push({ role: "user", content: message });

    // Trim to last 20 messages (keep system prompt)
    if (history.length > 21) {
      history = [history[0], ...history.slice(-20)];
    }

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      thinking: { type: "disabled" },
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    history.push({ role: "assistant", content: response });
    conversations.set(key, history);

    return NextResponse.json({ response });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to get response";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { conversationId = "default" } = await request.json();
    conversations.delete(`${userId}:${conversationId}`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear conversation" }, { status: 500 });
  }
}