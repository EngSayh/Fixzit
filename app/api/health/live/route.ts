/**
 * @fileoverview Kubernetes Liveness Probe
 * @description Returns 200 if the Node.js process is alive and responsive. Lightweight check without dependency verification for k8s livenessProbe.
 * @route GET /api/health/live - Kubernetes liveness probe endpoint
 * @access Public
 * @module health
 */

import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = enforceRateLimit(request, { requests: 120, windowMs: 60_000, keyPrefix: "health:live" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    return NextResponse.json(
      {
        alive: true,
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
