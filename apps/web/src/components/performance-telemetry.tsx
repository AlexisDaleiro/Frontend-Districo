"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "./providers";
import {
  commitPerformanceNavigation,
  recordPerformanceVital,
  startPerformanceCapture,
} from "@/lib/performance-recorder";
export function PerformanceTelemetry({
  release,
  environment,
}: {
  release: string;
  environment: "PRODUCTION" | "LOCAL";
}) {
  const pathname = usePathname(),
    params = useSearchParams(),
    client = useQueryClient(),
    { loading } = useSession();
  useReportWebVitals(recordPerformanceVital);
  useEffect(
    () =>
      startPerformanceCapture(
        release,
        () => {
          const queries = client
            .getQueryCache()
            .getAll()
            .filter(
              (query) =>
                query.getObserversCount() > 0 &&
                !String(query.queryKey.at(-1)).includes(
                  "operations/performance",
                ),
            );
          return {
            busy: queries.some(
              (query) => query.state.fetchStatus === "fetching",
            ),
            error: queries.some((query) => query.state.status === "error"),
          };
        },
        environment,
      ),
    [client, release, environment],
  );
  useEffect(() => {
    if (!loading)
      commitPerformanceNavigation(
        `${pathname}${params.size ? `?${params}` : ""}`,
      );
  }, [pathname, params, loading]);
  return null;
}
