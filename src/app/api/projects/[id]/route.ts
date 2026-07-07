import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const project = await db.project.updateMany({
      where: { id, userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.technologies !== undefined && { technologies: JSON.stringify(body.technologies) }),
        ...(body.architecture !== undefined && { architecture: body.architecture }),
        ...(body.complexity !== undefined && { complexity: body.complexity }),
        ...(body.difficulty !== undefined && { difficulty: body.difficulty }),
        ...(body.githubUrl !== undefined && { githubUrl: body.githubUrl }),
        ...(body.liveUrl !== undefined && { liveUrl: body.liveUrl }),
        ...(body.documentation !== undefined && { documentation: body.documentation }),
        ...(body.testing !== undefined && { testing: body.testing }),
      },
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;

    await db.project.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}