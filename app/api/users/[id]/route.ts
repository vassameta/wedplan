import { randomBytes, scryptSync } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionContext, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;
  const { id } = await context.params;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  const data: any = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (["ADMIN", "EDITOR", "VIEWER"].includes(body.role)) data.role = body.role;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.password === "string" && body.password.length >= 12) data.passwordHash = hashPassword(body.password);
  if (!Object.keys(data).length) return Response.json({ error: "Tidak ada perubahan yang valid." }, { status: 400 });
  try {
    const user = await prisma.workspaceUser.update({
      where: { id }, data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    });
    return Response.json(user);
  } catch { return Response.json({ error: "User tidak ditemukan atau gagal diperbarui." }, { status: 404 }); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;
  const { id } = await context.params;
  const session = await getSessionContext();
  if (session?.userId === id) return Response.json({ error: "Akun yang sedang digunakan tidak dapat dihapus." }, { status: 400 });
  const user = await prisma.workspaceUser.findUnique({ where: { id } });
  if (!user) return Response.json({ error: "User tidak ditemukan." }, { status: 404 });
  if (user.role === "ADMIN") {
    const admins = await prisma.workspaceUser.count({ where: { role: "ADMIN", isActive: true } });
    if (admins <= 1) return Response.json({ error: "Minimal harus ada satu admin aktif." }, { status: 400 });
  }
  await prisma.workspaceUser.delete({ where: { id } });
  return Response.json({ ok: true });
}
