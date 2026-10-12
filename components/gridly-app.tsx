"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Bell, Bookmark, BriefcaseBusiness, Check, ChevronDown, CircleDollarSign,
  Clock3, Code2, Compass, Filter, Flag, FlaskConical, Globe2, GraduationCap, HandHeart, Home, ListChecks, Megaphone, Menu, Moon, Palette, Search,
  ShieldCheck, SlidersHorizontal, Sparkles, Sun, Target, Trophy, Users, X, Zap,
} from "lucide-react";
import type { Opportunity } from "@/lib/opportunities";
import { marketUpdates } from "@/lib/market-updates";

type Profile = {
  age: string;
  location: string;
  interests: string[];
  skills: string;
  onlineOnly: boolean;
  freeOnly: boolean;
  goal: string;
};

type MultiFilters = {
  types: string[];
  topics: string[];
  ages: string[];
  locations: string[];
  formats: string[];
  statuses: Array<"active" | "upcoming">;
};

type Filters = {
  type: string;
  topic: string;
  eligibility: string;
  format: string;
  location: string;
  freeOnly: boolean;
  deadline: string;
  prize: string;
  participation: string;
  age: string;
  noExperience: boolean;
  worldwide: boolean;
  prizeType: string;
};

const defaultFilters: Filters = {
  type: "All types", topic: "All topics", eligibility: "Everyone", format: "Any format",
  location: "Anywhere", freeOnly: false, deadline: "Any deadline", prize: "Any prize", participation: "Solo or team",
  age: "Any age", noExperience: false, worldwide: false, prizeType: "Any reward",
};

const emptyProfile: Profile = { age: "", location: "", interests: [], skills: "", onlineOnly: true, freeOnly: true, goal: "Explore and learn" };
const defaultMultiFilters: MultiFilters = { types: [], topics: [], ages: [], locations: [], formats: [], statuses: ["active", "upcoming"] };
const ageOptions = ["Age 13", "Age 14", "Age 15", "Age 16", "Age 17", "Under 18", "18+", "Middle school", "High school", "College age"];

const daysLeft = (deadline: string | null) => deadline
  ? Math.ceil((new Date(`${deadline}T23:59:59`).getTime() - Date.now()) / 86400000)
  : Number.POSITIVE_INFINITY;

const dateLabel = (deadline: string | null) => deadline
  ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${deadline}T12:00:00`))
  : "See official page";

const money = (value: number | null) => value
  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
  : "Prize varies";

const compactMoney = (value: number | null) => value
  ? new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
  : null;

const includes = (value: string, search: string) => value.toLowerCase().includes(search.toLowerCase());

const categories = [
  { name: "All opportunities", icon: Sparkles },
  { name: "Tech & AI", icon: Code2 },
  { name: "Business", icon: BriefcaseBusiness },
  { name: "Science", icon: FlaskConical },
  { name: "Academics", icon: GraduationCap },
  { name: "Media", icon: Megaphone },
  { name: "Arts", icon: Palette },
  { name: "Community Impact", icon: HandHeart },
];

function categoryFor(item: Opportunity) {
  const text = [item.title, item.type, item.topic, ...(item.topics ?? []), item.summary].join(" ").toLowerCase();
  if (/\b(art|arts|design|creative|fashion|music|visual)\b/.test(text)) return "Arts";
  if (/\b(media|film|video|journalism|storytelling|content|communications?|photography)\b/.test(text)) return "Media";
  if (/\b(education|academic|student|school|university|college|scholarship|fellowship)\b|research education/.test(text)) return "Academics";
  if (/\b(science|research|health|medical|biology|climate|environment|water|space|energy|mathematics?)\b/.test(text)) return "Science";
  if (/\b(business|startup|entrepreneur|fintech|commerce|market|productivity)\b|small business/.test(text)) return "Business";
  if (/\b(community|social|public|civic|humanitarian|volunteer|justice|equity|nonprofit)\b/.test(text)) return "Community Impact";
  if (/\b(ai|code|coding|developer|software|robotics?|web3|blockchain|mobile|gaming|iot|serverless|hackathon)\b|machine learning/.test(text)) return "Tech & AI";
  return item.type === "Grant" ? "Community Impact" : "Tech & AI";
}

const detailText = (item: Opportunity) => [item.title, item.summary, item.benefit, ...item.eligibility].join(" ").toLowerCase();

function ageLabel(item: Opportunity) {
  const text = item.eligibility.join(" ");
  const age = text.match(/ages?\s+(\d+)\s+(?:to|-|–)\s+(\d+)/i);
  if (age) return `Ages ${age[1]}–${age[2]}`;
  const minimumAge = text.match(/ages?\s+(\d+)\s*\+/i);
  if (minimumAge) return `Ages ${minimumAge[1]}+`;
  if (/above legal age|18\+|adults?/i.test(text)) return "Adults / legal age";
  if (item.type === "Grant") return /\bindividuals\b/i.test(text) ? "Eligible individuals" : "Organizations; see eligibility";
  if (/students? only|middle school|high school|college students?/i.test(text)) return "Students; check grade rules";
  if (/individual/i.test(text)) return "Eligible individuals";
  return "See official age rules";
}

function matchesAge(item: Opportunity, selection: string) {
  if (selection === "Any age") return true;
  const text = detailText(item);
  const exact = selection.match(/^Age (\d{1,2})$/);
  const rangeMatches = [...text.matchAll(/ages?\s*(\d{1,2})\s*(?:to|-|–)\s*(\d{1,2})/gi)];
  const minimumMatches = [...text.matchAll(/ages?\s*(\d{1,2})\s*\+/gi)];
  const isAdultOnly = /above legal age|adults? only|must be (?:at least )?18|18\+/.test(text);
  const isOrganizationOnly = /organizations? only|nonprofits? only|small businesses? only/.test(text);

  if (exact) {
    const age = Number(exact[1]);
    if (rangeMatches.length) return rangeMatches.some((match) => age >= Number(match[1]) && age <= Number(match[2]));
    if (minimumMatches.length) return minimumMatches.some((match) => age >= Number(match[1]));
    if ((isAdultOnly || isOrganizationOnly) && age < 18) return false;
    if (/middle school/.test(text)) return age >= 10 && age <= 14;
    if (/high school|teen/.test(text)) return age >= 13 && age <= 18;
    if (/college|university|higher education/.test(text)) return age >= 16;
    return /all ages|any age|anyone|students? only|youth|children|teens?/.test(text);
  }

  if (selection === "Under 18") {
    if (isAdultOnly || isOrganizationOnly) return false;
    return !rangeMatches.length || rangeMatches.some((match) => Number(match[1]) < 18);
  }
  if (selection === "18+") {
    if (rangeMatches.length) return rangeMatches.some((match) => Number(match[2]) >= 18);
    return isAdultOnly || /individuals?|college|university|higher education/.test(text);
  }
  if (selection === "Middle school") return /middle school/.test(text) || rangeMatches.some((match) => Number(match[1]) <= 14 && Number(match[2]) >= 10);
  if (selection === "High school") return /high school|teen|students? only/.test(text) || rangeMatches.some((match) => Number(match[1]) <= 18 && Number(match[2]) >= 13);
  if (selection === "College age") return /college|university|higher education|student/.test(text) || rangeMatches.some((match) => Number(match[2]) >= 17);
  return true;
}

function experienceLabel(item: Opportunity) {
  const text = detailText(item);
  if (item.beginnerFriendly || /no experience|all skill levels|beginner/.test(text)) return "No experience needed";
  return item.type === "Grant" ? "Application experience may help" : "Some relevant skills may be needed";
}

function rewardType(item: Opportunity) {
  const text = detailText(item);
  if (item.prizeAmount) return "Cash funding";
  if (/scholarship|tuition/.test(text)) return "Scholarship";
  if (/mentor/.test(text)) return "Mentorship";
  if (/certificate/.test(text)) return "Certificate";
  return "Recognition & benefits";
}

function matchScore(item: Opportunity, profile: Profile) {
  let score = item.featured ? 5 : 0;
  if (item.beginnerFriendly) score += 8;
  if (profile.onlineOnly && item.format === "Online") score += 10;
  if (profile.freeOnly && item.cost === "Free") score += 8;
  if (profile.location && includes(item.location, profile.location)) score += 12;
  for (const interest of profile.interests) {
    if ([item.topic, ...(item.topics ?? []), item.summary].some((value) => includes(value, interest))) score += 12;
  }
  if (profile.skills && detailText(item).includes(profile.skills.toLowerCase())) score += 8;
  if (profile.goal === "Win prizes or funding" && item.prizeAmount) score += 10;
  if (profile.goal === "Build my résumé" && /student|fellowship|intern|competition|hackathon/i.test(detailText(item))) score += 8;
  if (profile.goal === "Launch a startup" && /startup|business|entrepreneur|pitch/i.test(detailText(item))) score += 10;
  return score;
}

function interpretNaturalQuery(input: string) {
  const text = input.toLowerCase();
  const patch: Filters = { ...defaultFilters };
  const multi: MultiFilters = { ...defaultMultiFilters, types: [], topics: [], ages: [], locations: [], formats: [] };
  const pickedCategories: string[] = [];
  const understood: string[] = [];

  if (/hackathon|buildathon/.test(text)) { multi.types.push("Hackathon"); understood.push("hackathons"); }
  if (/grant|funding/.test(text)) { multi.types.push("Grant"); understood.push("grants"); }
  if (/competition|contest|science fair|fair\b/.test(text)) { multi.types.push("Competition"); understood.push("competitions"); }
  if (/\bfree\b|no cost/.test(text)) { patch.freeOnly = true; understood.push("free"); }
  if (/beginner|no experience|first.?time/.test(text)) { patch.eligibility = "Beginner-friendly"; patch.noExperience = /no experience/.test(text); understood.push("beginner-friendly"); }
  if (/\bonline\b|virtual|remote/.test(text)) { multi.formats.push("Online"); understood.push("online"); }
  if (/in.?person|onsite/.test(text)) { multi.formats.push("In-person"); understood.push("in-person"); }
  if (/worldwide|global|any country/.test(text)) { multi.locations.push("Worldwide"); understood.push("worldwide"); }
  if (/united states|\bu\.?s\.?\b|america/.test(text)) { multi.locations.push("United States"); understood.push("United States"); }
  if (/san francisco|bay area/.test(text)) { patch.location = "San Francisco"; understood.push("San Francisco"); }
  if (/california/.test(text)) { patch.location = "California"; understood.push("California"); }
  if (/this week/.test(text)) { patch.deadline = "This week"; understood.push("closing this week"); }
  else if (/this month/.test(text)) { patch.deadline = "This month"; understood.push("closing this month"); }
  else if (/next (three|3) months/.test(text)) { patch.deadline = "Next 3 months"; understood.push("next three months"); }
  if (/solo|individual/.test(text)) { patch.participation = "Solo allowed"; understood.push("solo allowed"); }
  if (/team/.test(text)) { patch.participation = "Team allowed"; understood.push("teams allowed"); }
  const exactAge = text.match(/\bage\s*(\d{1,2})\b|\b(\d{1,2})\s*[- ]?years?\s*[- ]?old\w*\b/);
  if (exactAge) {
    const age = Number(exactAge[1] ?? exactAge[2]);
    if (age >= 5 && age <= 99) { multi.ages.push(`Age ${age}`); understood.push(`age ${age}`); }
  }
  if (/middle school/.test(text) && !exactAge) { multi.ages.push("Middle school"); patch.eligibility = "Students"; understood.push("middle-school eligibility"); }
  if (/high school|teen/.test(text) && !exactAge) { multi.ages.push("High school"); patch.eligibility = "Students"; understood.push("high-school eligibility"); }
  if (/college|university/.test(text)) { patch.age = "College age"; patch.eligibility = "Students"; understood.push("college eligibility"); }
  if (/\bai\b|artificial intelligence|machine learning|coding|software|robot/.test(text)) { pickedCategories.push("Tech & AI"); multi.topics.push("Machine Learning/AI"); understood.push("AI & technology"); }
  if (/startup|business|entrepreneur|pitch/.test(text)) { pickedCategories.push("Business"); multi.topics.push("Business"); understood.push("business"); }
  if (/science|research|space|health|medical|climate|environment/.test(text)) { pickedCategories.push("Science"); understood.push("science"); }
  if (/scholarship|academic|school|education/.test(text)) pickedCategories.push("Academics");
  if (/media|film|journalism|content/.test(text)) pickedCategories.push("Media");
  if (/art|design|music|creative/.test(text)) pickedCategories.push("Arts");
  if (/community|social impact|nonprofit|civic/.test(text)) pickedCategories.push("Community Impact");
  if (/upcoming|opening soon|announced/.test(text) && !/\bopen\b/.test(text)) multi.statuses = ["upcoming"];

  const structural = /^(show|find|give|me|i|want|need|for|the|a|an|and|or|with|that|are|is|to|in|near|opportunities?|hackathons?|competitions?|contests?|grants?|free|beginner|friendly|online|virtual|remote|worldwide|global|solo|team|teams|allowed|middle|high|school|college|university|this|week|month|next|three|months|years?|old\w*|age|ai|artificial|intelligence|machine|learning|coding|business|startup|science|fair|fairs)$/;
  const keywords = input.split(/\s+/).map((word) => word.replace(/[^a-z0-9+-]/gi, "")).filter((word) => word.length > 2 && !structural.test(word) && !(exactAge && /^\d{1,2}$/.test(word)));
  return { patch, multi, categories: [...new Set(pickedCategories)], keywords: [...new Set(keywords)].join(" "), understood: understood.length ? understood.join(" · ") : "your exact words" };
}

function popularityScore(item: Opportunity) {
  const knownOrganizer = /amazon|meta|nasa|google|microsoft|nvidia|adobe|ibm|openai|national science foundation|national institutes of health/i.test(item.organizer);
  return Math.log10((item.registrations ?? 0) + 1) * 22
    + Math.min((item.prizeAmount ?? 0) / 10000, 35)
    + (item.trending ? 18 : 0)
    + (item.featured ? 14 : 0)
    + (knownOrganizer ? 20 : 0);
}

function fitReason(item: Opportunity, profile: Profile) {
  if (profile.interests.some((interest) => [item.topic, ...(item.topics ?? [])].some((topic) => includes(topic, interest)))) return `Matches your ${profile.interests[0]} interests`;
  if (profile.onlineOnly && item.format === "Online") return "Matches your online preference";
  if (profile.freeOnly && item.cost === "Free") return "Matches your free-only preference";
  if (item.beginnerFriendly) return "Friendly for newer builders";
  if ((item.registrations ?? 0) > 5000) return `${(item.registrations ?? 0).toLocaleString()} builders are interested`;
  return "Strong organizer, reward, and momentum";
}

function diversify(items: Opportunity[], seed: number, limit: number) {
  const rotated = [...items];
  if (!rotated.length) return [];
  const offset = seed % Math.min(rotated.length, 12);
  const candidates = [...rotated.slice(offset), ...rotated.slice(0, offset)];
  const picked: Opportunity[] = [];
  const usedCategories = new Set<string>();
  for (const item of candidates) {
    const category = categoryFor(item);
    if (!usedCategories.has(category)) { picked.push(item); usedCategories.add(category); }
    if (picked.length === limit) return picked;
  }
  for (const item of candidates) if (!picked.includes(item)) { picked.push(item); if (picked.length === limit) break; }
  return picked;
}

function useLocalList(key: string) {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { setItems([]); }
  }, [key]);
  const toggle = (id: string) => setItems((current) => {
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    localStorage.setItem(key, JSON.stringify(next));
    return next;
  });
  return [items, toggle] as const;
}

function SideNav({ open, onClose, count, savedCount, alertCount }: { open: boolean; onClose: () => void; count: number; savedCount: number; alertCount: number }) {
  const nav = [
    { label: "Discover", href: "#top", icon: Home },
    { label: "Popular now", href: "#popular", icon: Trophy },
    { label: "New announcements", href: "#announcements", icon: Megaphone },
    { label: "Explore all", href: "#explore", icon: Compass },
    { label: "Closing soon", href: "#collections", icon: Clock3 },
    { label: "Best for you", href: "#best-for-you", icon: Sparkles },
  ];
  return <><aside className={open ? "side-nav open" : "side-nav"} aria-label="Gridly navigation">
    <div className="side-brand-row"><Link className="brand" href="/" onClick={onClose}><span className="brand-mark">G</span><span>Gridly</span></Link><button className="side-close" onClick={onClose} aria-label="Close menu"><X size={18}/></button></div>
    <div className="side-section"><span>Explore</span>{nav.map(({ label, href, icon: Icon }) => <a href={href} key={label} onClick={onClose}><Icon size={17}/><b>{label}</b></a>)}</div>
    <div className="side-section"><span>My space</span>
      <Link href="/dashboard" onClick={onClose}><Bookmark size={17}/><b>My watchlist</b><i>{savedCount}</i></Link>
      <Link href="/dashboard?tab=Applied" onClick={onClose}><ListChecks size={17}/><b>Applications</b></Link>
      <Link href="/dashboard?tab=Upcoming%20deadlines" onClick={onClose}><Bell size={17}/><b>Deadline alerts</b>{alertCount > 0 && <i className="warning">{alertCount}</i>}</Link>
      <Link href="/admin" onClick={onClose}><ShieldCheck size={17}/><b>Admin</b></Link>
    </div>
    <div className="side-status"><span><i/> Live catalog</span><b>{count} open &amp; upcoming</b><small>Official sources · refreshed today</small></div>
  </aside>{open && <button className="side-backdrop" onClick={onClose} aria-label="Close navigation"/>}</>;
}

function AppHeader({ savedCount, alerts, onProfile, onMenu, count, query, onQuery, onSearch }: { savedCount: number; alerts: Opportunity[]; onProfile: () => void; onMenu: () => void; count: number; query: string; onQuery: (value: string) => void; onSearch: () => void }) {
  const [dark, setDark] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);
  useEffect(() => {
    const isDark = localStorage.getItem("gridly-theme") !== "light";
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("gridly-theme", next ? "dark" : "light");
  };
  return <header className="topbar">
    <button className="icon-button mobile-only" aria-label="Open menu" onClick={onMenu}><Menu size={20}/></button>
    <form className="top-smart-search" onSubmit={(event) => { event.preventDefault(); onSearch(); }}><Sparkles size={16}/><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Ask Gridly: free AI hackathons for high-school students..." aria-label="Ask Gridly anything"/><span><i/>{count} Open</span><button type="submit">Search</button></form>
    <div className="header-actions">
      <button className="icon-button" onClick={toggleTheme} aria-label="Toggle color theme">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
      <div className="alerts-wrap"><button className="icon-button alert-button" onClick={() => setShowAlerts((value) => !value)} aria-label="Open alerts"><Bell size={18}/>{alerts.length > 0 && <i>{Math.min(alerts.length, 9)}</i>}</button>{showAlerts && <div className="alerts-popover"><div><b>Watchlist alerts</b><button onClick={() => setShowAlerts(false)}><X size={15}/></button></div>{alerts.length ? alerts.slice(0, 5).map((item) => <Link key={item.id} href="/dashboard"><span>{daysLeft(item.deadline) <= 7 ? "Closing soon" : "Deadline update"}</span><strong>{item.title}</strong><small>{daysLeft(item.deadline)} days left · {dateLabel(item.deadline)}</small></Link>) : <p>Watch an opportunity to receive deadline alerts here.</p>}<Link className="alerts-all" href="/dashboard">Manage watchlist</Link></div>}</div>
      <Link className="saved-link" href="/dashboard"><Bookmark size={17}/><span>{savedCount ? `${savedCount} watching` : "Watchlist"}</span></Link>
      <button className="profile-button" onClick={onProfile}>Tune my matches</button>
    </div>
  </header>;
}

function Hero({ count, query, onQuery, onSearch, onQuick, interpretation }: { count: number; query: string; onQuery: (value: string) => void; onSearch: () => void; onQuick: (value: string) => void; interpretation: string }) {
  return <section className="hero">
    <div className="eyebrow"><span className="live-dot"/> {count} opportunities verified today</div>
    <h1>Explore what&apos;s<br/><span>open right now.</span></h1>
    <p>Understand the deadline, eligibility, effort, cost, and reward before you ever leave Gridly.</p>
    <div className="hero-search">
      <Sparkles size={21}/><input value={query} onChange={(event) => onQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSearch()} placeholder="Ask naturally: free beginner robotics competitions online..." aria-label="Search opportunities"/>
      <button onClick={onSearch}>Ask Gridly <ArrowRight size={17}/></button>
    </div>
    {interpretation && <div className="search-interpretation"><Check size={14}/><span>Gridly understood: {interpretation}</span></div>}
    <div className="quick-searches"><span>Try</span>{["Beginner AI", "Online hackathons", "Big prizes", "Grants for startups"].map((term) => <button key={term} onClick={() => onQuick(term)}>{term}</button>)}</div>
    <div className="hero-stats"><div><strong>{count}+</strong><span>open & upcoming</span></div><div><strong>7</strong><span>opportunity paths</span></div><div><strong>Official</strong><span>source on every card</span></div></div>
  </section>;
}

function MultiSelectMenu({ label, fallback, options, selected, onChange }: { label: string; fallback: string; options: string[]; selected: string[]; onChange: (values: string[]) => void }) {
  return <details className="multi-menu"><summary><span>{label}</span><b>{selected.length ? selected.join(", ") : fallback}</b><ChevronDown size={14}/></summary><div>{options.map((option) => <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={() => onChange(selected.includes(option) ? selected.filter((value) => value !== option) : [...selected, option])}/><span>{option}</span></label>)}</div></details>;
}

function SmartFilterBar({ multi, onChange }: { multi: MultiFilters; onChange: (next: MultiFilters) => void }) {
  return <div className="smart-filter-bar" aria-label="Combined filters">
    <div className="filter-state"><span className="live-dot"/><b>Always filtering</b></div>
    <MultiSelectMenu label="Status" fallback="Open + upcoming" options={["active", "upcoming"]} selected={multi.statuses} onChange={(statuses) => onChange({ ...multi, statuses: statuses.length ? statuses as MultiFilters["statuses"] : ["active", "upcoming"] })}/>
    <MultiSelectMenu label="Type" fallback="Any type" options={["Hackathon", "Competition", "Grant"]} selected={multi.types} onChange={(types) => onChange({ ...multi, types })}/>
    <MultiSelectMenu label="Age" fallback="Any age" options={ageOptions} selected={multi.ages} onChange={(ages) => onChange({ ...multi, ages })}/>
    <MultiSelectMenu label="Topics" fallback="Any topic" options={["Machine Learning/AI", "Business", "Science & research", "Environment", "Education", "Health", "Design & creative", "Community impact"]} selected={multi.topics} onChange={(topics) => onChange({ ...multi, topics })}/>
    <MultiSelectMenu label="Location" fallback="Anywhere" options={["Online", "Worldwide", "United States", "San Francisco", "California"]} selected={multi.locations} onChange={(locations) => onChange({ ...multi, locations })}/>
    <MultiSelectMenu label="Format" fallback="Any format" options={["Online", "In-person", "Hybrid"]} selected={multi.formats} onChange={(formats) => onChange({ ...multi, formats })}/>
  </div>;
}

function MiniCard({ item, saved, onSave }: { item: Opportunity; saved: boolean; onSave: () => void }) {
  const left = daysLeft(item.deadline);
  return <article className="mini-card">
    <div className="mini-top"><span className={`type-pill ${item.type.toLowerCase()}`}>{item.type}</span><button className={saved ? "save active" : "save"} onClick={onSave} aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/></button></div>
    <h3>{item.title}</h3><p>{item.organizer}</p>
    <div className="mini-meta"><span><Clock3 size={14}/>{left >= 0 && left !== Infinity ? `${left} days left` : dateLabel(item.deadline)}</span><span>{compactMoney(item.prizeAmount) ?? item.format}</span></div>
  </article>;
}

function PopularCard({ item, rank, profile, saved, onSave }: { item: Opportunity; rank: number; profile: Profile; saved: boolean; onSave: () => void }) {
  const fit = Math.min(96, Math.round(58 + matchScore(item, profile) * 1.45));
  return <article className="popular-card">
    <div className="popular-rank">#{rank}</div>
    <div className="popular-card-top"><span className="type-pill">{categoryFor(item)}</span><button className={saved ? "save active" : "save"} onClick={onSave} aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}><Bookmark size={16} fill={saved ? "currentColor" : "none"}/></button></div>
    <h3>{item.title}</h3><p>{item.organizer}</p>
    <div className="fit-meter"><span style={{ width: `${fit}%` }}/></div><strong>{fit}% fit</strong><small>{fitReason(item, profile)}</small>
    <div className="popular-proof"><span><Users size={14}/>{item.registrations ? `${item.registrations.toLocaleString()} registered` : "Major official program"}</span><span><Trophy size={14}/>{compactMoney(item.prizeAmount) ?? rewardType(item)}</span></div>
    <a href={item.officialUrl} target="_blank" rel="noreferrer">View opportunity <ArrowUpRight size={15}/></a>
  </article>;
}

function MarketUpdateCard({ update }: { update: (typeof marketUpdates)[number] }) {
  return <article className="market-card">
    <div><span className="live-dot"/><b>{update.status}</b><small>{update.category}</small></div>
    <h3>{update.title}</h3><p>{update.summary}</p>
    <dl><div><dt>Deadline</dt><dd>{update.deadline}</dd></div><div><dt>Who it’s for</dt><dd>{update.audience}</dd></div><div><dt>Reward</dt><dd>{update.reward}</dd></div></dl>
    <div className="market-card-footer"><span><Check size={13}/> Verified {update.verifiedAt}</span><a href={update.officialUrl} target="_blank" rel="noreferrer">Official announcement <ArrowUpRight size={15}/></a></div>
  </article>;
}

function OpportunityCard({ item, saved, applied, reminded, onSave, onApply, onRemind }: { item: Opportunity; saved: boolean; applied: boolean; reminded: boolean; onSave: () => void; onApply: () => void; onRemind: () => void }) {
  const left = daysLeft(item.deadline);
  const eligibility = item.eligibility.slice(0, 2).join(" · ");
  const category = categoryFor(item);
  return <article className="opportunity-card">
    <div className="card-rail"><div className="org-avatar">{item.organizer.slice(0, 2).toUpperCase()}</div><div className="rail-line"/></div>
    <div className="card-body">
      <div className="card-heading">
        <div><div className="card-tags"><span className={`type-pill ${item.type.toLowerCase()}`}>{item.type}</span><span className="soft-pill">{category}</span>{item.beginnerFriendly && <span className="soft-pill">Beginner friendly</span>}{item.trending && <span className="soft-pill hot"><Zap size={12}/> Trending</span>}</div><h3>{item.title}</h3><p className="organizer">{item.organizer}</p></div>
        <button className={saved ? "watch-button active" : "watch-button"} onClick={onSave}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/>{saved ? "Watching" : "Watch"}</button>
      </div>
      <p className="summary">{item.summary}</p>
      <div className="detail-grid detail-grid-six">
        <span><Clock3/><b>{left >= 0 && left !== Infinity ? `${left} days left` : "Deadline"}</b><small>{dateLabel(item.deadline)}</small></span>
        <span><Globe2/><b>{item.format}</b><small>{item.location}</small></span>
        <span><Users/><b>{ageLabel(item)}</b><small>{eligibility || "See official rules"}</small></span>
        <span><Sparkles/><b>{experienceLabel(item)}</b><small>{item.teamAllowed === true ? "Teams allowed" : item.soloAllowed === true ? "Solo allowed" : "Check participation rules"}</small></span>
        <span><Trophy/><b>{money(item.prizeAmount)}</b><small>{rewardType(item)} · {item.benefit}</small></span>
        <span><CircleDollarSign/><b>{item.cost}</b><small>Entry cost</small></span>
      </div>
      <details className="plain-details"><summary>Full eligibility and source details</summary><div><p><b>Who can apply</b>{item.eligibility.join(" · ")}</p><p><b>What you receive</b>{item.benefit}</p><p><b>Experience</b>{experienceLabel(item)}</p><p><b>Official source</b>{item.sourceName}, verified {item.verifiedAt}</p></div></details>
      <div className="card-footer">
        <div className="verified"><Check size={14}/> Verified {item.verifiedAt} · {item.sourceName}</div>
        <div className="card-actions">
          <button className={reminded ? "text-action active" : "text-action"} onClick={onRemind}><Bell size={15}/>{reminded ? "Alerts on" : "Alert me"}</button>
          <button className={applied ? "text-action active" : "text-action"} onClick={onApply}><Check size={15}/>{applied ? "Applied" : "I applied"}</button>
          <a className="primary-link" href={item.officialUrl} target="_blank" rel="noreferrer">Continue to official page <ArrowUpRight size={16}/></a>
        </div>
      </div>
      <a className="report" href={`mailto:hello@gridly.app?subject=Incorrect listing: ${encodeURIComponent(item.title)}`}><Flag size={12}/> Report incorrect listing</a>
    </div>
  </article>;
}

function SelectFilter({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="filter-field"><span>{label}</span><div><select value={value} onChange={(event) => onChange(event.target.value)}>{values.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14}/></div></label>;
}

function FilterPanel({ filters, onChange, onClear, mobile, close }: { filters: Filters; onChange: (next: Filters) => void; onClear: () => void; mobile?: boolean; close?: () => void }) {
  return <aside className={mobile ? "filters-panel mobile-panel" : "filters-panel"}>
    <div className="filters-title"><div><SlidersHorizontal size={17}/><b>Filters</b></div>{mobile && <button className="icon-button" onClick={close}><X size={18}/></button>}</div>
    <SelectFilter label="Type" value={filters.type} values={["All types", "Hackathon", "Competition", "Grant"]} onChange={(type) => onChange({ ...filters, type })}/>
    <SelectFilter label="Topic" value={filters.topic} values={["All topics", "Machine Learning/AI", "Business", "Science & research", "Environment", "Education", "Health", "Design & creative", "Community impact"]} onChange={(topic) => onChange({ ...filters, topic })}/>
    <SelectFilter label="Eligibility" value={filters.eligibility} values={["Everyone", "Beginner-friendly", "Individuals", "Students", "Startups", "Organizations"]} onChange={(eligibility) => onChange({ ...filters, eligibility })}/>
    <SelectFilter label="Age" value={filters.age} values={["Any age", ...ageOptions]} onChange={(age) => onChange({ ...filters, age })}/>
    <SelectFilter label="Format" value={filters.format} values={["Any format", "Online", "In-person", "Hybrid"]} onChange={(format) => onChange({ ...filters, format })}/>
    <SelectFilter label="Location" value={filters.location} values={["Anywhere", "Worldwide", "United States", "Online", "San Francisco", "California"]} onChange={(location) => onChange({ ...filters, location })}/>
    <SelectFilter label="Deadline" value={filters.deadline} values={["Any deadline", "This week", "This month", "Next 3 months"]} onChange={(deadline) => onChange({ ...filters, deadline })}/>
    <SelectFilter label="Prize" value={filters.prize} values={["Any prize", "$1,000+", "$10,000+", "$100,000+"]} onChange={(prize) => onChange({ ...filters, prize })}/>
    <SelectFilter label="Reward type" value={filters.prizeType} values={["Any reward", "Cash funding", "Scholarship", "Mentorship", "Certificate", "Recognition & benefits"]} onChange={(prizeType) => onChange({ ...filters, prizeType })}/>
    <SelectFilter label="Participation" value={filters.participation} values={["Solo or team", "Team allowed", "Solo allowed"]} onChange={(participation) => onChange({ ...filters, participation })}/>
    <label className="switch-row"><span><b>Free only</b><small>Hide paid or unclear entry costs</small></span><input type="checkbox" checked={filters.freeOnly} onChange={(event) => onChange({ ...filters, freeOnly: event.target.checked })}/><i/></label>
    <label className="switch-row"><span><b>No experience needed</b><small>Beginner-ready opportunities</small></span><input type="checkbox" checked={filters.noExperience} onChange={(event) => onChange({ ...filters, noExperience: event.target.checked })}/><i/></label>
    <label className="switch-row"><span><b>Worldwide</b><small>Open beyond one country</small></span><input type="checkbox" checked={filters.worldwide} onChange={(event) => onChange({ ...filters, worldwide: event.target.checked })}/><i/></label>
    <button className="clear-filters" onClick={onClear}>Clear all filters</button>
  </aside>;
}

function Onboarding({ initial, onSave, onClose }: { initial: Profile; onSave: (profile: Profile) => void; onClose: () => void }) {
  const [profile, setProfile] = useState(initial);
  const interests = ["AI", "Coding", "Business", "Robotics", "Science", "Design", "Environment"];
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Personalize recommendations">
    <div className="onboarding">
      <button className="modal-close" onClick={onClose}><X/></button>
      <div className="modal-icon"><Sparkles/></div><span className="eyebrow plain">YOUR MATCH PROFILE</span>
      <h2>Make Gridly yours.</h2><p>Tell us what you&apos;re looking for. Your answers stay on this device.</p>
      <div className="profile-grid"><label><span>Age or grade</span><input value={profile.age} onChange={(event) => setProfile({ ...profile, age: event.target.value })} placeholder="e.g. College sophomore"/></label><label><span>Country or city</span><input value={profile.location} onChange={(event) => setProfile({ ...profile, location: event.target.value })} placeholder="e.g. San Francisco"/></label></div>
      <label className="full-label"><span>Interests</span><div className="interest-grid">{interests.map((interest) => <button className={profile.interests.includes(interest) ? "selected" : ""} key={interest} onClick={() => setProfile({ ...profile, interests: profile.interests.includes(interest) ? profile.interests.filter((value) => value !== interest) : [...profile.interests, interest] })}>{interest}</button>)}</div></label>
      <label className="full-label"><span>Skills</span><input value={profile.skills} onChange={(event) => setProfile({ ...profile, skills: event.target.value })} placeholder="Python, pitching, product design..."/></label>
      <label className="full-label"><span>Main goal</span><select value={profile.goal} onChange={(event) => setProfile({ ...profile, goal: event.target.value })}><option>Explore and learn</option><option>Win prizes or funding</option><option>Build my résumé</option><option>Launch a startup</option></select></label>
      <div className="preference-row"><label><input type="checkbox" checked={profile.onlineOnly} onChange={(event) => setProfile({ ...profile, onlineOnly: event.target.checked })}/> Prefer online opportunities</label><label><input type="checkbox" checked={profile.freeOnly} onChange={(event) => setProfile({ ...profile, freeOnly: event.target.checked })}/> Prefer free opportunities</label></div>
      <button className="modal-primary" onClick={() => onSave(profile)}>Show my best matches <ArrowRight size={17}/></button>
    </div>
  </div>;
}

export default function GridlyApp({ opportunities, organizations }: { opportunities: Opportunity[]; organizations: { name: string; source: string }[] }) {
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [multiFilters, setMultiFilters] = useState<MultiFilters>(defaultMultiFilters);
  const [sort, setSort] = useState("Best match");
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [searchInterpretation, setSearchInterpretation] = useState("");
  const [limit, setLimit] = useState(18);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [rotationSeed, setRotationSeed] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [saved, toggleSaved] = useLocalList("gridly-saved");
  const [applied, toggleApplied] = useLocalList("gridly-applied");
  const [reminders, toggleReminder] = useLocalList("gridly-reminders");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gridly-profile");
      if (stored) setProfile({ ...emptyProfile, ...JSON.parse(stored) }); else setTimeout(() => setShowOnboarding(true), 650);
    } catch { setShowOnboarding(true); }
  }, []);

  useEffect(() => setRotationSeed(Math.floor(Math.random() * 10000)), []);

  const filtered = useMemo(() => {
    const now = new Date();
    const deadlineLimit = filters.deadline === "This week" ? 7 : filters.deadline === "This month" ? 31 : filters.deadline === "Next 3 months" ? 93 : Infinity;
    const prizeLimit = filters.prize === "$1,000+" ? 1000 : filters.prize === "$10,000+" ? 10000 : filters.prize === "$100,000+" ? 100000 : 0;
    const eligibility = filters.eligibility.toLowerCase();
    const results = opportunities.filter((item) => {
      const haystack = [item.title, item.organizer, item.type, item.topic, ...(item.topics ?? []), item.summary, ...item.eligibility].join(" ").toLowerCase();
      const left = item.deadline ? Math.ceil((new Date(`${item.deadline}T23:59:59`).getTime() - now.getTime()) / 86400000) : Infinity;
      const ageMatch = matchesAge(item, filters.age);
      const multiAgeMatch = !multiFilters.ages.length || multiFilters.ages.some((age) => matchesAge(item, age));
      const multiTypeMatch = !multiFilters.types.length || multiFilters.types.includes(item.type);
      const multiTopicMatch = !multiFilters.topics.length || multiFilters.topics.some((topic) => [item.topic, ...(item.topics ?? [])].some((itemTopic) => includes(itemTopic, topic)));
      const multiLocationMatch = !multiFilters.locations.length || multiFilters.locations.some((location) => includes(`${item.location} ${item.format}`, location));
      return item.status !== "expired"
        && multiFilters.statuses.includes(item.status as "active" | "upcoming")
        && (!activeCategories.length || activeCategories.includes(categoryFor(item)))
        && multiTypeMatch
        && multiAgeMatch
        && multiTopicMatch
        && multiLocationMatch
        && (!multiFilters.formats.length || multiFilters.formats.includes(item.format))
        && (!committedQuery || committedQuery.toLowerCase().split(/\s+/).every((term) => haystack.includes(term)))
        && (filters.type === "All types" || item.type === filters.type)
        && (filters.topic === "All topics" || [item.topic, ...(item.topics ?? [])].some((topic) => includes(topic, filters.topic)))
        && (filters.eligibility === "Everyone" || (eligibility === "beginner-friendly" ? item.beginnerFriendly : haystack.includes(eligibility.replace("students", "student"))))
        && (filters.format === "Any format" || item.format === filters.format)
        && (filters.location === "Anywhere" || includes(`${item.location} ${item.format}`, filters.location))
        && (!filters.freeOnly || item.cost === "Free")
        && ageMatch
        && (!filters.noExperience || experienceLabel(item) === "No experience needed")
        && (!filters.worldwide || /worldwide|all countries|online/.test(`${item.location} ${haystack}`.toLowerCase()))
        && (filters.prizeType === "Any reward" || rewardType(item) === filters.prizeType)
        && left >= 0 && left <= deadlineLimit
        && (item.prizeAmount ?? 0) >= prizeLimit
        && (filters.participation === "Solo or team" || (filters.participation === "Team allowed" ? item.teamAllowed === true : item.soloAllowed === true));
    });
    return results.sort((a, b) => {
      if (sort === "Nearest deadline") return daysLeft(a.deadline) - daysLeft(b.deadline);
      if (sort === "Biggest prize") return (b.prizeAmount ?? 0) - (a.prizeAmount ?? 0);
      if (sort === "Newest") return b.verifiedAt.localeCompare(a.verifiedAt);
      if (sort === "Beginner-friendly") return Number(b.beginnerFriendly) - Number(a.beginnerFriendly);
      const aHybrid = matchScore(a, profile) * 2.2 + Math.min(popularityScore(a), 130);
      const bHybrid = matchScore(b, profile) * 2.2 + Math.min(popularityScore(b), 130);
      return bHybrid - aHybrid || daysLeft(a.deadline) - daysLeft(b.deadline);
    });
  }, [opportunities, committedQuery, filters, multiFilters, sort, profile, activeCategories]);

  const closestMatches = useMemo(() => {
    if (filtered.length) return filtered;
    const now = new Date();
    const requestedAges = [...multiFilters.ages, ...(filters.age === "Any age" ? [] : [filters.age])];
    const open = opportunities.filter((item) => item.status !== "expired" && (!item.deadline || new Date(`${item.deadline}T23:59:59`) >= now));
    const ageCompatible = requestedAges.length ? open.filter((item) => requestedAges.some((age) => matchesAge(item, age))) : open;
    const candidates = ageCompatible.length ? ageCompatible : open;

    const score = (item: Opportunity) => {
      const haystack = detailText(item);
      let value = matchScore(item, profile) + popularityScore(item) / 10;
      if (!multiFilters.types.length || multiFilters.types.includes(item.type)) value += 24;
      if (!multiFilters.topics.length || multiFilters.topics.some((topic) => [item.topic, ...(item.topics ?? [])].some((itemTopic) => includes(itemTopic, topic)))) value += 18;
      if (!multiFilters.locations.length || multiFilters.locations.some((location) => includes(`${item.location} ${item.format}`, location))) value += 16;
      if (!multiFilters.formats.length || multiFilters.formats.includes(item.format)) value += 16;
      if (!activeCategories.length || activeCategories.includes(categoryFor(item))) value += 14;
      if (!committedQuery || committedQuery.toLowerCase().split(/\s+/).some((term) => haystack.includes(term))) value += 12;
      if (!filters.freeOnly || item.cost === "Free") value += 10;
      if (!filters.noExperience || experienceLabel(item) === "No experience needed") value += 8;
      if (filters.prizeType === "Any reward" || rewardType(item) === filters.prizeType) value += 8;
      return value;
    };

    return [...candidates].sort((a, b) => score(b) - score(a) || daysLeft(a.deadline) - daysLeft(b.deadline));
  }, [opportunities, filtered, filters, multiFilters, profile, activeCategories, committedQuery]);

  const showingClosest = filtered.length === 0;
  const displayedResults = showingClosest ? closestMatches : filtered;

  const active = opportunities.filter((item) => item.status !== "expired" && daysLeft(item.deadline) >= 0);
  const closing = [...active].filter((item) => daysLeft(item.deadline) <= 30).sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline)).slice(0, 5);
  const recommended = [...active].sort((a, b) => matchScore(b, profile) - matchScore(a, profile)).slice(0, 5);
  const beginner = active.filter((item) => item.beginnerFriendly).slice(0, 5);
  const bigPrizes = [...active].filter((item) => item.prizeAmount).sort((a, b) => (b.prizeAmount ?? 0) - (a.prizeAmount ?? 0)).slice(0, 5);
  const online = active.filter((item) => item.format === "Online").slice(0, 5);
  const categoryCounts = Object.fromEntries(categories.map(({ name }) => [name, name === "All opportunities" ? active.length : active.filter((item) => categoryFor(item) === name).length]));
  const watchAlerts = [...active].filter((item) => saved.includes(item.id) && reminders.includes(item.id) && daysLeft(item.deadline) <= 30).sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline));
  const popularNow = diversify([...active].sort((a, b) => (popularityScore(b) + matchScore(b, profile)) - (popularityScore(a) + matchScore(a, profile))), rotationSeed, 6);
  const toggleWatch = (id: string) => {
    const adding = !saved.includes(id);
    toggleSaved(id);
    if (adding && !reminders.includes(id)) toggleReminder(id);
  };
  const saveProfile = (next: Profile) => { setProfile(next); localStorage.setItem("gridly-profile", JSON.stringify(next)); setShowOnboarding(false); };
  const runSmartSearch = () => {
    const parsed = interpretNaturalQuery(query);
    setFilters(parsed.patch);
    setMultiFilters(parsed.multi);
    setActiveCategories(parsed.categories);
    setCommittedQuery(parsed.keywords);
    setSearchInterpretation(parsed.understood);
    setSort("Best match");
    setLimit(18);
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" });
  };
  const quickExplore = (choice: string) => {
    setActiveCategories([]);
    setMultiFilters(defaultMultiFilters);
    setLimit(18);
    if (choice === "Beginner AI") { setQuery("Beginner AI opportunities"); setCommittedQuery(""); setActiveCategories(["Tech & AI"]); setMultiFilters({ ...defaultMultiFilters, topics: ["Machine Learning/AI"] }); setFilters({ ...defaultFilters, eligibility: "Beginner-friendly" }); }
    if (choice === "Online hackathons") { setQuery(""); setCommittedQuery(""); setFilters(defaultFilters); setMultiFilters({ ...defaultMultiFilters, types: ["Hackathon"], formats: ["Online"] }); }
    if (choice === "Big prizes") { setQuery(""); setCommittedQuery(""); setFilters(defaultFilters); setSort("Biggest prize"); }
    if (choice === "Grants for startups") { setQuery("startup"); setCommittedQuery("startup"); setFilters(defaultFilters); setMultiFilters({ ...defaultMultiFilters, types: ["Grant"] }); }
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" });
  };
  const categoryTitle = activeCategories.length ? activeCategories.join(" + ") : "All opportunities";
  const toggleCategory = (name: string) => {
    setActiveCategories((current) => name === "All opportunities" ? [] : current.includes(name) ? current.filter((value) => value !== name) : [...current, name]);
    setLimit(18);
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" });
  };

  return <div className="app-shell">
    <SideNav open={sideOpen} onClose={() => setSideOpen(false)} count={active.length} savedCount={saved.length} alertCount={watchAlerts.length}/>
    <div className="app-main">
    <AppHeader savedCount={saved.length} alerts={watchAlerts} onProfile={() => setShowOnboarding(true)} onMenu={() => setSideOpen(true)} count={active.length} query={query} onQuery={setQuery} onSearch={runSmartSearch}/>
    <main id="top">
      <Hero count={active.length} query={query} onQuery={setQuery} onQuick={quickExplore} onSearch={runSmartSearch} interpretation={searchInterpretation}/>
      <div className="trust-strip"><span><Check/> Direct official links</span><span><Check/> Expired listings hidden</span><span><Check/> Source + verification date on every card</span></div>

      <section className="popular-section" id="popular"><div className="section-heading"><div><span className="kicker">RANKED FOR YOU</span><h2>Popular right now</h2><p>Ranked using real participation, organizer reach, reward size, momentum, and your Gridly profile. Picks rotate on each visit for a more diverse feed.</p></div><button onClick={() => setRotationSeed((current) => current + 1)}>Shuffle picks <Sparkles size={15}/></button></div><div className="popular-grid">{popularNow.map((item, index) => <PopularCard key={item.id} item={item} rank={index + 1} profile={profile} saved={saved.includes(item.id)} onSave={() => toggleWatch(item.id)}/>)}</div></section>

      <section className="market-section" id="announcements"><div className="market-intro"><div><span className="kicker urgent">FRESH ANNOUNCEMENTS</span><h2>Big opportunities just opened.</h2></div><p>Recognizable programs from NASA and Society for Science, checked directly against their official announcements—not copied from an aggregator.</p></div><div className="market-grid">{marketUpdates.map((update) => <MarketUpdateCard key={update.title} update={update}/>)}</div></section>

      <section className="explore-hub" id="explore"><div className="explore-intro"><div><span className="kicker">EXPLORE OPPORTUNITIES</span><h2>Pick a path. Combine what fits.</h2></div><p>Select one or several categories. Gridly combines them with your search, location, status, topic, and eligibility preferences.</p></div><div className="category-grid">{categories.map(({ name, icon: Icon }) => { const selected = name === "All opportunities" ? !activeCategories.length : activeCategories.includes(name); return <button key={name} className={selected ? "category-card active" : "category-card"} onClick={() => toggleCategory(name)}><Icon/><span><b>{name}</b><small>{categoryCounts[name]} open opportunities</small></span><i>{selected ? <Check size={14}/> : String(categoryCounts[name]).padStart(2, "0")}</i></button>; })}</div></section>

      <section className="collection-section first" id="collections"><div className="section-heading"><div><span className="kicker urgent">ACT FAST</span><h2>Closing soon</h2><p>Real deadlines. No stale listings.</p></div><button onClick={() => { setFilters({ ...defaultFilters, deadline: "This month" }); document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }); }}>View all <ArrowRight size={15}/></button></div><div className="card-row">{closing.map((item) => <MiniCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={() => toggleWatch(item.id)}/>)}</div></section>
      <section className="collection-section tinted" id="best-for-you"><div className="section-heading"><div><span className="kicker">PERSONALIZED</span><h2>Best for you</h2><p>{profile.interests.length ? `Based on ${profile.interests.join(", ")}` : "Tune your profile to improve these matches."}</p></div><button onClick={() => setShowOnboarding(true)}>Edit profile <Target size={15}/></button></div><div className="card-row">{recommended.map((item) => <MiniCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={() => toggleWatch(item.id)}/>)}</div></section>

      <section className="discover" id="discover">
        <div className="discover-head"><div><span className="kicker">HYBRID-RANKED RESULTS</span><h2>{categoryTitle}</h2><p>{showingClosest ? `${displayedResults.length} closest verified matches — your exact combination is not available yet` : `${filtered.length} matches ranked by profile fit, search relevance, and live popularity`}</p></div><div className="sort-wrap"><button className="filter-trigger" onClick={() => setMobileFilters(true)}><Filter size={16}/> Filters</button><label>Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option>Best match</option><option>Nearest deadline</option><option>Biggest prize</option><option>Newest</option><option>Beginner-friendly</option></select></label></div></div>
        <SmartFilterBar multi={multiFilters} onChange={(next) => { setMultiFilters(next); setLimit(18); }}/>
        <div className="quick-filter-bar"><button className={filters.age === "Any age" ? "active" : ""} onClick={() => setFilters({ ...filters, age: "Any age" })}>Any age</button><button className={filters.eligibility === "Beginner-friendly" ? "active" : ""} onClick={() => setFilters({ ...filters, eligibility: filters.eligibility === "Beginner-friendly" ? "Everyone" : "Beginner-friendly" })}>Beginner-friendly</button><button className={filters.noExperience ? "active" : ""} onClick={() => setFilters({ ...filters, noExperience: !filters.noExperience })}>No experience needed</button><button className={filters.freeOnly ? "active" : ""} onClick={() => setFilters({ ...filters, freeOnly: !filters.freeOnly })}>Free</button><button className={filters.format === "Online" ? "active" : ""} onClick={() => setFilters({ ...filters, format: filters.format === "Online" ? "Any format" : "Online" })}>Online</button><button className={filters.worldwide ? "active" : ""} onClick={() => setFilters({ ...filters, worldwide: !filters.worldwide })}>Worldwide</button><label>Prize type<select value={filters.prizeType} onChange={(event) => setFilters({ ...filters, prizeType: event.target.value })}><option>Any reward</option><option>Cash funding</option><option>Scholarship</option><option>Mentorship</option><option>Certificate</option><option>Recognition & benefits</option></select></label></div>
        <div className="discover-layout"><FilterPanel filters={filters} onChange={(next) => { setFilters(next); setLimit(18); }} onClear={() => { setFilters(defaultFilters); setMultiFilters(defaultMultiFilters); setActiveCategories([]); setCommittedQuery(""); setQuery(""); setSearchInterpretation(""); }}/><div className="feed">
          {showingClosest && <div className="closest-match-note"><Sparkles/><span><b>No dead ends.</b> These are the closest age-compatible verified options. Adjust one filter for a tighter match.</span><button onClick={() => { setFilters(defaultFilters); setMultiFilters(defaultMultiFilters); setActiveCategories([]); setCommittedQuery(""); setQuery(""); setSearchInterpretation(""); }}>Reset filters</button></div>}
          {displayedResults.slice(0, limit).map((item) => <OpportunityCard key={item.id} item={item} saved={saved.includes(item.id)} applied={applied.includes(item.id)} reminded={reminders.includes(item.id)} onSave={() => toggleWatch(item.id)} onApply={() => toggleApplied(item.id)} onRemind={() => toggleReminder(item.id)}/>) }
          {limit < displayedResults.length && <button className="load-more" onClick={() => setLimit((current) => current + 18)}>Load 18 more <span>{displayedResults.length - limit} remaining</span></button>}
        </div></div>
      </section>

      <section className="curated-grid"><div><span className="kicker">START HERE</span><h2>Built for every ambition.</h2><p>Choose a lane or explore them all.</p></div>{[{ title: "Best for beginners", list: beginner, icon: Sparkles }, { title: "Big prizes", list: bigPrizes, icon: CircleDollarSign }, { title: "100% online", list: online, icon: Globe2 }].map(({ title, list, icon: Icon }) => <article className="curated-card" key={title}><Icon/><h3>{title}</h3><p>{list.length ? `${list.length}+ verified picks ready to explore` : "New picks coming soon"}</p><button onClick={() => { if (title.includes("beginner")) setFilters({ ...defaultFilters, eligibility: "Beginner-friendly" }); if (title.includes("prizes")) setSort("Biggest prize"); if (title.includes("online")) setFilters({ ...defaultFilters, format: "Online" }); document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }); }}>Explore <ArrowRight size={15}/></button></article>)}</section>

      <section className="organizations"><div className="section-heading"><div><span className="kicker">SOURCE FIRST</span><h2>Featured organizations</h2><p>Opportunities link straight to the organizer or official platform.</p></div></div><div className="logo-cloud">{organizations.map((organization) => <span key={organization.name}>{organization.name}</span>)}</div></section>

      <section className="how"><div><span className="kicker">A SIMPLE SYSTEM</span><h2>Discover → Save → Apply → Win</h2></div><div className="steps">{[["01", "Discover", "Use deep filters to find what actually fits."], ["02", "Save", "Build a shortlist and switch on reminders."], ["03", "Apply", "Open the official source and track your status."], ["04", "Win", "Ship the project, pitch, or application."]].map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    </main>
    <footer><div className="brand"><span className="brand-mark">G</span><span>Gridly</span></div><p>Quality opportunities. Official sources. Zero invented listings.</p><div><Link href="/admin">Admin</Link><Link href="/dashboard">Dashboard</Link></div></footer>
    </div>
    {mobileFilters && <div className="mobile-filter-backdrop"><FilterPanel mobile filters={filters} onChange={setFilters} onClear={() => { setFilters(defaultFilters); setMultiFilters(defaultMultiFilters); setActiveCategories([]); setCommittedQuery(""); setQuery(""); setSearchInterpretation(""); }} close={() => setMobileFilters(false)}/></div>}
    {showOnboarding && <Onboarding initial={profile} onSave={saveProfile} onClose={() => setShowOnboarding(false)}/>} 
  </div>;
}
