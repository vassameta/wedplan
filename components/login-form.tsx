"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Heart, LockKeyhole, Sparkles } from "lucide-react";

export default function LoginForm() {
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
        body: JSON.stringify({ password })
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
          <label htmlFor="password"><LockKeyhole size={14}/> Workspace password</label>
          <input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required placeholder="Enter your password"/>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Enter workspace"}</button>
        </form>
        <small>Private wedding planning space · Made with love</small>
      </div>
    </main>
  );
}
