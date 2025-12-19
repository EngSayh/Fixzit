/**
 * @fileoverview Seller Settlements API
 * @description Lists and manages seller settlement statements with RBAC-based access control and audit logging.
 * @route GET /api/souq/settlements - List seller settlements
 * @access Authenticated (Seller for own settlements, ADMIN/SUPER_ADMIN for all)
 * @module souq
 */

import { NextResponse, NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { auth } from "@/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { SouqSettlement } from "@/server/models/souq/Settlement";
import { AgentAuditLog } from "@/server/models/AgentAuditLog";
import mongoose from "mongoose";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import { parseBodySafe } from "@/lib/api/parse-body";

/**
 * GET /api/souq/settlements - List seller settlements
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for settlement reads
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-settlements:list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const status = searchParams.get("status");
    const targetOrgId = searchParams.get("targetOrgId") || undefined;
    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ??
      inferSubRoleFromRole((session.user as { role?: string }).role);
    const normalizedRole = normalizeRole(
      (session.user as { role?: string }).role,
      normalizedSubRole,
    );
    const isSuperAdmin =
      normalizedRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;

    const orgId = isSuperAdmin ? (targetOrgId || sessionOrgId) : sessionOrgId;
    if (isSuperAdmin && !orgId) {
      return NextResponse.json(
        { error: "targetOrgId is required for platform admins" },
        { status: 400 },
      );
    }
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 },
      );
    }

    // Authorization: seller can view own; finance/admin roles can view any
    const isAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);
    const isFinance =
      normalizedRole === Role.TEAM_MEMBER &&
      !!normalizedSubRole &&
      normalizedSubRole === SubRole.FINANCE_OFFICER;
    if (!isSuperAdmin && !isAdmin && !isFinance && sellerId !== session.user.id) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Settlements not found" }, { status: 404 });
    }

    const query: Record<string, unknown> = { sellerId, orgId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      SouqSettlement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SouqSettlement.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: settlements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("GET /api/souq/settlements error:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settlements" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/souq/settlements - Process settlement (Admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ??
      inferSubRoleFromRole((session.user as { role?: string }).role);
    const normalizedRole = normalizeRole(
      (session.user as { role?: string }).role,
      normalizedSubRole,
    );

    const isSuperAdmin =
      normalizedRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isOrgAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);
    const isFinance =
      normalizedRole === Role.TEAM_MEMBER &&
      !!normalizedSubRole &&
      normalizedSubRole === SubRole.FINANCE_OFFICER;

    if (!isSuperAdmin && !isOrgAdmin && !isFinance) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const { data: body, error: parseError } = await parseBodySafe<{
      settlementId?: string;
      action?: string;
    }>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }
    const { settlementId, action } = body;

    if (!settlementId || !action) {
      return NextResponse.json(
        { error: "Settlement ID and action are required" },
        { status: 400 },
      );
    }

    if (!["approve", "reject", "paid"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be: approve, reject, or paid" },
        { status: 400 },
      );
    }

    // Enforce org scoping on settlement lookup
    const orgId = (session.user as { orgId?: string }).orgId;
    const targetOrgId = (body as { targetOrgId?: string }).targetOrgId;
    const resolvedOrgId = isSuperAdmin ? (targetOrgId || orgId) : orgId;
    if (isSuperAdmin && !resolvedOrgId) {
      return NextResponse.json(
        { error: "targetOrgId is required for platform admins" },
        { status: 400 },
      );
    }
    if (!resolvedOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // NO_LEAN: Document required for status update and save()
     
    const settlement = await SouqSettlement.findOne({ settlementId, orgId: resolvedOrgId });

    if (!settlement) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 },
      );
    }

    // Update settlement based on action
    if (action === "approve") {
      settlement.status = "approved";
    } else if (action === "reject") {
      settlement.status = "rejected";
    } else if (action === "paid") {
      settlement.status = "paid";
      settlement.paidDate = new Date();
    }

    settlement.processedBy = (session.user as { id?: string })
      .id as unknown as mongoose.Types.ObjectId;
    settlement.processedAt = new Date();

    await settlement.save();

    // Audit cross-tenant actions for platform admins
    if (isSuperAdmin && targetOrgId) {
      await AgentAuditLog.create({
        agent_id: "platform-admin",
        assumed_user_id: (session.user as { id?: string }).id || "unknown",
        action_summary: `Settlement ${action} across org boundary`,
        resource_type: "cross_tenant_action",
        resource_id: settlementId,
        orgId: resolvedOrgId,
        targetOrgId,
        request_path: request.url,
        success: true,
        ip_address: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    logger.error("POST /api/souq/settlements error:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to process settlement" },
      { status: 500 },
    );
  }
}
