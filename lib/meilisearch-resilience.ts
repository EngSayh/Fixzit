import { SERVICE_RESILIENCE } from "@/config/service-timeouts";
import {
  executeWithRetry,
  withTimeout,
  getCircuitBreaker,
} from "@/lib/resilience";

const meiliResilience = SERVICE_RESILIENCE.meilisearch;
const meiliBreaker = getCircuitBreaker("meilisearch");

export type MeiliOperationType = "search" | "index";

export async function withMeiliResilience<T>(
  label: string,
  type: MeiliOperationType,
  operation: () => Promise<T>,
): Promise<T> {
  const timeoutMs =
    type === "search"
      ? meiliResilience.timeouts.searchMs
      : meiliResilience.timeouts.indexingMs;

  return executeWithRetry(
    () => meiliBreaker.run(() => withTimeout(() => operation(), { timeoutMs })),
    {
      maxAttempts: meiliResilience.retries.maxAttempts,
      baseDelayMs: meiliResilience.retries.baseDelayMs,
      label: `meili-${label}`,
    },
  );
}
