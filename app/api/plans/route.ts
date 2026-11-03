import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import type { PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";

function serializePlan(plan: Awaited<ReturnType<typeof prisma.weddingPlan.findMany>>[number]) {
  return {
    ...plan,
    budget: Number(plan.budget),
    items: plan.items.map(item => ({
      ...item,
      planned: Number(item.planned),
      actual: Number(item.actual),
      paymentStatus: ({ UNPAID: "Belum dibayar", DEPOSIT: "DP", PAID: "Lunas" } as const)[item.paymentStatus]
    }))
  };
}

function mapStatus(value: string): PaymentStatus {
  if (value === "Lunas") return "PAID";
  if (value === "DP") return "DEPOSIT";
  return "UNPAID";
}

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const plans = await prisma.weddingPlan.findMany({
    include: { items: { orderBy: { name: "asc" } } },
    orderBy: { updatedAt: "desc" }
  });
  return Response.json(plans.map(serializePlan));
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON tidak valid." }, { status: 400 }); }
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Nama plan wajib diisi." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const plan = await prisma.weddingPlan.create({
    data: {
      name: body.name.trim(),
      partner: typeof body.partner === "string" ? body.partner : "",
      date: typeof body.date === "string" ? body.date : "",
      location: typeof body.location === "string" ? body.location : "",
      budget: Math.max(0, Number(body.budget) || 0),
      guestCount: Math.max(0, Math.floor(Number(body.guestCount) || 0)),
      items: { create: items.map((item: any) => ({
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        name: String(item.name ?? ""),
        category: String(item.category ?? "Lain-lain"),
        vendor: String(item.vendor ?? ""),
        planned: Math.max(0, Number(item.planned) || 0),
        actual: Math.max(0, Number(item.actual) || 0),
        paymentStatus: mapStatus(String(item.paymentStatus ?? "")),
        dueDate: String(item.dueDate ?? ""),
        notes: String(item.notes ?? "")
      })) }
    },
    include: { items: true }
  });
  return Response.json(serializePlan(plan), { status: 201 });
}
