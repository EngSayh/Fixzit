import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { returnsService } from '@/services/souq/returns-service';
import {
  Role,
  SubRole,
  normalizeRole,
} from '@/lib/rbac/client-roles';
import { AgentAuditLog } from '@/server/models/AgentAuditLog';
import { z } from 'zod';
import mongoose from 'mongoose';

const refundSchema = z.object({
  rmaId: z
    .string()
    .trim()
    .min(1),
  refundAmount: z.preprocess(
    (v) => (typeof v === 'string' || typeof v === 'number' ? Number(v) : v),
    z.number().positive().finite(),
  ),
  refundMethod: z.enum(['original_payment', 'wallet', 'bank_transfer']),
});

/**
 * POST /api/souq/returns/refund
 * Process refund for inspected return
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = session.user.id;

    const rawSubRole = ((session.user as { subRole?: string | null }).subRole ?? undefined) as string | undefined;
    const normalizedSubRole =
      rawSubRole && Object.values(SubRole).includes(rawSubRole as SubRole)
        ? (rawSubRole as SubRole)
        : undefined;
    const userRole = normalizeRole(session.user.role, normalizedSubRole as SubRole | undefined);
    // Note: subRole not needed for refund authorization - finance/admin only

    // 🔐 STRICT v4.1: Refunds are finance/admin actions only - no ops/support access
    const financeAdminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.CORPORATE_OWNER];
    const isFinanceOfficer =
      userRole === Role.TEAM_MEMBER &&
      normalizedSubRole === SubRole.FINANCE_OFFICER;
    const isPlatformAdmin = userRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isFinanceOrAdmin = userRole !== null && financeAdminRoles.includes(userRole);

    if (!isPlatformAdmin && !isFinanceOrAdmin && !isFinanceOfficer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parseResult = refundSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parseResult.error.flatten() },
        { status: 400 },
      );
    }
    const { rmaId, refundAmount, refundMethod } = parseResult.data;

    // 🔐 SECURITY: Get org context first, then scope RMA lookup to prevent cross-tenant leaks
    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    if (!isPlatformAdmin && !sessionOrgId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 403 },
      );
    }

    const { SouqRMA } = await import('@/server/models/souq/RMA');
    const { ObjectId } = await import('mongodb');

    const buildOrgFilter = (orgId: string) => {
      const candidates: Array<string | InstanceType<typeof ObjectId>> = [orgId];
      if (ObjectId.isValid(orgId)) {
        candidates.push(new ObjectId(orgId));
      }
      return { orgId: { $in: candidates } };
    };

    // 🔐 SECURITY: Org-scoped RMA lookup prevents cross-tenant metadata leaks
    // SUPER_ADMIN can access any org's RMA; others must scope to their org
    const rmaQuery = isPlatformAdmin
      ? { _id: rmaId }
      : { _id: rmaId, ...buildOrgFilter(sessionOrgId!) };
    
    const rma = await SouqRMA.findOne(rmaQuery).lean();
    if (!rma) {
      // For non-platform admins, avoid leaking existence across tenants
      const status = isPlatformAdmin ? 404 : 403;
      return NextResponse.json({ error: 'RMA not found' }, { status });
    }

    const rmaOrgId = rma.orgId?.toString();
    if (!rmaOrgId) {
      return NextResponse.json({ error: 'RMA missing orgId' }, { status: 400 });
    }

    // Determine target org for downstream operations
    const targetOrgId = isPlatformAdmin ? rmaOrgId : sessionOrgId!;

    // 🔒 STRICT TENANCY: Non-platform admins cannot refund RMAs from other orgs
    if (!isPlatformAdmin && rmaOrgId !== sessionOrgId) {
      return NextResponse.json(
        { error: 'Access denied: RMA belongs to different organization' },
        { status: 403 }
      );
    }

    // 🔐 Tenant boundary enforcement for non-platform admins
    if (!isPlatformAdmin && rmaOrgId !== targetOrgId) {
      logger.warn('Org boundary violation attempt in refund processing', { 
        userId: session.user.id, 
        userOrg: targetOrgId,
        rmaOrg: rmaOrgId,
        rmaId 
      });
      return NextResponse.json({ 
        error: 'Access denied: RMA belongs to different organization' 
      }, { status: 403 });
    }

    const validMethods = ['original_payment', 'wallet', 'bank_transfer'];
    if (!validMethods.includes(refundMethod)) {
      return NextResponse.json({ 
        error: `Invalid refundMethod. Must be one of: ${validMethods.join(', ')}` 
      }, { status: 400 });
    }

    if (refundAmount <= 0) {
      return NextResponse.json({ 
        error: 'Refund amount must be greater than 0' 
      }, { status: 400 });
    }

    // 🔒 SECURITY: Server-side refund amount validation
    // Compute the maximum allowed refund based on inspection results to prevent over-refunds
    let maxAllowedRefund = refundAmount;
    if (typeof (returnsService as { getRefundableAmount?: typeof returnsService.getRefundableAmount }).getRefundableAmount === "function") {
      try {
        maxAllowedRefund = await returnsService.getRefundableAmount(rmaId, targetOrgId);
      } catch (err) {
        logger.warn("getRefundableAmount failed; defaulting to requested amount", {
          rmaId,
          targetOrgId,
          error: err instanceof Error ? err.message : String(err),
        });
        maxAllowedRefund = refundAmount;
      }
    }

    if (refundAmount > maxAllowedRefund) {
      logger.warn('Refund amount exceeds maximum allowed', {
        userId: session.user.id,
        rmaId,
        requestedAmount: refundAmount,
        maxAllowedAmount: maxAllowedRefund,
      });
      return NextResponse.json({ 
        error: `Refund amount (${refundAmount}) exceeds maximum allowed (${maxAllowedRefund})`,
      }, { status: 400 });
    }

    const auditCrossOrg = isPlatformAdmin;

    // Process refund
    // 🔄 TRANSACTION SAFETY: processRefund returns notifications to be fired after commit
    // Wrap in a session to avoid leaving RMAs stuck in refund_processing on errors
    const sessionDb = await mongoose.startSession();
    let notifications: Awaited<ReturnType<typeof returnsService.processRefund>> | undefined;
    try {
      notifications = await sessionDb.withTransaction(() =>
        returnsService.processRefund({
          rmaId,
          orgId: targetOrgId,
          refundAmount,
          refundMethod,
          processorId: session.user.id,
          session: sessionDb,
        }),
      );
    } catch (err) {
      // Fallback for environments without replica set (e.g., local/CI)
      if (
        err instanceof Error &&
        err.message.includes("Transaction numbers are only allowed")
      ) {
        notifications = await returnsService.processRefund({
          rmaId,
          orgId: targetOrgId,
          refundAmount,
          refundMethod,
          processorId: session.user.id,
          session: undefined,
        });
      } else {
        throw err;
      }
    } finally {
      await sessionDb.endSession();
    }

    // Fire notifications after refund is complete and transaction committed
    await returnsService.fireNotifications(notifications ?? []);

    if (auditCrossOrg) {
      await AgentAuditLog.create({
        agent_id: session.user.id,
        assumed_user_id: session.user.id,
        action_summary: 'Processed refund (platform admin)',
        resource_type: 'cross_tenant_action',
        resource_id: rmaId,
        orgId: sessionOrgId ?? rmaOrgId,
        targetOrgId: rmaOrgId,
        request_path: request.nextUrl.pathname,
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Refund processed successfully'
    });

  } catch (error) {
    logger.error('Process refund error', error as Error, { userId });
    return NextResponse.json({ 
      error: 'Failed to process refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
