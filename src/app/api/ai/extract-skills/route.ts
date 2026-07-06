import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `You are an expert resume analyzer. Extract all professional information from the provided resume text. Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "skills": [
    {"name": "Skill Name", "category": "Language/Framework/Tool/Domain/Soft Skill", "proficiency": 70, "confidence": 0.8}
  ],
  "experiences": [
    {"title": "Job Title", "company": "Company Name", "startDate": "YYYY-MM", "endDate": "YYYY-MM or null", "description": "Brief description"}
  ],
  "projects": [
    {"name": "Project Name", "description": "Description", "technologies": ["tech1", "tech2"]}
  ],
  "certificates": [
    {"title": "Certificate Name", "issuingOrg": "Organization", "completionDate": "YYYY-MM"}
  ],
  "summary": "A brief professional summary extracted from the resume"
}

Be thorough and extract ALL skills mentioned. Estimate proficiency based on context clues like years of experience, projects, and role level. Categories should be: Language, Framework, Tool, Database, Cloud, DevOps, Domain, Soft Skill, or Other.`
        },
        {
          role: "user",
          content: text,
        },
      ],
      thinking: { type: "disabled" },
    });

    let response = completion.choices[0]?.message?.content || "{}";
    response = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      return NextResponse.json(JSON.parse(response));
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return NextResponse.json(JSON.parse(jsonMatch[0]));
      return NextResponse.json({ error: "Failed to parse extracted data" }, { status: 500 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}