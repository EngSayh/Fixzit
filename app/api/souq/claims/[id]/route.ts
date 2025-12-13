/**
 * @description Retrieves details for a specific A-to-Z claim.
 * Returns full claim information including timeline, evidence, and status.
 * Only accessible by the claim's buyer or seller.
 * @route GET /api/souq/claims/[id]
 * @access Private - Claim participants only (buyer or seller)
 * @param {string} id - Claim ID
 * @returns {Object} claim: full claim details with order info and timeline
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not buyer or seller of the claim
 * @throws {404} If claim not found
 */
import { NextRequest, NextResponse } from "next/server";
import { ClaimService } from "@/services/souq/claims/claim-service";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { buildOrgScopeFilter } from "@/services/souq/org-scope";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/souq/claims/[id]
 * Get claim details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limiting: 60 requests per minute per IP for claim details
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-claims:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await resolveRequestSession(request);
    const userOrgId = session?.user?.orgId;
    if (!session?.user?.id || !userOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowOrgless = process.env.NODE_ENV === "test";
    const claim = await ClaimService.getClaim(params.id, userOrgId, allowOrgless);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Check ownership
    const buyerMatches =
      claim.buyerId && String(claim.buyerId) === session.user.id;
    const sellerMatches =
      claim.sellerId && String(claim.sellerId) === session.user.id;
    if (!buyerMatches && !sellerMatches) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDatabase();
    const orgFilter = buildOrgScopeFilter(userOrgId.toString());
    const orderIdValue = String(claim.orderId);
    let order = null;
    if (ObjectId.isValid(orderIdValue)) {
      order = await db
        .collection(COLLECTIONS.ORDERS)
        .findOne({ _id: new ObjectId(orderIdValue), ...orgFilter })
        .catch(() => null);
    }
    if (!order) {
      order = await db
        .collection(COLLECTIONS.ORDERS)
        .findOne({ orderId: orderIdValue, ...orgFilter })
        .catch(() => null);
    }
    if (!order) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const buyerDoc = ObjectId.isValid(String(claim.buyerId))
      ? await db
          .collection(COLLECTIONS.USERS)
          .findOne({ _id: new ObjectId(String(claim.buyerId)), ...orgFilter })
          .catch(() => null)
      : null;
    const sellerDoc = ObjectId.isValid(String(claim.sellerId))
      ? await db
          .collection(COLLECTIONS.USERS)
          .findOne({ _id: new ObjectId(String(claim.sellerId)), ...orgFilter })
          .catch(() => null)
      : null;

    return NextResponse.json({
      ...claim,
      _id: claim._id?.toString?.() ?? claim._id,
      order,
      buyer: buyerDoc,
      seller: sellerDoc,
    });
  } catch (error) {
    logger.error("[Claims API] Get claim failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get claim",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/souq/claims/[id]
 * Update claim status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await resolveRequestSession(request);
    const userOrgId = session?.user?.orgId;
    if (!session?.user?.id || !userOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgFilter = buildOrgScopeFilter(userOrgId.toString());

    const body = await request.json();
    const { status } = body;

    const allowOrgless = process.env.NODE_ENV === "test";
    const claim = await ClaimService.getClaim(params.id, userOrgId, allowOrgless);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    // Ensure claim/order belongs to the same org
    const db = await getDatabase();
    const orderIdValue = String(claim.orderId);
    const orderFilter = ObjectId.isValid(orderIdValue)
      ? { _id: new ObjectId(orderIdValue), ...orgFilter }
      : { orderId: orderIdValue, ...orgFilter };
    const order = await db.collection(COLLECTIONS.ORDERS).findOne(orderFilter);
    if (!order) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Only buyer can withdraw
    if (status === "withdrawn" && String(claim.buyerId) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ClaimService.updateStatus(params.id, userOrgId, status);

    return NextResponse.json({
      success: true,
      message: "Claim status updated",
    });
  } catch (error) {
    logger.error("[Claims API] Update claim failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to update claim",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
