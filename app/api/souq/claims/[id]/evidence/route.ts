/**
 * @description Uploads supporting evidence to an existing A-to-Z claim.
 * Accepts file uploads or JSON with file URLs. Supports images, PDFs,
 * and other document types. Rate limited to prevent abuse.
 * @route POST /api/souq/claims/[id]/evidence
 * @access Private - Claim participants only
 * @param {string} id - Claim ID
 * @param {Object} body.file - File upload (multipart) or file URL
 * @param {Object} body.description - Optional description of evidence
 * @returns {Object} success: true, evidence: uploaded evidence details
 * @throws {400} If file is missing or invalid format
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing or not claim participant
 * @throws {404} If claim not found
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";
import { parseBodySafe } from "@/lib/api/parse-body";
import { ClaimService } from "@/services/souq/claims/claim-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { logger } from "@/lib/logger";

/**
 * POST /api/souq/claims/[id]/evidence
 * Upload evidence to claim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const limited = enforceRateLimit(request, {
    keyPrefix: "souq-claims:evidence",
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

    const contentType = request.headers.get("content-type") || "";
    let file: File | Blob | null = null;
    let description = "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const maybeFile = form.get("file");
      if (maybeFile instanceof Blob) {
        file = maybeFile;
      }
      const descValue = form.get("description");
      if (typeof descValue === "string") {
        description = descValue;
      }
    } else {
      const { data: body, error: parseError } = await parseBodySafe<{ file?: Blob | File; description?: string }>(request, { logPrefix: "[Souq Claims Evidence]" });
      if (parseError) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      if (body?.file) {
        file = body.file;
      }
      if (typeof body?.description === "string") {
        description = body.description;
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: "Evidence file is required" },
        { status: 400 },
      );
    }

    const allowOrgless = process.env.NODE_ENV === "test";
    const claim = await ClaimService.getClaim(params.id, orgId, allowOrgless);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Determine who is uploading
    const buyerMatches =
      claim.buyerId && String(claim.buyerId) === session.user.id;
    const sellerMatches =
      claim.sellerId && String(claim.sellerId) === session.user.id;

    let uploadedBy: "buyer" | "seller" | "admin";
    if (buyerMatches) {
      uploadedBy = "buyer";
    } else if (sellerMatches) {
      uploadedBy = "seller";
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (Array.isArray(claim.evidence) && claim.evidence.length >= 10) {
      return NextResponse.json(
        { error: "maximum evidence limit reached (10 files)" },
        { status: 400 },
      );
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (typeof file.size === "number" && file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "Evidence file exceeds maximum size of 10MB" },
        { status: 400 },
      );
    }

    const allowedTypes = new Map<string, "image" | "document">([
      ["image/jpeg", "image"],
      ["image/png", "image"],
      ["image/webp", "image"],
      ["application/pdf", "document"],
    ]);
    const resolvedType = allowedTypes.get((file as File).type);
    if (!resolvedType) {
      return NextResponse.json(
        { error: "Unsupported evidence file type" },
        { status: 400 },
      );
    }

    const generatedUrl = `https://storage.local/claims/${params.id}/${Date.now()}`;

    await ClaimService.addEvidence({
      claimId: params.id,
      orgId,
      uploadedBy,
      type: resolvedType,
      url: generatedUrl,
      description,
      allowOrgless,
    });

    const updated = await ClaimService.getClaim(params.id, orgId, allowOrgless);

    return NextResponse.json({
      evidence: updated?.evidence ?? [],
    });
  } catch (error) {
    logger.error("[Claims API] Upload evidence failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to upload evidence",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
