/**
 * @fileoverview FM Work Order Auto-Assignment API
 * @description Auto-assigns work orders to technicians/vendors using rule-based or ML scoring.
 * @route POST /api/fm/work-orders/auto-assign - Auto-assign a single work order
 * @route POST /api/fm/work-orders/auto-assign?bulk=true - Auto-assign multiple work orders
 * @module api/fm/work-orders/auto-assign
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { parseBodySafe } from "@/lib/api/parse-body";
import { isValidObjectId } from "@/lib/utils/objectid";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import { autoAssignWorkOrder, type AssignmentCandidate, type ScoringMode } from "@/services/fm/auto-assignment-engine";
import { requireFmAbility } from "@/app/api/fm/utils/fm-auth";
import { resolveTenantId, isCrossTenantMode } from "@/app/api/fm/utils/tenant";
import { FMErrors, fmErrorContext } from "@/app/api/fm/errors";
import { getCanonicalUserId, recordTimelineEntry } from "../utils";

const routingModeSchema = z.enum(["heuristic", "ml"]);

const singleAssignSchema = z.object({
  workOrderId: z.string(),
  routingMode: routingModeSchema.optional(),
});

const bulkAssignSchema = z.object({
  workOrderIds: z
    .array(z.string())
    .min(1)
    .max(20, "Maximum 20 work orders per bulk auto-assign"),
  skipIfAssigned: z.boolean().default(true),
  routingMode: routingModeSchema.optional(),
});

function resolveRoutingMode(requested: ScoringMode | undefined, aiEnabled: boolean): ScoringMode {
  if (!requested) {
    return aiEnabled ? "ml" : "heuristic";
  }
  return requested;
}

function mapAutoAssignError(message: string, req: NextRequest) {
  const context = fmErrorContext(req);
  switch (message) {
    case "Work order not found":
      return FMErrors.notFound("Work order", context);
    case "Work order already assigned":
      return FMErrors.conflict("Work order is already assigned", context);
    case "Outside business hours":
      return FMErrors.validationError("Outside business hours", undefined, context);
    case "Auto-assignment is disabled":
      return FMErrors.forbidden("Auto-assignment is disabled", context);
    default:
      return FMErrors.validationError(message, undefined, context);
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "fm-workorders-auto-assign:post",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await requireFmAbility("ASSIGN")(req);
    if (actor instanceof NextResponse) return actor;

    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError(
        "User identifier is required",
        undefined,
        fmErrorContext(req),
      );
    }

    const isSuperAdmin = actor.role === "SUPER_ADMIN";
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId, {
      isSuperAdmin,
      userId: actorId,
      allowHeaderOverride: isSuperAdmin,
    });
    if ("error" in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;

    if (isCrossTenantMode(tenantId)) {
      return FMErrors.forbidden(
        "Auto-assignment requires a specific organization context",
        fmErrorContext(req),
      );
    }

    const autoAssignEnabled = isFeatureEnabled("fm.work_order_auto_assign", {
      orgId: tenantId,
      userId: actorId,
    });
    if (!autoAssignEnabled) {
      return FMErrors.forbidden(
        "Auto-assignment feature is not enabled for this organization",
        fmErrorContext(req),
      );
    }

    const aiEnabled = isFeatureEnabled("fm.work_order_ai_routing", {
      orgId: tenantId,
      userId: actorId,
    });

    await connectToDatabase();

    const url = new URL(req.url);
    const isBulk = url.searchParams.get("bulk") === "true";

    const { data: body, error: parseError } = await parseBodySafe(req);
    if (parseError || !body) {
      return FMErrors.validationError(
        parseError || "Invalid request body",
        undefined,
        fmErrorContext(req),
      );
    }

    if (isBulk) {
      const parseResult = bulkAssignSchema.safeParse(body);
      if (!parseResult.success) {
        return FMErrors.validationError(
          "Validation failed",
          parseResult.error.flatten(),
          fmErrorContext(req),
        );
      }

      const { workOrderIds, skipIfAssigned, routingMode: requestedMode } = parseResult.data;
      const routingMode = resolveRoutingMode(requestedMode, aiEnabled);
      if (routingMode === "ml" && !aiEnabled) {
        return FMErrors.forbidden("AI routing is not enabled", fmErrorContext(req));
      }

      const invalidIds = workOrderIds.filter((id) => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        return FMErrors.invalidId("work order", fmErrorContext(req));
      }

      const results: {
        assigned: Array<{ workOrderId: string; assignee: AssignmentCandidate }>;
        failed: Array<{ workOrderId: string; error: string }>;
        skipped: string[];
      } = { assigned: [], failed: [], skipped: [] };

      for (const workOrderId of workOrderIds) {
        const result = await autoAssignWorkOrder(tenantId, workOrderId, actorId, {
          scoringMode: routingMode,
        });

        if (result.success && result.assignee) {
          results.assigned.push({ workOrderId, assignee: result.assignee });

          await recordTimelineEntry({
            workOrderId,
            orgId: tenantId,
            action: "assigned",
            description: `Auto-assigned to ${result.assignee.name}`,
            metadata: {
              autoAssigned: true,
              score: result.assignee.score,
              reasons: result.assignee.reasons,
              assigneeUserId: result.assignee.type === "user" ? result.assignee.id : undefined,
              assigneeVendorId: result.assignee.type === "vendor" ? result.assignee.id : undefined,
            },
            performedBy: actorId,
            performedAt: new Date(),
          });
          continue;
        }

        const errorMessage = result.error || "Auto-assignment failed";
        if (errorMessage === "Work order already assigned" && skipIfAssigned) {
          results.skipped.push(workOrderId);
        } else {
          results.failed.push({ workOrderId, error: errorMessage });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          assigned: results.assigned.length,
          failed: results.failed.length,
          skipped: results.skipped.length,
          details: results,
          routingMode,
        },
        message: "Bulk auto-assignment completed",
      });
    }

    const parseResult = singleAssignSchema.safeParse(body);
    if (!parseResult.success) {
      return FMErrors.validationError(
        "Validation failed",
        parseResult.error.flatten(),
        fmErrorContext(req),
      );
    }

    const { workOrderId, routingMode: requestedMode } = parseResult.data;
    if (!isValidObjectId(workOrderId)) {
      return FMErrors.invalidId("work order", fmErrorContext(req));
    }

    const routingMode = resolveRoutingMode(requestedMode, aiEnabled);
    if (routingMode === "ml" && !aiEnabled) {
      return FMErrors.forbidden("AI routing is not enabled", fmErrorContext(req));
    }

    const result = await autoAssignWorkOrder(tenantId, workOrderId, actorId, {
      scoringMode: routingMode,
    });

    if (!result.success || !result.assignee) {
      return mapAutoAssignError(result.error || "Auto-assignment failed", req);
    }

    await recordTimelineEntry({
      workOrderId,
      orgId: tenantId,
      action: "assigned",
      description: `Auto-assigned to ${result.assignee.name}`,
      metadata: {
        autoAssigned: true,
        score: result.assignee.score,
        reasons: result.assignee.reasons,
        assigneeUserId: result.assignee.type === "user" ? result.assignee.id : undefined,
        assigneeVendorId: result.assignee.type === "vendor" ? result.assignee.id : undefined,
      },
      performedBy: actorId,
      performedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        workOrderId,
        assignee: result.assignee,
        routingMode,
      },
      message: "Work order auto-assigned",
    });
  } catch (error) {
    logger.error("[fm/work-orders/auto-assign] POST error", error as Error);
    return FMErrors.internalError("Failed to auto-assign work order", fmErrorContext(req));
  }
}
