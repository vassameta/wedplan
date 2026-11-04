import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth";

export const runtime = "nodejs";

async function syncPaymentTotal(tx: any, planId: string, itemId: string) {
  if (!itemId) return;
  const item = await tx.budgetItem.findFirst({ where: { id: itemId, planId } });
  if (!item) return;
  const payments = await tx.plannerRecord.findMany({ where: { planId, kind: "PAYMENT" } });
  const total = payments.reduce((sum: number, record: any) => {
    const data = record.data as Record<string, unknown>;
    return data.budgetItemId === itemId ? sum + Math.max(0, Number(data.amount) || 0) : sum;
  }, 0);
  await tx.budgetItem.update({
    where: { id: itemId },
    data: {
      actual: total,
      paymentStatus: total <= 0 ? "UNPAID" : total >= Number(item.planned) ? "PAID" : "DEPOSIT"
    }
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireRole(["ADMIN", "EDITOR"]);
  if (denied) return denied;
  const { id } = await context.params;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  if (!body?.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return Response.json({ error: "Isi record tidak valid." }, { status: 400 });
  }
  try {
    const record = await prisma.$transaction(async tx => {
      const previous = await tx.plannerRecord.findUniqueOrThrow({ where: { id } });
      if (previous.kind === "PAYMENT" && (!(Number(body.data.amount) > 0) || !body.data.date)) {
        throw new Error("Nominal pembayaran dan tanggal wajib diisi.");
      }
      const updated = await tx.plannerRecord.update({ where: { id }, data: { data: body.data } });
      if (previous.kind === "PAYMENT") {
        const oldData = previous.data as Record<string, unknown>;
        const newItemId = String(body.data.budgetItemId ?? "");
        await syncPaymentTotal(tx, previous.planId, String(oldData.budgetItemId ?? ""));
        if (newItemId && newItemId !== oldData.budgetItemId) await syncPaymentTotal(tx, previous.planId, newItemId);
        else if (newItemId) await syncPaymentTotal(tx, previous.planId, newItemId);
      }
      return updated;
    });
    return Response.json(record);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Record tidak ditemukan atau gagal diperbarui." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;
  const { id } = await context.params;
  try {
    await prisma.$transaction(async tx => {
      const previous = await tx.plannerRecord.findUniqueOrThrow({ where: { id } });
      await tx.plannerRecord.delete({ where: { id } });
      if (previous.kind === "PAYMENT") {
        const data = previous.data as Record<string, unknown>;
        await syncPaymentTotal(tx, previous.planId, String(data.budgetItemId ?? ""));
      }
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Record tidak ditemukan." }, { status: 404 });
  }
}
