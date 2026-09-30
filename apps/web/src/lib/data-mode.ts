// Demo is opt-in for local development only. Missing or stale Vercel settings
// must never put a deployed storefront on simulated data.
export function isDemoMode() {
  return (
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL &&
    process.env.NEXT_PUBLIC_DATA_MODE === "demo"
  );
}

export const DEMO = isDemoMode();
