import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import type { PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";

function mapStatus(value: string): PaymentStatus {
  if (value === "Lunas") return "PAID";
  if (value === "DP") return "DEPOSIT";
  return "UNPAID";
}

function serializePlan(plan: any) {
  return {
    ...plan,
    budget: Number(plan.budget),
    items: plan.items.map((item: any) => ({
      ...item,
      planned: Number(item.planned),
      actual: Number(item.actual),
      paymentStatus: ({ UNPAID: "Belum dibayar", DEPOSIT: "DP", PAID: "Lunas" } as const)[item.paymentStatus as "UNPAID" | "DEPOSIT" | "PAID"]
    }))
  };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;
  const { id } = await context.params;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Nama plan wajib diisi." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  try {
    const plan = await prisma.$transaction(async tx => {
      await tx.weddingPlan.update({
        where: { id },
        data: {
          name: body.name.trim(),
          partner: typeof body.partner === "string" ? body.partner : "",
          date: typeof body.date === "string" ? body.date : "",
          location: typeof body.location === "string" ? body.location : "",
          budget: Math.max(0, Number(body.budget) || 0),
          guestCount: Math.max(0, Math.floor(Number(body.guestCount) || 0))
        }
      });
      await tx.budgetItem.deleteMany({ where: { planId: id } });
      if (items.length) {
        await tx.budgetItem.createMany({
          data: items.map((item: any) => ({
            id: String(item.id || crypto.randomUUID()),
            planId: id,
            name: String(item.name ?? ""),
            category: String(item.category ?? "Lain-lain"),
            vendor: String(item.vendor ?? ""),
            planned: Math.max(0, Number(item.planned) || 0),
            actual: Math.max(0, Number(item.actual) || 0),
            paymentStatus: mapStatus(String(item.paymentStatus ?? "")),
            dueDate: String(item.dueDate ?? ""),
            notes: String(item.notes ?? "")
          }))
        });
      }
      return tx.weddingPlan.findUniqueOrThrow({ where: { id }, include: { items: true } });
    });
    return Response.json(serializePlan(plan));
  } catch {
    return Response.json({ error: "Wedding plan tidak ditemukan atau gagal diperbarui." }, { status: 404 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;
  const { id } = await context.params;
  try {
    await prisma.weddingPlan.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Wedding plan tidak ditemukan." }, { status: 404 });
  }
}
