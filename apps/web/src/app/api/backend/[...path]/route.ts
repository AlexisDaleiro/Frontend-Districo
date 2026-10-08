import { NextRequest, NextResponse } from "next/server";
import { allowedPath, sanitize } from "@/lib/proxy-policy";
import { backendApiUrl } from "@/lib/backend-url";
import { isDemoMode } from "@/lib/data-mode";
export const dynamic = "force-dynamic";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  const reply = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store, private" },
    });
  if (!allowedPath(path, request.method))
    return reply({ message: "Ruta no disponible." }, 404);
  if (isDemoMode())
    return reply({ message: "Esta instalación funciona en modo demo." }, 503);
  if (request.method !== "GET") {
    // Next puede informar localhost en nextUrl aunque el navegador use otra
    // dirección (p. ej. 127.0.0.1). Se compara con el host que usó el navegador;
    // un sitio ajeno no puede falsificar Host ni X-Forwarded-Host.
    const hosts = [
      request.nextUrl.host,
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
    ];
    let originHost: string | undefined;
    try {
      originHost = new URL(request.headers.get("origin") ?? "").host;
    } catch {}
    if (!originHost || !hosts.includes(originHost))
      return reply({ message: "Origen no autorizado." }, 403);
  }
  const upstreamUrl = backendApiUrl(path);
  if (!upstreamUrl) return reply({ message: "La API aún no está configurada." }, 503);
  upstreamUrl.search = request.nextUrl.search;
  const invoiceUpload = request.method === "POST" && /^admin\/orders\/[a-zA-Z0-9_-]+\/(invoices|credit-notes)$/.test(path);
  const bannerUpload = (request.method === "POST" && path === "admin/banners") ||
    (request.method === "PATCH" && /^admin\/banners\/[a-zA-Z0-9_-]+$/.test(path));
  const catalogUpload = request.method === "POST" && (
    /^products\/[a-zA-Z0-9_-]+\/media\/upload$/.test(path) ||
    /^(brands|laboratories)\/[a-zA-Z0-9_-]+\/logo$/.test(path)
  );
  const applicationUpload = request.method === "POST" && (
    path === "applications" || /^admin\/applications\/[a-zA-Z0-9_-]+\/documents$/.test(path)
  ) && request.headers.get("content-type")?.startsWith("multipart/form-data;");
  const multipartUpload = invoiceUpload || bannerUpload || catalogUpload || applicationUpload;
  const privateDownload = request.method === "GET" && (
    /^admin\/orders\/[a-zA-Z0-9_-]+\/(invoices|credit-notes)\/[a-zA-Z0-9_-]+$/.test(path) ||
    /^admin\/(applications|customers)\/[a-zA-Z0-9_-]+\/documents\/[a-zA-Z0-9_-]+$/.test(path)
  );
  const csvDownload = request.method === "GET" && path === "admin/orders/export";
  let body: BodyInit | undefined;
  if (multipartUpload) {
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
      return reply({ message: "Adjuntá un archivo válido." }, 415);
    const limit = applicationUpload && path === "applications" ? 16_000_000 : bannerUpload ? 11_000_000 : catalogUpload && path.startsWith("products/") ? 41_000_000 : 5_500_000;
    if (Number(request.headers.get("content-length") ?? 0) > limit)
      return reply({ message: "El archivo supera el tamaño permitido." }, 413);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > limit)
      return reply({ message: "El archivo supera el tamaño permitido." }, 413);
    body = bytes;
  } else if (request.method !== "GET" && request.method !== "DELETE") {
    if (Number(request.headers.get("content-length") ?? 0) > 150000)
      return reply({ message: "Solicitud demasiado grande." }, 413);
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return reply({ message: "Solicitud inválida." }, 400);
    }
  }
  if (path === "auth/refresh" || path === "auth/logout")
    body = JSON.stringify({
      refreshToken: request.cookies.get("districo-refresh")?.value ?? "",
    });
  // Backend currently returns a password-reset token to any caller. Do not expose it publicly.
  if (path === "auth/forgot-password")
    return reply(
      {
        message:
          "La recuperación por correo aún no está disponible. Contactá a DISTRICO para recuperar tu acceso.",
      },
      501,
    );
  try {
    const token = request.cookies.get("districo-access")?.value;
    const upstream = await fetch(
      upstreamUrl.toString(),
      {
        method: request.method,
        headers: {
          "Content-Type": multipartUpload ? request.headers.get("content-type")! : "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(catalogUpload || applicationUpload || csvDownload || path.startsWith("admin/bulk/") ? 90000 : 20000),
      },
    );
    if ((privateDownload || csvDownload) && upstream.ok) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
          "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment",
          "Cache-Control": "no-store, private",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const data = await upstream.json().catch(() => ({}));
    const response = reply(
      upstream.ok
        ? sanitize(data)
        : {
            message:
              upstream.status >= 500
                ? "El servicio no pudo completar la operación."
                : (data.message ?? "No se pudo completar la operación."),
          },
      upstream.status,
    );
    if (
      upstream.ok &&
      (path === "auth/login" || path === "auth/refresh") &&
      typeof data.accessToken === "string" &&
      typeof data.refreshToken === "string"
    ) {
      response.cookies.set("districo-access", data.accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7,
      });
      response.cookies.set("districo-refresh", data.refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    if (path === "auth/logout" || (path === "auth/refresh" && !upstream.ok)) {
      response.cookies.set("districo-access", "", {
        ...cookieOptions,
        maxAge: 0,
      });
      response.cookies.set("districo-refresh", "", {
        ...cookieOptions,
        maxAge: 0,
      });
    }
    return response;
  } catch {
    const response = reply(
      {
        message:
          "No recibimos confirmación de la API. Verificá el resultado antes de repetir una operación.",
      },
      502,
    );
    if (path === "auth/logout")
      for (const key of ["districo-access", "districo-refresh"])
        response.cookies.set(key, "", { ...cookieOptions, maxAge: 0 });
    return response;
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
