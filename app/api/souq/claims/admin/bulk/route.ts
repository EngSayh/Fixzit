import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDb } from "@/lib/mongo";
import { logger } from "@/lib/logger";
import { SouqClaim } from "@/server/models/souq/Claim";
import { SouqOrder, type IOrder } from "@/server/models/souq/Order";
import { User } from "@/server/models/User";
import { Types } from "mongoose";
import { RefundProcessor } from "@/services/souq/claims/refund-processor";
import { addJob, QUEUE_NAMES } from "@/lib/queues/setup";
import { isValidObjectId } from "@/lib/utils/object-id";

const ELIGIBLE_STATUSES = [
  "submitted",
  "under_review",
  "pending_seller_response",
  "pending_investigation",
  "escalated",
] as const;

/**
 * POST /api/souq/claims/admin/bulk
 *
 * Bulk approve or reject multiple claims at once
 *
 * Body: {
 *   action: 'approve' | 'reject',
 *   claimIds: string[],
 *   reason: string
 * }
 *
 * @security Requires admin role
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const userRole = session.user.role;
    const isSuperAdmin = session.user.isSuperAdmin;

    // 🔒 SECURITY FIX: Include CORPORATE_ADMIN per 14-role matrix
    if (!isSuperAdmin && !["ADMIN", "CORPORATE_ADMIN"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action, claimIds, reason } = body;

    // Validate input
    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 },
      );
    }

    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return NextResponse.json(
        { error: "claimIds must be a non-empty array" },
        { status: 400 },
      );
    }

    if (claimIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 claims can be processed at once" },
        { status: 400 },
      );
    }

    const invalidIds = claimIds.filter((id: unknown) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid claimIds: ${invalidIds.join(",")}` },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 20) {
      return NextResponse.json(
        { error: "Reason must be at least 20 characters" },
        { status: 400 },
      );
    }

    await connectDb();

    const normalizedIds = claimIds.map((id: string) => String(id));
    const objectIds = normalizedIds
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));

    // 🔒 SECURITY FIX: CORPORATE_ADMIN can only process claims involving their org's users
    const isPlatformAdmin = isSuperAdmin || userRole === "ADMIN";
    let orgUserFilter: Record<string, unknown> | null = null;
    const orgId = (session.user as { orgId?: string }).orgId;
    
    if (!isPlatformAdmin && userRole === "CORPORATE_ADMIN") {
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization context required for CORPORATE_ADMIN" },
          { status: 403 },
        );
      }
      
      const orgUserIds = await User.find({ orgId }, { _id: 1 }).lean();
      const userIdStrings = orgUserIds.map((u: { _id: Types.ObjectId }) => String(u._id));
      
      orgUserFilter = {
        $or: [
          { buyerId: { $in: userIdStrings } },
          { sellerId: { $in: userIdStrings } },
        ],
      };
    }

    // Fetch all claims to validate they exist and can be bulk processed
    const baseOrgScope = isPlatformAdmin ? {} : { orgId };
    const claimQuery = {
      ...baseOrgScope,
      $and: [
        { status: { $in: ELIGIBLE_STATUSES } },
        { $or: [{ _id: { $in: objectIds } }, { claimId: { $in: normalizedIds } }] },
        ...(orgUserFilter ? [orgUserFilter] : []),
      ],
    };
    const claims = await SouqClaim.find(claimQuery);

    if (claims.length === 0) {
      return NextResponse.json(
        { error: "No valid claims found for bulk action" },
        { status: 404 },
      );
    }

    // ✅ PERF FIX: Batch load all orders to avoid N+1 queries
    const orderIds = claims.map((c) => c.orderId).filter(Boolean);
    const orders = await SouqOrder.find({ _id: { $in: orderIds }, ...baseOrgScope }).lean();
    const orderMap = new Map(orders.map((o) => [String(o._id), o as unknown as IOrder]));

    const results = {
      success: 0,
      failed: 0,
      partialSuccess: 0, // Claim saved but notification/refund failed
      errors: [] as { claimId: string; error: string; stage: string }[],
      warnings: [] as { claimId: string; warning: string }[],
    };

    // Process each claim
    for (const claim of claims) {
      const claimIdStr = String(claim._id);
      let claimSaved = false;
      let refundProcessed = false;

      try {
        const newStatus = action === "approve" ? "resolved" : "closed";

        // Fetch order early for validation and payment details (required for refund)
        let order: IOrder | null = null;
        if (action === "approve") {
          order = orderMap.get(String(claim.orderId)) || null;
          if (!order) {
            results.failed++;
            results.errors.push({
              claimId: claimIdStr,
              error: "Order not found - cannot process refund",
              stage: "order_lookup",
            });
            continue;
          }
        }

        // 🔒 SAFETY: Cap refund to order total to prevent over-refund
        const rawRefundAmount = action === "approve" ? claim.requestedAmount : 0;
        const maxAllowedRefund =
          action === "approve" && order?.pricing?.total != null
            ? order.pricing.total
            : rawRefundAmount;
        if (action === "approve" && rawRefundAmount > maxAllowedRefund) {
          results.failed++;
          results.errors.push({
            claimId: claimIdStr,
            error: `Requested refund (${rawRefundAmount}) exceeds order total (${maxAllowedRefund})`,
            stage: "validation",
          });
          continue;
        }
        const refundAmount = Math.min(rawRefundAmount, maxAllowedRefund);

        // Validate refund amount
        if (action === "approve" && refundAmount <= 0) {
          results.failed++;
          results.errors.push({
            claimId: claimIdStr,
            error: "Requested refund amount must be greater than 0",
            stage: "validation",
          });
          continue;
        }

        if (action === "approve" && refundAmount > 0 && order) {
          if (!order.payment?.transactionId) {
            results.failed++;
            results.errors.push({
              claimId: claimIdStr,
              error:
                "Order payment transaction ID missing - cannot process refund",
              stage: "payment_validation",
            });
            continue;
          }

          if (!order.payment?.method) {
            results.failed++;
            results.errors.push({
              claimId: claimIdStr,
              error: "Order payment method missing - cannot process refund",
              stage: "payment_validation",
            });
            continue;
          }
        }

        // Update claim status and decision
        claim.status = newStatus;
        claim.decision = {
          decidedBy: session.user.id,
          decidedAt: new Date(),
          outcome: action === "approve" ? "approved" : "denied",
          reasoning: reason.trim(),
          refundAmount,
          evidence: [],
        };

        // Add timeline event
        if (!claim.timeline) {
          claim.timeline = [];
        }
        claim.timeline.push({
          status: `admin_decision_${newStatus}`,
          performedBy: session.user.id,
          timestamp: new Date(),
          note: `Bulk action: ${reason.trim()}`,
        });

        // Save claim first
        await claim.save();
        claimSaved = true;

        // Send notification to buyer and seller
        try {
          const claimOrgId =
            (claim as { orgId?: string | Types.ObjectId }).orgId?.toString() ||
            orgId ||
            (order as { orgId?: string | Types.ObjectId } | null | undefined)?.orgId?.toString();
          await addJob(QUEUE_NAMES.NOTIFICATIONS, "souq-claim-decision", {
            claimId: claimIdStr,
            buyerId: String(claim.buyerId),
            sellerId: String(claim.sellerId),
            orgId: claimOrgId, // 🔐 Tenant-scoped notification routing
            decision: action === "approve" ? "approved" : "denied",
            reasoning: reason.trim(),
            refundAmount,
          });
        } catch (notifError) {
          logger.error(
            "Failed to queue claim decision notification",
            notifError as Error,
            {
              claimId: claimIdStr,
            },
          );
          results.warnings.push({
            claimId: claimIdStr,
            warning:
              "Notification queuing failed - manual notification may be required",
          });
        }

        // Process refund if approved
        if (action === "approve" && refundAmount > 0 && order) {
          const orderOrgId = order.orgId?.toString();
          if (!orderOrgId) {
            results.failed++;
            results.errors.push({
              claimId: claimIdStr,
              error: "Order missing orgId - cannot scope refund",
              stage: "validation",
            });
            continue;
          }
          try {
            // 🔐 Get orgId from order for tenant-scoped notifications
            await RefundProcessor.processRefund({
              claimId: claimIdStr,
              orderId: String(claim.orderId),
              buyerId: String(claim.buyerId),
              sellerId: String(claim.sellerId),
              orgId: orderOrgId, // 🔐 Tenant context for notifications
              amount: refundAmount,
              reason: reason.trim(),
              originalPaymentMethod: order.payment.method,
              originalTransactionId: order.payment.transactionId,
            });
            refundProcessed = true;
          } catch (refundError) {
            logger.error(
              "Refund processing failed for approved claim",
              refundError as Error,
              {
                claimId: claimIdStr,
                refundAmount,
                orderId: String(claim.orderId),
                transactionId: order.payment.transactionId,
              },
            );
            results.warnings.push({
              claimId: claimIdStr,
              warning: `Refund processing failed: ${refundError instanceof Error ? refundError.message : "Unknown error"} - manual refund required`,
            });
          }
        }

        // Determine final status
        if (claimSaved) {
          if (
            action === "reject" ||
            (action === "approve" && refundAmount === 0)
          ) {
            // No refund needed for rejection or zero amount
            results.success++;
          } else if (action === "approve" && refundProcessed) {
            // Full success: claim saved + refund processed
            results.success++;
          } else {
            // Partial success: claim saved but refund failed
            results.partialSuccess++;
            results.warnings.push({
              claimId: claimIdStr,
              warning: "Claim decision saved but refund processing incomplete",
            });
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          claimId: claimIdStr,
          error: error instanceof Error ? error.message : "Unknown error",
          stage: claimSaved ? "post_save" : "claim_update",
        });
        logger.error("Bulk action failed for claim", error as Error, {
          claimId: claimIdStr,
          action,
          stage: claimSaved ? "post_save" : "claim_update",
        });
      }
    }

    // Calculate overall success
    const hasFailures = results.failed > 0;
    const hasWarnings =
      results.warnings.length > 0 || results.partialSuccess > 0;

    return NextResponse.json({
      success: !hasFailures,
      message: hasFailures
        ? `Bulk action completed with ${results.failed} failures`
        : hasWarnings
          ? `Processed ${results.success} claims with ${results.partialSuccess} partial successes`
          : `Successfully processed ${results.success} claims`,
      results: {
        total: claimIds.length,
        processed: claims.length,
        success: results.success,
        partialSuccess: results.partialSuccess,
        failed: results.failed,
        notFound: claimIds.length - claims.length,
        errors: results.errors,
        warnings: results.warnings,
      },
    });
  } catch (error) {
    logger.error("Bulk claims action error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
