/**
 * @fileoverview Superadmin Feature Flags API
 * @description Feature flag management for superadmin portal
 * @route GET /api/superadmin/feature-flags
 * @route PUT /api/superadmin/feature-flags
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/feature-flags
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  isFeatureEnabled,
  listFeatureFlags,
  setFeatureFlag,
  type FeatureFlagContext,
  getFeatureFlagDefinition,
} from "@/lib/feature-flags";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

function buildContext(session: { username: string }): FeatureFlagContext {
  return {
    userId: session.username,
    orgId: "1", // SAHRECO org ID
    roles: ["SUPER_ADMIN"],
    environment: process.env.NODE_ENV,
  };
}

/**
 * GET /api/superadmin/feature-flags
 * List all feature flags with current state
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-feature-flags:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const context = buildContext(session);
    const flags = listFeatureFlags().map((flag) => ({
      ...flag,
      enabled: isFeatureEnabled(flag.id, context),
    }));

    return NextResponse.json(
      {
        flags,
        evaluatedAt: new Date().toISOString(),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FeatureFlags] Failed to load flags", { error });
    return NextResponse.json(
      { error: "Failed to load feature flags" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/feature-flags
 * Toggle a feature flag
 */
export async function PUT(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-feature-flags:put",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<{
      id?: string;
      enabled?: boolean;
    }>(request, { logPrefix: "[superadmin:feature-flags]" });

    if (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const flagId = body?.id as string | undefined;
    const enabled = body?.enabled as boolean | undefined;

    if (!flagId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body - id and enabled required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const flagDef = getFeatureFlagDefinition(flagId);
    if (!flagDef) {
      return NextResponse.json(
        { error: "Unknown feature flag" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    const context = buildContext(session);
    const unmetDependencies = (flagDef.dependencies || []).filter(
      (dep) => !isFeatureEnabled(dep, context)
    );

    setFeatureFlag(flagId, enabled);

    logger.info("[Superadmin:FeatureFlags] Flag toggled", {
      flagId,
      enabled,
      by: session.username,
    });

    return NextResponse.json(
      {
        flag: { ...flagDef, enabled },
        unmetDependencies,
        updatedAt: new Date().toISOString(),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:FeatureFlags] Failed to update flag", { error });
    return NextResponse.json(
      { error: "Failed to update feature flag" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
