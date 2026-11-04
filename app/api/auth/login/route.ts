import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { makeSessionToken, sessionCookie, sessionMaxAge } from "@/lib/auth";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwarded || "unknown";
  const now = Date.now();
  const state = attempts.get(clientKey);
  if (state && state.resetAt > now && state.count >= MAX_ATTEMPTS) {
    return Response.json({ error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }, { status: 429 });
  }
  if (!state || state.resetAt <= now) attempts.set(clientKey, { count: 0, resetAt: now + WINDOW_MS });

  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ error: "Request tidak valid." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : (process.env.ADMIN_EMAIL || "admin@wedplan.local").toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return Response.json({ error: "Email dan password wajib diisi." }, { status: 400 });

  // Bootstrap the first administrator from deployment environment variables.
  const userCount = await prisma.workspaceUser.count();
  if (userCount === 0) {
    const initialPassword = process.env.ADMIN_PASSWORD;
    if (!initialPassword) return Response.json({ error: "ADMIN_PASSWORD belum dikonfigurasi." }, { status: 503 });
    await prisma.workspaceUser.create({
      data: {
        email: (process.env.ADMIN_EMAIL || "admin@wedplan.local").trim().toLowerCase(),
        name: "Workspace Admin",
        passwordHash: hashPassword(initialPassword),
        role: "ADMIN"
      }
    });
  }

  const user = await prisma.workspaceUser.findUnique({ where: { email } });
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    const current = attempts.get(clientKey)!;
    current.count += 1;
    return Response.json({ error: "Email atau password tidak sesuai." }, { status: 401 });
  }
  attempts.delete(clientKey);

  let token: string;
  try { token = makeSessionToken(user.id, user.role); } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Konfigurasi session tidak valid." }, { status: 503 });
  }
  const response = Response.json({ ok: true, user: { name: user.name, email: user.email, role: user.role } });
  response.headers.append("Set-Cookie", `${sessionCookie}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionMaxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}
