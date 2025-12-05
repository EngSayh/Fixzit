import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import { z } from "zod";

const InitiateSchema = z.object({
  orderId: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        listingId: z.string().trim().min(1),
        quantity: z.coerce.number().int().positive(),
        reason: z.enum([
          "damaged",
          "defective",
          "wrong_item",
          "not_as_described",
          "changed_mind",
          "better_price",
          "other",
        ]),
        comments: z.string().trim().min(1).optional(),
      }),
    )
    .min(1, "At least one item is required"),
  buyerPhotos: z.array(z.string().trim().min(1)).optional(),
});

/**
 * POST /api/souq/returns/initiate
 * Initiate a return request
 * Buyer-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    let payload: z.infer<typeof InitiateSchema>;
    try {
      payload = InitiateSchema.parse(await request.json());
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message =
          error.issues.map((issue) => issue.message).join("; ") ||
          "Invalid request payload";
        return NextResponse.json({ error: message }, { status: 400 });
      }
      throw error;
    }

    const { orderId, items, buyerPhotos } = payload;

    // Initiate return
    const rmaId = await returnsService.initiateReturn({
      orderId,
      buyerId: session.user.id,
      orgId,
      items,
      buyerPhotos,
    });

    return NextResponse.json({
      success: true,
      rmaId,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    logger.error("Initiate return error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to initiate return",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
