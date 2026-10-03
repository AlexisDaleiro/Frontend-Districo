export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
let refreshFlight: Promise<boolean> | undefined;
export async function http<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const multipart = body instanceof FormData;
  const send = () =>
    fetch(`/api/backend/${path}`, {
      method,
      headers: multipart ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(multipart ? 95000 : 25000),
    });
  let response: Response;
  try {
    response = await send();
    if (
      response.status === 401 &&
      (!path.startsWith("auth/") || path === "auth/me")
    ) {
      refreshFlight ??= fetch("/api/backend/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(15000),
      })
        .then((r) => r.ok)
        .catch(() => false)
        .finally(() => {
          refreshFlight = undefined;
        });
      if (await refreshFlight) response = await send();
    }
  } catch {
    throw new ApiError(
      method === "GET"
        ? "No se pudo conectar. Revisá tu conexión e intentá nuevamente."
        : "No recibimos confirmación de la operación. Verificá el resultado antes de repetirla.",
    );
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== "auth/me" &&
      !path.includes("login")
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
  const response = await fetch(`/api/backend/${path}`, { cache: "no-store" });
  if (!response.ok) throw new ApiError("No se pudo descargar el archivo.", response.status);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
