"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Bell, Bookmark, CheckCircle2, Clock3, Inbox, Trophy } from "lucide-react";
import { opportunities, type Opportunity } from "@/lib/opportunities";

const read = (key: string) => {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as string[]; } catch { return []; }
};

const days = (item: Opportunity) => item.deadline ? Math.ceil((new Date(`${item.deadline}T23:59:59`).getTime() - Date.now()) / 86400000) : Infinity;

export default function Dashboard() {
  const [tab, setTab] = useState("Watchlist");
  const [saved, setSaved] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [reminders, setReminders] = useState<string[]>([]);
  const [browserAlerts, setBrowserAlerts] = useState(false);
  useEffect(() => {
    setSaved(read("gridly-saved")); setApplied(read("gridly-applied")); setReminders(read("gridly-reminders"));
    setBrowserAlerts(typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem("gridly-browser-alerts") === "on");
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (["Watchlist", "Applied", "Upcoming deadlines", "Completed"].includes(requestedTab ?? "")) setTab(requestedTab!);
  }, []);
  const upcoming = useMemo(() => [...opportunities].filter((item) => reminders.includes(item.id) && days(item) >= 0).sort((a, b) => days(a) - days(b)), [reminders]);
  useEffect(() => {
    const urgent = upcoming.find((item) => days(item) <= 7);
    if (!browserAlerts || !urgent || Notification.permission !== "granted") return;
    const alertKey = `${urgent.id}:${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem("gridly-last-browser-alert") === alertKey) return;
    new Notification(`${urgent.title} is closing soon`, { body: `${days(urgent)} days left. Open Gridly to review the deadline and official source.` });
    localStorage.setItem("gridly-last-browser-alert", alertKey);
  }, [browserAlerts, upcoming]);
  const collection = tab === "Watchlist" ? opportunities.filter((item) => saved.includes(item.id)) : tab === "Applied" ? opportunities.filter((item) => applied.includes(item.id)) : tab === "Upcoming deadlines" ? upcoming : [];
  const stats = [{ label: "Watchlist", value: saved.length, icon: Bookmark }, { label: "Applied", value: applied.length, icon: CheckCircle2 }, { label: "Upcoming deadlines", value: upcoming.length, icon: Bell }, { label: "Completed", value: 0, icon: Trophy }];
  const enableBrowserAlerts = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setBrowserAlerts(enabled);
    localStorage.setItem("gridly-browser-alerts", enabled ? "on" : "off");
    if (enabled) new Notification("Gridly alerts are on", { body: "We’ll notify you about watched opportunities while Gridly is open." });
  };
  return <main className="dashboard-shell">
    <header className="sub-header"><Link href="/" className="brand"><span className="brand-mark">G</span>Gridly</Link><Link href="/"><ArrowLeft size={15}/> Back to discovery</Link></header>
    <section className="dashboard-hero"><span className="kicker">MY WATCHLIST</span><h1>Keep momentum visible.</h1><p>Watch promising listings, get deadline alerts, and keep applications moving.</p></section>
    <section className="notification-console"><div><Bell/><span><b>Opportunity alerts</b><small>{browserAlerts ? "Browser notifications are enabled on this device." : "In-app deadline alerts are on. Enable browser alerts for an extra reminder while Gridly is open."}</small></span></div><button className={browserAlerts ? "enabled" : ""} onClick={enableBrowserAlerts}>{browserAlerts ? "Browser alerts on" : "Enable browser alerts"}</button></section>
    <section className="stat-grid">{stats.map(({ label, value, icon: Icon }) => <button key={label} className={tab === label ? "stat-card active" : "stat-card"} onClick={() => setTab(label)}><Icon/><strong>{value}</strong><span>{label}</span></button>)}</section>
    <section className="dashboard-list"><div className="section-heading"><div><span className="kicker">TRACKER</span><h2>{tab}</h2><p>{collection.length} opportunities</p></div></div>
      {collection.length ? <div className="tracking-list">{collection.map((item) => <article key={item.id}><div className="tracking-icon">{item.organizer.slice(0,2).toUpperCase()}</div><div><span className="type-pill">{item.type}</span><h3>{item.title}</h3><p>{item.organizer} · {item.format} · {item.location}</p></div><div className="tracking-deadline"><Clock3/><strong>{days(item) === Infinity ? "Open" : `${days(item)} days`}</strong><span>{item.deadline ?? "See source"}</span></div><a href={item.officialUrl} target="_blank" rel="noreferrer">Official page <ArrowUpRight/></a></article>)}</div> : <div className="empty-state"><Inbox/><h3>Nothing here yet</h3><p>Add an opportunity to your watchlist or mark it applied from Explore.</p><Link href="/#explore">Explore opportunities</Link></div>}
    </section>
  </main>;
}
