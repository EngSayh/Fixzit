/**
 * Circuit Breaker Metrics Endpoint
 * GET /api/metrics/circuit-breakers
 *
 * Returns Prometheus-compatible metrics for all circuit breakers.
 * 
 * SECURITY: Protected by HEALTH_CHECK_TOKEN for production environments.
 * 
 * Metrics exposed:
 * - circuit_breaker_state: Current state (0=closed, 1=half-open, 2=open)
 * - circuit_breaker_failure_count: Current failure count
 * - circuit_breaker_total_calls: Total number of calls
 * - circuit_breaker_total_failures: Total number of failures
 * - circuit_breaker_total_successes: Total number of successes
 * - circuit_breaker_cooldown_remaining_ms: Remaining cooldown time
 * 
 * @module app/api/metrics/circuit-breakers/route
 */
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { 
  getAllCircuitBreakerMetrics, 
  getPrometheusMetrics 
} from "@/lib/resilience/circuit-breaker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Protect metrics endpoint in production
  const isAuthorized = isAuthorizedHealthRequest(request);
  
  if (!isAuthorized && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const accept = request.headers.get("accept") || "";
  
  // Return Prometheus text format if requested
  if (accept.includes("text/plain") || accept.includes("text/prometheus")) {
    const prometheusMetrics = getPrometheusMetrics();
    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Default: return JSON format
  const metrics = getAllCircuitBreakerMetrics();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    count: metrics.length,
    circuitBreakers: metrics,
  }, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
