import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Server-side validation 1: reject non-.txt files
    if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
      return NextResponse.json({ error: "Invalid file type. Only .txt files are allowed." }, { status: 400 });
    }

    // Server-side validation 2: reject files > 1MB
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds the 1MB limit." }, { status: 400 });
    }

    // Read plain-text content
    const textContent = await file.text();

    let fileUrl: string | null = null;

    // Upload to Supabase Storage if configured
    if (supabaseAdmin) {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const filename = `${userId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from("resumes")
        .upload(filename, fileBuffer, {
          contentType: "text/plain",
          upsert: true,
        });

      if (error) {
        console.error("Supabase Storage upload error:", error);
      } else if (data) {
        const { data: urlData } = supabaseAdmin.storage
          .from("resumes")
          .getPublicUrl(filename);
        fileUrl = urlData?.publicUrl || null;
      }
    }

    // Save resume reference to Postgres database
    const savedFile = await db.resumeFile.create({
      data: {
        filename: file.name,
        fileUrl,
        content: textContent,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      resume: savedFile,
      content: textContent,
    });
  } catch (error: unknown) {
    console.error("Resume upload error:", error);
    return NextResponse.json({ error: "Failed to upload resume" }, { status: 500 });
  }
}
