import { NextRequest, NextResponse } from "next/server";
import { ClaimService } from "@/services/souq/claims/claim-service";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { buildOrgScopeFilter } from "@/app/api/souq/claims/org-scope";

interface CounterEvidenceEntry {
  type?: string;
  [key: string]: unknown;
}

/**
 * POST /api/souq/claims/[id]/decision
 * Make decision on claim (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await resolveRequestSession(request);
    const userOrgId = session?.user?.orgId;
    if (!session?.user?.id || !userOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const adminRecord = ObjectId.isValid(session.user.id)
      ? await db
          .collection(COLLECTIONS.USERS)
          .findOne({ _id: new ObjectId(session.user.id) })
      : await db.collection(COLLECTIONS.USERS).findOne({ id: session.user.id });

    const role = (adminRecord?.role || session.user.role || "").toUpperCase();
    // 🔒 SECURITY FIX: Use standard role names from UserRole enum
    const allowedRoles = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN", "CLAIMS_ADMIN"];
    if (!allowedRoles.includes(role)) {
      // 🔐 STRICT v4.1: Return 404 (not 403) to prevent info leakage about admin endpoints
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const body = await request.json();
    const decisionRaw = body.decision
      ? String(body.decision).toLowerCase()
      : "";
    const reasoning = body.reasoning ? String(body.reasoning).trim() : "";
    const refundAmountInput = body.refundAmount;

    if (!decisionRaw || !reasoning) {
      return NextResponse.json(
        { error: "Missing required fields: decision, reasoning" },
        { status: 400 },
      );
    }

    const allowOrgless = process.env.NODE_ENV === "test";
    const claim = await ClaimService.getClaim(params.id, userOrgId, allowOrgless);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    // Enforce org scoping via order/org lookup
    const claimOrgFilter = ObjectId.isValid(claim.orderId)
      ? { orgId: new ObjectId(userOrgId), _id: new ObjectId(claim.orderId) }
      : { orgId: new ObjectId(userOrgId), orderId: claim.orderId };
    const orderForScope = await db
      .collection(COLLECTIONS.ORDERS)
      .findOne(claimOrgFilter);
    if (!orderForScope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const baseOrgFilter = buildOrgScopeFilter(userOrgId.toString());
    const orgFilter = allowOrgless
      ? { $or: [baseOrgFilter, { orgId: { $exists: false } }] }
      : baseOrgFilter;
    const filter = ObjectId.isValid(params.id)
      ? { _id: new ObjectId(params.id), ...orgFilter }
      : { claimId: params.id, ...orgFilter };

    let status: string;
    let refundAmountNumber: number;

    if (decisionRaw === "approve") {
      const fallbackAmount =
        typeof claim.refundAmount === "number"
          ? claim.refundAmount
          : Number(claim.requestedAmount ?? claim.orderAmount ?? 0);
      refundAmountNumber =
        typeof refundAmountInput === "number"
          ? refundAmountInput
          : Number(refundAmountInput ?? fallbackAmount);
      status = "approved";

      // 🔒 SAFETY: Cap refund to the order total to prevent over-refunds
      const maxAllowedRefund = Number(
        (orderForScope as { pricing?: { total?: number } })?.pricing?.total ??
          fallbackAmount ??
          0,
      );
      if (refundAmountNumber > maxAllowedRefund) {
        return NextResponse.json(
          {
            error: `Refund amount (${refundAmountNumber}) exceeds order total (${maxAllowedRefund})`,
          },
          { status: 400 },
        );
      }
      if (refundAmountNumber < 0) {
        return NextResponse.json(
          { error: "Refund amount must be non-negative" },
          { status: 400 },
        );
      }
      refundAmountNumber = Math.min(refundAmountNumber, maxAllowedRefund);
    } else if (decisionRaw === "reject") {
      status = "rejected";
      refundAmountNumber = 0;
    } else {
      return NextResponse.json(
        { error: "Unsupported decision" },
        { status: 400 },
      );
    }

    const counterEvidence = claim.sellerResponse?.counterEvidence;
    let sellerProtected = false;
    if (Array.isArray(counterEvidence)) {
      const entries = counterEvidence as unknown as CounterEvidenceEntry[];
      const evidenceTypes = entries.map((entry) =>
        (entry?.type || "").toString().toLowerCase(),
      );
      sellerProtected =
        evidenceTypes.includes("tracking") &&
        evidenceTypes.includes("signature");
    }

    const decisionRecord = {
      outcome: decisionRaw,
      reasoning,
      refundAmount: refundAmountNumber,
      decidedAt: new Date(),
      decidedBy: session.user.id,
    };

    await db.collection(COLLECTIONS.CLAIMS).updateOne(filter, {
      $set: {
        status,
        refundAmount: refundAmountNumber,
        decision: decisionRecord,
        sellerProtected,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      status,
      refundAmount: refundAmountNumber,
      sellerProtected,
    });
  } catch (error) {
    logger.error("[Claims API] Make decision failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to make decision",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
