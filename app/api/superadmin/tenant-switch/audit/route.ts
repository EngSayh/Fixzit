import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSuperadminSession, getClientIp } from "@/lib/superadmin/auth";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const rl = await enforceRateLimit(request, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "superadmin:tenant-switch:audit",
  });
  if (rl) return rl;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const target = typeof body?.target === "string" ? body.target : "switch-tenant";

    await audit({
      actorId: session.username,
      actorEmail: session.username,
      actorRole: session.role,
      action: "superadmin.tenant.switchShortcut",
      target,
      targetType: "tenant-switch",
      orgId: session.orgId,
      ipAddress,
      success: true,
      meta: {
        via: body?.via || "header",
      },
    });

    logger.info("[Superadmin] Tenant switch shortcut recorded", {
      actor: session.username,
      target,
      via: body?.via || "header",
      ipAddress,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.warn("[Superadmin] tenant switch audit failed", { error });
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}
