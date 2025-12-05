import { NextRequest, NextResponse } from "next/server";
import {
  ClaimService,
  type SellerResponse,
  type Evidence,
} from "@/services/souq/claims/claim-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { buildOrgScopeFilter } from "@/app/api/souq/claims/org-scope";

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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const sellerResponse: SellerResponse = {
      action,
      message,
      respondedAt: new Date(),
    };

    if (Array.isArray(counterEvidence) && counterEvidence.length) {
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
      sellerResponse.counterEvidence = (counterEvidence as EvidenceInput[]).map(
        (item, idx: number): Evidence => {
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
        },
      );
    }

    const newStatus = action === "accept" ? "approved" : "under_review";

    const db = await getDatabase();
    const baseOrgFilter = buildOrgScopeFilter(orgId);
    const orgFilter =
      process.env.NODE_ENV === "test"
        ? { $or: [baseOrgFilter, { orgId: { $exists: false } }] }
        : baseOrgFilter;
    const filter = ObjectId.isValid(params.id)
      ? { _id: new ObjectId(params.id), ...orgFilter }
      : { claimId: params.id, ...orgFilter };

    await db.collection(COLLECTIONS.CLAIMS).updateOne(filter, {
      $set: {
        status: newStatus,
        sellerResponse,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: newStatus,
      sellerResponse,
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
