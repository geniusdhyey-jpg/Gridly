import { NextResponse } from "next/server";
import { database } from "@/lib/postgres";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ configured: false, opportunities: [] });
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 24)));
  const query = url.searchParams.get("q") ?? "";
  const sql = database();
  const rows = await sql`
    SELECT o.*, org.name AS organizer
    FROM opportunities o
    LEFT JOIN organizations org ON org.id = o.organization_id
    WHERE o.status IN ('active','upcoming')
      AND (o.deadline IS NULL OR o.deadline >= now())
      AND (${query} = '' OR to_tsvector('english', o.title || ' ' || o.summary) @@ plainto_tsquery('english', ${query}))
    ORDER BY o.deadline ASC NULLS LAST
    LIMIT ${limit} OFFSET ${(page - 1) * limit}
  `;
  return NextResponse.json({ configured: true, page, limit, opportunities: rows });
}
