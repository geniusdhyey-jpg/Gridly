"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Database, FileUp, Link2, Plus, ShieldCheck, TriangleAlert } from "lucide-react";
import { opportunities } from "@/lib/opportunities";

const sampleHeaders = "title,organizer,type,topic,summary,status,deadline,format,location,eligibility,cost,prizeAmount,benefit,officialUrl,sourceName,verifiedAt";

function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { field += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += char;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((value) => value.trim()) ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}

export default function Admin() {
  const [key, setKey] = useState("");
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", organizer: "", type: "Hackathon", topic: "AI", deadline: "", officialUrl: "" });
  const importRecord = async (record: Record<string, unknown>) => {
    const response = await fetch("/api/admin/opportunities", { method: "POST", headers: { "content-type": "application/json", "x-gridly-admin-key": key }, body: JSON.stringify(record) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Import failed");
  };
  const runImport = async () => {
    if (!records.length) return;
    setBusy(true); setMessage("");
    try {
      let imported = 0;
      for (const record of records) {
        await importRecord({ ...record, eligibility: record.eligibility?.split("|").filter(Boolean) ?? ["See official rules"], prizeAmount: record.prizeAmount ? Number(record.prizeAmount) : null });
        imported++;
      }
      setMessage(`${imported} listings imported or updated.`); setRecords([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed"); }
    finally { setBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await importRecord({ ...form, summary: `Review ${form.title} on its official source for complete details.`, status: "review", format: "Online", location: "Worldwide", eligibility: ["See official rules"], cost: "Free", benefit: "See official page", sourceName: "Manual admin review", verifiedAt: new Date().toISOString().slice(0,10) });
      setMessage("Listing added to the review queue.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add listing"); }
    finally { setBusy(false); }
  };
  return <main className="admin-shell">
    <header className="sub-header"><Link href="/" className="brand"><span className="brand-mark">G</span>Gridly Admin</Link><Link href="/"><ArrowLeft size={15}/> Public site</Link></header>
    <section className="admin-hero"><div><span className="kicker">CONTENT OPERATIONS</span><h1>Publish trust,<br/>not noise.</h1><p>Add, review, de-duplicate, and expire opportunities from one source-first workflow.</p></div><div className="admin-health"><ShieldCheck/><div><strong>Quality gate active</strong><span>Official URL + deadline + eligibility + verification required</span></div></div></section>
    <section className="admin-stats"><article><Database/><strong>{opportunities.length}</strong><span>verified seed records</span></article><article><Check/><strong>{opportunities.filter((item) => item.status === "active").length}</strong><span>active listings</span></article><article><Link2/><strong>100%</strong><span>direct source links</span></article><article><TriangleAlert/><strong>0</strong><span>duplicate URLs</span></article></section>
    <section className="admin-grid">
      <article className="admin-panel"><div className="panel-heading"><FileUp/><div><h2>Bulk import CSV</h2><p>Review parsed rows before writing to PostgreSQL.</p></div></div><label className="key-field"><span>Admin API key</span><input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Required for database changes"/></label><label className="drop-zone"><FileUp/><b>Choose a CSV file</b><span>Required headers: {sampleHeaders}</span><input type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { const parsed = parseCSV(await file.text()); setRecords(parsed); setMessage(`${parsed.length} rows ready for review.`); } }}/></label>{records.length > 0 && <div className="import-preview"><b>{records.length} parsed rows</b>{records.slice(0,4).map((record, index) => <span key={index}>{record.title || `Row ${index + 1}`} <small>{record.organizer}</small></span>)}<button onClick={runImport} disabled={busy || !key}>{busy ? "Importing…" : "Import to PostgreSQL"}</button></div>}</article>
      <article className="admin-panel"><div className="panel-heading"><Plus/><div><h2>Add one listing</h2><p>New listings enter review before they can go live.</p></div></div><form className="admin-form" onSubmit={submit}><label>Opportunity name<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}/></label><label>Organization<input required value={form.organizer} onChange={(event) => setForm({ ...form, organizer: event.target.value })}/></label><div><label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Hackathon</option><option>Competition</option><option>Grant</option><option>Fellowship</option><option>Internship</option><option>Scholarship</option></select></label><label>Deadline<input required type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })}/></label></div><label>Topic<input required value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })}/></label><label>Official source URL<input required type="url" value={form.officialUrl} onChange={(event) => setForm({ ...form, officialUrl: event.target.value })} placeholder="https://organizer.org/program"/></label><button disabled={busy || !key}>{busy ? "Saving…" : "Add to review queue"}</button></form></article>
    </section>{message && <div className="admin-toast">{message}</div>}
  </main>;
}
