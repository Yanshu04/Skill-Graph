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

    // Filter duplicates case-insensitively and collect their IDs for cleanup
    const seen = new Set<string>();
    const cleanSkills: typeof skills = [];
    const duplicateIds: string[] = [];

    for (const skill of skills) {
      const normalized = skill.name.trim().toLowerCase();
      if (seen.has(normalized)) {
        duplicateIds.push(skill.id);
      } else {
        seen.add(normalized);
        cleanSkills.push(skill);
      }
    }

    // Clean up duplicate entries from the database in the background
    if (duplicateIds.length > 0) {
      db.skill.deleteMany({
        where: { id: { in: duplicateIds } }
      }).catch((err) => console.error("Failed to delete duplicate skills:", err));
    }

    return NextResponse.json(cleanSkills);
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

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Skill name is required" }, { status: 400 });
    }

    const trimmedName = String(name).trim();

    // Check for duplicate — SQLite doesn't support mode:"insensitive", so we fetch
    // the user's skills and compare in JS (case-insensitive)
    const userSkills = await db.skill.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const existing = userSkills.find(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      return NextResponse.json(
        { error: `Skill "${trimmedName}" already exists.` },
        { status: 409 }
      );
    }

    const skill = await db.skill.create({
      data: {
        name: trimmedName,
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
      await db.skillEdge.create({
        data: { fromId: parentId, toId: skill.id, relationType },
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