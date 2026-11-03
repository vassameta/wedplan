"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowDownToLine, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleDollarSign, ClipboardList, Download, Heart, LayoutDashboard,
  MapPin, MoreHorizontal, Pencil, Plus, Search, Settings2, Sparkles, Trash2,
  TrendingUp, Users, Wallet, X
} from "lucide-react";
import { categories } from "@/lib/defaults";
import { dateLabel, rupiah, shortRupiah } from "@/lib/format";
import type { BudgetItem, PaymentStatus, WeddingPlan } from "@/lib/types";

const blankItem = (): BudgetItem => ({ id: crypto.randomUUID(), name: "", category: categories[0], vendor: "", planned: 0, actual: 0, paymentStatus: "Belum dibayar", dueDate: "", notes: "" });

export default function WeddingDashboard() {
  const [plans, setPlans] = useState<WeddingPlan[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua kategori");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WeddingPlan | null>(null);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [menuId, setMenuId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plans", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Tidak dapat memuat wedding plan.");
        return response.json() as Promise<WeddingPlan[]>;
      })
      .then(initial => {
        if (cancelled) return;
        setPlans(initial);
        setActiveId(initial[0]?.id ?? "");
      })
      .catch(error => {
        if (!cancelled) alert(error instanceof Error ? error.message : "Gagal memuat data dari server.");
      })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const active = plans.find(p => p.id === activeId) ?? plans[0];
  const totals = useMemo(() => {
    const items = active?.items ?? [];
    const planned = items.reduce((s, x) => s + x.planned, 0);
    const actual = items.reduce((s, x) => s + x.actual, 0);
    const paid = items.filter(x => x.paymentStatus === "Lunas").length;
    return { planned, actual, remaining: (active?.budget ?? 0) - actual, allocated: planned, paid, count: items.length };
  }, [active]);
  const fmtDate = active ? dateLabel(active.date) : "Belum ada rencana";

  async function updateActive(updater: (p: WeddingPlan) => WeddingPlan) {
    if (!active) return;
    const nextPlan = { ...updater(active), updatedAt: new Date().toISOString() };
    setPlans(current => current.map(p => p.id === active.id ? nextPlan : p));
    try {
      const response = await fetch(`/api/plans/${active.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextPlan)
      });
      if (!response.ok) throw new Error("Gagal menyimpan perubahan budget.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan perubahan ke server.");
    }
  }
  async function savePlan(data: WeddingPlan) {
    try {
      const response = await fetch(editingPlan ? `/api/plans/${data.id}` : "/api/plans", {
        method: editingPlan ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Gagal menyimpan wedding plan.");
      const saved = await response.json() as WeddingPlan;
      setPlans(current => editingPlan ? current.map(p => p.id === saved.id ? saved : p) : [saved, ...current]);
      setActiveId(saved.id); setShowPlanModal(false); setEditingPlan(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan wedding plan.");
    }
  }
  async function removePlan(id: string) {
    if (!confirm("Hapus wedding plan ini beserta seluruh item budget-nya?")) return;
    try {
      const response = await fetch(`/api/plans/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal menghapus wedding plan.");
      const next = plans.filter(p => p.id !== id); setPlans(next); setActiveId(next[0]?.id ?? ""); setMenuId("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menghapus wedding plan.");
    }
  }
  function saveItem(item: BudgetItem) {
    updateActive(p => ({ ...p, items: editingItem ? p.items.map(x => x.id === item.id ? item : x) : [item, ...p.items] }));
    setShowItemModal(false); setEditingItem(null);
  }
  function removeItem(id: string) {
    if (!confirm("Hapus item budget ini?")) return;
    updateActive(p => ({ ...p, items: p.items.filter(x => x.id !== id) }));
  }
  function exportPlan() {
    if (!active) return;
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `wedplan-${active.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`; a.click(); URL.revokeObjectURL(url);
  }
  async function importPlan(file?: File) {
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text()) as WeddingPlan;
      if (!imported.name || !Array.isArray(imported.items)) throw new Error("Format tidak valid");
      const copy = { ...imported, id: "", name: imported.name + " (Imported)", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const response = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(copy) });
      if (!response.ok) throw new Error("Tidak dapat mengimpor plan.");
      const saved = await response.json() as WeddingPlan;
      setPlans(current => [saved, ...current]); setActiveId(saved.id);
    } catch { alert("File tidak valid. Pilih file ekspor WedPlan berformat JSON."); }
    if (fileRef.current) fileRef.current.value = "";
  }
  const filteredItems = (active?.items ?? []).filter(item => {
    const matchQuery = [item.name, item.vendor, item.category].join(" ").toLowerCase().includes(query.toLowerCase());
    return matchQuery && (categoryFilter === "Semua kategori" || item.category === categoryFilter);
  });
  const categoriesSummary = categories.map(name => {
    const list = (active?.items ?? []).filter(x => x.category === name);
    return { name, planned: list.reduce((s, x) => s + x.planned, 0), actual: list.reduce((s, x) => s + x.actual, 0), count: list.length };
  }).filter(x => x.count > 0).sort((a,b) => b.planned - a.planned);
  const progress = active?.budget ? Math.min(100, Math.round(totals.actual / active.budget * 100)) : 0;
  const allocation = active?.budget ? Math.min(100, totals.allocated / active.budget * 100) : 0;

  if (!ready) return <div className="loading-screen"><div className="brand-mark"><Heart size={20}/></div><span>Menyiapkan ruang rencanamu...</span></div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark"><Heart size={18} fill="currentColor"/></span><span>wedplan<span className="brand-dot">.</span><small>YOUR DAY, YOUR WAY</small></span></a>
        <div className="side-label">WORKSPACE</div>
        <button className={tab === "Overview" ? "nav-item active" : "nav-item"} onClick={() => setTab("Overview")}><LayoutDashboard size={17}/> Overview</button>
        <button className={tab === "Budget" ? "nav-item active" : "nav-item"} onClick={() => setTab("Budget")}><Wallet size={17}/> Budget & expenses</button>
        <button className={tab === "Vendors" ? "nav-item active" : "nav-item"} onClick={() => setTab("Vendors")}><Sparkles size={17}/> Vendors <span className="nav-soon">BETA</span></button>
        <button className={tab === "Guests" ? "nav-item active" : "nav-item"} onClick={() => setTab("Guests")}><Users size={17}/> Guest list <span className="nav-soon">BETA</span></button>
        <button className={tab === "Checklist" ? "nav-item active" : "nav-item"} onClick={() => setTab("Checklist")}><ClipboardList size={17}/> Checklist <span className="nav-soon">BETA</span></button>
        <div className="side-divider"/>
        <div className="side-label">YOUR PLANS <button onClick={() => {setEditingPlan(null);setShowPlanModal(true)}} aria-label="Create plan"><Plus size={14}/></button></div>
        <div className="plan-list">
          {plans.map(p => <button key={p.id} className={p.id === active?.id ? "plan-switch active" : "plan-switch"} onClick={() => {setActiveId(p.id);setTab("Overview")}}><span className="plan-avatar">{p.partner.split("&")[0]?.trim().charAt(0) || "W"}</span><span className="plan-switch-text"><b>{p.partner || p.name}</b><small>{p.name}</small></span>{p.id === active?.id && <span className="active-dot"/>}</button>)}
          {plans.length === 0 && <p className="empty-side">Belum ada plan. Buat rencana pertamamu.</p>}
        </div>
        <button className="new-plan-side" onClick={() => {setEditingPlan(null);setShowPlanModal(true)}}><Plus size={16}/> Create new plan</button>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><Heart size={16}/></span><b>Every detail matters.</b><p>One step closer to your forever.</p></div><div className="profile-row"><div className="profile-avatar">W</div><span><b>Wedding workspace</b><small>Personal planner</small></span><MoreHorizontal size={18}/></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{active?.name ?? "Wedding plans"}</b></div><div className="top-actions"><button className="icon-btn" title="Import plan" onClick={() => fileRef.current?.click()}><ArrowDownToLine size={17}/></button><input ref={fileRef} type="file" accept="application/json" hidden onChange={e => importPlan(e.target.files?.[0])}/><button className="icon-btn" title="Export plan" onClick={exportPlan} disabled={!active}><Download size={17}/></button><div className="top-divider"/><div className="today-label">A LITTLE PLANNING, A LOT OF LOVE <Heart size={13}/></div></div></header>
        {active ? <>
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR WEDDING JOURNEY</div><h1>Let’s make it <em>beautiful.</em></h1><p>Every little detail, thoughtfully planned for your big day.</p></div><div className="welcome-actions"><button className="button button-soft" onClick={() => {setEditingPlan(active);setShowPlanModal(true)}}><Pencil size={15}/> Edit plan</button><div className="more-wrap"><button className="button button-icon" onClick={() => setMenuId(menuId === active.id ? "" : active.id)}><MoreHorizontal size={18}/></button>{menuId === active.id && <div className="dropdown"><button onClick={async () => {setMenuId("");try{const response=await fetch("/api/plans",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...active,id:"",name:active.name+" copy"})});if(!response.ok)throw new Error();const copy=await response.json() as WeddingPlan;setPlans(c=>[copy,...c]);setActiveId(copy.id)}catch{alert("Gagal menggandakan wedding plan.")}}}>Duplicate plan</button><button className="danger-text" onClick={() => removePlan(active.id)}><Trash2 size={14}/> Delete plan</button></div>}</div></div></section>
          <section className="hero-card"><div className="hero-content"><span className="hero-kicker"><Sparkles size={13}/> THE COUNTDOWN IS ON</span><div className="couple-name">{active.partner || active.name}</div><div className="hero-meta"><span><CalendarDays size={15}/>{fmtDate}</span><span><MapPin size={15}/>{active.location || "Lokasi belum ditentukan"}</span><span><Users size={15}/>{active.guestCount.toLocaleString("id-ID")} guests</span></div><div className="hero-quote">“A day to remember, a love to celebrate.”</div></div><div className="hero-art"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><div className="art-center"><Heart size={30} strokeWidth={1.2}/><span>EST.</span><b>FOREVER</b></div><span className="sparkle s1">✳</span><span className="sparkle s2">✧</span><span className="sparkle s3">✦</span></div></section>

          <section className="section-heading"><div><span className="eyebrow">THE BIG PICTURE</span><h2>Your budget at a glance</h2></div><span className="updated-label">Updated just now</span></section>
          <section className="stats-grid">
            <article className="stat-card stat-primary"><div className="stat-top"><span>Total budget</span><span className="stat-icon"><Wallet size={17}/></span></div><div className="stat-value">{shortRupiah(active.budget)}</div><div className="stat-foot">Your planned spending limit</div><div className="stat-line"><i style={{width:`${allocation}%`}}/></div><div className="stat-sub"><span>{Math.round(allocation)}% allocated</span><span>{shortRupiah(Math.max(0,active.budget-totals.allocated))} unallocated</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Actual spending</span><span className="stat-icon blush"><TrendingUp size={17}/></span></div><div className="stat-value">{shortRupiah(totals.actual)}</div><div className="stat-foot">Money spent so far</div><div className="mini-progress"><i style={{width:`${progress}%`}}/></div><div className="stat-sub"><span>{progress}% of total budget</span><span>{totals.count ? "Tracked items" : "No items yet"}</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Budget remaining</span><span className="stat-icon sage"><CircleDollarSign size={17}/></span></div><div className={totals.remaining < 0 ? "stat-value negative" : "stat-value"}>{shortRupiah(totals.remaining)}</div><div className="stat-foot">Budget left after expenses</div><div className="remaining-note"><span className="tiny-dot"/> {totals.remaining < 0 ? "Over budget — review your plan" : "Looking good. Keep it balanced."}</div></article>
            <article className="stat-card"><div className="stat-top"><span>Budget items</span><span className="stat-icon lavender"><ClipboardList size={17}/></span></div><div className="stat-value">{totals.count}<small> items</small></div><div className="stat-foot">{totals.paid} fully paid</div><div className="stat-sub"><span>{totals.count ? Math.round(totals.paid/totals.count*100) : 0}% payment completed</span><span>{totals.count-totals.paid} outstanding</span></div></article>
          </section>

          {tab === "Overview" && <section className="overview-grid"><article className="panel allocation-panel"><div className="panel-heading"><div><span className="eyebrow">WHERE IT GOES</span><h3>Budget allocation</h3></div><button className="text-button" onClick={() => setTab("Budget")}>View all <ArrowUpRight size={14}/></button></div>{categoriesSummary.length ? <div className="category-bars">{categoriesSummary.slice(0,6).map((c,i) => <div className="category-row" key={c.name}><div className="category-label"><span className={`category-dot dot-${i%6}`}/><b>{c.name}</b><span>{shortRupiah(c.planned)}</span></div><div className="bar-track"><i style={{width:`${totals.allocated ? c.planned/totals.allocated*100 : 0}%`}}/></div><small>{c.count} item{c.count===1?"":"s"}</small></div>)}</div> : <EmptyState title="Your budget starts here" body="Add the first expense to see how your budget is allocated." action={() => {setEditingItem(null);setShowItemModal(true)}}/>}</article>
            <article className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow">A GENTLE REMINDER</span><h3>Planning snapshot</h3></div><span className="snapshot-icon"><Heart size={17}/></span></div><div className="snapshot-total"><span>Planned allocation</span><b>{rupiah(totals.allocated)}</b></div><div className="snapshot-total"><span>Actual expenses</span><b>{rupiah(totals.actual)}</b></div><div className="snapshot-total"><span>Remaining allocation</span><b>{rupiah(totals.allocated-totals.actual)}</b></div><div className="snapshot-divider"/><div className="snapshot-tip"><Sparkles size={17}/><p><b>A little tip</b> Keep a 5–10% contingency fund for the unexpected little things.</p></div></article></section>}

          {tab === "Budget" && <section className="panel budget-panel"><div className="panel-heading budget-toolbar"><div><span className="eyebrow">THE DETAILS</span><h3>Budget & expenses</h3><p>Keep every cost in one thoughtful place.</p></div><button className="button button-dark" onClick={() => {setEditingItem(null);setShowItemModal(true)}}><Plus size={16}/> Add budget item</button></div><div className="filters"><div className="search-box"><Search size={16}/><input placeholder="Search items or vendors..." value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>Semua kategori</option>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>ITEM / VENDOR</th><th>CATEGORY</th><th>PLANNED</th><th>ACTUAL</th><th>PAYMENT</th><th/></tr></thead><tbody>{filteredItems.map(item=><tr key={item.id}><td><b>{item.name}</b><small>{item.vendor || "Vendor belum dipilih"}</small></td><td><span className="category-pill">{item.category}</span></td><td>{rupiah(item.planned)}</td><td className="actual-cell">{rupiah(item.actual)}</td><td><span className={`payment-pill ${item.paymentStatus==="Lunas"?"paid":item.paymentStatus==="DP"?"deposit":"unpaid"}`}>{item.paymentStatus}</span></td><td><div className="row-actions"><button title="Edit" onClick={()=>{setEditingItem(item);setShowItemModal(true)}}><Pencil size={14}/></button><button title="Delete" onClick={()=>removeItem(item.id)}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table>{filteredItems.length===0 && <div className="empty-table">No budget items found. Try another search or add a new item.</div>}</div><div className="table-total"><span>{filteredItems.length} items shown</span><b>Planned: {rupiah(totals.allocated)} <i>·</i> Actual: {rupiah(totals.actual)}</b></div></section>}

          {(tab === "Vendors" || tab === "Guests" || tab === "Checklist") && <section className="panel coming-panel"><span className="coming-icon"><Sparkles size={24}/></span><span className="eyebrow">COMING IN THE NEXT RELEASE</span><h2>{tab === "Vendors" ? "Vendor management" : tab === "Guests" ? "Your guest list" : "Wedding checklist"}</h2><p>{tab === "Vendors" ? "A dedicated space for vendor contacts, proposals, contracts and payment milestones." : tab === "Guests" ? "Keep track of invitations, RSVPs, meal preferences and seating arrangements." : "A calm, organized timeline so every detail gets its moment."}</p><button className="button button-soft" onClick={() => setTab("Budget")}>Back to budget planning</button></section>}
        </> : <section className="no-plan"><div className="no-plan-icon"><Heart size={25}/></div><h1>Your story starts here.</h1><p>Create your first wedding plan and give every beautiful detail a place.</p><button className="button button-dark" onClick={() => {setEditingPlan(null);setShowPlanModal(true)}}><Plus size={16}/> Create your first plan</button></section>}
        <footer className="footer"><span>Made with <Heart size={12} fill="currentColor"/> for your forever.</span><span>WEDPLAN · WEDDING BUDGET PLANNER</span></footer>
      </main>

      {showPlanModal && <PlanModal initial={editingPlan} onClose={()=>{setShowPlanModal(false);setEditingPlan(null)}} onSave={savePlan}/>}
      {showItemModal && <ItemModal initial={editingItem} onClose={()=>{setShowItemModal(false);setEditingItem(null)}} onSave={saveItem}/>}
    </div>
  );
}

function EmptyState({title,body,action}:{title:string;body:string;action:()=>void}) {
  return <div className="empty-state"><span><Heart size={20}/></span><b>{title}</b><p>{body}</p><button className="text-button" onClick={action}><Plus size={14}/> Add budget item</button></div>;
}

function ModalShell({title,subtitle,children,onClose}:{title:string;subtitle:string;children:ReactNode;onClose:()=>void}) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-heading"><div><span className="eyebrow">WEDPLAN WORKSPACE</span><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div></div>;
}

function PlanModal({initial,onClose,onSave}:{initial:WeddingPlan|null;onClose:()=>void;onSave:(p:WeddingPlan)=>void}) {
  const [name,setName]=useState(initial?.name??"Our Wedding");
  const [partner,setPartner]=useState(initial?.partner??"");
  const [date,setDate]=useState(initial?.date??"");
  const [location,setLocation]=useState(initial?.location??"");
  const [budget,setBudget]=useState(String(initial?.budget??100000000));
  const [guests,setGuests]=useState(String(initial?.guestCount??300));
  function submit(e:FormEvent) {
    e.preventDefault();
    const now=new Date().toISOString();
    onSave({id:initial?.id??crypto.randomUUID(),name,partner,date,location,budget:Math.max(0,Number(budget)||0),guestCount:Math.max(0,Number(guests)||0),items:initial?.items??[],createdAt:initial?.createdAt??now,updatedAt:now});
  }
  return <ModalShell title={initial?"Edit wedding plan":"Create your wedding plan"} subtitle="Let’s start with the details that make this day yours." onClose={onClose}><form onSubmit={submit} className="form-grid"><label className="full-field">Plan name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Our Wedding"/></label><label className="full-field">Couple’s name<input value={partner} onChange={e=>setPartner(e.target.value)} placeholder="Alya & Bima"/></label><label>Wedding date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Jakarta"/></label><label>Total budget (IDR)<input type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)}/></label><label>Guest estimate<input type="number" min="0" value={guests} onChange={e=>setGuests(e.target.value)}/></label><div className="modal-actions full-field"><button type="button" className="button button-soft" onClick={onClose}>Cancel</button><button className="button button-dark" type="submit"><Check size={15}/>{initial?"Save changes":"Create plan"}</button></div></form></ModalShell>;
}

function ItemModal({initial,onClose,onSave}:{initial:BudgetItem|null;onClose:()=>void;onSave:(i:BudgetItem)=>void}) {
  const [item,setItem]=useState<BudgetItem>(initial??blankItem());
  function change<K extends keyof BudgetItem>(key:K,value:BudgetItem[K]) { setItem(old=>({...old,[key]:value})); }
  function submit(e:FormEvent) { e.preventDefault(); if(!item.name.trim())return; onSave({...item,name:item.name.trim(),planned:Math.max(0,Number(item.planned)||0),actual:Math.max(0,Number(item.actual)||0)}); }
  return <ModalShell title={initial?"Edit budget item":"Add a budget item"} subtitle="Capture the estimate now; update the actual cost as plans come together." onClose={onClose}><form onSubmit={submit} className="form-grid"><label className="full-field">Item name<input required value={item.name} onChange={e=>change("name",e.target.value)} placeholder="e.g. Wedding venue"/></label><label>Category<select value={item.category} onChange={e=>change("category",e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Vendor<input value={item.vendor} onChange={e=>change("vendor",e.target.value)} placeholder="Vendor / provider"/></label><label>Planned amount (IDR)<input type="number" min="0" value={item.planned} onChange={e=>change("planned",Number(e.target.value))}/></label><label>Actual amount (IDR)<input type="number" min="0" value={item.actual} onChange={e=>change("actual",Number(e.target.value))}/></label><label>Payment status<select value={item.paymentStatus} onChange={e=>change("paymentStatus",e.target.value as PaymentStatus)}><option>Belum dibayar</option><option>DP</option><option>Lunas</option></select></label><label>Payment due date<input type="date" value={item.dueDate} onChange={e=>change("dueDate",e.target.value)}/></label><label className="full-field">Notes<textarea rows={3} value={item.notes} onChange={e=>change("notes",e.target.value)} placeholder="Details, payment terms, reminders..."/></label><div className="modal-actions full-field"><button type="button" className="button button-soft" onClick={onClose}>Cancel</button><button className="button button-dark" type="submit"><Check size={15}/>{initial?"Save changes":"Add item"}</button></div></form></ModalShell>;
}
