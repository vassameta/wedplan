"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = { id: string; name: string; email: string; role: "ADMIN" | "EDITOR" | "VIEWER"; isActive: boolean; createdAt: string };

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">("EDITOR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/users", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Tidak dapat memuat user. Pastikan login sebagai ADMIN.");
    setUsers(data);
  }
  useEffect(() => { load().catch(err => setError(err.message)); }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat user.");
      setName(""); setEmail(""); setPassword(""); setRole("EDITOR");
      await load(); setMessage("Akun berhasil dibuat.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat user."); }
    finally { setBusy(false); }
  }

  async function update(user: User, changes: Partial<User> & { password?: string }) {
    const response = await fetch("/api/users/" + user.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Gagal memperbarui user."); return; }
    await load();
  }

  async function remove(user: User) {
    if (!window.confirm("Hapus akun " + user.email + "?")) return;
    const response = await fetch("/api/users/" + user.id, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Gagal menghapus user."); return; }
    await load();
  }

  return <main className="module-page">
    <header className="module-top"><Link href="/" className="module-brand">♥ wedplan<span>.</span></Link><nav><Link href="/">Dashboard</Link><Link href="/vendors">Vendors</Link><Link href="/guests">Guests</Link><Link href="/checklist">Checklist</Link><Link href="/payments">Payments</Link><Link href="/reports">Reports</Link><Link href="/users">Users</Link></nav></header>
    <section className="module-heading"><div><span className="eyebrow">WORKSPACE ACCESS</span><h1>Users & permissions</h1><p>Buat akun individual dan atur hak akses setiap kolaborator.</p></div></section>
    {error && <div className="module-error">{error}</div>}{message && <div className="module-success">{message}</div>}
    <section className="module-modal user-create-panel"><div className="module-modal-head"><div><span className="eyebrow">INVITE A COLLABORATOR</span><h2>Create workspace account</h2></div></div><form onSubmit={create}><div className="module-form-grid">
      <label>Nama<input required value={name} onChange={e=>setName(e.target.value)} /></label>
      <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>Password (minimal 12 karakter)<input required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <label>Role<select value={role} onChange={e=>setRole(e.target.value as typeof role)}><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option><option value="ADMIN">Admin</option></select></label>
    </div><div className="module-modal-actions"><button className="button button-dark" disabled={busy}>{busy ? "Membuat..." : "Create account"}</button></div></form></section>
    <section className="module-table-wrap"><table className="module-table"><thead><tr><th>NAMA</th><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>AKSI</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td><select className="user-role-select" value={user.role} onChange={e=>update(user,{role:e.target.value as User["role"]})}><option value="ADMIN">Admin</option><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select></td><td>{user.isActive ? "Aktif" : "Nonaktif"}</td><td><button className="module-action" onClick={()=>update(user,{isActive:!user.isActive})}>{user.isActive ? "Nonaktifkan" : "Aktifkan"}</button><button className="module-action" onClick={async()=>{const next=window.prompt("Password baru (minimal 12 karakter):");if(next){if(next.length<12){setError("Password minimal 12 karakter.");return;}await update(user,{password:next} as Partial<User>);setMessage("Password berhasil diperbarui.");}}}>Reset password</button><button className="module-action danger" onClick={()=>remove(user)}>Hapus</button></td></tr>)}</tbody></table>{users.length===0 && <div className="module-empty">Belum ada akun pengguna.</div>}</section>
    <p className="report-footnote">Admin dapat mengelola akun. Editor dapat mengubah data wedding. Viewer hanya dapat melihat data. Setiap pengguna menggunakan email dan password masing-masing.</p>
  </main>;
}
