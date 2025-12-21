/**
 * @fileoverview RFQ Bid Management
 * @description Handles vendor bid submissions and retrieval for specific RFQs with anonymous bidding support
 * @route GET /api/rfqs/[id]/bids - List all bids for an RFQ
 * @route POST /api/rfqs/[id]/bids - Submit a new bid
 * @access Private - Requires vendor authentication for submissions
 * @module rfqs
 */
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { RFQ } from "@/server/models/RFQ";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { Types } from "mongoose";
import { ProjectBidModel } from "@/server/models/ProjectBid";
import { logger } from "@/lib/logger";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError, handleApiError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

// Comprehensive Bid interface matching all properties a bid can have
interface Bid {
  bidId: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  currency: string;
  validity: string;
  deliveryTime: number;
  paymentTerms: string;
  technicalProposal?: string;
  commercialProposal?: string;
  alternates?: Array<{
    description: string;
    priceAdjustment: number;
  }>;
  exceptions?: string[];
  submitted: Date;
  status: string;
}

type RFQWithBids = {
  bids: Bid[];
  timeline?: { bidDeadline?: Date | string };
  bidding?: { targetBids?: number; maxBids?: number; anonymous?: boolean };
  workflow?: { closedBy?: string; closedAt?: Date };
  status: string;
  save: () => Promise<unknown>;
};

const submitBidSchema = z.object({
  // vendorId and vendorName are derived from the authenticated user to prevent spoofing
  amount: z.number().positive(),
  currency: z.string().default("SAR"),
  validity: z.union([z.string(), z.number()]).transform((value) =>
    typeof value === "number" ? `${value}` : value.trim(),
  ),
  deliveryTime: z.number().positive(),
  paymentTerms: z.string(),
  technicalProposal: z.string().optional(),
  commercialProposal: z.string().optional(),
  alternates: z
    .array(
      z.object({
        description: z.string(),
        priceAdjustment: z.number(),
      }),
    )
    .optional(),
  exceptions: z.array(z.string()).optional(),
});

/**
 * @openapi
 * /api/rfqs/[id]/bids:
 *   get:
 *     summary: rfqs/[id]/bids operations
 *     tags: [rfqs]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    const userRole = (user as { role?: string }).role;
    const allowedBidderRoles = new Set([
      "VENDOR",
      "SUPPLIER",
      "TENANT",
      "END_USER",
      "CORPORATE_EMPLOYEE",
    ]);
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    if (userRole && !allowedBidderRoles.has(userRole.toUpperCase())) {
      return createSecureResponse(
        { error: "Forbidden", message: "Insufficient role to submit bid" },
        403,
        req,
      );
    }
    if (!params?.id || typeof params.id !== "string" || !Types.ObjectId.isValid(params.id)) {
      return createSecureResponse({ error: "Invalid RFQ id" }, 400, req);
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const data = submitBidSchema.parse(await req.json());

    const rfq = await RFQ.findOne({ _id: params.id, orgId: user.orgId }).lean();

    if (!rfq) {
      return createSecureResponse({ error: "RFQ not found" }, 404, req);
    }

    const rfqDoc = rfq as unknown as RFQWithBids;

    if (rfqDoc.status !== "PUBLISHED" && rfqDoc.status !== "BIDDING") {
      return createSecureResponse(
        { error: "RFQ is not accepting bids" },
        400,
        req,
      );
    }

    if (!Types.ObjectId.isValid(String(user.id))) {
      return createSecureResponse(
        { error: "Invalid vendor identifier" },
        400,
        req,
      );
    }

    const vendorObjectId = new Types.ObjectId(String(user.id));
    const currentBidCount = await ProjectBidModel.countDocuments({
      rfqId: rfq._id,
      orgId: user.orgId,
    });

    // Check if vendor already submitted a bid
    const existingBid = await ProjectBidModel.findOne({
      rfqId: rfq._id,
      vendorId: vendorObjectId,
      orgId: user.orgId,
    })
      .lean()
      .exec();
    if (existingBid) {
      return createSecureResponse(
        { error: "Vendor has already submitted a bid" },
        400,
        req,
      );
    }

    if (
      rfqDoc.bidding?.maxBids &&
      currentBidCount >= rfqDoc.bidding.maxBids
    ) {
      return createSecureResponse(
        { error: "RFQ is no longer accepting bids (max reached)" },
        400,
        req,
      );
    }

    // Check bid deadline
    if (
      rfqDoc.timeline?.bidDeadline &&
      new Date() > new Date(rfqDoc.timeline.bidDeadline)
    ) {
      return createSecureResponse(
        { error: "Bid deadline has passed" },
        400,
        req,
      );
    }

    // Add bid as standalone ProjectBid document (schema uses references, not embedded)
    const bidDoc = await ProjectBidModel.create({
      orgId: user.orgId,
      rfqId: rfq._id,
      rfqCode: (rfq as { code?: string }).code,
      bidAmount: data.amount,
      currency: data.currency,
      validityText: data.validity,
      deliveryTimeDays: data.deliveryTime,
      paymentTermsNote: data.paymentTerms,
      technicalProposal: data.technicalProposal,
      commercialProposal: data.commercialProposal,
      alternates: data.alternates,
      exceptions: data.exceptions,
      status: "SUBMITTED",
      vendorId: vendorObjectId,
      vendorName:
        (user as { name?: string; email?: string }).name ??
        (user as { email?: string }).email ??
        "Vendor",
      submittedAt: new Date(),
    });

    // Update RFQ status and reference list atomically
    const update: Record<string, unknown> = {
      $addToSet: { bids: bidDoc._id },
    };
    const nextStatus: Record<string, unknown> = {};
    if (rfqDoc.status === "PUBLISHED") {
      nextStatus.status = "BIDDING";
    }

    const totalBidCount = currentBidCount + 1;

    if (
      rfqDoc.bidding?.targetBids &&
      totalBidCount >= rfqDoc.bidding.targetBids
    ) {
      nextStatus.status = "CLOSED";
      nextStatus["workflow.closedBy"] = user.id;
      nextStatus["workflow.closedAt"] = new Date();
    }

    if (Object.keys(nextStatus).length > 0) {
      update.$set = nextStatus;
    }

    await RFQ.updateOne({ _id: rfq._id, orgId: user.orgId }, update);

    logger.info("[RFQ] Bid submitted", {
      rfqId: params.id,
      orgId: user.orgId,
      userId: user.id,
      role: userRole,
      bidId: bidDoc._id.toString(),
    });

    return createSecureResponse(
      {
        bidId: bidDoc._id.toString(),
        vendorId: vendorObjectId.toString(),
        vendorName: bidDoc.vendorName,
        amount: data.amount,
        currency: data.currency,
        validity: data.validity,
        deliveryTime: data.deliveryTime,
        paymentTerms: data.paymentTerms,
        status: "SUBMITTED",
        submitted: bidDoc.submittedAt,
      },
      201,
      req,
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return createSecureResponse(
        { error: "Unauthorized", message: "Missing tenant context" },
        401,
        req,
      );
    }
    if (!params?.id || typeof params.id !== "string" || !Types.ObjectId.isValid(params.id)) {
      return createSecureResponse({ error: "Invalid RFQ id" }, 400, req);
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const rfq = await RFQ.findOne({ _id: params.id, orgId: user.orgId }).lean();

    if (!rfq) {
      return createSecureResponse({ error: "RFQ not found" }, 404, req);
    }

    const rfqDoc = rfq as unknown as RFQWithBids;

    const bids = await ProjectBidModel.find({
      rfqId: rfq._id,
      orgId: user.orgId,
    })
      .sort({ submittedAt: -1 })
      .limit(200) // Safety cap to prevent unbounded responses
      .lean()
      .exec();

    const shaped = bids.map((bid, index: number) => {
      const bidId =
        (bid as { _id?: Types.ObjectId | string })?._id?.toString?.() ??
        (bid as { _id?: Types.ObjectId | string })._id?.toString?.() ??
        "";
      const vendorId = (bid as { vendorId?: Types.ObjectId | string }).vendorId;
      const vendorIdString =
        typeof vendorId === "string"
          ? vendorId
          : vendorId?.toString?.() ?? "UNKNOWN";
      const base = {
        bidId,
        vendorId: vendorIdString,
        vendorName: (bid as { vendorName?: string }).vendorName ?? vendorIdString,
        amount: (bid as { bidAmount?: number }).bidAmount,
        currency: (bid as { currency?: string }).currency,
        validity: (bid as { validityText?: string }).validityText,
        deliveryTime: (bid as { deliveryTimeDays?: number }).deliveryTimeDays,
        paymentTerms: (bid as { paymentTermsNote?: string }).paymentTermsNote,
        technicalProposal: (bid as { technicalProposal?: string }).technicalProposal,
        commercialProposal: (bid as { commercialProposal?: string }).commercialProposal,
        alternates: (bid as { alternates?: Bid["alternates"] }).alternates ?? [],
        exceptions: (bid as { exceptions?: Bid["exceptions"] }).exceptions ?? [],
        submitted: (bid as { submittedAt?: Date }).submittedAt,
        status: (bid as { status?: string }).status ?? "SUBMITTED",
      };

      if (rfqDoc.bidding?.anonymous && rfqDoc.status !== "AWARDED") {
        return {
          ...base,
          vendorId: `VENDOR-${index + 1}`,
          vendorName: `Anonymous Vendor ${index + 1}`,
        };
      }

      return base;
    });

    return createSecureResponse(shaped, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
