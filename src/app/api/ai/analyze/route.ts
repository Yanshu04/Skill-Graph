import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

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

    const { role, skills: userSkills } = await request.json();
    if (!role) return NextResponse.json({ error: "Target role is required" }, { status: 400 });

    const prompt = `You are a career analysis expert. Analyze the gap between a user's current skills and their target role. 
For each suggested learning item and recommended project, you MUST specify a "citesGap" field containing the name of the missing skill that this recommendation addresses.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code fences):
{
  "targetSkills": ["skill1", "skill2", ...],
  "matchedSkills": ["matched1", ...],
  "missingSkills": ["missing1", ...],
  "matchPercentage": 75,
  "strengths": ["strength1", ...],
  "weaknesses": ["weakness1", ...],
  "suggestedLearningOrder": [
    {
      "skill": "Skill Name", 
      "priority": "high/medium/low", 
      "estimatedWeeks": 4, 
      "reason": "Why it matters",
      "citesGap": "The missing skill this item directly addresses"
    }
  ],
  "recommendedProjects": [
    {
      "name": "Project name", 
      "skills": ["skill1", "skill2"], 
      "difficulty": "beginner/intermediate/advanced", 
      "description": "Brief description",
      "citesGap": "The missing skill this project targets"
    }
  ],
  "overallAssessment": "A 2-3 sentence overall assessment of readiness.",
  "readinessLevel": "high/medium/low"
}

Target Role: ${role}

User's Current Skills:
${(userSkills || []).map((s: any) => `- ${s.name} (Proficiency: ${s.proficiency}/100, Category: ${s.category})`).join("\n")}

Analyze the gap and provide the JSON response.`;

    let responseJsonStr = "";
    let extractedData: any = null;

    // --- PIPELINE STEP 1: Try Gemini (Primary) ---
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        console.log("Attempting gap analysis via Gemini...");
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
        console.error("Gemini gap analysis failed, falling back...", err);
      }
    }

    // --- PIPELINE STEP 2: Try Groq (Fallback) ---
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!extractedData && groqApiKey) {
      try {
        console.log("Attempting gap analysis via Groq fallback...");
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
        console.error("Groq fallback gap analysis failed:", err);
      }
    }

    if (!extractedData) {
      return NextResponse.json({ error: "Failed to perform gap analysis using Gemini and Groq API" }, { status: 502 });
    }

    return NextResponse.json(extractedData);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}