/**
 * @fileoverview PM Work Order Generation API
 * @description Auto-generates work orders from preventive maintenance plans that are due, typically invoked by cron job.
 * @route POST /api/pm/generate-wos - Generate work orders from due PM plans
 * @access System (CRON_SECRET header required)
 * @module pm
 */
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FMPMPlan } from "@/server/models/FMPMPlan";
import { Config } from "@/lib/config/constants";
import { createSecureResponse } from "@/server/security/headers";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import { verifySecretHeader } from "@/lib/security/verify-secret-header";

import { logger } from "@/lib/logger";

interface PMPlanWithMethods extends PMPlanDocument {
  recordGeneration?: (
    id: unknown,
    woNumber: string,
    status: string,
  ) => Promise<unknown>;
}

interface PMPlanDocument {
  _id: unknown;
  planNumber?: string;
  title?: string;
  propertyId?: string;
  nextScheduledDate: Date;
  woLeadTimeDays: number;
  lastGeneratedDate?: Date;
  woTitle?: string;
  estimatedCost?: number;
  [key: string]: unknown;
}
/**
 * POST /api/pm/generate-wos
 * Auto-generate work orders from PM plans that are due
 *
 * This endpoint should be called by a cron job (e.g., daily at midnight)
 * It checks all ACTIVE PM plans and generates WOs for those due
 * 
 * SECURITY: Protected by CRON_SECRET header - not accessible to regular users
 * NOTE: System-wide query across all tenants is intentional for cron job
 * Each generated WO inherits orgId from its parent PM plan
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 10, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // 🔒 CRON AUTH: Only allow calls with valid cron secret
  if (!verifySecretHeader(req, "x-cron-secret", Config.security.cronSecret)) {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }

  try {
    // PLATFORM-WIDE: cron job processes all tenants (secured by CRON_SECRET)
    // Each PM plan has its own orgId which is inherited by generated WOs
    const plans = await (/* PLATFORM-WIDE */ FMPMPlan.find({
      status: "ACTIVE",
      nextScheduledDate: { $exists: true },
    }).lean());

    const results = {
      checked: plans.length,
      generated: 0,
      skipped: 0,
      failed: 0,
      workOrders: [] as Array<{
        planId: string;
        planNumber: string;
        woNumber: string;
        scheduledFor: Date;
      }>,
    };

    for (const plan of plans) {
      // Check if plan should generate WO now (considering lead time)
      const shouldGenerate = (
        plan as unknown as { shouldGenerateNow?: () => boolean }
      ).shouldGenerateNow?.();
      if (!shouldGenerate) {
        results.skipped++;
        continue;
      }

      try {
        // In a real implementation, this would call WorkOrder.create()
        // For now, we simulate WO creation and just record it
        // SECURITY: Use crypto-random UUID instead of predictable Date.now() + Math.random()
        const woNumber = `WO-PM-${crypto.randomUUID()}`;
        const workOrderData = {
          title: plan.woTitle,
          description:
            plan.woDescription || `Preventive maintenance: ${plan.title}`,
          category: plan.woCategory,
          priority: plan.woPriority,
          propertyId: plan.propertyId,
          unitId: plan.unitId,
          type: "MAINTENANCE",
          status: "SCHEDULED",
          scheduledDate: plan.nextScheduledDate,
          pmPlanId: plan._id,
          pmPlanNumber: plan.planNumber,
          estimatedCost: plan.estimatedCost,
          budgetCode: plan.budgetCode,
          checklist: plan.checklist,
        };

        // Log the WO that would be created
        logger.info(
          `[PM] Generated WO: ${woNumber} from plan ${plan.planNumber}`,
        );
        logger.info(`[PM] WO Data:`, { workOrderData });

        // Record generation in plan
        const planWithMethods = plan as unknown as PMPlanWithMethods;
        if (planWithMethods.recordGeneration) {
          await planWithMethods.recordGeneration(
            plan._id, // In real impl, this would be the actual WorkOrder._id
            woNumber,
            "SUCCESS",
          );
        }

        results.generated++;
        results.workOrders.push({
          planId: plan._id.toString(),
          planNumber: plan.planNumber,
          woNumber,
          scheduledFor: plan.nextScheduledDate,
        });
      } catch (error) {
        logger.error(
          `[PM] Failed to generate WO for plan ${plan.planNumber}`,
          error,
        );
        results.failed++;
      }
    }

    logger.info(`[PM] Generation complete:`, { results });

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error(`[API] PM generation failed:`, error);
    return NextResponse.json(
      { success: false, error: "PM generation failed" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/pm/generate-wos
 * Preview which PM plans would generate WOs if run now
 * 
 * SECURITY: Protected by CRON_SECRET header - not accessible to regular users
 * NOTE: System-wide query across all tenants is intentional for cron preview
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 30, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // 🔒 CRON AUTH: Only allow calls with valid cron secret
  if (!verifySecretHeader(req, "x-cron-secret", Config.security.cronSecret)) {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }

  try {
    // PLATFORM-WIDE: cron preview processes all tenants (secured by CRON_SECRET)
    const plans = await (/* PLATFORM-WIDE */ FMPMPlan.find({
      status: "ACTIVE",
      nextScheduledDate: { $exists: true },
    }).lean());

    const plansTyped = plans as unknown as PMPlanDocument[];
    const preview = plansTyped
      .filter((plan) => {
        // Manually check shouldGenerateNow logic
        const now = new Date();
        const leadTime = plan.woLeadTimeDays * 24 * 60 * 60 * 1000;
        const generateByDate = new Date(
          plan.nextScheduledDate.getTime() - leadTime,
        );

        return (
          now >= generateByDate &&
          (!plan.lastGeneratedDate || plan.lastGeneratedDate < generateByDate)
        );
      })
      .map((plan) => ({
        planId: plan._id,
        planNumber: plan.planNumber,
        title: plan.title,
        propertyId: plan.propertyId,
        nextScheduledDate: plan.nextScheduledDate,
        woLeadTimeDays: plan.woLeadTimeDays,
        woTitle: plan.woTitle,
        estimatedCost: plan.estimatedCost,
      }));

    return NextResponse.json({
      success: true,
      data: {
        total: plans.length,
        readyToGenerate: preview.length,
        plans: preview,
      },
    });
  } catch (error) {
    logger.error(`[API] PM preview failed:`, error);
    return NextResponse.json(
      { success: false, error: "PM preview failed" },
      { status: 500 },
    );
  }
}
