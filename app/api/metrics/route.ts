import { NextRequest, NextResponse } from "next/server";
import { getMetricsRegistry } from "@/lib/monitoring/metrics-registry";
import { logger } from "@/lib/logger";
import { requireSuperAdmin } from "@/lib/authz";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require SUPER_ADMIN + org context to access metrics
    let authContext: { id: string; tenantId: string } | null = null;
    try {
      authContext = await requireSuperAdmin(req);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }
    if (!authContext?.tenantId) {
      return NextResponse.json({ error: "Missing organization context" }, { status: 400 });
    }

    // Rate limiting with org-aware key to avoid abuse
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, authContext.tenantId, authContext.id), 60, 60_000);
    if (!rl.allowed) return rateLimitError();

    const registry = getMetricsRegistry();
    const body = await registry.metrics();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": registry.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("[Metrics] Failed to render /api/metrics payload", { error });
    return new NextResponse("metrics_unavailable", { status: 500 });
  }
}
