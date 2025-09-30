import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/src/lib/mongodb-unified";
import { RFQ } from "@/src/server/models/RFQ";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";
import { nanoid } from "nanoid";

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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = submitBidSchema.parse(await req.json());

    const rfq = await RFQ.findOne({ _id: params.id, tenantId: user.tenantId });
    
    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    if (rfq.status !== 'PUBLISHED' && rfq.status !== 'BIDDING') {
      return NextResponse.json({ error: "RFQ is not accepting bids" }, { status: 400 });
    }

    // Check if vendor already submitted a bid
    const existingBid = rfq.bids.find((b: any) => b.vendorId === data.vendorId);
    if (existingBid) {
      return NextResponse.json({ error: "Vendor has already submitted a bid" }, { status: 400 });
    }

    // Check bid deadline
    if (new Date() > new Date(rfq.timeline.bidDeadline)) {
      return NextResponse.json({ error: "Bid deadline has passed" }, { status: 400 });
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

    return NextResponse.json(bid, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const rfq = await RFQ.findOne({ _id: params.id, tenantId: user.tenantId });
    
    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    // If anonymous bidding is enabled, hide vendor details
    if (rfq.bidding.anonymous && rfq.status !== 'AWARDED') {
      const anonymizedBids = rfq.bids.map((bid: any, index: number) => ({
        ...bid,
        vendorId: `VENDOR-${index + 1}`,
        vendorName: `Anonymous Vendor ${index + 1}`
      }));
      return NextResponse.json(anonymizedBids);
    }

    return NextResponse.json(rfq.bids);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}