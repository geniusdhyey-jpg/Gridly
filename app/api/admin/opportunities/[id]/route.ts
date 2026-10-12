import { NextResponse } from "next/server";
import { database, requireAdmin } from "@/lib/postgres";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { requireAdmin(request); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await context.params;
  const body = await request.json() as { status?: string };
  const allowed = new Set(["draft", "review", "active", "upcoming", "expired", "rejected"]);
  const status = body.status;
  if (!status || !allowed.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  try {
    const sql = database();
    const [row] = await sql`UPDATE opportunities SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING id, status`;
    return row ? NextResponse.json({ opportunity: row }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 500 });
  }
}
