/**
 * Shared SWR fetcher utilities
 *
 * Use these instead of defining inline fetcher functions in components.
 * This consolidates error handling and tenant ID header injection.
 */

import { logger } from "@/lib/logger";

/**
 * Basic fetcher for SWR - JSON response
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }
  return res.json();
}

/**
 * Tenant-aware fetcher - injects x-tenant-id header
 * Use with: useSWR([url, orgId], ([url, id]) => tenantFetcher(url, id))
 */
export async function tenantFetcher<T = unknown>(
  url: string,
  orgId: string
): Promise<T> {
  try {
    const res = await fetch(url, {
      headers: { "x-tenant-id": orgId },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message =
        typeof errorData?.error === "string"
          ? errorData.error
          : `Request failed: ${res.status}`;
      throw new Error(message);
    }
    return res.json();
  } catch (error) {
    logger.error("Tenant fetcher error", error as Error, { url, orgId });
    throw error;
  }
}

/**
 * POST fetcher for mutations
 */
export async function postFetcher<T = unknown, D = unknown>(
  url: string,
  { arg }: { arg: { data: D; orgId?: string } }
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (arg.orgId) {
    headers["x-tenant-id"] = arg.orgId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(arg.data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      typeof errorData?.error === "string"
        ? errorData.error
        : `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}
