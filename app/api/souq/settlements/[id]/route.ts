/**
 * @fileoverview Settlement Details API
 * @description Retrieves detailed information for a specific settlement statement with authorization checks.
 * @route GET /api/souq/settlements/[id] - Get settlement statement details
 * @access Authenticated (Seller for own statements, ADMIN/SUPER_ADMIN/CORPORATE_ADMIN/FINANCE for all)
 * @module souq
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { SouqSettlement } from "@/server/models/souq/Settlement";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limiting: 60 requests per minute per IP for settlement reads
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-settlements:details",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: statementId } = params;
    const orgId = (session.user as { orgId?: string }).orgId;

    // [FIXZIT-API-SETTLE-001] Validate ID format before database operation
    if (!statementId) {
      return NextResponse.json(
        { error: "Settlement ID required" },
        { status: 400 }
      );
    }

    // TD-001: Migrated from db.collection() to Mongoose model with proper tenant scoping
    // Build filter with org scoping for non-admin users
    const userRole = (session.user as { role?: string }).role;
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "CORPORATE_ADMIN", "FINANCE", "FINANCE_OFFICER"].includes(userRole || "");
    
    const filter: Record<string, unknown> = { settlementId: statementId };
    
    // 🔐 TD-001 FIX: Add org scoping for tenant isolation
    if (orgId) {
      filter.orgId = orgId;
    }

    const statement = await SouqSettlement.findOne(filter).lean();

    if (!statement) {
      return NextResponse.json(
        { error: "Settlement statement not found" },
        { status: 404 },
      );
    }

    // Authorization: Seller can only view own statements, admin can view all
    if (
      !isAdmin &&
      String(statement.sellerId) !== session.user.id
    ) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Settlement statement not found" }, { status: 404 });
    }

    return NextResponse.json({ statement });
  } catch (error) {
    logger.error("Error fetching settlement", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch settlement" },
      { status: 500 },
    );
  }
}
