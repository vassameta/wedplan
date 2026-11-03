import { timingSafeEqual } from "node:crypto";
import { makeSessionToken, sessionCookie, sessionMaxAge } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    return Response.json({ error: "ADMIN_PASSWORD belum dikonfigurasi." }, { status: 503 });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request tidak valid." }, { status: 400 });
  }

  const submitted = typeof body.password === "string" ? body.password : "";
  const a = Buffer.from(submitted);
  const b = Buffer.from(configuredPassword);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) return Response.json({ error: "Password tidak sesuai." }, { status: 401 });

  let token: string;
  try {
    token = makeSessionToken();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Konfigurasi session tidak valid." }, { status: 503 });
  }

  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${sessionCookie}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionMaxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}
