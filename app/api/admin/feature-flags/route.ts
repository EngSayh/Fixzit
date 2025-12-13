import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";
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

const ADMIN_ROLES = new Set(["SUPER_ADMIN"]);

function buildContext(session: Session): FeatureFlagContext {
  return {
    userId: session.user.id,
    orgId: session.user.orgId ?? undefined,
    roles: session.user.role ? [session.user.role] : [],
    environment: process.env.NODE_ENV,
  };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin-feature-flags:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_ROLES.has(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const context = buildContext(session);
    const flags = listFeatureFlags().map((flag) => ({
      ...flag,
      enabled: isFeatureEnabled(flag.id, context),
    }));

    return NextResponse.json({
      flags,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[FeatureFlags] Failed to load flags", { error });
    return NextResponse.json(
      { error: "Failed to load feature flags" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_ROLES.has(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<{ id?: string; enabled?: boolean }>(request, { logPrefix: "[admin:feature-flags]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const flagId = body?.id as string | undefined;
    const enabled = body?.enabled as boolean | undefined;

    if (!flagId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const flagDef = getFeatureFlagDefinition(flagId);
    if (!flagDef) {
      return NextResponse.json({ error: "Unknown feature flag" }, { status: 404 });
    }

    const context = buildContext(session);
    const unmetDependencies = (flagDef.dependencies || []).filter(
      (dep) => !isFeatureEnabled(dep, context),
    );

    setFeatureFlag(flagId, enabled);

    return NextResponse.json({
      flag: { ...flagDef, enabled },
      unmetDependencies,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[FeatureFlags] Failed to update flag", { error });
    return NextResponse.json(
      { error: "Failed to update feature flag" },
      { status: 500 },
    );
  }
}
