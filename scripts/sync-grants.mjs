import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.grants.gov/v1/api";
const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, "../data/grants-gov.json");
const verifiedAt = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" });

const clean = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

const isoDate = (value) => {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : null;
};

const amount = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const topicFrom = (categories = []) => {
  const joined = categories.map((item) => item.description).join(" ").toLowerCase();
  if (/science|technology|research/.test(joined)) return "Science & research";
  if (/environment|natural resource|energy/.test(joined)) return "Environment";
  if (/education/.test(joined)) return "Education";
  if (/business|commerce/.test(joined)) return "Business";
  if (/health/.test(joined)) return "Health";
  if (/arts|humanities/.test(joined)) return "Design & creative";
  return "Community impact";
};

async function post(path, body) {
  const response = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
  return response.json();
}

const search = await post("search2", {
  keyword: "",
  oppStatuses: "posted|forecasted",
  eligibilities: "21|23|99",
  rows: 120,
  startRecordNum: 0,
  sortBy: "closeDate|asc",
});

const hits = search.data?.oppHits ?? [];
const records = new Array(hits.length);
let cursor = 0;

async function worker() {
  while (cursor < hits.length) {
    const index = cursor++;
    const hit = hits[index];
    try {
      const detail = await post("fetchOpportunity", { opportunityId: Number(hit.id) });
      const data = detail.data ?? {};
      const synopsis = data.synopsis ?? data.forecast ?? {};
      const eligibilities = synopsis.applicantTypes?.map((item) => item.description).filter(Boolean) ?? [];
      const ceiling = amount(synopsis.awardCeiling);
      const floor = amount(synopsis.awardFloor);
      const description = clean(synopsis.synopsisDesc || synopsis.forecastDesc || "Review the official notice for full program details.");
      const categories = synopsis.fundingActivityCategories ?? [];
      records[index] = {
        id: `grants-gov-${hit.id}`,
        sourceId: String(hit.id),
        title: hit.title,
        organizer: hit.agency || synopsis.agencyName || data.agencyDetails?.agencyName || "U.S. Government",
        type: "Grant",
        topic: topicFrom(categories),
        deadline: isoDate(hit.closeDate),
        status: hit.oppStatus === "forecasted" ? "upcoming" : "active",
        format: "Online",
        location: "United States",
        eligibility: eligibilities.length ? eligibilities : ["See official eligibility rules"],
        eligibilityGroups: eligibilities.some((item) => /individual/i.test(item))
          ? ["Individuals", "College", "Young entrepreneurs"]
          : ["Organizations", "Startups"],
        cost: "Free",
        prizeAmount: ceiling,
        benefit: ceiling
          ? `Up to $${ceiling.toLocaleString("en-US")} in federal funding`
          : floor
            ? `Federal funding awards from $${floor.toLocaleString("en-US")}`
            : "Federal funding; award amount is listed in the official notice",
        summary: description.slice(0, 360),
        officialUrl: `https://www.grants.gov/search-results-detail/${hit.id}`,
        sourceName: "Grants.gov",
        verifiedAt,
        teamAllowed: true,
        soloAllowed: eligibilities.some((item) => /individual/i.test(item)),
        beginnerFriendly: false,
        featured: false,
        trending: false,
      };
    } catch (error) {
      console.error(`Skipping ${hit.id}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 6 }, () => worker()));
const complete = records.filter(Boolean);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(complete, null, 2)}\n`, "utf8");
console.log(`Saved ${complete.length} verified opportunities to ${output}`);
