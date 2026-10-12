import { NextResponse } from "next/server";
import { database, requireAdmin, slugify } from "@/lib/postgres";

export async function POST(request: Request) {
  try { requireAdmin(request); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const body = await request.json() as {
      externalId?: string; title: string; organizer: string; type: string; topic: string; topics?: string[];
      summary: string; status?: string; deadline?: string; format: string; location: string;
      eligibility: string | string[]; eligibilityGroups?: string[]; cost: string; prizeAmount?: number;
      benefit: string; officialUrl: string; sourceName: string; verifiedAt?: string;
      teamAllowed?: boolean; soloAllowed?: boolean; beginnerFriendly?: boolean; featured?: boolean;
    };
    const required = ["title", "organizer", "type", "topic", "summary", "format", "location", "eligibility", "cost", "benefit", "officialUrl", "sourceName"];
    const missing = required.filter((key) => !(body as unknown as Record<string, unknown>)[key]);
    if (missing.length) return NextResponse.json({ error: `Missing: ${missing.join(", ")}` }, { status: 400 });
    const sql = database();
    const [organization] = await sql`
      INSERT INTO organizations (name, verified) VALUES (${body.organizer}, true)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id
    `;
    const slug = `${slugify(body.title)}-${Date.now().toString(36)}`;
    const [row] = await sql`
      INSERT INTO opportunities (
        external_id, organization_id, title, slug, type, topic, topics, summary, status, deadline,
        format, location, eligibility, eligibility_groups, cost, prize_amount, benefit, official_url,
        source_name, verified_at, team_allowed, solo_allowed, beginner_friendly, featured
      ) VALUES (
        ${body.externalId ?? null}, ${organization.id}, ${body.title}, ${slug}, ${body.type}, ${body.topic}, ${body.topics ?? []},
        ${body.summary}, ${body.status ?? "review"}, ${body.deadline ?? null}, ${body.format}, ${body.location},
        ${Array.isArray(body.eligibility) ? body.eligibility : [body.eligibility]}, ${body.eligibilityGroups ?? []}, ${body.cost},
        ${body.prizeAmount ?? null}, ${body.benefit}, ${body.officialUrl}, ${body.sourceName}, ${body.verifiedAt ?? null},
        ${body.teamAllowed ?? null}, ${body.soloAllowed ?? null}, ${Boolean(body.beginnerFriendly)}, ${Boolean(body.featured)}
      )
      ON CONFLICT (official_url) DO UPDATE SET
        title = EXCLUDED.title, summary = EXCLUDED.summary, deadline = EXCLUDED.deadline,
        eligibility = EXCLUDED.eligibility, verified_at = EXCLUDED.verified_at, updated_at = now()
      RETURNING id, title, status
    `;
    return NextResponse.json({ opportunity: row }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 500 });
  }
}
