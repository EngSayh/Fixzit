import { CircuitBreaker } from "./circuit-breaker";

const createBreaker = (name: string, cooldownMs: number): CircuitBreaker =>
  new CircuitBreaker({
    name,
    failureThreshold: 4,
    successThreshold: 2,
    cooldownMs,
  });

const paytabsBreaker = createBreaker("paytabs", 30_000);
const taqnyatBreaker = createBreaker("taqnyat", 30_000);
const meilisearchBreaker = createBreaker("meilisearch", 15_000);
const zatcaBreaker = createBreaker("zatca", 60_000);
const sendgridBreaker = createBreaker("sendgrid", 20_000);

export const serviceCircuitBreakers = {
  paytabs: paytabsBreaker,
  taqnyat: taqnyatBreaker,
  meilisearch: meilisearchBreaker,
  zatca: zatcaBreaker,
  sendgrid: sendgridBreaker,
} as const;

export type CircuitBreakerName = keyof typeof serviceCircuitBreakers;

export function getCircuitBreaker(name: CircuitBreakerName): CircuitBreaker {
  return serviceCircuitBreakers[name];
}
