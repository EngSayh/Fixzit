/**
 * @description Approves or rejects return requests.
 * Admin endpoint for processing return authorization decisions.
 * Supports ops/support sub-roles on TEAM_MEMBER.
 * @route POST /api/souq/returns/approve
 * @access Private - Admin, ops manager, or support agent
 * @param {Object} body.rmaId - Return Merchandise Authorization ID
 * @param {Object} body.action - Decision: approve, reject
 * @param {Object} body.reason - Optional rejection reason
 * @returns {Object} success: true, return: updated return status
 * @throws {400} If validation fails
 * @throws {401} If user is not authenticated
 * @throws {403} If user lacks authorization
 * @throws {404} If return not found
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import { AgentAuditLog } from "@/server/models/AgentAuditLog";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import { approveSchema, parseJsonBody, formatZodError } from "../validation";

/**
 * POST /api/souq/returns/approve
 * Approve or reject a return request
 * Admin-only endpoint with explicit org scoping
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT v4.1: admins plus ops/support sub-roles on TEAM_MEMBER
    const rawSubRole = ((session.user as { subRole?: string | null }).subRole ?? undefined) as string | undefined;
    const normalizedSubRole =
      rawSubRole && Object.values(SubRole).includes(rawSubRole as SubRole)
        ? (rawSubRole as SubRole)
        : undefined;
    const userRole = normalizeRole(session.user.role, normalizedSubRole);
    const userSubRole =
      normalizeSubRole(normalizedSubRole) ??
      inferSubRoleFromRole(session.user.role);

    const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.CORPORATE_OWNER];
    const isPlatformAdmin = userRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isOrgAdmin = userRole !== null && adminRoles.includes(userRole) && !isPlatformAdmin;
    const isOpsOrSupport =
      userRole === Role.TEAM_MEMBER &&
      !!userSubRole &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(userSubRole);

    if (!isPlatformAdmin && !isOrgAdmin && !isOpsOrSupport) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sessionOrgId = (session.user as { orgId?: string }).orgId;

    const parsed = await parseJsonBody(request, approveSchema);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }
    const { rmaId, approve, approvalNotes, rejectionReason, targetOrgId } = parsed.data;

    // 🔒 TENANT SCOPING: orgId required; platform admins must explicitly set targetOrgId if switching orgs
    if (isPlatformAdmin && !sessionOrgId && !targetOrgId) {
      return NextResponse.json(
        { error: "targetOrgId is required for platform admins without a session org" },
        { status: 400 },
      );
    }
    const orgId = isPlatformAdmin ? (targetOrgId || sessionOrgId) : sessionOrgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    const scopedOrgId = orgId as string;

    const actorId = session.user.id;
    const actorRole = session.user.role;
    const auditCrossOrg = isPlatformAdmin && targetOrgId && targetOrgId !== sessionOrgId;

    const logCrossOrgAudit = async (action: string) => {
      if (!auditCrossOrg) return;
      await AgentAuditLog.create({
        agent_id: actorId,
        assumed_user_id: actorId,
        action_summary: action,
        resource_type: "cross_tenant_action",
        resource_id: rmaId,
        orgId: scopedOrgId,
        targetOrgId: targetOrgId ?? sessionOrgId,
        request_path: request.nextUrl.pathname,
        success: true,
        ip_address: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
      });
    };

    if (approve) {
      await returnsService.approveReturn({
        rmaId,
        orgId: scopedOrgId,
        adminId: actorId,
        approvalNotes,
      });

      await logCrossOrgAudit("Approved return across org boundary");

      logger.info("Return approved", {
        actorUserId: actorId,
        actorRole,
        rmaId,
        targetOrgId: scopedOrgId,
        crossOrg: auditCrossOrg,
      });

      return NextResponse.json({
        success: true,
        message: "Return approved successfully",
      });
    }

    // Schema validation guarantees rejectionReason is present when approve is false
    // Adding explicit guard for TypeScript type narrowing
    if (!rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required when rejecting a return" },
        { status: 400 },
      );
    }

    await returnsService.rejectReturn(
      rmaId,
      actorId,
      rejectionReason,
      scopedOrgId,
    );

    await logCrossOrgAudit("Rejected return across org boundary");

    logger.info("Return rejected", {
      actorUserId: actorId,
      actorRole,
      rmaId,
      targetOrgId: scopedOrgId,
      crossOrg: auditCrossOrg,
    });

    return NextResponse.json({
      success: true,
      message: "Return rejected successfully",
    });
  } catch (error) {
    logger.error("Approve/reject return error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to process return approval",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
