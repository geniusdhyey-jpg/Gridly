import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  client ??= postgres(process.env.DATABASE_URL, { ssl: "require", max: 5, idle_timeout: 20 });
  return client;
}

export function requireAdmin(request: Request) {
  const expected = process.env.ADMIN_API_KEY;
  const supplied = request.headers.get("x-gridly-admin-key");
  if (!expected || !supplied || supplied !== expected) throw new Error("UNAUTHORIZED");
}

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
