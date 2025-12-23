/**
 * @fileoverview Invoice Reminder API Endpoint
 * @route POST /api/invoices/reminders/scan
 *
 * Triggers invoice reminder scanning and sends payment reminders.
 * Designed to be called by cron jobs or finance managers.
 */

import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { createSecureResponse } from "@/server/security/headers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { Invoice } from "@/server/models/Invoice";
import {
  scanForReminders,
  filterInvoicesByReminderLevel,
  type InvoiceForReminder,
  type ReminderConfig,
} from "@/services/finance/invoice-reminder-service";

/**
 * Roles that can trigger reminder scans
 */
const REMINDER_SCAN_ROLES = new Set([
  "SUPER_ADMIN",
  "FM_ADMIN",
  "FM_MANAGER",
  "FINANCE_MANAGER",
  "PROPERTY_OWNER",
]);

/**
 * POST /api/invoices/reminders/scan
 *
 * Scans invoices for due/overdue status and sends reminders
 *
 * Query params:
 * - dryRun=true: Don't send emails, just report status
 * - includeReminders=false: Skip sending, just return invoice status
 *
 * Request body (optional):
 * - upcomingDays: number - Days before due to send reminder (default: 7)
 * - severelyOverdueDays: number - Days for severely overdue (default: 30)
 * - finalNoticeDays: number - Days for final notice (default: 60)
 * - reminderCooldownDays: number - Min days between reminders (default: 3)
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per minute
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "invoices:reminders:scan",
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
    if (!REMINDER_SCAN_ROLES.has(user.role)) {
      return createSecureResponse(
        { error: "Forbidden: Insufficient permissions for reminder scan" },
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
    const includeReminders = url.searchParams.get("includeReminders") !== "false";

    // Parse optional request body
    let body: Partial<ReminderConfig> = {};

    try {
      const rawBody = await request.text();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Fetch invoices that need reminders
    const invoices = await Invoice.find({
      orgId: new Types.ObjectId(user.orgId),
      status: { $nin: ["PAID", "CANCELLED", "DRAFT"] },
      dueDate: { $exists: true, $ne: null },
    })
      .select(
        "_id number type status issueDate dueDate total currency recipient issuer payments reminderHistory"
      )
      .lean();

    // Type-cast for service - lean() returns plain objects
    type InvLean = typeof invoices[number] & {
      dueDate?: Date;
      issueDate?: Date;
      orgId?: Types.ObjectId;
      total?: number;
      currency?: string;
      reminderHistory?: InvoiceForReminder["reminderHistory"];
    };

    const invoicesForReminder: InvoiceForReminder[] = (invoices as InvLean[]).map((inv) => ({
      _id: inv._id,
      number: inv.number || "",
      type: inv.type,
      status: inv.status,
      issueDate: inv.issueDate || new Date(),
      dueDate: inv.dueDate || new Date(),
      total: inv.total || 0,
      currency: inv.currency || "SAR",
      orgId: inv.orgId || new Types.ObjectId(),
      recipient: (inv.recipient || {}) as InvoiceForReminder["recipient"],
      issuer: inv.issuer as InvoiceForReminder["issuer"],
      payments: inv.payments as InvoiceForReminder["payments"],
      reminderHistory: inv.reminderHistory,
    }));

    // Build config
    const config: Partial<ReminderConfig> = {
      sendEmails: !dryRun && includeReminders,
      ...body,
    };

    if (!includeReminders) {
      // Just return invoice status without sending reminders
      const byLevel = filterInvoicesByReminderLevel(invoicesForReminder, config);

      return createSecureResponse(
        {
          success: true,
          mode: "filter-only",
          scannedAt: new Date().toISOString(),
          totalScanned: invoicesForReminder.length,
          summary: {
            upcoming: byLevel.upcoming.length,
            dueToday: byLevel.dueToday.length,
            overdue: byLevel.overdue.length,
            severelyOverdue: byLevel.severelyOverdue.length,
            finalNotice: byLevel.finalNotice.length,
          },
          invoices: {
            upcoming: byLevel.upcoming.slice(0, 10).map((inv) => ({
              id: String(inv._id),
              number: inv.number,
              total: inv.total,
              dueDate: inv.dueDate,
              recipient: inv.recipient?.name,
            })),
            overdue: byLevel.overdue.slice(0, 10).map((inv) => ({
              id: String(inv._id),
              number: inv.number,
              total: inv.total,
              dueDate: inv.dueDate,
              recipient: inv.recipient?.name,
            })),
            severelyOverdue: byLevel.severelyOverdue.slice(0, 10).map((inv) => ({
              id: String(inv._id),
              number: inv.number,
              total: inv.total,
              dueDate: inv.dueDate,
              recipient: inv.recipient?.name,
            })),
          },
        },
        200,
        request
      );
    }

    // Run full scan with reminders
    const scanResult = await scanForReminders(invoicesForReminder, config);

    return createSecureResponse(
      {
        success: true,
        mode: dryRun ? "dry-run" : "live",
        scannedAt: scanResult.scannedAt.toISOString(),
        totalScanned: scanResult.totalScanned,
        summary: {
          upcoming: scanResult.upcoming,
          dueToday: scanResult.dueToday,
          overdue: scanResult.overdue,
          severelyOverdue: scanResult.severelyOverdue,
          finalNotice: scanResult.finalNotice,
          remindersSent: scanResult.remindersSent,
        },
        reminders: scanResult.reminders.map((reminder) => ({
          invoiceId: reminder.invoiceId,
          invoiceNumber: reminder.invoiceNumber,
          level: reminder.level,
          daysOverdue: reminder.daysOverdue,
          daysUntilDue: reminder.daysUntilDue,
          outstandingAmount: reminder.outstandingAmount,
          emailsSent: reminder.alertsSent.length,
          emailsSuccessful: reminder.alertsSent.filter((a) => a.success).length,
        })),
      },
      200,
      request
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reminder scan failed";
    return createSecureResponse({ error: message }, 500, request);
  }
}

/**
 * GET /api/invoices/reminders/scan
 *
 * Get invoice payment status overview without sending reminders
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 20 requests per minute
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "invoices:reminders:scan:get",
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

    // Fetch invoices
    const invoices = await Invoice.find({
      orgId: new Types.ObjectId(user.orgId),
      status: { $nin: ["PAID", "CANCELLED", "DRAFT"] },
      dueDate: { $exists: true, $ne: null },
    })
      .select("_id number type status issueDate dueDate total currency recipient payments")
      .lean();

    // Type-cast for service - lean() returns plain objects
    type InvLeanGet = typeof invoices[number] & {
      dueDate?: Date;
      issueDate?: Date;
      orgId?: Types.ObjectId;
      total?: number;
      currency?: string;
    };

    const invoicesForReminder: InvoiceForReminder[] = (invoices as InvLeanGet[]).map((inv) => ({
      _id: inv._id,
      number: inv.number || "",
      type: inv.type,
      status: inv.status,
      issueDate: inv.issueDate || new Date(),
      dueDate: inv.dueDate || new Date(),
      total: inv.total || 0,
      currency: inv.currency || "SAR",
      orgId: inv.orgId || new Types.ObjectId(),
      recipient: (inv.recipient || {}) as InvoiceForReminder["recipient"],
      payments: inv.payments as InvoiceForReminder["payments"],
    }));

    const byLevel = filterInvoicesByReminderLevel(invoicesForReminder);

    // Calculate totals
    const calculateTotal = (invs: InvoiceForReminder[]) =>
      invs.reduce((sum, inv) => sum + (inv.total || 0), 0);

    return createSecureResponse(
      {
        success: true,
        totalInvoices: invoicesForReminder.length,
        upcoming: {
          count: byLevel.upcoming.length,
          total: calculateTotal(byLevel.upcoming),
        },
        dueToday: {
          count: byLevel.dueToday.length,
          total: calculateTotal(byLevel.dueToday),
        },
        overdue: {
          count: byLevel.overdue.length,
          total: calculateTotal(byLevel.overdue),
        },
        severelyOverdue: {
          count: byLevel.severelyOverdue.length,
          total: calculateTotal(byLevel.severelyOverdue),
        },
        finalNotice: {
          count: byLevel.finalNotice.length,
          total: calculateTotal(byLevel.finalNotice),
        },
      },
      200,
      request
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get invoice status";
    return createSecureResponse({ error: message }, 500, request);
  }
}
