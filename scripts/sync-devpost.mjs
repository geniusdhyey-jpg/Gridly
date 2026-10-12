import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, "../data/devpost.json");
const verifiedAt = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" });
const pages = 13;

const decode = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&#x27;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

const deadlineFrom = (range) => {
  const end = range?.split(" - ").at(-1)?.trim();
  if (!end) return null;
  const parsed = new Date(end);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const prizeFrom = (html) => {
  const value = decode(html).replace(/[^\d.]/g, "");
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const detailFromHtml = (html) => {
  const eligibilityBlock = html.match(/<ul[^>]+id=["']eligibility-list["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? "";
  const eligibility = [...eligibilityBlock.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => decode(match[1]))
    .filter(Boolean);
  const description = decode(
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([\s\S]*?)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)?.[1]
      ?? "",
  );
  const upper = html.toUpperCase();
  return {
    eligibility,
    description,
    cost: /NO PURCHASE NECESSARY/.test(upper) ? "Free" : "Check official rules",
    teamAllowed: /TEAM/.test(upper) ? true : null,
    soloAllowed: /INDIVIDUAL/.test(upper) || /ONE PERSON/.test(upper) ? true : null,
  };
};

const listPages = await Promise.all(Array.from({ length: pages }, async (_, index) => {
  const response = await fetch(`https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&page=${index + 1}`);
  if (!response.ok) throw new Error(`Devpost page ${index + 1} failed: ${response.status}`);
  return response.json();
}));

const listings = listPages.flatMap((page) => page.hackathons ?? []);
const records = new Array(listings.length);
let cursor = 0;

async function worker() {
  while (cursor < listings.length) {
    const index = cursor++;
    const item = listings[index];
    try {
      const response = await fetch(item.url);
      const html = response.ok ? await response.text() : "";
      const detail = detailFromHtml(html);
      const themes = item.themes?.map((theme) => theme.name) ?? [];
      const online = item.displayed_location?.icon === "globe" || /online/i.test(item.displayed_location?.location ?? "");
      const prizeAmount = prizeFrom(item.prize_amount);
      records[index] = {
        id: `devpost-${item.id}`,
        sourceId: String(item.id),
        title: item.title,
        organizer: item.organization_name || "Devpost community",
        type: /competition|challenge|contest/i.test(item.title) ? "Competition" : "Hackathon",
        topic: themes[0] || "Open innovation",
        topics: themes,
        deadline: deadlineFrom(item.submission_period_dates),
        status: item.open_state === "open" ? "active" : "upcoming",
        format: online ? "Online" : "In-person",
        location: item.displayed_location?.location || "See official page",
        eligibility: detail.eligibility.length ? detail.eligibility : ["See the official rules for eligibility"],
        eligibilityGroups: themes.includes("Beginner Friendly") ? ["Beginner-friendly"] : ["Builders"],
        cost: detail.cost,
        prizeAmount,
        benefit: prizeAmount ? `$${prizeAmount.toLocaleString("en-US")} in prizes` : "Prizes and recognition; see the official page",
        summary: detail.description || `Build and submit a project for ${item.title}. Review the official page for challenge details and judging criteria.`,
        officialUrl: item.url,
        sourceName: "Official Devpost challenge page",
        verifiedAt,
        teamAllowed: detail.teamAllowed,
        soloAllowed: detail.soloAllowed,
        beginnerFriendly: themes.includes("Beginner Friendly"),
        featured: Boolean(item.featured),
        trending: Number(item.registrations_count ?? 0) >= 1000,
        registrations: Number(item.registrations_count ?? 0),
        imageUrl: item.thumbnail_url?.startsWith("//") ? `https:${item.thumbnail_url}` : item.thumbnail_url,
      };
    } catch (error) {
      console.error(`Skipping ${item.id}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 8 }, () => worker()));
const complete = records.filter(Boolean);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(complete, null, 2)}\n`, "utf8");
console.log(`Saved ${complete.length} verified opportunities to ${output}`);
