import { browserOperationTimeout } from "./operation-timeout";
import { recordPerformanceApi } from "./performance-recorder";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
let refreshFlight: Promise<boolean> | undefined;
async function refreshSession() {
  const renew = () => fetch("/api/backend/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(browserOperationTimeout("auth/refresh")) }).then((response) => response.ok);
  if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request("districo-session-refresh", async () => {
    // Another tab may have already rotated the shared HttpOnly cookie.
    const current = await fetch("/api/backend/auth/me", { cache: "no-store", signal: AbortSignal.timeout(browserOperationTimeout("auth/me")) });
    return current.ok || await renew();
  });
  return renew();
}
export async function http<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const started = typeof performance !== "undefined" ? performance.now() : 0;
  const multipart = body instanceof FormData;
  const send = () =>
    fetch(`/api/backend/${path}`, {
      method,
      headers: multipart ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(browserOperationTimeout(path, multipart)),
    });
  let response: Response;
  try {
    response = await send();
    if (
      response.status === 401 &&
      (!path.startsWith("auth/") || path === "auth/me")
    ) {
      refreshFlight ??= refreshSession()
        .catch(() => false)
        .finally(() => {
          refreshFlight = undefined;
        });
      if (await refreshFlight) response = await send();
    }
  } catch {
    if (method === "GET") recordPerformanceApi(path, performance.now() - started, false);
    throw new ApiError(
      method === "GET"
        ? "No se pudo conectar. Revisá tu conexión e intentá nuevamente."
        : "No recibimos confirmación de la operación. Verificá el resultado antes de repetirla.",
    );
  }
  const result = await response.json().catch(() => ({}));
  if (method === "GET") recordPerformanceApi(path, performance.now() - started, response.ok);
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== "auth/me" &&
      !path.startsWith("auth/mfa/") && !path.includes("login")
    )
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      Array.isArray(result.message)
        ? result.message.join(" · ")
        : (result.message ?? "No se pudo completar la operación."),
      response.status,
    );
  }
  return result as T;
}

export async function downloadPrivateFile(path: string, filename: string) {
  await http("auth/me");
  const response = await fetch(`/api/backend/${path}`, { cache: "no-store", signal: AbortSignal.timeout(browserOperationTimeout(path)) });
  if (!response.ok) throw new ApiError("No se pudo descargar el archivo.", response.status);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
