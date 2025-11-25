/**
 * Owner Portal API - ROI Reports
 *
 * GET /api/owner/reports/roi
 * Calculates ROI, NOI, and financial analytics for owner's portfolio
 *
 * Query Parameters:
 * - period: "3m" | "6m" | "9m" | "12m" | "ytd" | "custom" (default: "12m")
 * - startDate: ISO date string (required if period=custom)
 * - endDate: ISO date string (required if period=custom)
 * - propertyId: ObjectId (optional) - specific property or entire portfolio
 * - includeCapitalGains: boolean (default: false)
 *
 * Requires: PRO subscription + roiAnalytics feature
 */

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { requireSubscription } from "@/server/middleware/subscriptionCheck";
import { logger } from "@/lib/logger";
import {
  calculatePortfolioAnalytics,
  getStandardPeriods,
  type AnalyticsPeriod,
} from "@/server/services/owner/analytics";

export async function GET(req: NextRequest) {
  try {
    // Check subscription - requires PRO plan with ROI analytics feature
    const subCheck = await requireSubscription(req, {
      requirePlan: "PRO",
      requireFeature: "roiAnalytics",
    });

    if (subCheck.error) {
      return subCheck.error;
    }

    const { ownerId, orgId } = subCheck;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get("period") || "12m";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const propertyIdParam = searchParams.get("propertyId");
    const includeCapitalGains =
      searchParams.get("includeCapitalGains") === "true";

    // Determine period
    let period: AnalyticsPeriod;

    if (periodParam === "custom") {
      if (!startDateParam || !endDateParam) {
        return NextResponse.json(
          { error: "startDate and endDate required for custom period" },
          { status: 400 },
        );
      }
      period = {
        startDate: new Date(startDateParam),
        endDate: new Date(endDateParam),
        label: "Custom Period",
      };
    } else {
      const standardPeriods = getStandardPeriods();
      const periodMap: Record<string, number> = {
        "3m": 0,
        "6m": 1,
        "9m": 2,
        "12m": 3,
        ytd: 4,
      };

      const periodIndex = periodMap[periodParam];
      if (periodIndex === undefined) {
        return NextResponse.json(
          { error: "Invalid period parameter" },
          { status: 400 },
        );
      }

      period = standardPeriods[periodIndex];
    }

    // Parse property ID if provided
    let propertyId: Types.ObjectId | undefined;
    if (propertyIdParam) {
      propertyId = new Types.ObjectId(propertyIdParam);
    }

    // Connect to database
    await connectToDatabase();

    // Calculate analytics
    const analytics = await calculatePortfolioAnalytics({
      ownerId: ownerId!,
      propertyId,
      period,
      includeCapitalGains,
      orgId: orgId!,
    });

    return NextResponse.json({
      success: true,
      data: analytics,
      subscription: subCheck.status,
    });
  } catch (error) {
    logger.error("Error calculating ROI report", { error });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate ROI report",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
