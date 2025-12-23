/**
 * @fileoverview Work Orders Bulk Import API Route
 * @description Bulk import work orders from JSON payload. Validates each row,
 * creates work orders with auto-generated codes, and reports import results.
 * @route POST /api/work-orders/import - Import up to 100 work orders at once
 * @access Protected - Requires EDIT ability on work orders
 * @module work-orders
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { requireAbility } from "@/server/middleware/withAuthRbac";
import { z } from "zod";
import { WOAbility } from "@/types/work-orders/abilities";

import { createSecureResponse } from "@/server/security/headers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Validation schema for import rows
const ImportRowSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

const ImportRequestSchema = z.object({
  rows: z.array(ImportRowSchema).max(100, "Maximum 100 rows per import"),
});

/**
 * @openapi
 * /api/work-orders/import:
 *   get:
 *     summary: work-orders/import operations
 *     tags: [work-orders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "work-orders-import:post",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const user = await requireAbility(WOAbility.EDIT)(req);
  if (user instanceof NextResponse) return user;
  await connectToDatabase();

  // Extract correlation ID once for the entire request
  const correlationId =
    req.headers.get("x-correlation-id") || crypto.randomUUID();

  // Parse and validate JSON request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return createSecureResponse(
      { error: "Invalid JSON in request body" },
      400,
      req,
    );
  }

  // Validate request structure and rows
  const validationResult = ImportRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return createSecureResponse(
      {
        error: "Validation failed",
        details: validationResult.error.issues,
      },
      422,
      req,
    );
  }

  const { rows } = validationResult.data;
  let created = 0;
  const errors: Array<{ row: number; error: string }> = [];

  // Process each row with error handling
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const code = `WO-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: tenantId set from user.orgId
      await WorkOrder.create({
        tenantId: user.orgId,
        code,
        title: r.title,
        description: r.description,
        priority: r.priority || "MEDIUM",
        createdBy: user.id,
        status: "SUBMITTED",
        statusHistory: [
          {
            from: "DRAFT",
            to: "SUBMITTED",
            byUserId: user.id,
            at: new Date(),
          },
        ],
      });
      created++;
    } catch (error) {
      logger.error(
        `[${correlationId}] Work order import error for row ${i + 1}:`,
        error instanceof Error ? error : new Error(String(error)),
        { row: i + 1 },
      );
      errors.push({ row: i + 1, error: "Failed to import row" });
    }
  }

  return createSecureResponse(
    {
      created,
      total: rows.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    },
    200,
    req,
  );
}
