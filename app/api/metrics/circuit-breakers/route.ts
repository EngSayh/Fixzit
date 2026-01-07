/**
 * @fileoverview Circuit Breaker Metrics API
 * @description Exposes Prometheus-compatible metrics for circuit breaker health monitoring and alerting.
 * @route GET /api/metrics/circuit-breakers - Get circuit breaker metrics in Prometheus or JSON format
 * @access Protected (METRICS_TOKEN in production)
 * @module metrics
 *
 * Query params:
 * - format=prometheus (default) - Prometheus text format
 * - format=json - JSON format
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getPrometheusMetrics,
  getCircuitBreakerSummary,
} from "@/lib/resilience/circuit-breaker-metrics";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export const dynamic = "force-dynamic";

// Optional auth token for metrics endpoint
const METRICS_TOKEN = process.env.METRICS_TOKEN;

function isAuthorized(request: NextRequest): boolean {
  // In development, always allow
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  // If no token configured, allow (operator choice)
  if (!METRICS_TOKEN) {
    return true;
  }
  
  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return token === METRICS_TOKEN;
  }
  
  // Check X-Metrics-Token header
  const metricsToken = request.headers.get("x-metrics-token");
  return metricsToken === METRICS_TOKEN;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 120, windowMs: 60_000, keyPrefix: "metrics:circuit-breakers" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Optional authentication
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const format = request.nextUrl.searchParams.get("format") ?? "prometheus";

    if (format === "json") {
      const summary = getCircuitBreakerSummary();
      return NextResponse.json(summary, {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // Default: Prometheus text format
    const metrics = getPrometheusMetrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    logger.error("[metrics/circuit-breakers] Failed to render metrics", {
      error,
    });
    return NextResponse.json(
      { error: "Failed to load circuit breaker metrics" },
      { status: 500 },
    );
  }
}
