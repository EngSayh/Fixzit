#!/usr/bin/env tsx
/**
 * Notification smoke test runner.
 *
 * Usage:
 *   pnpm tsx qa/notifications/run-smoke.ts --channel email
 *   pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms
 *
 * Add more --channel flags to exercise additional transports.
 */

import type {
  NotificationChannel,
  NotificationRecipient,
  NotificationPayload,
} from "@/lib/fm-notifications";
import { buildNotification } from "@/lib/fm-notifications";
import type { BulkNotificationResult } from "@/lib/integrations/notifications";
import { sendBulkNotifications } from "@/lib/integrations/notifications";
import { emitNotificationTelemetry } from "@/lib/telemetry";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { loadEnv } from "@/scripts/utils/load-env";

type CliChannel = NotificationChannel;

loadEnv();

const ALL_CHANNELS: CliChannel[] = ["email", "sms", "whatsapp", "push"];

const COMMON_ENV = [
  "NOTIFICATIONS_SMOKE_USER_ID",
  "NOTIFICATIONS_SMOKE_NAME",
  "NOTIFICATIONS_SMOKE_EMAIL",
  "NOTIFICATIONS_TELEMETRY_WEBHOOK",
];

const CHANNEL_ENV: Record<CliChannel, { label: string; required: string[] }> = {
  email: {
    label: "Email (SendGrid)",
    required: ["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL", "SENDGRID_FROM_NAME"],
  },
  sms: {
    label: "SMS (Taqnyat)",
    required: [
      "TAQNYAT_BEARER_TOKEN",
      "TAQNYAT_SENDER_NAME",
      "NOTIFICATIONS_SMOKE_PHONE",
    ],
  },
  whatsapp: {
    label: "WhatsApp Business",
    required: [
      "WHATSAPP_BUSINESS_API_KEY",
      "WHATSAPP_PHONE_NUMBER_ID",
      "NOTIFICATIONS_SMOKE_PHONE",
    ],
  },
  push: {
    label: "Push (Firebase)",
    required: [
      "FIREBASE_ADMIN_PROJECT_ID",
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_ADMIN_PRIVATE_KEY",
    ],
  },
};

function usage(): void {
  console.log(`
Notification Smoke Test
-----------------------
Usage:
  pnpm tsx qa/notifications/run-smoke.ts --channel <email|sms|whatsapp|push>

Add multiple --channel flags to exercise more than one transport.
Examples:
  pnpm tsx qa/notifications/run-smoke.ts --channel email
  pnpm tsx qa/notifications/run-smoke.ts --channel email --channel sms
  pnpm tsx qa/notifications/run-smoke.ts --channel all
`);
}

function parseChannels(argv: string[]): CliChannel[] {
  const selected = new Set<CliChannel>();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }

    if (arg === "--channel" || arg === "-c") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Missing value after --channel");
      }
      i += 1;
      addChannel(value, selected);
      continue;
    }

    if (arg.startsWith("--channel=")) {
      const value = arg.split("=")[1];
      addChannel(value, selected);
      continue;
    }

    console.warn(`⚠️  Ignoring unrecognised argument: ${arg}`);
  }

  if (selected.size === 0) {
    selected.add("email");
  }

  return Array.from(selected);
}

function addChannel(value: string, set: Set<CliChannel>): void {
  if (!value) return;
  const normalised = value.trim().toLowerCase();

  if (normalised === "all") {
    ALL_CHANNELS.forEach((channel) => set.add(channel));
    return;
  }

  if (ALL_CHANNELS.includes(normalised as CliChannel)) {
    set.add(normalised as CliChannel);
    return;
  }

  throw new Error(
    `Unknown channel "${value}". Expected one of: ${ALL_CHANNELS.join(", ")}, or "all".`,
  );
}

function validateEnv(selectedChannels: CliChannel[]): void {
  const missingCommon = COMMON_ENV.filter(
    (key) => !process.env[key] || process.env[key]?.trim() === "",
  );
  if (missingCommon.length > 0) {
    throw new Error(
      `Missing common notification env vars: ${missingCommon.join(", ")}`,
    );
  }

  const missingPerChannel: string[] = [];
  for (const channel of selectedChannels) {
    const required = CHANNEL_ENV[channel].required;
    const missing = required.filter(
      (key) => !process.env[key] || process.env[key]?.trim() === "",
    );
    if (missing.length > 0) {
      missingPerChannel.push(
        `${CHANNEL_ENV[channel].label}: ${missing.join(", ")}`,
      );
    }
  }

  if (missingPerChannel.length > 0) {
    throw new Error(
      `Missing channel-specific env vars:\n- ${missingPerChannel.join("\n- ")}`,
    );
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Environment variable ${name} is required for this smoke test`,
    );
  }
  return value;
}

function deriveStatus(
  result: BulkNotificationResult,
): Pick<NotificationPayload, "status" | "failureReason"> {
  if (result.attempted === 0) {
    return {
      status: "failed",
      failureReason: "No valid channels or contact info",
    };
  }

  if (result.failed === 0) {
    return { status: "sent", failureReason: undefined };
  }

  if (result.failed === result.attempted) {
    return {
      status: "failed",
      failureReason: "All notification attempts failed",
    };
  }

  return {
    status: "partial_failure",
    failureReason: `${result.failed} of ${result.attempted} channel attempts failed`,
  };
}

async function main(): Promise<void> {
  console.log("🔔 Running notification smoke test...");

  const channels = parseChannels(process.argv.slice(2));
  console.log(`• Channels: ${channels.join(", ")}`);

  validateEnv(channels);

  const recipient: NotificationRecipient = {
    userId: requireEnv("NOTIFICATIONS_SMOKE_USER_ID"),
    name: requireEnv("NOTIFICATIONS_SMOKE_NAME"),
    email: requireEnv("NOTIFICATIONS_SMOKE_EMAIL"),
    phone: process.env.NOTIFICATIONS_SMOKE_PHONE,
    preferredChannels: channels,
  };

  if (channels.some((channel) => channel === "sms" || channel === "whatsapp")) {
    recipient.phone = requireEnv("NOTIFICATIONS_SMOKE_PHONE");
  }

  const workOrderId =
    process.env.NOTIFICATIONS_SMOKE_WORKORDER_ID ||
    `SMOKE-${new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 12)}`;
  const tenantName =
    process.env.NOTIFICATIONS_SMOKE_TENANT || "Smoke Test Tenant";

  const notification = buildNotification(
    "onTicketCreated",
    {
      workOrderId,
      tenantName,
      technicianName: recipient.name,
      description: "Automated smoke test notification",
      priority: "high",
    },
    [recipient],
  );

  let dbConnected = false;
  if (channels.includes("push")) {
    console.log("• Connecting to MongoDB for push token lookup...");
    await connectToDatabase();
    dbConnected = true;
  }

  try {
    const result = await sendBulkNotifications(
      notification,
      notification.recipients,
    );
    const derivedStatus = deriveStatus(result);

    notification.status = derivedStatus.status;
    notification.failureReason = derivedStatus.failureReason;
    notification.sentAt = new Date();

    await emitNotificationTelemetry({
      notificationId: notification.id,
      event: notification.event,
      status: notification.status,
      attempted: result.attempted,
      failed: result.failed,
      skipped: result.skipped,
      issues: result.issues,
    });

    if (result.issues.length > 0) {
      console.log("\n⚠️  Issues:");
      for (const issue of result.issues) {
        console.log(
          `   - ${issue.channel} • user ${issue.userId}: ${issue.type} (${issue.reason})`,
        );
      }
    }

    console.log("\n📊 Result:", {
      attempted: result.attempted,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      status: notification.status,
      failureReason: notification.failureReason,
    });

    if (notification.status === "sent") {
      console.log("\n✅ Notification smoke test succeeded.");
      process.exitCode = 0;
    } else if (notification.status === "partial_failure") {
      console.log(
        "\n⚠️  Notification smoke test completed with partial failures.",
      );
      process.exitCode = 2;
    } else {
      console.error("\n❌ Notification smoke test failed.");
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error(
      "[SmokeTest] Unexpected failure",
      error instanceof Error ? error : undefined,
      { error },
    );
    console.error("\n❌ Smoke test execution failed:", error);
    process.exitCode = 1;
  } finally {
    if (dbConnected) {
      await disconnectFromDatabase();
    }
  }
}

main().catch((error) => {
  logger.error(
    "[SmokeTest] Fatal error",
    error instanceof Error ? error : undefined,
    { error },
  );
  console.error("\n❌ Smoke test crashed:", error);
  process.exit(1);
});
