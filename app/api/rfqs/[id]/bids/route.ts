import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { RFQ } from "@/server/models/RFQ";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { nanoid } from "nanoid";

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
  bidding?: { targetBids?: number; anonymous?: boolean };
  workflow?: { closedBy?: string; closedAt?: Date };
  status: string;
  save: () => Promise<unknown>;
};

const submitBidSchema = z.object({
  vendorId: z.string(),
  vendorName: z.string(),
  amount: z.number(),
  currency: z.string().default("SAR"),
  validity: z.string(),
  deliveryTime: z.number(),
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
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const data = submitBidSchema.parse(await req.json());

    const rfq = await RFQ.findOne({ _id: params.id, tenantId: user.tenantId });

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

    // Check if vendor already submitted a bid
    const bidsArray = Array.isArray(rfqDoc.bids)
      ? rfqDoc.bids
      : (rfqDoc.bids = []);
    const existingBid = bidsArray.find((b) => b.vendorId === data.vendorId);
    if (existingBid) {
      return createSecureResponse(
        { error: "Vendor has already submitted a bid" },
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

    // Add bid
    const bid = {
      bidId: nanoid(),
      ...data,
      submitted: new Date(),
      status: "SUBMITTED",
    };

    bidsArray.push(bid);

    // Update status to BIDDING if first bid
    if (bidsArray.length === 1 && rfqDoc.status === "PUBLISHED") {
      rfqDoc.status = "BIDDING";
    }

    // Check if target bids reached
    if (
      rfqDoc.bidding?.targetBids &&
      bidsArray.length >= rfqDoc.bidding.targetBids
    ) {
      rfqDoc.status = "CLOSED";
      if (rfqDoc.workflow) {
        rfqDoc.workflow.closedBy = user.id;
        rfqDoc.workflow.closedAt = new Date();
      }
    }

    await rfqDoc.save();

    return createSecureResponse(bid, 201, req);
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
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const rfq = await RFQ.findOne({ _id: params.id, tenantId: user.tenantId });

    if (!rfq) {
      return createSecureResponse({ error: "RFQ not found" }, 404, req);
    }

    const rfqDoc = rfq as unknown as RFQWithBids;

    // If anonymous bidding is enabled, hide vendor details
    if (rfqDoc.bidding?.anonymous && rfqDoc.status !== "AWARDED") {
      const anonymizedBids = (rfqDoc.bids || []).map((bid, index: number) => ({
        ...bid,
        vendorId: `VENDOR-${index + 1}`,
        vendorName: `Anonymous Vendor ${index + 1}`,
      }));
      return createSecureResponse(anonymizedBids, 200, req);
    }

    return createSecureResponse(rfqDoc.bids, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
