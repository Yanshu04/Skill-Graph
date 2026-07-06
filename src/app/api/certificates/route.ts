import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const certs = await db.certificate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(certs);
  } catch {
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const body = await request.json();
    const { title, issuingOrg, completionDate, skills } = body;

    const cert = await db.certificate.create({
      data: {
        title,
        issuingOrg: issuingOrg || null,
        completionDate: completionDate ? new Date(completionDate) : null,
        skills: JSON.stringify(skills || []),
        userId,
      },
    });

    await db.learningEvent.create({
      data: { type: "certification_earned", title: `Earned certificate: ${title}`, date: new Date(), userId },
    });

    return NextResponse.json(cert, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create certificate" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await request.json();
    await db.certificate.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete certificate" }, { status: 500 });
  }
}