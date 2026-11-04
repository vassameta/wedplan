import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

type DbPaymentStatus = "UNPAID" | "DEPOSIT" | "PAID";

function mapStatus(value: string): DbPaymentStatus {
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
      paymentStatus: ({ UNPAID: "Belum dibayar", DEPOSIT: "DP", PAID: "Lunas" } as Record<DbPaymentStatus, string>)[item.paymentStatus as DbPaymentStatus]
    }))
  };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireRole(["ADMIN", "EDITOR"]);
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

      const normalizedItems = items.map((item: any) => ({
        ...item,
        id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID()
      }));
      const ids = normalizedItems.map((item: any) => item.id);
      if (new Set(ids).size !== ids.length) throw new Error("Item budget memiliki ID duplikat.");
      if (ids.length) await tx.budgetItem.deleteMany({ where: { planId: id, id: { notIn: ids } } });
      else await tx.budgetItem.deleteMany({ where: { planId: id } });

      const payments = await tx.plannerRecord.findMany({ where: { planId: id, kind: "PAYMENT" } });
      for (const item of normalizedItems) {
        const planned = Math.max(0, Number(item.planned) || 0);
        const actualFromForm = Math.max(0, Number(item.actual) || 0);
        const existing = await tx.budgetItem.findFirst({ where: { id: item.id, planId: id }, select: { id: true } });
        const fields = {
          name: String(item.name ?? ""),
          category: String(item.category ?? "Lain-lain"),
          vendor: String(item.vendor ?? ""),
          planned,
          actual: actualFromForm,
          paymentStatus: mapStatus(String(item.paymentStatus ?? "")),
          dueDate: String(item.dueDate ?? ""),
          notes: String(item.notes ?? "")
        };
        if (existing) await tx.budgetItem.update({ where: { id: existing.id }, data: fields });
        else await tx.budgetItem.create({ data: { id: item.id, planId: id, ...fields } });

        const linkedPayments = payments.filter((payment: any) => {
          const data = payment.data as Record<string, unknown>;
          return data.budgetItemId === item.id;
        });
        if (linkedPayments.length) {
          const paidTotal = linkedPayments.reduce((sum: number, payment: any) => {
            const data = payment.data as Record<string, unknown>;
            return sum + Math.max(0, Number(data.amount) || 0);
          }, 0);
          await tx.budgetItem.update({
            where: { id: item.id },
            data: {
              actual: paidTotal,
              paymentStatus: paidTotal <= 0 ? "UNPAID" : paidTotal >= planned ? "PAID" : "DEPOSIT"
            }
          });
        }
      }
      return tx.weddingPlan.findUniqueOrThrow({ where: { id }, include: { items: true } });
    });
    return Response.json(serializePlan(plan));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Wedding plan tidak ditemukan atau gagal diperbarui." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireRole(["ADMIN", "EDITOR"]);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    await prisma.weddingPlan.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Wedding plan tidak ditemukan." }, { status: 404 });
  }
}
