import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { RFQ } from "@/src/server/models/RFQ";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await connectDb();

    const rfq = await (RFQ as any).findOne({
      _id: params.id,
      tenantId: user.tenantId,
      status: "DRAFT"
    });

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found or already published" }, { status: 404 });
    }

    // Update RFQ to published status
    rfq.status = "PUBLISHED";
    rfq.workflow.publishedBy = user.id;
    rfq.workflow.publishedAt = new Date();
    rfq.timeline.publishDate = new Date();

    await rfq.save();

    // TODO: Send notifications to qualified vendors based on:
    // - Location (city-bounded if enabled)
    // - Category/subcategory match
    // - Required qualifications
    // - License requirements

    return NextResponse.json({
      success: true,
      rfq: {
        id: rfq._id,
        code: rfq.code,
        status: rfq.status,
        publishedAt: rfq.workflow.publishedAt
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
