import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";

const loginSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // ── PATH A: Supabase Auth (when configured) ──────────────────────────────
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return NextResponse.json({ error: authError?.message || "Invalid credentials" }, { status: 401 });
      }

      // Ensure user exists in local DB
      let user = await db.user.findUnique({ where: { id: authData.user.id } });
      if (!user) {
        user = await db.user.create({
          data: {
            id: authData.user.id,
            email,
            name: authData.user.user_metadata?.name || null,
          },
        });
      }

      await createSession(user.id);
      return NextResponse.json({
        id: user.id, email: user.email, name: user.name, image: user.image,
        headline: user.headline, bio: user.bio, location: user.location,
        website: user.website, github: user.github, linkedin: user.linkedin, twitter: user.twitter,
      });
    }

    // ── PATH B: Local DB Auth (no Supabase) ──────────────────────────────────
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

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