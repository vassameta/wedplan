"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Kind = "VENDOR" | "GUEST" | "TASK" | "PAYMENT";
type Plan = { id: string; name: string; partner: string; budget: number; items: { id: string; name: string; planned: number; actual: number; paymentStatus: string }[] };
type RecordItem = { id: string; kind: Kind; data: Record<string, unknown>; updatedAt: string };
type Field = { key: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea"; options?: string[]; required?: boolean; placeholder?: string };

const configs: Record<Kind, { title: string; eyebrow: string; description: string; singular: string; fields: Field[]; columns: string[] }> = {
  VENDOR: {
    title: "Vendor management", eyebrow: "YOUR WEDDING PARTNERS", description: "Simpan kontak, penawaran, dan status vendor dalam satu tempat.", singular: "vendor",
    fields: [
      { key: "name", label: "Nama vendor", required: true, placeholder: "Contoh: Seruni Decoration" },
      { key: "category", label: "Kategori", type: "select", options: ["Venue", "Catering", "Dekorasi", "Fotografi & Videografi", "Busana & Makeup", "Hiburan", "Undangan & Souvenir", "Transportasi", "Lainnya"] },
      { key: "contactName", label: "Nama kontak" }, { key: "phone", label: "Nomor telepon" }, { key: "email", label: "Email", type: "text" },
      { key: "quote", label: "Penawaran (IDR)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Prospek", "Dihubungi", "Negosiasi", "Dipilih", "Kontrak", "Tidak dipilih"] },
      { key: "notes", label: "Catatan", type: "textarea" }
    ], columns: ["name", "category", "phone", "quote", "status"]
  },
  GUEST: {
    title: "Guest list", eyebrow: "THE PEOPLE WE LOVE", description: "Kelola daftar undangan, RSVP, jumlah tamu, dan kebutuhan khusus.", singular: "tamu",
    fields: [
      { key: "name", label: "Nama tamu / keluarga", required: true },
      { key: "group", label: "Kelompok", type: "select", options: ["Keluarga mempelai 1", "Keluarga mempelai 2", "Teman", "Kantor", "VIP", "Lainnya"] },
      { key: "phone", label: "Nomor telepon" },
      { key: "pax", label: "Jumlah orang", type: "number" },
      { key: "invitation", label: "Undangan", type: "select", options: ["Belum dikirim", "Dikirim", "Diterima"] },
      { key: "rsvp", label: "Konfirmasi kehadiran", type: "select", options: ["Belum konfirmasi", "Hadir", "Tidak hadir", "Mungkin"] },
      { key: "meal", label: "Preferensi makanan / alergi" }, { key: "table", label: "Nomor meja" }, { key: "notes", label: "Catatan", type: "textarea" }
    ], columns: ["name", "group", "pax", "invitation", "rsvp"]
  },
  TASK: {
    title: "Wedding checklist", eyebrow: "ONE STEP AT A TIME", description: "Atur pekerjaan, penanggung jawab, prioritas, dan tenggat persiapan.", singular: "task",
    fields: [
      { key: "title", label: "Nama pekerjaan", required: true, placeholder: "Contoh: Booking venue" },
      { key: "category", label: "Kategori", type: "select", options: ["Venue", "Catering", "Dekorasi", "Dokumentasi", "Busana & Makeup", "Administrasi", "Undangan", "Lainnya"] },
      { key: "dueDate", label: "Deadline", type: "date" },
      { key: "priority", label: "Prioritas", type: "select", options: ["Rendah", "Normal", "Tinggi", "Urgent"] },
      { key: "status", label: "Status", type: "select", options: ["Belum mulai", "Dikerjakan", "Menunggu", "Selesai"] },
      { key: "assignee", label: "Penanggung jawab" }, { key: "notes", label: "Catatan", type: "textarea" }
    ], columns: ["title", "category", "dueDate", "priority", "status", "assignee"]
  },
  PAYMENT: {
    title: "Payment tracking", eyebrow: "EVERY RUPIAH ACCOUNTED FOR", description: "Catat DP, cicilan, dan pelunasan. Total transaksi otomatis memperbarui actual budget item.", singular: "pembayaran",
    fields: [
      { key: "budgetItemId", label: "Item budget", type: "select", required: true },
      { key: "amount", label: "Nominal pembayaran (IDR)", type: "number", required: true },
      { key: "date", label: "Tanggal pembayaran", type: "date", required: true },
      { key: "method", label: "Metode", type: "select", options: ["Transfer bank", "Tunai", "Kartu", "E-wallet", "Lainnya"] },
      { key: "reference", label: "Referensi / bukti transaksi" },
      { key: "notes", label: "Catatan", type: "textarea" }
    ], columns: ["budgetItemId", "amount", "date", "method", "reference"]
  }
};

const money = (value: unknown) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const textValue = (value: unknown) => value === undefined || value === null || value === "" ? "—" : String(value);

export default function PlannerManager({ kind }: { kind: Kind }) {
  const config = configs[kind];
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const activePlan = plans.find(plan => plan.id === planId);
  const itemOptions = activePlan?.items ?? [];

  useEffect(() => {
    fetch("/api/plans", { cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Gagal memuat wedding plan."); return response.json(); })
      .then((data: Plan[]) => { setPlans(data); setPlanId(data[0]?.id ?? ""); })
      .catch(err => setError(err.message || "Gagal memuat data."))
      .finally(() => setLoading(false));
  }, []);

  async function loadRecords() {
    if (!planId) { setRecords([]); return; }
    const response = await fetch(`/api/records?planId=${encodeURIComponent(planId)}&kind=${kind}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Gagal memuat data.");
    setRecords(await response.json());
  }

  useEffect(() => {
    loadRecords().catch(err => setError(err.message || "Gagal memuat data."));
  }, [planId, kind]);

  function openNew() {
    const initial: Record<string, string> = {};
    for (const field of config.fields) {
      if (field.key === "date") initial[field.key] = new Date().toISOString().slice(0, 10);
      else if (field.key === "pax") initial[field.key] = "1";
      else if (field.key === "status") initial[field.key] = kind === "TASK" ? "Belum mulai" : kind === "VENDOR" ? "Prospek" : "";
      else if (field.key === "rsvp") initial[field.key] = "Belum konfirmasi";
      else if (field.key === "invitation") initial[field.key] = "Belum dikirim";
      else initial[field.key] = "";
    }
    setEditing(null); setForm(initial); setError("");
  }

  function openEdit(record: RecordItem) {
    const values: Record<string, string> = {};
    for (const field of config.fields) values[field.key] = textValue(record.data[field.key]) === "—" ? "" : String(record.data[field.key]);
    setEditing(record); setForm(values); setError("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planId) return;
    setSaving(true); setError("");
    const data: Record<string, unknown> = { ...form };
    for (const key of ["quote", "pax", "amount"]) if (key in data) data[key] = Number(data[key]) || 0;
    try {
      const response = await fetch(editing ? `/api/records/${editing.id}` : "/api/records", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { data } : { planId, kind, data })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan data.");
      setEditing(null); setForm({});
      await loadRecords();
      if (kind === "PAYMENT") {
        const plansResponse = await fetch("/api/plans", { cache: "no-store" });
        if (plansResponse.ok) setPlans(await plansResponse.json());
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan data."); }
    finally { setSaving(false); }
  }

  async function remove(record: RecordItem) {
    if (!window.confirm(`Hapus data ${config.singular} ini?`)) return;
    const response = await fetch(`/api/records/${record.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Gagal menghapus data."); return; }
    await loadRecords();
    if (kind === "PAYMENT") {
      const plansResponse = await fetch("/api/plans", { cache: "no-store" });
      if (plansResponse.ok) setPlans(await plansResponse.json());
    }
  }

  const visible = useMemo(() => records.filter(record => config.columns.map(key => {
    if (key === "budgetItemId") return itemOptions.find(item => item.id === record.data[key])?.name ?? "";
    return String(record.data[key] ?? "");
  }).join(" ").toLowerCase().includes(search.toLowerCase())), [records, search, config, itemOptions]);

  function fieldInput(field: Field) {
    const common = { value: form[field.key] ?? "", required: field.required, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(old => ({ ...old, [field.key]: event.target.value })) };
    if (field.key === "budgetItemId") return <select {...common}><option value="">Pilih item budget</option>{itemOptions.map(item => <option key={item.id} value={item.id}>{item.name} · {money(item.planned)}</option>)}</select>;
    if (field.type === "select") return <select {...common}><option value="">Pilih...</option>{(field.options ?? []).map(option => <option key={option}>{option}</option>)}</select>;
    if (field.type === "textarea") return <textarea {...common} rows={3} placeholder={field.placeholder ?? ""}/>;
    return <input {...common} type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} placeholder={field.placeholder ?? ""}/>;
  }

  function cellValue(record: RecordItem, key: string) {
    if (key === "budgetItemId") return itemOptions.find(item => item.id === record.data[key])?.name ?? "Item dihapus";
    if (["amount", "quote"].includes(key)) return money(record.data[key]);
    if (key === "dueDate" || key === "date") return textValue(record.data[key]);
    return textValue(record.data[key]);
  }

  if (loading) return <main className="module-page"><p>Memuat workspace...</p></main>;

  return <main className="module-page">
    <header className="module-top"><Link href="/" className="module-brand">♥ wedplan<span>.</span></Link><nav><Link href="/">Dashboard</Link><Link href="/vendors">Vendors</Link><Link href="/guests">Guests</Link><Link href="/checklist">Checklist</Link><Link href="/payments">Payments</Link><Link href="/reports">Reports</Link><Link href="/users">Users</Link></nav></header>
    <section className="module-heading"><div><span className="eyebrow">{config.eyebrow}</span><h1>{config.title}</h1><p>{config.description}</p></div><button className="button button-dark" onClick={openNew} disabled={!planId}>＋ Add {config.singular}</button></section>
    <section className="module-toolbar"><label>Wedding plan<select value={planId} onChange={event => setPlanId(event.target.value)}>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.partner || plan.name} · {plan.name}</option>)}</select></label><input className="module-search" placeholder="Cari data..." value={search} onChange={event => setSearch(event.target.value)}/><span>{visible.length} data</span></section>
    {error && <div className="module-error">{error}</div>}
    {!planId ? <div className="module-empty">Belum ada wedding plan. Buat plan pertama dari dashboard.</div> : <section className="module-table-wrap"><table className="module-table"><thead><tr>{config.columns.map(key => <th key={key}>{key === "budgetItemId" ? "ITEM BUDGET" : key.replace(/[A-Z]/g, letter => " " + letter).toUpperCase()}</th>)}<th>AKSI</th></tr></thead><tbody>{visible.map(record => <tr key={record.id}>{config.columns.map(key => <td key={key}>{cellValue(record, key)}</td>)}<td><button className="module-action" onClick={() => openEdit(record)}>Edit</button><button className="module-action danger" onClick={() => remove(record)}>Hapus</button></td></tr>)}</tbody></table>{visible.length === 0 && <div className="module-empty">Belum ada data. Klik tombol Add untuk mulai.</div>}</section>}
    {editing !== null || Object.keys(form).length > 0 ? <div className="module-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setEditing(null); setForm({}); } }}><form className="module-modal" onSubmit={save}><div className="module-modal-head"><div><span className="eyebrow">WEDPLAN WORKSPACE</span><h2>{editing ? "Edit" : "Tambah"} {config.singular}</h2></div><button type="button" className="module-close" onClick={() => { setEditing(null); setForm({}); }}>×</button></div><div className="module-form-grid">{config.fields.map(field => <label key={field.key} className={field.type === "textarea" ? "full" : ""}>{field.label}{fieldInput(field)}</label>)}</div>{error && <div className="module-error">{error}</div>}<div className="module-modal-actions"><button type="button" className="button button-soft" onClick={() => { setEditing(null); setForm({}); }}>Batal</button><button className="button button-dark" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button></div></form></div> : null}
  </main>;
}
