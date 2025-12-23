/**
 * @description Manages accounting journal entries for double-entry bookkeeping.
 * POST creates draft journal entries. GET lists journals with filtering.
 * Supports posting to ledger, voiding, and deletion of draft entries.
 * @route GET /api/finance/journals
 * @route POST /api/finance/journals
 * @access Private - Users with FINANCE:CREATE/VIEW permission
 * @param {string} status - Filter by status (DRAFT, POSTED, VOIDED)
 * @param {string} startDate - Filter from date (ISO format)
 * @param {string} endDate - Filter to date (ISO format)
 * @returns {Object} journals: array, total: number
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE permission
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { dbConnect } from "@/lib/mongodb-unified";
import Journal from "@/server/models/finance/Journal";
import postingService from "@/server/services/finance/postingService";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError } from "@/server/utils/errorResponses";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

import { Types } from "mongoose";
import { z } from "zod";

import { logger } from "@/lib/logger";
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const JournalLineSchema = z.object({
  accountId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), "Invalid account ID"),
  accountCode: z.string().optional(),
  accountName: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
  // Dimensions (optional context)
  propertyId: z
    .string()
    .refine((val) => !val || Types.ObjectId.isValid(val), "Invalid property ID")
    .optional(),
  unitId: z
    .string()
    .refine((val) => !val || Types.ObjectId.isValid(val), "Invalid unit ID")
    .optional(),
  workOrderId: z
    .string()
    .refine(
      (val) => !val || Types.ObjectId.isValid(val),
      "Invalid work order ID",
    )
    .optional(),
  leaseId: z
    .string()
    .refine((val) => !val || Types.ObjectId.isValid(val), "Invalid lease ID")
    .optional(),
  vendorId: z
    .string()
    .refine((val) => !val || Types.ObjectId.isValid(val), "Invalid vendor ID")
    .optional(),
});

const CreateJournalSchema = z.object({
  date: z.string().or(z.date()),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  sourceType: z
    .enum([
      "MANUAL",
      "INVOICE",
      "PAYMENT",
      "EXPENSE",
      "WORK_ORDER",
      "ADJUSTMENT",
    ])
    .optional(),
  sourceId: z
    .string()
    .refine((val) => !val || Types.ObjectId.isValid(val), "Invalid source ID")
    .optional(),
  lines: z
    .array(JournalLineSchema)
    .min(2, "Journal must have at least 2 lines"),
});

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
// POST /api/finance/journals - Create draft journal
// ============================================================================

export async function POST(req: NextRequest) {
  // Rate limiting: 15 requests per minute per IP for journal writes
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "finance-journals:create",
    requests: 15,
    windowMs: 60_000,
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
    requirePermission(user.role, "finance.journals.create");

    // Parse and validate request body
    const { data: rawBody, error: parseError } = await parseBodySafe(req, {
      logPrefix: "[POST /api/finance/journals]",
    });
    if (parseError) {
      return NextResponse.json({ error: parseError }, { status: 400 });
    }
    const validated = CreateJournalSchema.parse(rawBody);

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Create draft journal using postingService
        const journal = await postingService.createJournal({
          orgId: new Types.ObjectId(user.orgId),
          journalDate: new Date(validated.date),
          description: validated.description,
          sourceType: validated.sourceType || "MANUAL",
          sourceId: validated.sourceId
            ? new Types.ObjectId(validated.sourceId)
            : undefined,
          sourceNumber: validated.reference,
          lines: validated.lines.map((line) => ({
            accountId: new Types.ObjectId(line.accountId),
            accountCode: line.accountCode,
            accountName: line.accountName,
            description: line.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            propertyId: line.propertyId
              ? new Types.ObjectId(line.propertyId)
              : undefined,
            unitId: line.unitId ? new Types.ObjectId(line.unitId) : undefined,
            workOrderId: line.workOrderId
              ? new Types.ObjectId(line.workOrderId)
              : undefined,
            leaseId: line.leaseId
              ? new Types.ObjectId(line.leaseId)
              : undefined,
            vendorId: line.vendorId
              ? new Types.ObjectId(line.vendorId)
              : undefined,
          })),
          userId: new Types.ObjectId(user.userId),
        });

        return NextResponse.json(
          {
            success: true,
            data: journal,
          },
          { status: 201 },
        );
      },
    );
  } catch (error) {
    logger.error("POST /api/finance/journals error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to journals");
    }

    return handleApiError(error);
  }
}

// ============================================================================
// GET /api/finance/journals - List journals with filters
// ============================================================================

export async function GET(req: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for reads
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "finance-journals:list",
    requests: 60,
    windowMs: 60_000,
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
    requirePermission(user.role, "finance.journals.read");

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status"); // DRAFT, POSTED, VOID
        const sourceType = searchParams.get("sourceType");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = Math.min(
          parseInt(searchParams.get("limit") || "50", 10),
          100,
        );
        const skip = (page - 1) * limit;

        // Build query
        const query: Record<string, unknown> = {
          orgId: new Types.ObjectId(user.orgId),
        };

        if (status) {
          query.status = status;
        }

        if (sourceType) {
          query.sourceType = sourceType;
        }

        if (startDate || endDate) {
          query.date = {};
          if (startDate)
            (query.date as Record<string, Date>).$gte = new Date(startDate);
          if (endDate)
            (query.date as Record<string, Date>).$lte = new Date(endDate);
        }

        // Execute query with pagination
        const [journals, total] = await Promise.all([
          Journal.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Journal.countDocuments(query),
        ]);

        return NextResponse.json({
          success: true,
          data: journals,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        });
      },
    );
  } catch (error) {
    logger.error("GET /api/finance/journals error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to journals");
    }

    return handleApiError(error);
  }
}
