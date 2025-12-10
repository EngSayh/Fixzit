/**
 * Journal Post/Void API Routes - Finance Pack Phase 2
 *
 * Endpoints:
 * - POST /api/finance/journals/[id]/post - Post journal to ledger
 * - POST /api/finance/journals/[id]/void - Void posted journal
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError } from "@/server/utils/errorResponses";

import { dbConnect } from "@/lib/mongodb-unified";
import Journal from "@/server/models/finance/Journal";
import postingService from "@/server/services/finance/postingService";

import { Types } from "mongoose";

// ============================================================================
// HELPER: Get User Session
// ============================================================================

async function getUserSession(req: NextRequest) {
  const user = await getSessionUser(req);

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

// ============================================================================
// POST /api/finance/journals/[id]/post - Post journal to ledger
// ============================================================================

import type { RouteContext } from "@/lib/types/route-context";

import { logger } from "@/lib/logger";
export async function POST(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.journals.post");

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    // Validate journal ID
    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { error: "Invalid journal ID" },
        { status: 400 },
      );
    }

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Check journal exists and belongs to org
        const journal = await Journal.findOne({
          _id: new Types.ObjectId(_params.id),
          orgId: new Types.ObjectId(user.orgId),
        });

        if (!journal) {
          return NextResponse.json(
            { error: "Journal not found" },
            { status: 404 },
          );
        }

        // Check journal status
        if (journal.status !== "DRAFT") {
          return NextResponse.json(
            {
              error: `Cannot post journal with status ${journal.status}`,
            },
            { status: 400 },
          );
        }

        // Post journal to ledger using postingService
        const result = await postingService.postJournal(
          new Types.ObjectId(_params.id),
        );

        return NextResponse.json({
          success: true,
          data: {
            journal: result.journal,
            ledgerEntries: result.ledgerEntries,
            message: `Journal ${result.journal.journalNumber} posted successfully. ${result.ledgerEntries.length} ledger entries created.`,
          },
        });
      },
    );
  } catch (error) {
    logger.error("POST /api/finance/journals/[id]/post error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to journals");
    }

    return handleApiError(error);
  }
}
