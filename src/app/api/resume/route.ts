import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const files = await db.resumeFile.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(files);
  } catch {
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { filename, content, skills } = body;

    const file = await db.resumeFile.create({
      data: {
        filename,
        content: content || null,
        skills: skills ? JSON.stringify(skills) : null,
        userId,
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
  }
}