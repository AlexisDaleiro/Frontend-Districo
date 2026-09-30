// The service binding is available at runtime, not during the Next.js build.
// BACKEND_API_URL is only for running the two local servers separately.
export function backendApiUrl(path: string): URL | undefined {
  try {
    const serviceUrl = process.env.API_SERVICE_URL;
    const base = serviceUrl
      ? new URL(serviceUrl)
      : !process.env.VERCEL && process.env.BACKEND_API_URL
        ? new URL(process.env.BACKEND_API_URL)
        : undefined;
    if (!base) return undefined;
    base.pathname = serviceUrl
      ? `${base.pathname.replace(/\/$/, "").replace(/\/api$/, "")}/api/`
      : `${base.pathname.replace(/\/$/, "")}/`;
    return new URL(path, base);
  } catch {
    return undefined;
  }
}
