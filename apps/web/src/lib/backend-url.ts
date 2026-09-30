// Vercel injects the binding at function runtime. The legacy URL supports
// running Next.js and NestJS separately outside `vercel dev`.
export function backendApiUrl(path: string): URL | undefined {
  try {
    const serviceUrl = process.env.API_SERVICE_URL;
    const base = serviceUrl
      ? new URL("api/", `${serviceUrl.replace(/\/$/, "")}/`)
      : process.env.BACKEND_API_URL;
    return base ? new URL(path, `${base.toString().replace(/\/$/, "")}/`) : undefined;
  } catch {
    return undefined;
  }
}
