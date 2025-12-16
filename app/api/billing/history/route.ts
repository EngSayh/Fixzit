/**
 * @description Retrieves paginated billing history for the authenticated user's organization.
 * Supports both corporate (org-based) and owner (user-based) subscription types.
 * Returns invoices with payment status, amounts, and associated subscription details.
 * @route GET /api/billing/history
 * @access Private - Authenticated users with organization context
 * @query {number} page - Page number for pagination (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 50)
 * @returns {Object} invoices: array of invoice records, pagination metadata
 * @throws {401} If user is not authenticated
 * @throws {400} If organization context is missing
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import {
  SubscriptionInvoice,
  type ISubscriptionInvoice,
} from "@/server/models/SubscriptionInvoice";
import Subscription from "@/server/models/Subscription";
import { logger } from "@/lib/logger";
import { auth } from "@/auth";
import { createSecureResponse } from "@/server/security/headers";
import { Types, type Model } from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/billing/history
 * 
 * Returns paginated billing history for the authenticated user's organization.
 * Supports both corporate (org-based) and owner (user-based) subscriptions.
 */
export async function GET(req: NextRequest) {
  enforceRateLimit(req, { requests: 30, windowMs: 60_000, keyPrefix: "billing:history" });
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return createSecureResponse({ error: "Authentication required" }, 401, req);
    }

    const userId = session.user.id;
    const orgId = (session.user as { orgId?: string }).orgId;

    if (!orgId) {
      return createSecureResponse({ error: "Organization context required" }, 400, req);
    }

    await connectToDatabase();

    // Parse pagination params
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    // Validate ObjectId format before creating instances
    if (!Types.ObjectId.isValid(orgId)) {
      return createSecureResponse({ error: "Invalid organization ID" }, 400, req);
    }
    if (!Types.ObjectId.isValid(userId)) {
      return createSecureResponse({ error: "Invalid user ID" }, 400, req);
    }

    const orgObjectId = new Types.ObjectId(orgId);
    const userObjectId = new Types.ObjectId(userId);

    // Find all subscriptions belonging to this tenant or owner
    const subscriptions = await Subscription.find({
      $or: [
        { tenant_id: orgObjectId },
        { owner_user_id: userObjectId },
      ],
    }).select("_id").lean();

    const subscriptionIds = subscriptions.map((s) => s._id);

    if (subscriptionIds.length === 0) {
      return NextResponse.json({
        invoices: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Count total invoices
    const InvoiceModel = SubscriptionInvoice as Model<ISubscriptionInvoice>;

    const total = await InvoiceModel.countDocuments({
      orgId: orgObjectId,
      subscriptionId: { $in: subscriptionIds },
    });

    // Fetch invoices with pagination, sorted by newest first
    const invoices = await InvoiceModel.find({
      orgId: orgObjectId,
      subscriptionId: { $in: subscriptionIds },
    })
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response
    const formattedInvoices = invoices.map((inv) => ({
      id: `INV-${String(inv._id).slice(-8).toUpperCase()}`,
      _id: inv._id,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      periodStart: inv.periodStart?.toISOString(),
      periodEnd: inv.periodEnd?.toISOString(),
      dueDate: inv.dueDate?.toISOString(),
      paidAt: inv.paidAt?.toISOString() || null,
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("[billing/history] Error fetching invoices", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch billing history" },
      { status: 500 }
    );
  }
}
