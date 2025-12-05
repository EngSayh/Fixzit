import { NextRequest, NextResponse } from "next/server";
import {
  ClaimService,
  type ClaimType,
  type ClaimStatus,
} from "@/services/souq/claims/claim-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";

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

    const body = await request.json();
    const { orderId, reason, description, requestedAmount, requestType } = body;

    const missingFields: string[] = [];
    if (!orderId) missingFields.push("orderId");
    if (!reason) missingFields.push("reason");
    if (!description) missingFields.push("description");
    if (requestedAmount == null) missingFields.push("requestedAmount");
    if (!requestType) missingFields.push("requestType");

    if (missingFields.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 },
      );
    }

    let orderObjectId: ObjectId;
    try {
      orderObjectId = new ObjectId(orderId);
    } catch {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    const db = await getDatabase();
    const order = await db
      .collection(COLLECTIONS.ORDERS)
      .findOne({ _id: orderObjectId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 400 });
    }

    if (String(order.buyerId) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const claimsCollection = db.collection(COLLECTIONS.CLAIMS);
    const existingClaim = await claimsCollection.findOne({
      orderId: { $in: [orderObjectId, orderObjectId.toString()] },
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
    });
    if (existingClaim) {
      return NextResponse.json(
        { error: "An existing claim already covers this order" },
        { status: 400 },
      );
    }

    const orderTotal =
      typeof order.total === "number" ? order.total : Number(order.total ?? 0);
    if (Number(requestedAmount) > orderTotal) {
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

    const recentClaimsCount = await claimsCollection.countDocuments({
      buyerId: { $in: buyerIdFilter },
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
      Number(order.total ?? 0) >= 3000 || Number(requestedAmount) >= 3000;
    if (requiresEnhancedVerification) {
      requiresManualReview = true;
    }

    const claim = await ClaimService.createClaim({
      orderId: orderObjectId.toString(),
      buyerId: session.user.id,
      sellerId,
      productId,
      type: mapReasonToType(reason),
      reason,
      description,
      evidence: [],
      orderAmount: orderTotal,
      requestedAmount: Number(requestedAmount),
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
