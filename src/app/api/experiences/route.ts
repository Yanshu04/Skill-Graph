import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const exps = await db.experience.findMany({ where: { userId }, orderBy: { startDate: "desc" } });
    return NextResponse.json(exps);
  } catch {
    return NextResponse.json({ error: "Failed to fetch experiences" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const body = await request.json();
    const { title, company, startDate, endDate, description } = body;

    const exp = await db.experience.create({
      data: {
        title,
        company: company || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        description: description || null,
        userId,
      },
    });

    await db.learningEvent.create({
      data: { type: "career_growth", title: `Added experience: ${title} at ${company || "Unknown"}`, date: new Date(), userId },
    });

    return NextResponse.json(exp, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create experience" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await request.json();
    await db.experience.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete experience" }, { status: 500 });
  }
}