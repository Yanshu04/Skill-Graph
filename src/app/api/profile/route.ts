import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, image: true,
        headline: true, bio: true, location: true, website: true,
        github: true, linkedin: true, twitter: true,
      },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.headline !== undefined && { headline: body.headline }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.github !== undefined && { github: body.github }),
        ...(body.linkedin !== undefined && { linkedin: body.linkedin }),
        ...(body.twitter !== undefined && { twitter: body.twitter }),
      },
    });

    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, image: user.image,
      headline: user.headline, bio: user.bio, location: user.location, website: user.website,
      github: user.github, linkedin: user.linkedin, twitter: user.twitter,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}