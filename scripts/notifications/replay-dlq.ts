#!/usr/bin/env tsx
/**
 * Replay pending notification DLQ entries.
 *
 * Usage:
 *   pnpm tsx scripts/notifications/replay-dlq.ts --channel email --limit 25
 *   pnpm tsx scripts/notifications/replay-dlq.ts --channel all --limit 50 --dry-run
 */

import {
  NotificationDeadLetterModel,
  NotificationLogModel,
} from "@/server/models/NotificationLog";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "@/lib/mongodb-unified";
import type {
  NotificationChannel,
  NotificationPayload,
} from "@/lib/fm-notifications";
import {
  sendFCMNotification,
  sendEmailNotification,
  sendSMSNotification,
  sendWhatsAppNotification,
} from "@/lib/integrations/notifications";
import { logger } from "@/lib/logger";
import { loadEnv } from "@/scripts/utils/load-env";
import { setDeadLetterBacklog } from "@/lib/monitoring/notification-metrics";

loadEnv();

type ReplayOptions = {
  channel?: NotificationChannel;
  limit: number;
  dryRun: boolean;
};

type DLQEntry = {
  payload?: {
    title?: string;
    body?: string;
    deepLink?: string;
    data?: Record<string, unknown>;
  };
  recipient?: {
    userId?: string;
    email?: string;
    phone?: string;
  };
  notificationId?: string;
  event?: string;
  priority?: string;
  createdAt?: string | number | Date;
  status?: string;
  [key: string]: unknown;
};

const SUPPORTED_CHANNELS: NotificationChannel[] = [
  "push",
  "email",
  "sms",
  "whatsapp",
];

function parseArgs(): ReplayOptions {
  const args = process.argv.slice(2);
  const options: ReplayOptions = {
    limit: 50,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--channel" && args[i + 1]) {
      const rawValue = args[i + 1].toLowerCase();
      if (rawValue === "all") {
        options.channel = undefined;
      } else if (SUPPORTED_CHANNELS.includes(rawValue as NotificationChannel)) {
        options.channel = rawValue as NotificationChannel;
      } else {
        throw new Error(
          `Unsupported channel "${args[i + 1]}". Choose from ${SUPPORTED_CHANNELS.join(", ")} or "all"`,
        );
      }
      i += 1;
      continue;
    }

    if (arg.startsWith("--channel=")) {
      const rawValue = arg.split("=")[1]?.toLowerCase();
      if (!rawValue) continue;
      if (rawValue === "all") {
        options.channel = undefined;
      } else if (SUPPORTED_CHANNELS.includes(rawValue as NotificationChannel)) {
        options.channel = rawValue as NotificationChannel;
      } else {
        throw new Error(
          `Unsupported channel "${rawValue}". Choose from ${SUPPORTED_CHANNELS.join(", ")} or "all"`,
        );
      }
      continue;
    }

    if (arg === "--limit" && args[i + 1]) {
      options.limit = Math.max(1, parseInt(args[i + 1], 10));
      i += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
  }

  return options;
}

async function replayEntry(
  channel: NotificationChannel,
  entry: DLQEntry,
): Promise<void> {
  const payload = entry.payload || {};
  const recipient = entry.recipient || {};

  const notification: NotificationPayload = {
    id: entry.notificationId,
    event: entry.event,
    recipients: [
      {
        userId: recipient.userId || "unknown",
        name:
          recipient.userId ||
          recipient.email ||
          recipient.phone ||
          "Unknown Recipient",
        email: recipient.email,
        phone: recipient.phone,
        preferredChannels: [channel],
      },
    ],
    title: payload.title || "Fixzit Notification",
    body: payload.body || "",
    deepLink: payload.deepLink,
    data: payload.data,
    priority: entry.priority || "normal",
    createdAt: new Date(entry.createdAt || Date.now()),
    status: "pending",
  };

  switch (channel) {
    case "push":
      await sendFCMNotification(
        notification.recipients[0].userId,
        notification,
      );
      break;
    case "email":
      await sendEmailNotification(notification.recipients[0], notification);
      break;
    case "sms":
      await sendSMSNotification(notification.recipients[0], notification);
      break;
    case "whatsapp":
      await sendWhatsAppNotification(notification.recipients[0], notification);
      break;
    default:
      throw new Error(`Unsupported channel ${channel}`);
  }
}

async function run(): Promise<void> {
  const options = parseArgs();
  await connectToDatabase();

  const query: Record<string, unknown> = { status: "pending" };
  if (options.channel) {
    query.channel = options.channel;
  }

  const deadLetters = await NotificationDeadLetterModel.find(query)
    .sort({ createdAt: 1 })
    .limit(options.limit)
    .lean();

  if (deadLetters.length === 0) {
    logger.info("[DLQ] No pending notification entries found", query);
    await disconnectFromDatabase();
    return;
  }

  logger.info("[DLQ] Processing entries", {
    count: deadLetters.length,
    channel: options.channel ?? "all",
    dryRun: options.dryRun,
  });

  let succeeded = 0;
  let failed = 0;

  for (const entry of deadLetters) {
    const channel = entry.channel as NotificationChannel;
    const update: Record<string, unknown> = {
      attempts: (entry.attempts || 0) + 1,
      lastAttemptAt: new Date(),
    };

    try {
      if (!options.dryRun) {
        await replayEntry(channel, entry);
        update.status = "replayed";
        await NotificationDeadLetterModel.updateOne({ _id: entry._id }, update);
        await NotificationLogModel.updateOne(
          {
            notificationId: entry.notificationId,
            "channelResults.channel": channel,
          },
          {
            $set: {
              "channelResults.$.status": "sent",
              "channelResults.$.lastAttemptAt": update.lastAttemptAt,
              "channelResults.$.attempts": update.attempts,
            },
          },
        );
      }

      succeeded += 1;
      logger.info("[DLQ] Replayed notification channel", {
        notificationId: entry.notificationId,
        channel,
        attempts: update.attempts,
        dryRun: options.dryRun,
      });
    } catch (error) {
      failed += 1;
      const reason = error instanceof Error ? error.message : String(error);
      update.status = "pending";
      update.error = reason;
      if (!options.dryRun) {
        await NotificationDeadLetterModel.updateOne({ _id: entry._id }, update);
      }
      logger.error("[DLQ] Failed to replay notification channel", {
        notificationId: entry.notificationId,
        channel,
        error: reason,
      });
    }
  }

  logger.info("[DLQ] Replay summary", { succeeded, failed });

  if (!options.dryRun) {
    const backlog = await NotificationDeadLetterModel.aggregate<{
      _id: NotificationChannel;
      count: number;
    }>([
      { $match: { status: "pending" } },
      { $group: { _id: "$channel", count: { $sum: 1 } } },
    ]);

    const backlogMap = backlog.reduce<
      Partial<Record<NotificationChannel, number>>
    >((acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    }, {});

    setDeadLetterBacklog(backlogMap);
  }

  await disconnectFromDatabase();
}

run().catch((error) => {
  logger.error("[DLQ] Replay job crashed", { error });
  process.exitCode = 1;
});
