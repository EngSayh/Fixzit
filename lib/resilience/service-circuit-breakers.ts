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
const awsSnsBreaker = createBreaker("aws-sns", 20_000);
const nexmoBreaker = createBreaker("nexmo", 20_000);
const sendgridBreaker = createBreaker("sendgrid", 30_000);
const taqnyatBreaker = createBreaker("taqnyat", 20_000);

export const serviceCircuitBreakers = {
  paytabs: paytabsBreaker,
  twilio: twilioBreaker,
  meilisearch: meilisearchBreaker,
  zatca: zatcaBreaker,
  unifonic: unifonicBreaker,
  "aws-sns": awsSnsBreaker,
  nexmo: nexmoBreaker,
  sendgrid: sendgridBreaker,
  taqnyat: taqnyatBreaker,
} as const;

export type CircuitBreakerName = keyof typeof serviceCircuitBreakers;

export function getCircuitBreaker(name: CircuitBreakerName): CircuitBreaker {
  return serviceCircuitBreakers[name];
}

/**
 * Get stats for all circuit breakers (for health/monitoring endpoints)
 */
export function getAllCircuitBreakerStats() {
  return Object.entries(serviceCircuitBreakers).map(([, breaker]) => 
    breaker.getStats()
  );
}

/**
 * Check if any circuit breaker is currently open (for alerts)
 */
export function hasOpenCircuitBreakers(): boolean {
  return Object.values(serviceCircuitBreakers).some(breaker => breaker.isOpen());
}

/**
 * Reset all circuit breakers to closed state.
 * @internal Only use in test code to prevent state bleeding between tests.
 */
export function resetAllCircuitBreakers(): void {
  Object.values(serviceCircuitBreakers).forEach(breaker => breaker.reset());
}
