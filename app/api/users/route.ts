import { randomBytes, scryptSync } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export async function GET() {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;
  const users = await prisma.workspaceUser.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });
  return Response.json(users);
}

export async function POST(request: Request) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = ["ADMIN", "EDITOR", "VIEWER"].includes(body.role) ? body.role : "EDITOR";
  if (!name || !email || !email.includes("@") || password.length < 12) {
    return Response.json({ error: "Nama, email valid, dan password minimal 12 karakter wajib diisi." }, { status: 400 });
  }
  try {
    const user = await prisma.workspaceUser.create({
      data: { name, email, passwordHash: hashPassword(password), role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    });
    return Response.json(user, { status: 201 });
  } catch {
    return Response.json({ error: "Email sudah digunakan atau user gagal dibuat." }, { status: 409 });
  }
}
