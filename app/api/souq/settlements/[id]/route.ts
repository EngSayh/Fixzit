/**
 * Settlement Details API
 * GET /api/souq/settlements/[id] - Get settlement statement details
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongodb-unified";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: statementId } = params;

    await connectDb();
    const db = (await connectDb()).connection.db!;
    const statementsCollection = db.collection("souq_settlements");

    // Fetch statement
    const statement = await statementsCollection.findOne({ statementId });

    if (!statement) {
      return NextResponse.json(
        { error: "Settlement statement not found" },
        { status: 404 },
      );
    }

    // Authorization: Seller can only view own statements, admin can view all
    const userRole = (session.user as { role?: string }).role;
    if (
      userRole !== "ADMIN" &&
      userRole !== "SUPER_ADMIN" &&
      statement.sellerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ statement });
  } catch (error) {
    logger.error("Error fetching settlement", { error });
    return NextResponse.json(
      { error: "Failed to fetch settlement" },
      { status: 500 },
    );
  }
}
