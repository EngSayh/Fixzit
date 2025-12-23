/**
 * @fileoverview SLA Breach Scan API Endpoint
 * @route POST /api/work-orders/sla-scan
 *
 * Triggers an SLA breach scan for work orders and sends alerts.
 * Designed to be called by cron jobs or admin users.
 */

import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { createSecureResponse } from "@/server/security/headers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { WorkOrder } from "@/server/models/WorkOrder";
import {
  scanForSlaBreaches,
  filterAtRiskWorkOrders,
  type WorkOrderForSla,
  type SlaBreachConfig,
} from "@/services/fm/sla-breach-service";
import { User } from "@/server/models/User";

/**
 * Roles that can trigger SLA scans
 */
const SLA_SCAN_ROLES = new Set([
  "SUPER_ADMIN",
  "FM_ADMIN",
  "FM_MANAGER",
  "FM_SUPERVISOR",
]);

/**
 * POST /api/work-orders/sla-scan
 *
 * Scans work orders for SLA breaches and sends alerts
 *
 * Query params:
 * - dryRun=true: Don't send emails, just report breaches
 * - includeAlerts=false: Skip sending alerts, just return at-risk work orders
 *
 * Request body (optional):
 * - managerEmails: string[] - Additional manager emails to notify
 * - approachingThresholdMinutes: number - Override threshold (default: 60)
 * - criticalThresholdHours: number - Override threshold (default: 4)
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per minute (this is a heavy operation)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "work-orders:sla-scan",
    requests: 5,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return createSecureResponse({ error: "Unauthorized" }, 401, request);
    }

    const user = session.user as { id: string; role: string; orgId: string };

    // Check role authorization
    if (!SLA_SCAN_ROLES.has(user.role)) {
      return createSecureResponse(
        { error: "Forbidden: Insufficient permissions for SLA scan" },
        403,
        request
      );
    }

    // Validate orgId
    if (!user.orgId) {
      return createSecureResponse(
        { error: "Missing tenant context" },
        401,
        request
      );
    }

    await connectToDatabase();

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const includeAlerts = url.searchParams.get("includeAlerts") !== "false";

    // Parse optional request body
    let body: {
      managerEmails?: string[];
      approachingThresholdMinutes?: number;
      criticalThresholdHours?: number;
    } = {};

    try {
      const rawBody = await request.text();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Fetch active work orders with SLA deadlines
    const workOrders = await WorkOrder.find({
      orgId: new Types.ObjectId(user.orgId),
      status: { $nin: ["COMPLETED", "CLOSED", "CANCELLED", "RESOLVED"] },
      dueAt: { $exists: true, $ne: null },
    })
      .select(
        "_id workOrderNumber title priority status dueAt createdAt orgId assignment property"
      )
      .lean();

    // Type-cast for service - lean() returns plain objects
    type WoLean = typeof workOrders[number] & {
      dueAt?: Date;
      orgId?: Types.ObjectId;
      property?: { name?: string; address?: string };
    };

    const workOrdersForSla: WorkOrderForSla[] = (workOrders as WoLean[]).map((wo) => ({
      _id: wo._id,
      workOrderNumber: wo.workOrderNumber || "",
      title: wo.title,
      priority: wo.priority as WorkOrderForSla["priority"],
      status: wo.status,
      dueAt: wo.dueAt || new Date(),
      createdAt: wo.createdAt,
      orgId: wo.orgId || new Types.ObjectId(),
      assignment: wo.assignment as WorkOrderForSla["assignment"],
      property: wo.property,
    }));

    // Build config
    const config: Partial<SlaBreachConfig> = {
      sendEmails: !dryRun && includeAlerts,
      approachingThresholdMinutes: body.approachingThresholdMinutes,
      criticalThresholdHours: body.criticalThresholdHours,
    };

    // Get manager emails from org if not provided
    const managerEmails = body.managerEmails || [];
    if (managerEmails.length === 0 && includeAlerts) {
      // Fetch org managers
      const managers = await User.find({
        orgId: new Types.ObjectId(user.orgId),
        role: { $in: ["FM_MANAGER", "FM_ADMIN"] },
        status: "ACTIVE",
      })
        .select("email")
        .lean();

      for (const manager of managers) {
        if (manager.email) {
          managerEmails.push(manager.email);
        }
      }
    }

    if (!includeAlerts) {
      // Just return at-risk work orders without sending alerts
      const atRisk = filterAtRiskWorkOrders(workOrdersForSla, config);

      return createSecureResponse(
        {
          success: true,
          mode: "filter-only",
          scannedAt: new Date().toISOString(),
          totalScanned: workOrdersForSla.length,
          summary: {
            approaching: atRisk.approaching.length,
            breached: atRisk.breached.length,
            critical: atRisk.critical.length,
          },
          atRisk: {
            approaching: atRisk.approaching.map((wo) => ({
              id: String(wo._id),
              workOrderNumber: wo.workOrderNumber,
              title: wo.title,
              priority: wo.priority,
              dueAt: wo.dueAt,
            })),
            breached: atRisk.breached.map((wo) => ({
              id: String(wo._id),
              workOrderNumber: wo.workOrderNumber,
              title: wo.title,
              priority: wo.priority,
              dueAt: wo.dueAt,
            })),
            critical: atRisk.critical.map((wo) => ({
              id: String(wo._id),
              workOrderNumber: wo.workOrderNumber,
              title: wo.title,
              priority: wo.priority,
              dueAt: wo.dueAt,
            })),
          },
        },
        200,
        request
      );
    }

    // Run full scan with alerts
    const scanResult = await scanForSlaBreaches(
      workOrdersForSla,
      managerEmails,
      config
    );

    return createSecureResponse(
      {
        success: true,
        mode: dryRun ? "dry-run" : "live",
        scannedAt: scanResult.scannedAt.toISOString(),
        totalScanned: scanResult.totalScanned,
        summary: {
          approaching: scanResult.approaching,
          breached: scanResult.breached,
          critical: scanResult.critical,
          alertsSent: scanResult.alertsSent,
        },
        alerts: scanResult.alerts.map((alert) => ({
          workOrderId: alert.workOrderId,
          workOrderNumber: alert.workOrderNumber,
          breachLevel: alert.breachLevel,
          minutesUntilBreach: alert.minutesUntilBreach,
          minutesPastBreach: alert.minutesPastBreach,
          emailsSent: alert.alertsSent.length,
          emailsSuccessful: alert.alertsSent.filter((a) => a.success).length,
        })),
      },
      200,
      request
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SLA scan failed";
    return createSecureResponse({ error: message }, 500, request);
  }
}

/**
 * GET /api/work-orders/sla-scan
 *
 * Get at-risk work orders without triggering alerts
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 20 requests per minute
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "work-orders:sla-scan:get",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return createSecureResponse({ error: "Unauthorized" }, 401, request);
    }

    const user = session.user as { id: string; role: string; orgId: string };

    if (!user.orgId) {
      return createSecureResponse(
        { error: "Missing tenant context" },
        401,
        request
      );
    }

    await connectToDatabase();

    const url = new URL(request.url);
    const thresholdMinutes = parseInt(
      url.searchParams.get("thresholdMinutes") || "60",
      10
    );

    // Fetch active work orders with SLA deadlines
    const workOrders = await WorkOrder.find({
      orgId: new Types.ObjectId(user.orgId),
      status: { $nin: ["COMPLETED", "CLOSED", "CANCELLED", "RESOLVED"] },
      dueAt: { $exists: true, $ne: null },
    })
      .select(
        "_id workOrderNumber title priority status dueAt createdAt assignment"
      )
      .lean();

    // Type-cast for service - lean() returns plain objects
    type WoLeanGet = typeof workOrders[number] & {
      dueAt?: Date;
      orgId?: Types.ObjectId;
    };

    const workOrdersForSla: WorkOrderForSla[] = (workOrders as WoLeanGet[]).map((wo) => ({
      _id: wo._id,
      workOrderNumber: wo.workOrderNumber || "",
      title: wo.title,
      priority: wo.priority as WorkOrderForSla["priority"],
      status: wo.status,
      dueAt: wo.dueAt || new Date(),
      createdAt: wo.createdAt,
      orgId: wo.orgId || new Types.ObjectId(),
      assignment: wo.assignment as WorkOrderForSla["assignment"],
    }));

    const atRisk = filterAtRiskWorkOrders(workOrdersForSla, {
      approachingThresholdMinutes: thresholdMinutes,
    });

    return createSecureResponse(
      {
        success: true,
        totalScanned: workOrdersForSla.length,
        approaching: atRisk.approaching.length,
        breached: atRisk.breached.length,
        critical: atRisk.critical.length,
        workOrders: {
          approaching: atRisk.approaching.slice(0, 10).map((wo) => ({
            id: String(wo._id),
            workOrderNumber: wo.workOrderNumber,
            title: wo.title,
            priority: wo.priority,
            dueAt: wo.dueAt,
            assignee: wo.assignment?.assigneeName,
          })),
          breached: atRisk.breached.slice(0, 10).map((wo) => ({
            id: String(wo._id),
            workOrderNumber: wo.workOrderNumber,
            title: wo.title,
            priority: wo.priority,
            dueAt: wo.dueAt,
            assignee: wo.assignment?.assigneeName,
          })),
          critical: atRisk.critical.slice(0, 10).map((wo) => ({
            id: String(wo._id),
            workOrderNumber: wo.workOrderNumber,
            title: wo.title,
            priority: wo.priority,
            dueAt: wo.dueAt,
            assignee: wo.assignment?.assigneeName,
          })),
        },
      },
      200,
      request
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get SLA status";
    return createSecureResponse({ error: message }, 500, request);
  }
}
