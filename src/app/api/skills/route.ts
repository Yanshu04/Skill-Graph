import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const skills = await db.skill.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        parentRelations: { include: { toSkill: true } },
        childRelations: { include: { fromSkill: true } },
      },
    });

    return NextResponse.json(skills);
  } catch {
    return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { name, category, proficiency, verification, verificationSource, confidence, parentId, relationType } = body;

    const skill = await db.skill.create({
      data: {
        name,
        category: category || "Other",
        proficiency: proficiency || 50,
        verification: verification || "self_reported",
        verificationSource: verificationSource || null,
        confidence: confidence ?? 0.5,
        lastSeen: new Date(),
        userId,
      },
    });

    if (parentId && relationType) {
      await db.skillRelation.create({
        data: { fromSkillId: parentId, toSkillId: skill.id, relationType },
      });
    }

    // Create learning event
    await db.learningEvent.create({
      data: {
        type: "skill_added",
        title: `Added skill: ${name}`,
        date: new Date(),
        userId,
      },
    });

    return NextResponse.json(skill, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 });
  }
}