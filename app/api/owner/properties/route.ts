/**
 * @fileoverview Owner Portal API - Properties List
 * @description Returns all properties owned by the authenticated owner.
 * Supports optional financial summaries and unit details inclusion.
 * @route GET /api/owner/properties - List owner's properties
 * @access Protected - Requires BASIC subscription
 * @module owner
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Property } from "@/server/models/Property";
import { requireSubscription } from "@/server/middleware/subscriptionCheck";
import {
  clearTenantContext,
  setTenantContext,
} from "@/server/plugins/tenantIsolation";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

interface PropertyUnit {
  status: string;
  [key: string]: unknown;
}

interface PropertyDocument {
  units?: PropertyUnit[];
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 60 requests per minute per IP
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(`owner:properties:${clientIp}`, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Check subscription
    const subCheck = await requireSubscription(req, {
      requirePlan: "BASIC",
    });

    if (subCheck.error) {
      return subCheck.error;
    }

    const { ownerId, orgId } = subCheck;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const includeFinancials = searchParams.get("includeFinancials") === "true";
    const includeUnits = searchParams.get("includeUnits") !== "false";

    // Connect to database
    await connectToDatabase();

    // Set tenant context for automatic filtering
    setTenantContext({ orgId });

    try {
      // Build projection
      const projection: Record<string, number> = {
      code: 1,
      name: 1,
      description: 1,
      type: 1,
      subtype: 1,
      address: 1,
      "details.totalArea": 1,
      "details.bedrooms": 1,
      "details.bathrooms": 1,
      "details.occupancyRate": 1,
      "ownerPortal.ownerNickname": 1,
      "ownerPortal.agentId": 1,
      "ownerPortal.advertisementNumber": 1,
      "ownerPortal.advertisementExpiry": 1,
      createdAt: 1,
      updatedAt: 1,
    };

    if (includeFinancials) {
      projection["financial.currentValue"] = 1;
      projection["financial.monthlyRent"] = 1;
      projection["financial.annualYield"] = 1;
    }

    if (includeUnits) {
      projection.units = 1;
    }

    // Query properties
    const properties = await Property.find({
      "ownerPortal.ownerId": ownerId,
    })
      .select(projection)
      .sort({ name: 1 })
      .lean();

    // Calculate summary statistics
    const typedProperties = properties as unknown as PropertyDocument[];
    const summary = {
      totalProperties: typedProperties.length,
      totalUnits: typedProperties.reduce(
        (sum: number, p) => sum + (p.units?.length || 0),
        0,
      ),
      occupiedUnits: typedProperties.reduce(
        (sum: number, p) =>
          sum + (p.units?.filter((u) => u.status === "OCCUPIED").length || 0),
        0,
      ),
      averageOccupancy: 0,
    };

    if (summary.totalUnits > 0) {
      summary.averageOccupancy =
        (summary.occupiedUnits / summary.totalUnits) * 100;
    }

    return NextResponse.json({
      success: true,
      data: {
        properties,
        summary,
      },
      subscription: subCheck.status,
    });
    } finally {
      // Ensure tenant context is always cleared, even on error paths
      clearTenantContext();
    }
  } catch (error) {
    logger.error("Error fetching owner properties", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch properties",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
