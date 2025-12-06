import { logger } from "@/lib/logger";

export type CounterPayload = Record<string, unknown>;

/**
 * Tenant-scoped counters fetcher.
 * Requires orgId to avoid cross-tenant cache collisions and noisy 400s.
 */
export async function fetchOrgCounters(
  orgId: string,
  init?: RequestInit,
): Promise<CounterPayload> {
  if (!orgId) {
    throw new Error("Missing orgId for counters fetch");
  }

  const response = await fetch(
    `/api/counters?org=${encodeURIComponent(orgId)}`,
    {
      credentials: "include",
      ...init,
    },
  );

  if (!response.ok) {
    const error = new Error(
      `Failed to fetch counters: ${response.status} ${response.statusText}`,
    );
    if (process.env.NODE_ENV === "development") {
      logger.warn("[Counters] fetch failed", { status: response.status });
    }
    throw error;
  }

  return response.json() as Promise<CounterPayload>;
}
