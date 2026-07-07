import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let username = searchParams.get("username")?.trim();

    // If username is not passed in query, try to get it from the user's profile settings
    if (!username) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { github: true },
      });
      username = user?.github?.trim() || "";
    }

    if (!username) {
      return NextResponse.json({ error: "GitHub username is required. Please specify it in the search query or your profile settings." }, { status: 400 });
    }

    // Call GitHub API with User-Agent header (required by GitHub)
    const githubRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`, {
      headers: {
        "User-Agent": "SkillGraph-App",
        Accept: "application/vnd.github+json",
      },
      next: { revalidate: 3600 }, // Cache response for 1 hour
    });

    if (!githubRes.ok) {
      const errData = await githubRes.json().catch(() => ({}));
      return NextResponse.json({ error: errData.message || "Failed to fetch repositories from GitHub" }, { status: githubRes.status });
    }

    const repos = await githubRes.json();

    // Map and extract languages/topics as candidate skills
    const projects = repos.map((repo: any) => {
      const technologies = new Set<string>();

      // Extract primary language
      if (repo.language) {
        technologies.add(repo.language);
      }

      // Extract topics
      if (Array.isArray(repo.topics)) {
        repo.topics.forEach((t: string) => {
          // Normalize (e.g. reactjs -> React, nextjs -> Next.js, ts -> TypeScript)
          let normalized = t.toLowerCase();
          if (normalized === "reactjs" || normalized === "react") normalized = "React";
          else if (normalized === "nextjs" || normalized === "next-js") normalized = "Next.js";
          else if (normalized === "ts" || normalized === "typescript") normalized = "TypeScript";
          else if (normalized === "js" || normalized === "javascript") normalized = "JavaScript";
          else if (normalized === "py" || normalized === "python") normalized = "Python";
          else if (normalized === "k8s" || normalized === "kubernetes") normalized = "Kubernetes";
          else if (normalized === "pg" || normalized === "postgres" || normalized === "postgresql") normalized = "PostgreSQL";
          else {
            // Capitalize first letter
            normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
          }
          technologies.add(normalized);
        });
      }

      return {
        name: repo.name,
        description: repo.description || "",
        technologies: Array.from(technologies),
        githubUrl: repo.html_url,
        stars: repo.stargazers_count,
        updatedAt: repo.updated_at,
      };
    });

    return NextResponse.json(projects);
  } catch (error: unknown) {
    console.error("GitHub API error:", error);
    return NextResponse.json({ error: "Failed to process GitHub repositories" }, { status: 500 });
  }
}
