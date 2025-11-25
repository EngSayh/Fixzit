/**
 * Souq Deals API - Lightning deals, coupons, promotions
 * @route /api/souq/deals
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { SouqDeal } from "@/server/models/souq/Deal";
import { connectDb } from "@/lib/mongodb-unified";
import { nanoid } from "nanoid";

const dealCreateSchema = z.object({
  type: z.enum([
    "lightning_deal",
    "coupon",
    "bundle",
    "bogo",
    "percentage_off",
    "amount_off",
  ]),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(1000),
  sellerId: z.string().optional(),
  applicableProducts: z
    .array(
      z.object({
        productId: z.string(),
        fsin: z.string(),
      }),
    )
    .optional(),
  applicableCategories: z.array(z.string()).optional(),
  allProducts: z.boolean(),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.number().positive(),
  maxDiscountAmount: z.number().positive().optional(),
  minPurchaseAmount: z.number().min(0).optional(),
  maxUsagePerCustomer: z.number().int().positive(),
  totalUsageLimit: z.number().int().positive().optional(),
  couponCode: z.string().max(20).optional(),
  startDate: z.string(),
  endDate: z.string(),
  priority: z.number().int(),
});

export async function POST(request: NextRequest) {
  try {
    await connectDb();

    const body = await request.json();
    const validatedData = dealCreateSchema.parse(body);

    if (
      !validatedData.applicableProducts &&
      !validatedData.applicableCategories &&
      !validatedData.allProducts
    ) {
      return NextResponse.json(
        {
          error:
            "Deal must have applicable products, categories, or be for all products",
        },
        { status: 400 },
      );
    }

    if (validatedData.couponCode) {
      const existing = await SouqDeal.findOne({
        couponCode: validatedData.couponCode.toUpperCase(),
      });

      if (existing) {
        return NextResponse.json(
          { error: "Coupon code already exists" },
          { status: 400 },
        );
      }
    }

    const dealId = `DEAL-${nanoid(10).toUpperCase()}`;

    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    // Validate date range
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 },
      );
    }

    const now = new Date();

    // Use UTC timestamps for timezone-safe comparison
    const nowUTC = now.getTime();
    const startUTC = startDate.getTime();
    const endUTC = endDate.getTime();

    let status: "draft" | "scheduled" | "active" | "expired" | "paused" =
      "draft";

    if (startUTC > nowUTC) {
      status = "scheduled";
    } else if (startUTC <= nowUTC && endUTC >= nowUTC) {
      status = "active";
    } else if (endUTC < nowUTC) {
      status = "expired";
    }

    const deal = await SouqDeal.create({
      ...validatedData,
      dealId,
      couponCode: validatedData.couponCode?.toUpperCase(),
      currentUsageCount: 0,
      status,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("Deal creation error:", error as Error);
    return NextResponse.json(
      { error: "Failed to create deal" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const sellerId = searchParams.get("sellerId");
    const status = searchParams.get("status");
    const fsin = searchParams.get("fsin");
    const couponCode = searchParams.get("couponCode");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );

    const query: Record<string, unknown> = {};

    if (type) {
      query.type = type;
    }

    if (sellerId) {
      query.sellerId = sellerId;
    }

    if (status) {
      query.status = status;
    }

    if (fsin) {
      query["applicableProducts.fsin"] = fsin;
    }

    if (couponCode) {
      query.couponCode = couponCode.toUpperCase();
    }

    const now = new Date();
    if (status === "active") {
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }

    const skip = (page - 1) * limit;

    const [deals, total] = await Promise.all([
      SouqDeal.find(query)
        .populate("sellerId", "legalName tradeName")
        .sort({ priority: -1, startDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SouqDeal.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: deals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Deal fetch error:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 },
    );
  }
}
