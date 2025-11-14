import { NextRequest} from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { RFQ } from "@/server/models/RFQ";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { nanoid } from "nanoid";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError, handleApiError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

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
  alternates: z.array(z.object({
    description: z.string(),
    priceAdjustment: z.number()
  })).optional(),
  exceptions: z.array(z.string()).optional()
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
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = submitBidSchema.parse(await req.json());

    const rfq = (await RFQ.findOne({ _id: params.id, tenantId: user.tenantId }));
    
    if (!rfq) {
      return createSecureResponse({ error: "RFQ not found" }, 404, req);
    }

    if (rfq.status !== 'PUBLISHED' && rfq.status !== 'BIDDING') {
      return createSecureResponse({ error: "RFQ is not accepting bids" }, 400, req);
    }

    // Check if vendor already submitted a bid
    const existingBid = rfq.bids.find((b: { vendorId: string }) => b.vendorId === data.vendorId);
    if (existingBid) {
      return createSecureResponse({ error: "Vendor has already submitted a bid" }, 400, req);
    }

    // Check bid deadline
    if (new Date() > new Date(rfq.timeline.bidDeadline)) {
      return createSecureResponse({ error: "Bid deadline has passed" }, 400, req);
    }

    // Add bid
    const bid = {
      bidId: nanoid(),
      ...data,
      submitted: new Date(),
      status: "SUBMITTED"
    };

    rfq.bids.push(bid);

    // Update status to BIDDING if first bid
    if (rfq.bids.length === 1 && rfq.status === 'PUBLISHED') {
      rfq.status = 'BIDDING';
    }

    // Check if target bids reached
    if (rfq.bidding.targetBids && rfq.bids.length >= rfq.bidding.targetBids) {
      rfq.status = 'CLOSED';
      rfq.workflow.closedBy = user.id;
      rfq.workflow.closedAt = new Date();
    }

    await rfq.save();

    return createSecureResponse(bid, 201, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const rfq = (await RFQ.findOne({ _id: params.id, tenantId: user.tenantId }));
    
    if (!rfq) {
      return createSecureResponse({ error: "RFQ not found" }, 404, req);
    }

    // If anonymous bidding is enabled, hide vendor details
    if (rfq.bidding.anonymous && rfq.status !== 'AWARDED') {
      const anonymizedBids = (rfq.bids as Bid[]).map((bid, index: number) => ({
        ...bid,
        vendorId: `VENDOR-${index + 1}`,
        vendorName: `Anonymous Vendor ${index + 1}`
      }));
      return createSecureResponse(anonymizedBids, 200, req);
    }

    return createSecureResponse(rfq.bids, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}