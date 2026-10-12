import devpost from "@/data/devpost.json";
import grants from "@/data/grants-gov.json";

export type Opportunity = {
  id: string;
  sourceId: string;
  title: string;
  organizer: string;
  type: string;
  topic: string;
  topics?: string[];
  deadline: string | null;
  status: "active" | "upcoming" | "expired";
  format: string;
  location: string;
  eligibility: string[];
  eligibilityGroups: string[];
  cost: string;
  prizeAmount: number | null;
  benefit: string;
  summary: string;
  officialUrl: string;
  sourceName: string;
  verifiedAt: string;
  teamAllowed: boolean | null;
  soloAllowed: boolean | null;
  beginnerFriendly: boolean;
  featured: boolean;
  trending: boolean;
  registrations?: number;
  imageUrl?: string;
};

export const opportunities = [...devpost, ...grants] as Opportunity[];

export const organizations = Array.from(
  new Map(opportunities.map((item) => [item.organizer, item])).values(),
)
  .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0))
  .slice(0, 8)
  .map((item) => ({ name: item.organizer, source: item.sourceName }));
