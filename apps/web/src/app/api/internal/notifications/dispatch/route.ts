import { createHash, timingSafeEqual } from "node:crypto";
import { backendApiUrl } from "@/lib/backend-url";
import { isDemoMode } from "@/lib/data-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function reply(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store, private" } });
}

// Only this fixed operation is reachable by the scheduler. The general browser
// proxy continues to reject internal routes; the backend remains a private service.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (isDemoMode() || secret.length < 32)
    return reply({ message: "Despacho no configurado." }, 503);
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`)))
    return reply({ message: "No autorizado." }, 401);

  const url = backendApiUrl("internal/notifications/dispatch");
  const dispatchSecret = process.env.EMAIL_DISPATCH_SECRET ?? "";
  if (!url || dispatchSecret.length < 32)
    return reply({ message: "Despacho no configurado." }, 503);
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${dispatchSecret}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(50_000),
    });
    if (!upstream.ok) return reply({ message: "No se pudo procesar la cola." }, 502);
    const result = await upstream.json();
    if (!Number.isSafeInteger(result?.processed) || result.processed < 0)
      return reply({ message: "Respuesta de despacho inválida." }, 502);
    return reply({ processed: result.processed }, 200);
  } catch {
    return reply({ message: "No se pudo procesar la cola." }, 502);
  }
}
