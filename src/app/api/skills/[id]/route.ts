import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;

    const body = await request.json();
    const skill = await db.skill.updateMany({
      where: { id, userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.proficiency !== undefined && { proficiency: body.proficiency }),
        ...(body.verification !== undefined && { verification: body.verification }),
        ...(body.verificationSource !== undefined && { verificationSource: body.verificationSource }),
        ...(body.confidence !== undefined && { confidence: body.confidence }),
        ...(body.lastSeen !== undefined && { lastSeen: new Date(body.lastSeen) }),
      },
    });

    return NextResponse.json(skill);
  } catch {
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;

    await db.skill.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete skill" }, { status: 500 });
  }
}