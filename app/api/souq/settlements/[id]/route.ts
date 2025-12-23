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
import { connectDb } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";

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

    await connectDb();
    const db = (await connectDb()).connection.db!;
    const statementsCollection = db.collection(COLLECTIONS.SOUQ_SETTLEMENTS);

    // Fetch statement
    // eslint-disable-next-line local/require-lean, local/require-tenant-scope -- NO_LEAN: Native driver; Seller access check follows
    const statement = await statementsCollection.findOne({ statementId });

    if (!statement) {
      return NextResponse.json(
        { error: "Settlement statement not found" },
        { status: 404 },
      );
    }

    // Authorization: Seller can only view own statements, admin can view all
    const userRole = (session.user as { role?: string }).role;
    // 🔒 SECURITY FIX: Include CORPORATE_ADMIN and FINANCE roles
    if (
      !["ADMIN", "SUPER_ADMIN", "CORPORATE_ADMIN", "FINANCE", "FINANCE_OFFICER"].includes(userRole || "") &&
      statement.sellerId !== session.user.id
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
