import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id: skillId } = await params;

    // Parse maximum depth from query parameter (default to 3 hops)
    const { searchParams } = new URL(request.url);
    const maxDepth = parseInt(searchParams.get("depth") || "3", 10);

    // Verify the starting skill belongs to the authenticated user
    const startSkill = await db.skill.findUnique({
      where: { id: skillId },
    });

    if (!startSkill || startSkill.userId !== userId) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Execute recursive CTE query to traverse relationships up to maxDepth hops
    const relatedSkills = await db.$queryRaw<Array<{
      id: string;
      name: string;
      category: string;
      proficiency: number;
      relation_type: string;
      depth: number;
    }>>`
      WITH RECURSIVE skill_traverse AS (
        -- Anchor Member: find immediate neighbors
        SELECT 
          from_id, 
          to_id, 
          relation_type, 
          1 AS depth
        FROM skill_edges
        WHERE from_id = ${skillId}

        UNION ALL

        -- Recursive Member: traverse downstream connections
        SELECT 
          e.from_id, 
          e.to_id, 
          e.relation_type, 
          st.depth + 1
        FROM skill_edges e
        INNER JOIN skill_traverse st ON e.from_id = st.to_id
        WHERE st.depth < ${maxDepth}
      )
      SELECT DISTINCT ON (s.id)
        s.id,
        s.name,
        s.category,
        s.proficiency,
        st.relation_type,
        st.depth
      FROM skill_traverse st
      INNER JOIN "Skill" s ON st.to_id = s.id
      WHERE s."userId" = ${userId}
      ORDER BY s.id, st.depth ASC;
    `;

    return NextResponse.json(relatedSkills);
  } catch (error: unknown) {
    console.error("Error traversing skill graph:", error);
    return NextResponse.json({ error: "Failed to traverse skill graph" }, { status: 500 });
  }
}
