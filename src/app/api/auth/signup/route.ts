import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";

const signupSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = signupSchema.parse(body);

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // ── PATH A: Supabase Auth (when configured) ──────────────────────────────
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (supabaseError || !supabaseUser.user) {
        return NextResponse.json({ error: supabaseError?.message || "Supabase signup failed" }, { status: 400 });
      }

      const user = await db.user.create({
        data: { id: supabaseUser.user.id, email, name },
      });

      await createSession(user.id);

      return NextResponse.json({
        id: user.id, email: user.email, name: user.name, image: user.image,
        headline: user.headline, bio: user.bio, location: user.location,
        website: user.website, github: user.github, linkedin: user.linkedin, twitter: user.twitter,
      });
    }

    // ── PATH B: Local DB Auth (no Supabase) ──────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: { email, name, password: hashedPassword },
    });

    await createSession(user.id);

    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, image: user.image,
      headline: user.headline, bio: user.bio, location: user.location,
      website: user.website, github: user.github, linkedin: user.linkedin, twitter: user.twitter,
    });

  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Validation failed", details: (error as z.ZodError).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}