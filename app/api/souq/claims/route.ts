/**
 * @description Manages A-to-Z guarantee claims for Souq marketplace.
 * POST files a new claim against an order for issues like non-delivery,
 * defective items, or items not as described.
 * @route POST /api/souq/claims - File new A-to-Z claim
 * @access Private - Authenticated buyers only
 * @param {Object} body.orderId - Order ID to file claim against
 * @param {Object} body.reason - Claim reason (not_received, defective, wrong_item, etc.)
 * @param {Object} body.description - Detailed description of issue
 * @param {Object} body.evidence - Optional array of evidence URLs (photos, documents)
 * @returns {Object} success: true, claim: created claim with ID and status
 * @throws {400} If validation fails or claim deadline exceeded
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 * @throws {404} If order not found
 */
import { NextRequest, NextResponse } from "next/server";
import { parseBodySafe } from "@/lib/api/parse-body";
import {
  ClaimService,
  type ClaimType,
  type ClaimStatus,
} from "@/services/souq/claims/claim-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { connectDb } from "@/lib/mongodb-unified";
import { ClaimsOrder } from "@/server/models/souq/ClaimsOrder";
import { SouqClaim } from "@/server/models/souq/Claim";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { buildSouqOrgFilter as buildOrgScope } from "@/services/souq/org-scope";
import { CreateClaimSchema } from "@/lib/validations/souq-claims";

const CLAIM_DEADLINE_MS = 30 * 24 * 60 * 60 * 1000;

function mapReasonToType(reason: string): ClaimType {
  const normalized = reason?.toLowerCase() ?? "";
  if (normalized.includes("not_as_described")) return "not_as_described";
  if (normalized.includes("defective") || normalized.includes("damaged"))
    return "defective_item";
  if (
    normalized.includes("not_received") ||
    normalized.includes("not_received")
  )
    return "item_not_received";
  if (normalized.includes("wrong")) return "wrong_item";
  if (normalized.includes("missing")) return "missing_parts";
  if (normalized.includes("counterfeit")) return "counterfeit";
  return "item_not_received";
}

/**
 * POST /api/souq/claims
 * File a new A-to-Z claim
 */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "souq-claims:create",
    requests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const session = await resolveRequestSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request, { logPrefix: "[Souq Claims]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Validate request body with Zod schema (TD-001-2)
    const validation = CreateClaimSchema.safeParse(body);
    if (!validation.success) {
      const zodError = validation.error;
      const errors = zodError.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    const { orderId, reason, description, requestedAmount, requestType } = validation.data;

    let orderObjectId: ObjectId;
    try {
      orderObjectId = new ObjectId(orderId);
    } catch {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    await connectDb();
    // eslint-disable-next-line local/require-tenant-scope -- buildOrgScope spread contains orgId scope
    const order = await ClaimsOrder.findOne({ _id: orderObjectId, ...buildOrgScope(orgId) }).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 400 });
    }

    if (String(order.buyerId) !== session.user.id) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null;
    if (
      !deliveredAt ||
      Date.now() - deliveredAt.getTime() > CLAIM_DEADLINE_MS
    ) {
      return NextResponse.json(
        { error: "Claim deadline exceeded for this order" },
        { status: 400 },
      );
    }

    const existingClaim = await SouqClaim.findOne({
      orderId: { $in: [orderObjectId, orderObjectId.toString()] },
      $or: [buildOrgScope(orgId), { orgId: { $exists: false } }],
      status: {
        $nin: [
          "withdrawn",
          "resolved_refund_full",
          "resolved_refund_partial",
          "resolved_replacement",
          "rejected",
          "closed",
        ],
      },
    }).lean();
    if (existingClaim) {
      return NextResponse.json(
        { error: "An existing claim already covers this order" },
        { status: 400 },
      );
    }

    const orderTotal =
      typeof order.total === "number" ? order.total : Number(order.total ?? 0);
    if (requestedAmount > orderTotal) {
      return NextResponse.json(
        { error: "Requested amount exceeds order total" },
        { status: 400 },
      );
    }

    const sellerId = order.sellerId ? String(order.sellerId) : undefined;
    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller information missing for order" },
        { status: 400 },
      );
    }

    const firstItem =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items[0]
        : null;
    const productId =
      (firstItem?.productId && String(firstItem.productId)) ||
      firstItem?.name ||
      order.orderNumber ||
      "unknown-product";

    const buyerIdFilter: (string | ObjectId)[] = [session.user.id];
    if (ObjectId.isValid(session.user.id)) {
      buyerIdFilter.push(new ObjectId(session.user.id));
    }

    const recentClaimsCount = await SouqClaim.countDocuments({
      buyerId: { $in: buyerIdFilter },
      $or: [buildOrgScope(orgId), { orgId: { $exists: false } }],
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    let fraudRisk: "low" | "medium" | "high" = "low";
    let requiresManualReview = false;
    if (recentClaimsCount >= 5) {
      fraudRisk = "high";
      requiresManualReview = true;
    } else if (recentClaimsCount >= 3) {
      fraudRisk = "medium";
    }

    const requiresEnhancedVerification =
      Number(order.total ?? 0) >= 3000 || requestedAmount >= 3000;
    if (requiresEnhancedVerification) {
      requiresManualReview = true;
    }

    const claim = await ClaimService.createClaim({
      orgId,
      orderId: orderObjectId.toString(),
      buyerId: session.user.id,
      sellerId,
      productId,
      type: mapReasonToType(reason),
      reason,
      description,
      evidence: [],
      orderAmount: orderTotal,
      requestedAmount,
      requestType,
    });

    return NextResponse.json(
      {
        claimId: claim._id?.toHexString?.() ?? claim.claimId,
        status: claim.status,
        fraudRisk,
        requiresManualReview,
        requiresEnhancedVerification,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[Claims API] Create claim failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to create claim",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/souq/claims
 * List claims (buyer or seller view)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await resolveRequestSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view"); // 'buyer' or 'seller'
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const targetOrgId = searchParams.get("targetOrgId") || undefined;
    const sessionOrgId = (session.user as { orgId?: string }).orgId;

    // Robust parsing with validation and bounds
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    const pageParsed = pageRaw ? parseInt(pageRaw, 10) : 1;
    const limitParsed = limitRaw ? parseInt(limitRaw, 10) : 20;
    const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
    const limit = Number.isFinite(limitParsed)
      ? Math.min(Math.max(1, limitParsed), 100)
      : 20;

    const effectiveView = (view || "buyer").toLowerCase();
    const isAdminUser = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(
      (session.user.role || "").toUpperCase(),
    );
    const isSuperAdmin = (session.user.role || "").toUpperCase() === "SUPER_ADMIN";

    // Resolve org scope: require targetOrgId for SUPER_ADMIN without session org; otherwise use session org
    const resolvedOrgId = isSuperAdmin ? (targetOrgId || sessionOrgId) : sessionOrgId;
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

    const filters: {
      orgId: string;
      buyerId?: string;
      sellerId?: string;
      status?: ClaimStatus;
      type?: ClaimType;
      priority?: string;
      limit: number;
      offset: number;
    } = {
      orgId: resolvedOrgId,
      limit,
      offset: (page - 1) * limit,
    };

    if (effectiveView === "admin" && isAdminUser) {
      // Admin view: allow all claims
    } else if (effectiveView === "seller") {
      filters.sellerId = session.user.id;
    } else {
      filters.buyerId = session.user.id;
    }
    if (status) filters.status = status as ClaimStatus;
    if (type) filters.type = type as ClaimType;
    if (priority) filters.priority = priority;

    const result = await ClaimService.listClaims(filters);

    return NextResponse.json({
      claims: result.claims,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logger.error("[Claims API] List claims failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to list claims",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
