/**
 * @fileoverview Route Alias Metrics API
 * @description Provides metrics about API route aliases including duplicate
 * detection, health status, and historical snapshots for maintenance.
 * 
 * @module api/admin/route-metrics
 * @requires SUPER_ADMIN or ADMIN role
 * 
 * @endpoints
 * - GET /api/admin/route-metrics - Get route alias metrics
 * - POST /api/admin/route-metrics - Regenerate metrics and optionally notify
 * 
 * @queryParams (GET)
 * - refresh: Set to "1" to regenerate metrics
 * - history: Set to "1" to include historical snapshots
 * 
 * @response
 * - totals: Aggregate metrics (aliasFiles, duplicateAliases, duplicateRate)
 * - duplicates: List of duplicate alias files
 * - history: Array of historical snapshots (if requested)
 * - generatedAt: Timestamp of generation
 * 
 * @features
 * - Automatic duplicate detection
 * - Historical tracking (last 60 snapshots)
 * - Webhook notification on regeneration
 * - Route health data enrichment
 * 
 * @security
 * - Admin roles only
 * - File system access for artifact storage
 */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { existsSync, readdirSync } from "fs";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import {
  generateRouteAliasMetrics,
  readRouteAliasMetrics,
  saveRouteAliasMetrics,
  enrichRouteAliasMetrics,
} from "@/lib/routes/aliasMetrics";
import { loadRouteHealthData } from "@/lib/routes/routeHealth";
import { postRouteMetricsWebhook } from "@/lib/routes/webhooks";

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
      const duplicateRate =
        aliasFiles > 0 ? (duplicateAliases / aliasFiles) * 100 : 0;
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

export async function GET(request: NextRequest) {
  const jsonPath = path.join(process.cwd(), "_artifacts/route-aliases.json");
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  const historyRequested = request.nextUrl.searchParams.get("history") === "1";

  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "SUPER_ADMIN") {
      logger.warn("Route metrics access denied", { role });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (historyRequested) {
      const history = readHistorySnapshots();
      return NextResponse.json({ history });
    }

    if (!refresh) {
      const cached = readRouteAliasMetrics(jsonPath);
      if (cached) {
        return NextResponse.json(cached);
      }
      logger.info("Route metrics cache missing, regenerating", { jsonPath });
    } else {
      logger.info("Route metrics refresh requested", { jsonPath });
    }

    const routeHealth = await loadRouteHealthData();
    const metrics = enrichRouteAliasMetrics(generateRouteAliasMetrics(), {
      routeHealth,
    });
    try {
      saveRouteAliasMetrics(jsonPath, metrics);
    } catch (saveError) {
      logger.warn("Unable to persist route metrics artifact", {
        error: saveError,
      });
    }

    const duplicationRate =
      metrics.totals.aliasFiles > 0
        ? (metrics.totals.duplicateAliases / metrics.totals.aliasFiles) * 100
        : 0;
    if (duplicationRate <= 5) {
      await postRouteMetricsWebhook({
        duplicationRate,
        generatedAt: metrics.generatedAt,
        aliasFiles: metrics.totals.aliasFiles,
      });
    }

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error("Error generating route metrics", error as Error);
    return NextResponse.json(
      { error: "Failed to load route metrics" },
      { status: 500 },
    );
  }
}
