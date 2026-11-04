import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "wedplan_session";
const SESSION_SECONDS = 60 * 60 * 24 * 14;
export type WorkspaceRole = "ADMIN" | "EDITOR" | "VIEWER";
export type SessionContext = { userId: string; role: WorkspaceRole };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function makeSessionToken(userId: string, role: WorkspaceRole) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function readSession(token?: string): (SessionContext & { exp: number }) | null {
  if (!token) return null;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return null;
  try {
    const expected = signature(payload);
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: string; role?: WorkspaceRole; exp?: number;
    };
    if (typeof parsed.exp !== "number" || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof parsed.userId !== "string" || !parsed.userId) return null;
    if (typeof parsed.role !== "string" || !["ADMIN", "EDITOR", "VIEWER"].includes(parsed.role)) return null;
    return { userId: parsed.userId, role: parsed.role, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function isValidSession(token?: string) {
  return readSession(token) !== null;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const store = await cookies();
  const session = readSession(store.get(COOKIE_NAME)?.value);
  if (!session) return null;
  const user = await prisma.workspaceUser.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, isActive: true }
  });
  if (!user || !user.isActive) return null;
  return { userId: user.id, role: user.role };
}

export async function hasSession() {
  return (await getSessionContext()) !== null;
}

export async function requireSession() {
  if (!(await hasSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function requireRole(roles: WorkspaceRole[]) {
  const session = await getSessionContext();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!roles.includes(session.role)) return Response.json({ error: "Akses tidak diizinkan." }, { status: 403 });
  return null;
}

export const sessionCookie = COOKIE_NAME;
export const sessionMaxAge = SESSION_SECONDS;
