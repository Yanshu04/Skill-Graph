import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const targets = await db.careerTarget.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(targets);
  } catch {
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const body = await request.json();
    const { role, company, deadline, targetSkills } = body;

    const target = await db.careerTarget.create({
      data: {
        role,
        company: company || null,
        deadline: deadline ? new Date(deadline) : null,
        targetSkills: JSON.stringify(targetSkills || []),
        userId,
      },
    });

    return NextResponse.json(target, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create target" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await request.json();
    await db.careerTarget.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete target" }, { status: 500 });
  }
}