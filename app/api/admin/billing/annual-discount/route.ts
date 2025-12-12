/**
 * @description Updates annual prepayment discount percentage.
 * Controls the discount applied when customers pay annually vs monthly.
 * @route PATCH /api/admin/billing/annual-discount
 * @access Private - SUPER_ADMIN only
 * @param {Object} body - percentage (0-100)
 * @returns {Object} success: true, discount: updated discount object
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {400} If percentage is invalid
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/db/mongoose";
import DiscountRule from "@/server/models/DiscountRule";
import { requireSuperAdmin } from "@/lib/authz";
import { logger } from "@/lib/logger";

/**
 * Zod schema for annual discount request
 */
const AnnualDiscountSchema = z.object({
  percentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
});

/**
 * Updates annual discount percentage
 */
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    await requireSuperAdmin(req);
    
    const rawBody = await req.json().catch(() => ({}));
    const parsed = AnnualDiscountSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid percentage" },
        { status: 400 }
      );
    }
    
    const { percentage } = parsed.data;

    const doc = await DiscountRule.findOneAndUpdate(
      { key: "ANNUAL_PREPAY" },
      { percentage },
      { upsert: true, new: true },
    );

    return NextResponse.json({ ok: true, discount: doc?.percentage });
  } catch (error) {
    logger.error("[admin/billing/annual-discount] PATCH error", { error });
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
  }
}
