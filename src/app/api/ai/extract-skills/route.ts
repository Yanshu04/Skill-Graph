import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { generateEmbedding } from "@/lib/embeddings";

// Helper for fetch with retry (handles rate-limit 429 errors)
async function fetchWithRetry(url: string, options: any, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      console.warn(`Rate limit (429) hit. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
      continue;
    }
    return res;
  }
  return fetch(url, options);
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const prompt = `You are an expert resume analyzer. Extract all professional skills, experiences, projects, and certificates from the provided resume text.
For each skill, you must estimate the user's proficiency (10-100), output a confidence score (0.1 to 1.0), and extract a short direct quote ("evidence") from the resume text justifying the extraction of that skill.

Return ONLY a valid JSON object matching this structure (no markdown, no code fences):
{
  "summary": "A brief professional summary",
  "skills": [
    {
      "name": "Skill Name",
      "category": "Language/Framework/Tool/Database/Cloud/DevOps/Domain/Soft Skill/Other",
      "proficiency": 80,
      "confidence": 0.9,
      "evidence": "Direct quote from resume"
    }
  ],
  "experiences": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "description": "Job duties"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project details"
    }
  ],
  "certificates": [
    {
      "title": "Certificate Title",
      "issuingOrg": "Issuing Organization",
      "completionDate": "YYYY-MM"
    }
  ]
}

Resume Text:
${text}`;

    let responseJsonStr = "";
    let extractedData: any = null;

    // --- PIPELINE STEP 1: Try Gemini (Primary) ---
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        console.log("Attempting skill extraction via Gemini...");
        const res = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          responseJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          extractedData = JSON.parse(responseJsonStr);
        } else {
          console.warn(`Gemini API returned error: ${res.status}`);
        }
      } catch (err) {
        console.error("Gemini extraction failed, falling back...", err);
      }
    }

    // --- PIPELINE STEP 2: Try Groq (Fallback) ---
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!extractedData && groqApiKey) {
      try {
        console.log("Attempting skill extraction via Groq fallback...");
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
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          responseJsonStr = data.choices?.[0]?.message?.content || "";
          extractedData = JSON.parse(responseJsonStr);
        } else {
          const errText = await res.text();
          console.error(`Groq API returned status ${res.status}: ${errText}`);
        }
      } catch (err) {
        console.error("Groq fallback extraction failed:", err);
      }
    }

    // If both failed or JSON parse error, throw error
    if (!extractedData) {
      return NextResponse.json({ error: "Failed to extract skills using Gemini and Groq API" }, { status: 502 });
    }

    // --- pgvector similarity search & auto-linking ---
    if (Array.isArray(extractedData.skills)) {
      // Fetch user's existing skills to perform safe in-memory case-insensitive matching
      let userSkills: any[] = [];
      try {
        userSkills = await db.skill.findMany({ where: { userId } });
      } catch (err) {
        console.error("Failed to pre-fetch user skills:", err);
      }

      extractedData.skills = await Promise.all(
        extractedData.skills.map(async (s: any) => {
          let matchedSkillId: string | null = null;
          let matchedName = s.name;
          let matchedCategory = s.category;

          // 1. Try exact case-insensitive match in memory (safe for SQLite/Postgres)
          const localMatch = userSkills.find(
            (us) => us.name.trim().toLowerCase() === s.name.trim().toLowerCase()
          );

          if (localMatch) {
            matchedSkillId = localMatch.id;
            matchedName = localMatch.name;
            matchedCategory = localMatch.category;
          } else {
            // 2. Fall back to pgvector similarity search (Postgres only)
            try {
              const embedding = await generateEmbedding(s.name);
              const vectorStr = `[${embedding.join(",")}]`;
              const query = `
                SELECT id, name, category, 1 - (embedding <=> $1::vector) as similarity
                FROM "Skill"
                WHERE "userId" = $2
                ORDER BY embedding <=> $1::vector ASC
                LIMIT 1;
              `;
              const matches = await db.$queryRawUnsafe<Array<{ id: string; name: string; category: string; similarity: number }>>(
                query,
                vectorStr,
                userId
              );

              if (matches && matches.length > 0 && matches[0].similarity > 0.8) {
                matchedSkillId = matches[0].id;
                matchedName = matches[0].name;
                matchedCategory = matches[0].category;
              }
            } catch (err) {
              // Ignore vector query errors on SQLite local dev
            }
          }

          return {
            ...s,
            name: matchedName,
            category: matchedCategory,
            matchedSkillId,
          };
        })
      );
    }

    return NextResponse.json(extractedData);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}