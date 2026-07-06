import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { role, skills: userSkills } = await request.json();

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `You are a career analysis expert. Analyze the gap between a user's current skills and their target role. Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "targetSkills": ["skill1", "skill2", ...],
  "matchedSkills": ["matched1", ...],
  "missingSkills": ["missing1", ...],
  "matchPercentage": 75,
  "strengths": ["strength1", ...],
  "weaknesses": ["weakness1", ...],
  "suggestedLearningOrder": [
    {"skill": "Skill Name", "priority": "high/medium/low", "estimatedWeeks": 4, "reason": "why it matters"}
  ],
  "recommendedProjects": [
    {"name": "Project idea", "skills": ["skill1", "skill2"], "difficulty": "medium", "description": "brief description"}
  ],
  "overallAssessment": "A 2-3 sentence overall assessment of readiness.",
  "readinessLevel": "high/medium/low"
}`
        },
        {
          role: "user",
          content: `Target Role: ${role}\n\nUser's Current Skills:\n${userSkills.map((s: { name: string; proficiency: number; category: string }) => `- ${s.name} (Proficiency: ${s.proficiency}/100, Category: ${s.category})`).join("\n")}\n\nAnalyze the gap and provide the JSON response.`
        }
      ],
      thinking: { type: "disabled" },
    });

    let response = completion.choices[0]?.message?.content || "{}";
    // Clean up response - remove markdown code fences if present
    response = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const analysis = JSON.parse(response);
      return NextResponse.json(analysis);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return NextResponse.json(JSON.parse(jsonMatch[0]));
      }
      return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}