"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Heart, LockKeyhole, Mail, Sparkles } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("admin@wedplan.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login gagal.");
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="brand-mark"><Heart size={20} fill="currentColor"/></div>
        <div className="eyebrow"><Sparkles size={12}/> YOUR WEDDING WORKSPACE</div>
        <h1>Welcome to <em>WedPlan.</em></h1>
        <p>A thoughtful space for every little detail of your big day.</p>
        <form onSubmit={submit}>
          <label htmlFor="email"><Mail size={14}/> Email workspace</label>
          <input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required placeholder="admin@wedplan.local"/>
          <label htmlFor="password"><LockKeyhole size={14}/> Password</label>
          <input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required placeholder="Enter your password"/>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Enter workspace"}</button>
        </form>
        <small>First login: use ADMIN_EMAIL (default admin@wedplan.local) and ADMIN_PASSWORD from server .env.</small>
      </div>
    </main>
  );
}
