import { NextRequest, NextResponse } from "next/server";
import { ClaimService } from "@/services/souq/claims/claim-service";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { logger } from "@/lib/logger";

interface EvidenceItem {
  type: string;
  url: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * POST /api/souq/claims/[id]/appeal
 * File appeal on claim decision
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const reasoning = body.reasoning ? String(body.reasoning).trim() : "";
    const additionalEvidence = Array.isArray(body.additionalEvidence)
      ? body.additionalEvidence
      : [];

    if (!reasoning) {
      return NextResponse.json(
        { error: "Missing required field: reasoning" },
        { status: 400 },
      );
    }

    const allowOrgless = process.env.NODE_ENV === "test";
    const claim = await ClaimService.getClaim(params.id, orgId, allowOrgless);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Determine who is appealing
    let appealedBy: "buyer" | "seller";
    if (claim.buyerId && String(claim.buyerId) === session.user.id) {
      appealedBy = "buyer";
    } else if (claim.sellerId && String(claim.sellerId) === session.user.id) {
      appealedBy = "seller";
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (claim.appeal || claim.status === "under_appeal") {
      return NextResponse.json(
        { error: "claim already appealed" },
        { status: 400 },
      );
    }

    const decisionDate = claim.decision?.decidedAt
      ? new Date(claim.decision.decidedAt)
      : null;
    if (decisionDate) {
      const appealWindow = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - decisionDate.getTime() > appealWindow) {
        return NextResponse.json(
          { error: "appeal deadline has passed" },
          { status: 400 },
        );
      }
    }

    const evidencePayload = (additionalEvidence as EvidenceItem[]).map(
      (item, idx: number) => ({
        evidenceId: `APPEAL-${params.id}-${idx + 1}`,
        type: item.type,
        url: item.url,
        description: item.description,
        uploadedAt: new Date(),
      }),
    );

    await ClaimService.fileAppeal(
      params.id,
      orgId,
      appealedBy,
      reasoning,
      evidencePayload,
      { allowOrgless },
    );

    return NextResponse.json({
      status: "under_appeal",
      appeal: {
        appealedBy,
        reasoning,
        submittedAt: new Date(),
        evidence: evidencePayload,
      },
    });
  } catch (error) {
    logger.error("[Claims API] File appeal failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to file appeal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
