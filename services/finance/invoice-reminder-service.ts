/**
 * @fileoverview Invoice Reminder Service
 * @module services/finance/invoice-reminder-service
 *
 * Automated payment reminder system for overdue and upcoming due invoices.
 * Supports configurable reminder schedules, multi-channel notifications, and escalation.
 */

import { Types } from "mongoose";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { differenceInDays, format, addDays } from "date-fns";

/**
 * Reminder urgency levels
 */
export type ReminderLevel = "upcoming" | "due_today" | "overdue" | "severely_overdue" | "final_notice";

/**
 * Invoice data required for reminder processing
 */
export interface InvoiceForReminder {
  _id: Types.ObjectId | string;
  number: string;
  type: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  total: number;
  currency: string;
  orgId: Types.ObjectId | string;
  recipient: {
    name?: string;
    email?: string;
    phone?: string;
    customerId?: string;
  };
  issuer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  payments?: {
    amount: number;
    status: string;
  }[];
  reminderHistory?: {
    sentAt: Date;
    level: ReminderLevel;
    channel: string;
  }[];
}

/**
 * Reminder result for a single invoice
 */
export interface ReminderResult {
  invoiceId: string;
  invoiceNumber: string;
  level: ReminderLevel;
  daysOverdue?: number;
  daysUntilDue?: number;
  outstandingAmount: number;
  alertsSent: {
    channel: "email" | "sms";
    recipient: string;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Reminder scan result
 */
export interface ReminderScanResult {
  scannedAt: Date;
  totalScanned: number;
  upcoming: number;
  dueToday: number;
  overdue: number;
  severelyOverdue: number;
  finalNotice: number;
  remindersSent: number;
  reminders: ReminderResult[];
}

/**
 * Configuration for invoice reminders
 */
export interface ReminderConfig {
  /** Days before due date to send upcoming reminder (default: 7) */
  upcomingDays: number;
  /** Days past due for severely overdue classification (default: 30) */
  severelyOverdueDays: number;
  /** Days past due for final notice (default: 60) */
  finalNoticeDays: number;
  /** Minimum days between reminder emails (default: 3) */
  reminderCooldownDays: number;
  /** Whether to send emails (default: true) */
  sendEmails: boolean;
  /** Organization name for email branding */
  orgName?: string;
  /** Support email for questions */
  supportEmail?: string;
  /** Payment portal URL */
  paymentPortalUrl?: string;
}

const DEFAULT_CONFIG: ReminderConfig = {
  upcomingDays: 7,
  severelyOverdueDays: 30,
  finalNoticeDays: 60,
  reminderCooldownDays: 3,
  sendEmails: true,
};

/**
 * Calculate outstanding balance for an invoice
 */
export function calculateOutstandingAmount(invoice: InvoiceForReminder): number {
  const total = invoice.total || 0;
  const paidAmount = (invoice.payments || [])
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  return Math.max(0, total - paidAmount);
}

/**
 * Determine the reminder level for an invoice
 */
export function determineReminderLevel(
  invoice: InvoiceForReminder,
  config: Partial<ReminderConfig> = {}
): { level: ReminderLevel | null; daysOverdue?: number; daysUntilDue?: number } {
  const { upcomingDays, severelyOverdueDays, finalNoticeDays } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Skip paid, cancelled, or draft invoices
  const terminalStatuses = ["PAID", "CANCELLED", "DRAFT"];
  if (terminalStatuses.includes(invoice.status)) {
    return { level: null };
  }

  // Check if fully paid
  const outstanding = calculateOutstandingAmount(invoice);
  if (outstanding <= 0) {
    return { level: null };
  }

  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const daysUntilDue = differenceInDays(dueDate, now);

  if (daysUntilDue > upcomingDays) {
    // Not yet in reminder window
    return { level: null };
  }

  if (daysUntilDue > 0 && daysUntilDue <= upcomingDays) {
    // Upcoming due date
    return { level: "upcoming", daysUntilDue };
  }

  if (daysUntilDue === 0) {
    // Due today
    return { level: "due_today", daysUntilDue: 0 };
  }

  // Past due
  const daysOverdue = Math.abs(daysUntilDue);

  if (daysOverdue >= finalNoticeDays) {
    return { level: "final_notice", daysOverdue };
  }

  if (daysOverdue >= severelyOverdueDays) {
    return { level: "severely_overdue", daysOverdue };
  }

  return { level: "overdue", daysOverdue };
}

/**
 * Check if a reminder can be sent (respecting cooldown)
 */
export function canSendReminder(
  invoice: InvoiceForReminder,
  level: ReminderLevel,
  config: Partial<ReminderConfig> = {}
): boolean {
  const { reminderCooldownDays } = { ...DEFAULT_CONFIG, ...config };

  if (!invoice.reminderHistory?.length) {
    return true;
  }

  const lastReminder = invoice.reminderHistory
    .filter((r) => r.channel === "email")
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0];

  if (!lastReminder) {
    return true;
  }

  const daysSinceLastReminder = differenceInDays(new Date(), new Date(lastReminder.sentAt));

  // Allow immediate escalation to higher levels
  const levelOrder: ReminderLevel[] = [
    "upcoming",
    "due_today",
    "overdue",
    "severely_overdue",
    "final_notice",
  ];

  const lastLevelIndex = levelOrder.indexOf(lastReminder.level);
  const currentLevelIndex = levelOrder.indexOf(level);

  // If escalating, allow immediate send
  if (currentLevelIndex > lastLevelIndex) {
    return true;
  }

  // Otherwise respect cooldown
  return daysSinceLastReminder >= reminderCooldownDays;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: currency || "SAR",
  }).format(amount);
}

/**
 * Get email subject based on reminder level
 */
function getEmailSubject(invoice: InvoiceForReminder, level: ReminderLevel): string {
  const prefix = {
    upcoming: "📋 Payment Reminder",
    due_today: "⚠️ Payment Due Today",
    overdue: "🔴 Payment Overdue",
    severely_overdue: "🚨 URGENT: Payment Severely Overdue",
    final_notice: "🚨 FINAL NOTICE: Payment Required",
  }[level];

  return `${prefix}: Invoice ${invoice.number}`;
}

/**
 * Get email body based on reminder level
 */
function getEmailBody(
  invoice: InvoiceForReminder,
  level: ReminderLevel,
  details: { daysOverdue?: number; daysUntilDue?: number; outstandingAmount: number },
  config: Partial<ReminderConfig> = {}
): string {
  const { orgName = "Fixzit", supportEmail, paymentPortalUrl } = config;
  const formattedAmount = formatCurrency(details.outstandingAmount, invoice.currency);
  const dueDate = format(new Date(invoice.dueDate), "MMMM d, yyyy");

  const greeting = invoice.recipient?.name
    ? `Dear ${invoice.recipient.name},`
    : "Dear Customer,";

  const timeInfo =
    level === "upcoming" || level === "due_today"
      ? `Due Date: ${dueDate}`
      : `Days Overdue: ${details.daysOverdue}`;

  const urgency = {
    upcoming: `This is a friendly reminder that your payment of ${formattedAmount} for Invoice ${invoice.number} is due on ${dueDate}.`,
    due_today: `This is a reminder that your payment of ${formattedAmount} for Invoice ${invoice.number} is due today.`,
    overdue: `Your payment of ${formattedAmount} for Invoice ${invoice.number} is now ${details.daysOverdue} days overdue. Please arrange payment as soon as possible.`,
    severely_overdue: `URGENT: Your payment of ${formattedAmount} for Invoice ${invoice.number} is ${details.daysOverdue} days overdue. Immediate action is required to avoid further action.`,
    final_notice: `FINAL NOTICE: Your payment of ${formattedAmount} for Invoice ${invoice.number} is ${details.daysOverdue} days overdue. This is your final reminder before we escalate this matter.`,
  }[level];

  const paymentLink = paymentPortalUrl
    ? `\nPay online: ${paymentPortalUrl}/invoices/${invoice.number}`
    : "";

  const supportLine = supportEmail
    ? `\nFor questions, contact: ${supportEmail}`
    : "";

  return `
${greeting}

${urgency}

Invoice Details:
- Invoice Number: ${invoice.number}
- Issue Date: ${format(new Date(invoice.issueDate), "MMMM d, yyyy")}
- ${timeInfo}
- Outstanding Amount: ${formattedAmount}
${paymentLink}
${supportLine}

Thank you for your prompt attention to this matter.

Best regards,
${orgName} Finance Team

---
This is an automated payment reminder from ${orgName}.
`.trim();
}

/**
 * Send reminder for a single invoice
 */
async function sendReminder(
  invoice: InvoiceForReminder,
  level: ReminderLevel,
  details: { daysOverdue?: number; daysUntilDue?: number },
  config: Partial<ReminderConfig> = {}
): Promise<ReminderResult> {
  const { sendEmails = true } = config;
  const outstandingAmount = calculateOutstandingAmount(invoice);

  const result: ReminderResult = {
    invoiceId: String(invoice._id),
    invoiceNumber: invoice.number,
    level,
    daysOverdue: details.daysOverdue,
    daysUntilDue: details.daysUntilDue,
    outstandingAmount,
    alertsSent: [],
  };

  if (!sendEmails) {
    logger.info("[InvoiceReminder] Email sending disabled, skipping", {
      invoiceNumber: invoice.number,
      level,
    });
    return result;
  }

  const recipientEmail = invoice.recipient?.email;
  if (!recipientEmail) {
    logger.warn("[InvoiceReminder] No recipient email", {
      invoiceNumber: invoice.number,
    });
    return result;
  }

  const subject = getEmailSubject(invoice, level);
  const body = getEmailBody(invoice, level, { ...details, outstandingAmount }, config);

  const emailResult = await sendEmail(recipientEmail, subject, body);
  result.alertsSent.push({
    channel: "email",
    recipient: recipientEmail,
    success: emailResult.success,
    error: emailResult.error,
  });

  if (emailResult.success) {
    logger.info("[InvoiceReminder] Reminder sent", {
      invoiceNumber: invoice.number,
      level,
      recipient: recipientEmail,
    });
  } else {
    logger.warn("[InvoiceReminder] Reminder failed", {
      invoiceNumber: invoice.number,
      level,
      error: emailResult.error,
    });
  }

  return result;
}

/**
 * Scan invoices for reminders and send notifications
 */
export async function scanForReminders(
  invoices: InvoiceForReminder[],
  config: Partial<ReminderConfig> = {}
): Promise<ReminderScanResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const result: ReminderScanResult = {
    scannedAt: new Date(),
    totalScanned: invoices.length,
    upcoming: 0,
    dueToday: 0,
    overdue: 0,
    severelyOverdue: 0,
    finalNotice: 0,
    remindersSent: 0,
    reminders: [],
  };

  for (const invoice of invoices) {
    const { level, daysOverdue, daysUntilDue } = determineReminderLevel(
      invoice,
      mergedConfig
    );

    if (!level) continue;

    // Update counts
    switch (level) {
      case "upcoming":
        result.upcoming++;
        break;
      case "due_today":
        result.dueToday++;
        break;
      case "overdue":
        result.overdue++;
        break;
      case "severely_overdue":
        result.severelyOverdue++;
        break;
      case "final_notice":
        result.finalNotice++;
        break;
    }

    // Check cooldown
    if (!canSendReminder(invoice, level, mergedConfig)) {
      logger.debug("[InvoiceReminder] Skipping due to cooldown", {
        invoiceNumber: invoice.number,
        level,
      });
      continue;
    }

    // Send reminder
    const reminder = await sendReminder(
      invoice,
      level,
      { daysOverdue, daysUntilDue },
      mergedConfig
    );

    result.reminders.push(reminder);
    result.remindersSent += reminder.alertsSent.filter((a) => a.success).length;
  }

  logger.info("[InvoiceReminder] Scan complete", {
    totalScanned: result.totalScanned,
    upcoming: result.upcoming,
    overdue: result.overdue,
    remindersSent: result.remindersSent,
  });

  return result;
}

/**
 * Filter invoices by reminder level (for dashboard widgets)
 */
export function filterInvoicesByReminderLevel(
  invoices: InvoiceForReminder[],
  config: Partial<ReminderConfig> = {}
): {
  upcoming: InvoiceForReminder[];
  dueToday: InvoiceForReminder[];
  overdue: InvoiceForReminder[];
  severelyOverdue: InvoiceForReminder[];
  finalNotice: InvoiceForReminder[];
} {
  const result = {
    upcoming: [] as InvoiceForReminder[],
    dueToday: [] as InvoiceForReminder[],
    overdue: [] as InvoiceForReminder[],
    severelyOverdue: [] as InvoiceForReminder[],
    finalNotice: [] as InvoiceForReminder[],
  };

  for (const invoice of invoices) {
    const { level } = determineReminderLevel(invoice, config);

    switch (level) {
      case "upcoming":
        result.upcoming.push(invoice);
        break;
      case "due_today":
        result.dueToday.push(invoice);
        break;
      case "overdue":
        result.overdue.push(invoice);
        break;
      case "severely_overdue":
        result.severelyOverdue.push(invoice);
        break;
      case "final_notice":
        result.finalNotice.push(invoice);
        break;
    }
  }

  return result;
}

/**
 * Get scheduled reminder dates for an invoice
 */
export function getScheduledReminders(
  dueDate: Date,
  config: Partial<ReminderConfig> = {}
): { level: ReminderLevel; date: Date }[] {
  const { upcomingDays, severelyOverdueDays, finalNoticeDays } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const due = new Date(dueDate);

  return [
    { level: "upcoming" as ReminderLevel, date: addDays(due, -upcomingDays) },
    { level: "due_today" as ReminderLevel, date: due },
    { level: "overdue" as ReminderLevel, date: addDays(due, 1) },
    { level: "severely_overdue" as ReminderLevel, date: addDays(due, severelyOverdueDays) },
    { level: "final_notice" as ReminderLevel, date: addDays(due, finalNoticeDays) },
  ];
}

export const InvoiceReminderService = {
  calculateOutstandingAmount,
  determineReminderLevel,
  canSendReminder,
  scanForReminders,
  filterInvoicesByReminderLevel,
  getScheduledReminders,
};

export default InvoiceReminderService;
