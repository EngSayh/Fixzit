/**
 * SMS SLA Breach Monitor Job
 *
 * Detects SMS messages that have breached their SLA targets and sends notifications.
 * Should be run periodically via cron job.
 *
 * @module lib/jobs/sms-sla-monitor
 */

import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSMessage, type ISMSMessage } from "@/server/models/SMSMessage";
import { SMSSettings, type ISMSSettings } from "@/server/models/SMSSettings";
import { sendEmail } from "@/lib/email";
import {
  validatePublicHttpsUrl,
  isValidPublicHttpsUrl,
} from "@/lib/security/validate-public-https-url";

export interface SLABreachReport {
  totalChecked: number;
  newBreaches: number;
  notificationsSent: number;
  errors: string[];
}

/**
 * Check for and process SLA breaches
 */
export async function processSLABreaches(): Promise<SLABreachReport> {
  await connectToDatabase();

  const report: SLABreachReport = {
    totalChecked: 0,
    newBreaches: 0,
    notificationsSent: 0,
    errors: [],
  };

  try {
    // Find messages that haven't been checked for SLA breach yet
    // and are past their target delivery time
    const now = new Date();
    // PLATFORM-WIDE: SLA monitor scans all outbound messages
    const pendingMessages = await SMSMessage.find({
      status: { $in: ["PENDING", "QUEUED", "SENT"] },
      slaBreached: false,
      slaTargetMs: { $exists: true, $gt: 0 },
    }).lean();

    report.totalChecked = pendingMessages.length;

    // Group breaches by orgId for batch notifications
    const breachesByOrg: Map<string, ISMSMessage[]> = new Map();

    for (const message of pendingMessages) {
      const elapsed = now.getTime() - new Date(message.createdAt).getTime();

      if (message.slaTargetMs && elapsed > message.slaTargetMs) {
        // Mark as breached
        await SMSMessage.findByIdAndUpdate(message._id, {
          slaBreached: true,
          slaBreachAt: now,
        });

        report.newBreaches++;

        // Group by org for notifications
        // NOTE: "global" bucket is for system messages without tenant context (not a security issue)
        const orgId = message.orgId ?? "global";
        if (!breachesByOrg.has(orgId)) {
          breachesByOrg.set(orgId, []);
        }
        breachesByOrg.get(orgId)!.push(message as ISMSMessage);

        logger.warn("[SLA Monitor] SMS SLA breached", {
          messageId: message._id.toString(),
          orgId: message.orgId,
          type: message.type,
          priority: message.priority,
          targetMs: message.slaTargetMs,
          elapsedMs: elapsed,
        });
      }
    }

    // Send notifications for each org with breaches
    for (const [orgId, messages] of breachesByOrg) {
      try {
        await sendBreachNotification(orgId, messages);
        report.notificationsSent++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        report.errors.push(`Failed to notify org ${orgId}: ${errorMsg}`);
        logger.error("[SLA Monitor] Failed to send breach notification", {
          orgId,
          error: errorMsg,
        });
      }
    }

    logger.info("[SLA Monitor] Breach check completed", {
      totalChecked: report.totalChecked,
      newBreaches: report.newBreaches,
      notificationsSent: report.notificationsSent,
      errorCount: report.errors.length,
    });
    return report;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    report.errors.push(`Monitor failed: ${errorMsg}`);
    logger.error("[SLA Monitor] Failed to process breaches", { error: errorMsg });
    return report;
  }
}

/**
 * Send breach notification to org admins
 */
export async function sendBreachNotification(
  orgId: string,
  messages: ISMSMessage[]
): Promise<void> {
  // Get org-specific settings (or global)
  const settings: ISMSSettings | undefined = orgId === "global"
    ? await SMSSettings.getEffectiveSettings()
    : await SMSSettings.getEffectiveSettings(orgId);

  if (!settings) {
    logger.warn("[SLA Monitor] No SMS settings found; skipping notifications", { orgId });
    return;
  }

  const notifyEmails = settings.slaBreachNotifyEmails || [];

  if (notifyEmails.length === 0) {
    logger.info("[SLA Monitor] No notification emails configured", { orgId });
    return;
  }

  // Build summary
  const criticalCount = messages.filter((m) => m.priority === "CRITICAL").length;
  const highCount = messages.filter((m) => m.priority === "HIGH").length;
  const normalCount = messages.filter((m) => m.priority === "NORMAL").length;
  const lowCount = messages.filter((m) => m.priority === "LOW").length;

  const subject = `⚠️ SMS SLA Breach Alert: ${messages.length} message(s) exceeded target delivery time`;

  const body = `
    <h2>SMS SLA Breach Alert</h2>
    <p>${messages.length} SMS message(s) have exceeded their target delivery time.</p>
    
    <h3>Summary by Priority:</h3>
    <ul>
      ${criticalCount > 0 ? `<li>🔴 Critical: ${criticalCount}</li>` : ""}
      ${highCount > 0 ? `<li>🟠 High: ${highCount}</li>` : ""}
      ${normalCount > 0 ? `<li>🟡 Normal: ${normalCount}</li>` : ""}
      ${lowCount > 0 ? `<li>🟢 Low: ${lowCount}</li>` : ""}
    </ul>

    <h3>Recent Breaches:</h3>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>Type</th>
        <th>Priority</th>
        <th>To</th>
        <th>Target</th>
        <th>Elapsed</th>
      </tr>
      ${messages.slice(0, 10).map((m) => `
        <tr>
          <td>${m.type}</td>
          <td>${m.priority}</td>
          <td>${m.to.slice(0, 6)}****</td>
          <td>${formatMs(m.slaTargetMs || 0)}</td>
          <td>${formatMs(Date.now() - new Date(m.createdAt).getTime())}</td>
        </tr>
      `).join("")}
      ${messages.length > 10 ? `<tr><td colspan="5">... and ${messages.length - 10} more</td></tr>` : ""}
    </table>

    <p>Please investigate and take action to resolve delivery issues.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://fixzit.co"}/admin/sms">View SMS Dashboard</a></p>
  `;

  // Send to all configured emails
  for (const email of notifyEmails) {
    await sendEmail(email, subject, body, { html: body });
  }

  // Send webhook notification if configured
  const webhook = settings.slaBreachNotifyWebhook;
  let safeWebhook: string | undefined;
  if (webhook) {
    try {
      if (await isValidPublicHttpsUrl(webhook)) {
        const parsed = await validatePublicHttpsUrl(webhook);
        safeWebhook = parsed.toString();
      } else {
        logger.warn("[SLA Monitor] Webhook validation failed", {
          webhook,
          error: "Webhook must be a public HTTPS URL",
        });
      }
    } catch (error) {
      logger.warn("[SLA Monitor] Webhook validation failed", {
        webhook,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (safeWebhook) {
    try {
      await fetch(safeWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sms_sla_breach",
          orgId,
          breachCount: messages.length,
          summary: { criticalCount, highCount, normalCount, lowCount },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      logger.error("[SLA Monitor] Failed to send webhook", {
        webhook: safeWebhook,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Format milliseconds to human-readable string
 */
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Get SLA breach statistics for dashboard
 */
export async function getSLABreachStats(
  orgId?: string,
  since?: Date
): Promise<{
  total: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  recentBreaches: Array<{
    id: string;
    type: string;
    priority: string;
    createdAt: Date;
    breachAt: Date;
    targetMs: number;
    elapsedMs: number;
  }>;
}> {
  await connectToDatabase();

  const match: Record<string, unknown> = { slaBreached: true };
  if (orgId) match.orgId = orgId;
  if (since) match.slaBreachAt = { $gte: since };

  const [total, byPriority, byType, recentBreaches] = await Promise.all([
    SMSMessage.countDocuments(match),
    SMSMessage.aggregate([
      { $match: match },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    SMSMessage.aggregate([
      { $match: match },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
    SMSMessage.find(match)
      .sort({ slaBreachAt: -1 })
      .limit(20)
      .lean(),
  ]);

  return {
    total,
    byPriority: Object.fromEntries(byPriority.map((p) => [p._id, p.count])),
    byType: Object.fromEntries(byType.map((t) => [t._id, t.count])),
    recentBreaches: recentBreaches.map((m) => ({
      id: m._id.toString(),
      type: m.type,
      priority: m.priority,
      createdAt: m.createdAt,
      breachAt: m.slaBreachAt!,
      targetMs: m.slaTargetMs || 0,
      elapsedMs: (m.slaBreachAt?.getTime() || Date.now()) - m.createdAt.getTime(),
    })),
  };
}
