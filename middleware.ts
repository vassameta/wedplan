import { NextRequest, NextResponse } from "next/server";

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

function toBase64Url(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function validSession(token?: string) {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return false;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expected = toBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
    if (expected.length !== supplied.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
    if (mismatch !== 0) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    const data = JSON.parse(decoded) as { exp?: number; userId?: string; role?: string };
    return typeof data.exp === "number" && data.exp > Math.floor(Date.now() / 1000) && typeof data.userId === "string" && !!data.userId && typeof data.role === "string" && ["ADMIN", "EDITOR", "VIEWER"].includes(data.role);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const openPath = path === "/login" || path.startsWith("/api/auth/");
  const authenticated = await validSession(request.cookies.get("wedplan_session")?.value);
  if (openPath) {
    return NextResponse.next();
  }
  if (!authenticated) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
