import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

const allowedKinds = ["VENDOR", "GUEST", "TASK", "PAYMENT"] as const;
type Kind = typeof allowedKinds[number];

function validKind(value: unknown): value is Kind {
  return typeof value === "string" && allowedKinds.includes(value as Kind);
}

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

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const url = new URL(request.url);
  const planId = url.searchParams.get("planId");
  const kind = url.searchParams.get("kind");
  if (!planId) return Response.json({ error: "planId wajib diisi." }, { status: 400 });
  if (kind && !validKind(kind)) return Response.json({ error: "Jenis data tidak valid." }, { status: 400 });
  const records = await prisma.plannerRecord.findMany({
    where: { planId, ...(kind ? { kind } : {}) },
    orderBy: [{ updatedAt: "desc" }]
  });
  return Response.json(records);
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  if (!body || !body.planId || !validKind(body.kind) || !body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return Response.json({ error: "Data plan, jenis, dan isi record wajib valid." }, { status: 400 });
  }
  const plan = await prisma.weddingPlan.findUnique({ where: { id: String(body.planId) }, select: { id: true } });
  if (!plan) return Response.json({ error: "Wedding plan tidak ditemukan." }, { status: 404 });
  if (body.kind === "PAYMENT" && (!(Number(body.data.amount) > 0) || !body.data.date)) {
    return Response.json({ error: "Nominal pembayaran dan tanggal wajib diisi." }, { status: 400 });
  }
  const record = await prisma.$transaction(async tx => {
    const created = await tx.plannerRecord.create({
      data: { kind: body.kind, planId: plan.id, data: body.data }
    });
    if (body.kind === "PAYMENT" && body.data.budgetItemId) {
      await syncPaymentTotal(tx, plan.id, String(body.data.budgetItemId));
    }
    return created;
  });
  return Response.json(record, { status: 201 });
}
