import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { RFQ } from "@/src/server/models/RFQ";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await db;

    const rfq = await (RFQ as any).findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId, status: "DRAFT" },
      {
        $set: {
          status: "PUBLISHED",
          "workflow.publishedBy": user.id,
          "workflow.publishedAt": new Date(),
          "timeline.publishDate": new Date(),
        },
      },
      { new: true }
    );

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found or already published" }, { status: 404 });
    }

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
        publishedAt: rfq?.workflow?.publishedAt || null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
