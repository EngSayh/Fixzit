/**
 * Journal Void API Route - Finance Pack Phase 2
 *
 * Endpoint:
 * - POST /api/finance/journals/[id]/void - Void posted journal (creates reversal)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/server/lib/rbac.config";

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
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const body = await req.json();
    const validated = VoidJournalSchema.parse(body);

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

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 },
      );
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

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to void journal",
      },
      { status: 400 },
    );
  }
}
