import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import { AgentAuditLog } from "@/server/models/AgentAuditLog";
import { inspectSchema, parseJsonBody, formatZodError, ensureValidObjectId } from "../validation";

/**
 * POST /api/souq/returns/inspect
 * Complete return inspection
 * Admin/Inspector-only endpoint
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = session.user.id;

    // Admin or operations staff with inspect permissions - canonical Role + subRole per STRICT v4.1
    const rawSubRole = ((session.user as { subRole?: string | null }).subRole ?? undefined) as string | undefined;
    const normalizedSubRole =
      rawSubRole && Object.values(SubRole).includes(rawSubRole as SubRole)
        ? (rawSubRole as SubRole)
        : undefined;
    const userRole = normalizeRole(session.user.role, normalizedSubRole as SubRole | undefined);
    const userSubRole =
      normalizeSubRole(normalizedSubRole as SubRole | undefined) ??
      inferSubRoleFromRole(session.user.role);

    const isPlatformAdmin = userRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isAdminRole =
      userRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(userRole);
    
    // TEAM_MEMBER with ops/support subRole can inspect returns
    const isOpsStaff =
      userRole === Role.TEAM_MEMBER &&
      userSubRole !== undefined &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(userSubRole);
    
    if (!isPlatformAdmin && !isAdminRole && !isOpsStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const parsed = await parseJsonBody(request, inspectSchema);
    if (!parsed.success) {
      return NextResponse.json(
        formatZodError(parsed.error),
        { status: 400 },
      );
    }
    const { rmaId, condition, restockable, inspectionNotes, inspectionPhotos } =
      parsed.data;

    if (!ensureValidObjectId(rmaId)) {
      return NextResponse.json(
        { error: "Invalid rmaId" },
        { status: 400 },
      );
    }

    // Complete inspection
    await returnsService.inspectReturn({
      rmaId,
      orgId,
      inspectorId: session.user.id,
      condition,
      restockable,
      inspectionNotes,
      inspectionPhotos,
    });

    if (isPlatformAdmin) {
      await AgentAuditLog.create({
        agent_id: session.user.id,
        assumed_user_id: session.user.id,
        action_summary: "Inspected return (platform admin)",
        resource_type: "souq_rma",
        resource_id: rmaId,
        orgId,
        targetOrgId: orgId,
        request_path: request.nextUrl.pathname,
        success: true,
        ip_address: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Inspection completed successfully",
    });
  } catch (error) {
    logger.error("Inspect return error", error as Error, { userId });
    return NextResponse.json(
      {
        error: "Failed to complete inspection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
