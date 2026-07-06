import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { skills: { include: { skill: true } } },
    });

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { name, description, technologies, architecture, complexity, difficulty, documentation, testing, githubUrl, liveUrl, startDate, endDate, skillIds } = body;

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        technologies: JSON.stringify(technologies || []),
        architecture: architecture || null,
        complexity: complexity || "medium",
        difficulty: difficulty || 50,
        documentation: documentation || null,
        testing: testing || null,
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        userId,
      },
    });

    if (skillIds && skillIds.length > 0) {
      await db.projectSkill.createMany({
        data: skillIds.map((skillId: string) => ({ projectId: project.id, skillId })),
      });
    }

    await db.learningEvent.create({
      data: {
        type: "project_completed",
        title: `Added project: ${name}`,
        date: new Date(),
        userId,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}