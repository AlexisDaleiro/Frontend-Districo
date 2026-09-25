import { NextRequest, NextResponse } from "next/server";
import { allowedPath, sanitize } from "@/lib/proxy-policy";
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
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "real")
    return reply({ message: "Esta instalación funciona en modo demo." }, 503);
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin)
      return reply({ message: "Origen no autorizado." }, 403);
  }
  const base = process.env.BACKEND_API_URL;
  if (!base) return reply({ message: "La API aún no está configurada." }, 503);
  let body: Record<string, unknown> | undefined;
  if (request.method !== "GET" && request.method !== "DELETE") {
    if (Number(request.headers.get("content-length") ?? 0) > 150000)
      return reply({ message: "Solicitud demasiado grande." }, 413);
    try {
      body = await request.json();
    } catch {
      return reply({ message: "Solicitud inválida." }, 400);
    }
  }
  if (path === "auth/refresh" || path === "auth/logout")
    body = {
      refreshToken: request.cookies.get("districo-refresh")?.value ?? "",
    };
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
      `${base.replace(/\/$/, "")}/${path}${request.nextUrl.search}`,
      {
        method: request.method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      },
    );
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
    if (upstream.ok && (path === "auth/login" || path === "auth/refresh")) {
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
