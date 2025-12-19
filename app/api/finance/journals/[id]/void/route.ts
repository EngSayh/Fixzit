/**
 * @description Voids a posted journal by creating reversal entries.
 * Creates new journal with opposite debit/credit entries.
 * Marks original journal as VOIDED and links to reversal.
 * @route POST /api/finance/journals/[id]/void
 * @access Private - Users with FINANCE:VOID permission
 * @param {string} id - Journal ID (MongoDB ObjectId)
 * @param {Object} body - reason (required void reason for audit)
 * @returns {Object} journal: voided journal, reversalJournal: new reversal
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE:VOID permission
 * @throws {404} If journal not found
 * @throws {409} If journal is not in POSTED status
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError } from "@/server/utils/errorResponses";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

import { dbConnect } from "@/lib/mongodb-unified";
import Journal from "@/server/models/finance/Journal";
import postingService from "@/server/services/finance/postingService";

import { Types } from "mongoose";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const VoidJournalSchema = z.object({
  reason: z.string().min(1, "Void reason is required"),
});

// ============================================================================
// HELPER: Get User Session
// ============================================================================

async function getUserSession(_req: NextRequest) {
  const user = await getSessionUser(_req);

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
// POST /api/finance/journals/[id]/void - Void a journal entry
// ============================================================================

import type { RouteContext } from "@/lib/types/route-context";

import { logger } from "@/lib/logger";
export async function POST(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "finance:journals:void",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.journals.void");

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    // Validate journal ID
    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { error: "Invalid journal ID" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const { data: rawBody, error: parseError } = await parseBodySafe(req, {
      logPrefix: "[POST /api/finance/journals/:id/void]",
    });
    if (parseError) {
      return NextResponse.json({ error: parseError }, { status: 400 });
    }
    const validated = VoidJournalSchema.parse(rawBody);

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
        // NO_LEAN: Document required for journal void operation
         
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
        if (journal.status !== "POSTED") {
          return NextResponse.json(
            {
              error: `Cannot void journal with status ${journal.status}. Only POSTED journals can be voided.`,
            },
            { status: 400 },
          );
        }

        // Void journal using postingService (creates reversal journal)
        const result = await postingService.voidJournal(
          new Types.ObjectId(_params.id),
          new Types.ObjectId(user.userId),
          validated.reason,
        );

        return NextResponse.json({
          success: true,
          data: {
            originalJournal: result.originalJournal,
            reversingJournal: result.reversingJournal,
            message: `Journal ${result.originalJournal.journalNumber} voided. Reversal journal ${result.reversingJournal.journalNumber} created and posted.`,
          },
        });
      },
    );
  } catch (error) {
    logger.error("POST /api/finance/journals/[id]/void error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to journals");
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return handleApiError(error);
  }
}
