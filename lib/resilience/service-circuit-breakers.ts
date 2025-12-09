import { CircuitBreaker } from "./circuit-breaker";

const createBreaker = (name: string, cooldownMs: number): CircuitBreaker =>
  new CircuitBreaker({
    name,
    failureThreshold: 4,
    successThreshold: 2,
    cooldownMs,
  });

const paytabsBreaker = createBreaker("paytabs", 30_000);
const twilioBreaker = createBreaker("twilio", 20_000);
const meilisearchBreaker = createBreaker("meilisearch", 15_000);
const zatcaBreaker = createBreaker("zatca", 60_000);
const unifonicBreaker = createBreaker("unifonic", 20_000);
const taqnyatBreaker = createBreaker("taqnyat", 20_000); // CITC-compliant SMS provider
const smsBreaker = createBreaker("sms", 20_000); // Generic SMS circuit breaker

export const serviceCircuitBreakers = {
  paytabs: paytabsBreaker,
  twilio: twilioBreaker,
  meilisearch: meilisearchBreaker,
  zatca: zatcaBreaker,
  unifonic: unifonicBreaker,
  taqnyat: taqnyatBreaker,
  sms: smsBreaker,
} as const;

export type CircuitBreakerName = keyof typeof serviceCircuitBreakers;

export function getCircuitBreaker(name: CircuitBreakerName): CircuitBreaker {
  return serviceCircuitBreakers[name];
}
