/**
 * @description Submits seller's response to an A-to-Z claim.
 * Sellers can accept responsibility, dispute the claim, or offer resolution.
 * Supports counter-evidence uploads to support the response.
 * @route POST /api/souq/claims/[id]/response
 * @access Private - Claim seller only
 * @param {string} id - Claim ID
 * @param {Object} body.action - Response action: accept, dispute, offer_refund
 * @param {Object} body.message - Response message explaining seller's position
 * @param {Object} body.counterEvidence - Optional counter-evidence array
 * @returns {Object} success: true, claim: updated claim with response
 * @throws {400} If action or message missing
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not the seller or org context missing
 * @throws {404} If claim not found
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";
import { ClaimService, type Evidence } from "@/services/souq/claims/claim-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { logger } from "@/lib/logger";

/**
 * POST /api/souq/claims/[id]/response
 * Seller responds to claim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "souq-claims:response",
    requests: 30,
    windowMs: 120_000,
  });
  if (limited) return limited;

  try {
    const session = await resolveRequestSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId?.toString?.();
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action, message, counterEvidence } = body;

    if (!action || !message) {
      return NextResponse.json(
        { error: "Missing required fields: action, message" },
        { status: 400 },
      );
    }

    const claim = await ClaimService.getClaim(params.id, orgId, true);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const sellerMatches =
      claim.sellerId && String(claim.sellerId) === session.user.id;
    if (!sellerMatches) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const allowedStatuses = ["pending_seller_response", "pending_review"];
    if (!allowedStatuses.includes(claim.status as string)) {
      return NextResponse.json(
        { error: "Claim is not awaiting seller response" },
        { status: 400 },
      );
    }

    const createdAt =
      (claim.createdAt && new Date(claim.createdAt)) ||
      (claim.filedAt && new Date(claim.filedAt)) ||
      new Date();
    const maxWindow = 5 * 24 * 60 * 60 * 1000;
    if (Date.now() - createdAt.getTime() > maxWindow) {
      return NextResponse.json(
        { error: "Response deadline exceeded" },
        { status: 400 },
      );
    }

    if (action !== "accept" && action !== "dispute") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    interface EvidenceInput {
      type: string;
      url: string;
      description?: string;
      [key: string]: unknown;
    }
    const allowedTypes = new Set<Evidence["type"]>([
      "video",
      "image",
      "photo",
      "document",
      "tracking_info",
      "message_screenshot",
    ]);
    const evidence = Array.isArray(counterEvidence)
      ? (counterEvidence as EvidenceInput[]).map((item, idx): Evidence => {
          const normalizedType = allowedTypes.has(item.type as Evidence["type"])
            ? (item.type as Evidence["type"])
            : "document";
          return {
            evidenceId: `SR-${params.id}-${idx + 1}`,
            uploadedBy: "seller",
            type: normalizedType,
            url: item.url,
            description: item.description,
            uploadedAt: new Date(),
          };
        })
      : [];

    const proposedSolution =
      action === "accept" ? ("refund_full" as const) : ("dispute" as const);

    await ClaimService.addSellerResponse({
      claimId: params.id,
      orgId,
      sellerId: session.user.id,
      responseText: message,
      action: action as "accept" | "dispute",
      proposedSolution,
      evidence,
    });

    const updated = await ClaimService.getClaim(params.id, orgId, true);

    return NextResponse.json({
      status: updated?.status ?? "under_investigation",
      sellerResponse: updated?.sellerResponse,
    });
  } catch (error) {
    logger.error("[Claims API] Seller response failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to submit response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
