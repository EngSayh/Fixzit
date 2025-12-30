/**
 * @fileoverview Superadmin Route Metrics API
 * @description Route alias metrics for maintenance
 * @route GET /api/superadmin/route-metrics
 * @route POST /api/superadmin/route-metrics
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/route-metrics
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { existsSync, readdirSync } from "fs";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  generateRouteAliasMetrics,
  readRouteAliasMetrics,
  saveRouteAliasMetrics,
  enrichRouteAliasMetrics,
} from "@/lib/routes/aliasMetrics";
import { loadRouteHealthData } from "@/lib/routes/routeHealth";
import { postRouteMetricsWebhook } from "@/lib/routes/webhooks";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const HISTORY_DIR = path.join(process.cwd(), "reports/route-metrics/history");
const HISTORY_LIMIT = 60;

function readHistorySnapshots(limit = HISTORY_LIMIT) {
  if (!existsSync(HISTORY_DIR)) {
    return [];
  }

  const files = readdirSync(HISTORY_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .slice(-limit);

  return files
    .map((file) => {
      const snapshot = readRouteAliasMetrics(path.join(HISTORY_DIR, file));
      if (!snapshot) return null;
      const { aliasFiles, duplicateAliases } = snapshot.totals;
      const duplicateRate = aliasFiles > 0 ? (duplicateAliases / aliasFiles) * 100 : 0;
      return {
        generatedAt: snapshot.generatedAt,
        aliasFiles,
        duplicateAliases,
        duplicateRate,
        artifact: file,
      };
    })
    .filter(Boolean) as Array<{
    generatedAt: string;
    aliasFiles: number;
    duplicateAliases: number;
    duplicateRate: number;
    artifact: string;
  }>;
}

/**
 * GET /api/superadmin/route-metrics
 * Get route alias metrics
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-route-metrics:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const jsonPath = path.join(process.cwd(), "_artifacts/route-aliases.json");

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { searchParams } = request.nextUrl;
    const refresh = searchParams.get("refresh") === "1";
    const includeHistory = searchParams.get("history") === "1";

    let metrics = readRouteAliasMetrics(jsonPath);

    if (!metrics || refresh) {
      const routeHealth = await loadRouteHealthData();
      metrics = enrichRouteAliasMetrics(generateRouteAliasMetrics(), {
        routeHealth,
      });
      try {
        saveRouteAliasMetrics(jsonPath, metrics);
      } catch (saveError) {
        logger.warn("[Superadmin:RouteMetrics] Unable to persist artifact", {
          error: saveError,
        });
      }
    }

    const response: Record<string, unknown> = {
      totals: metrics.totals,
      reuse: metrics.reuse?.slice(0, 50),
      generatedAt: metrics.generatedAt,
    };

    if (includeHistory) {
      response.history = readHistorySnapshots();
    }

    return NextResponse.json(response, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[Superadmin:RouteMetrics] Failed to load metrics", { error });
    return NextResponse.json(
      { error: "Failed to load route metrics" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/route-metrics
 * Regenerate route metrics
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-route-metrics:post",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const jsonPath = path.join(process.cwd(), "_artifacts/route-aliases.json");

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const routeHealth = await loadRouteHealthData();
    const metrics = enrichRouteAliasMetrics(generateRouteAliasMetrics(), {
      routeHealth,
    });
    try {
      saveRouteAliasMetrics(jsonPath, metrics);
    } catch (saveError) {
      logger.warn("[Superadmin:RouteMetrics] Unable to persist artifact", {
        error: saveError,
      });
    }

    // Notify webhook if configured
    const duplicationRate =
      metrics.totals.aliasFiles > 0
        ? (metrics.totals.duplicateAliases / metrics.totals.aliasFiles) * 100
        : 0;
    if (duplicationRate <= 5) {
      await postRouteMetricsWebhook({
        duplicationRate,
        generatedAt: metrics.generatedAt,
        aliasFiles: metrics.totals.aliasFiles,
      }).catch((err) => {
        logger.warn("[Superadmin:RouteMetrics] Webhook failed", { error: err });
      });
    }

    logger.info("[Superadmin:RouteMetrics] Metrics regenerated", {
      by: session.username,
    });

    return NextResponse.json(
      {
        message: "Route metrics regenerated",
        totals: metrics.totals,
        generatedAt: metrics.generatedAt,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:RouteMetrics] Failed to regenerate metrics", { error });
    return NextResponse.json(
      { error: "Failed to regenerate route metrics" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
