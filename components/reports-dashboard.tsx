"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type BudgetItem = { id: string; name: string; category: string; planned: number; actual: number; paymentStatus: string; vendor: string };
type Plan = { id: string; name: string; partner: string; date: string; location: string; budget: number; guestCount: number; items: BudgetItem[] };
type RecordItem = { id: string; kind: string; data: Record<string, unknown> };
const idr = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
const val = (data: Record<string, unknown>, key: string) => String(data[key] ?? "");

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map(row => row.map(value => '"' + String(value ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export default function ReportsDashboard() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const active = plans.find(plan => plan.id === planId);
  useEffect(() => {
    fetch("/api/plans", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Tidak dapat memuat wedding plan.");
      const data = await response.json(); setPlans(data); setPlanId(data[0]?.id ?? "");
    }).catch(err => setError(err.message)).finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (!planId) { setRecords([]); return; }
    fetch("/api/records?planId=" + encodeURIComponent(planId), { cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Tidak dapat memuat data laporan."); setRecords(await response.json()); })
      .catch(err => setError(err.message));
  }, [planId]);
  const vendors = records.filter(record => record.kind === "VENDOR");
  const guests = records.filter(record => record.kind === "GUEST");
  const tasks = records.filter(record => record.kind === "TASK");
  const payments = records.filter(record => record.kind === "PAYMENT");
  const totals = useMemo(() => {
    const planned = active?.items.reduce((sum, item) => sum + Number(item.planned), 0) ?? 0;
    const actual = active?.items.reduce((sum, item) => sum + Number(item.actual), 0) ?? 0;
    const paid = active?.items.filter(item => item.paymentStatus === "Lunas").length ?? 0;
    return { planned, actual, remaining: (active?.budget ?? 0) - actual, paid };
  }, [active]);

  function exportAll() {
    if (!active) return;
    const rows: unknown[][] = [["Section", "Name", "Category / Type", "Amount / Status", "Date / Contact", "Notes"]];
    active.items.forEach(item => rows.push(["Budget", item.name, item.category, item.planned, item.vendor, item.paymentStatus + " | actual " + item.actual]));
    vendors.forEach(record => rows.push(["Vendor", val(record.data,"name"), val(record.data,"category"), val(record.data,"quote"), val(record.data,"phone"), val(record.data,"status")]));
    guests.forEach(record => rows.push(["Guest", val(record.data,"name"), val(record.data,"group"), val(record.data,"pax"), val(record.data,"phone"), val(record.data,"rsvp")]));
    tasks.forEach(record => rows.push(["Checklist", val(record.data,"title"), val(record.data,"category"), val(record.data,"priority"), val(record.data,"dueDate"), val(record.data,"status")]));
    payments.forEach(record => rows.push(["Payment", val(record.data,"budgetItemId"), val(record.data,"method"), val(record.data,"amount"), val(record.data,"date"), val(record.data,"notes")]));
    downloadCsv("wedplan-report-" + active.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".csv", rows);
  }

  if (busy) return <main className="module-page"><p>Memuat laporan...</p></main>;
  return <main className="module-page">
    <header className="module-top"><Link href="/" className="module-brand">♥ wedplan<span>.</span></Link><nav><Link href="/">Dashboard</Link><Link href="/vendors">Vendors</Link><Link href="/guests">Guests</Link><Link href="/checklist">Checklist</Link><Link href="/payments">Payments</Link><Link href="/reports">Reports</Link></nav></header>
    <section className="module-heading"><div><span className="eyebrow">YOUR WEDDING AT A GLANCE</span><h1>Reports & overview</h1><p>Ringkasan anggaran, pembayaran, vendor, tamu, dan checklist.</p></div><div className="report-actions"><button className="button button-soft" onClick={() => window.print()}>Print / Save PDF</button><button className="button button-dark" onClick={exportAll} disabled={!active}>Export Excel (CSV)</button></div></section>
    <section className="module-toolbar"><label>Wedding plan<select value={planId} onChange={event => setPlanId(event.target.value)}>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.partner || plan.name} · {plan.name}</option>)}</select></label><span>{active?.date || "Tanggal belum ditentukan"}</span></section>
    {error && <div className="module-error">{error}</div>}
    {!active ? <div className="module-empty">Belum ada wedding plan untuk dilaporkan.</div> : <>
      <section className="report-hero"><div><span className="eyebrow">WEDDING PLAN</span><h2>{active.partner || active.name}</h2><p>{active.name} · {active.location || "Lokasi belum ditentukan"} · {active.guestCount} estimasi tamu</p></div><div><small>Total budget</small><strong>{idr(active.budget)}</strong></div></section>
      <section className="report-stats">
        <article><small>Planned allocation</small><b>{idr(totals.planned)}</b></article>
        <article><small>Actual spending</small><b>{idr(totals.actual)}</b></article>
        <article><small>Budget remaining</small><b>{idr(totals.remaining)}</b></article>
        <article><small>Budget items paid</small><b>{totals.paid} / {active.items.length}</b></article>
      </section>
      <section className="report-section"><h2>Budget breakdown</h2><div className="module-table-wrap"><table className="module-table"><thead><tr><th>ITEM</th><th>KATEGORI</th><th>PLANNED</th><th>ACTUAL</th><th>STATUS</th></tr></thead><tbody>{active.items.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.category}</td><td>{idr(item.planned)}</td><td>{idr(item.actual)}</td><td>{item.paymentStatus}</td></tr>)}</tbody></table></div></section>
      <section className="report-grid">
        <article className="report-section"><h2>Vendors <span>{vendors.length}</span></h2>{vendors.map(item => <p key={item.id}><b>{val(item.data,"name")}</b><small>{val(item.data,"category")} · {val(item.data,"status")}</small></p>)}</article>
        <article className="report-section"><h2>Guests <span>{guests.length}</span></h2>{guests.map(item => <p key={item.id}><b>{val(item.data,"name")}</b><small>{val(item.data,"pax") || "1"} pax · {val(item.data,"rsvp")}</small></p>)}</article>
        <article className="report-section"><h2>Checklist <span>{tasks.length}</span></h2>{tasks.map(item => <p key={item.id}><b>{val(item.data,"title")}</b><small>{val(item.data,"dueDate")} · {val(item.data,"status")}</small></p>)}</article>
        <article className="report-section"><h2>Payments <span>{payments.length}</span></h2>{payments.map(item => <p key={item.id}><b>{idr(Number(item.data.amount) || 0)}</b><small>{val(item.data,"date")} · {val(item.data,"method")}</small></p>)}</article>
      </section>
    </>}
    <p className="report-footnote">CSV dapat dibuka menggunakan Microsoft Excel atau Google Sheets. Untuk PDF, gunakan Print lalu pilih Save as PDF pada dialog browser.</p>
  </main>;
}
