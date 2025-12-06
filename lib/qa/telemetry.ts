/**
 * QA Telemetry utilities
 *
 * Provides lightweight in-process counters for QA storage failures (alerts/logs)
 * and emits an optional webhook when repeated failures are detected within a
 * short window. This helps surface DB outages that would otherwise be hidden
 * behind 503 responses.
 */

import { logger } from "@/lib/logger";

type QaChannel = "alert" | "log";
type QaOperation = "read" | "write";

type CounterState = {
  count: number;
  windowStart: number;
};

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const ALERT_THRESHOLD = 3; // Trigger alert on 3 failures within window
const counters: Record<QaChannel, CounterState> = {
  alert: { count: 0, windowStart: 0 },
  log: { count: 0, windowStart: 0 },
};

const webhookUrl = process.env.QA_TELEMETRY_WEBHOOK;

function resetWindow(channel: QaChannel, now: number) {
  counters[channel] = { count: 0, windowStart: now };
}

async function postToWebhook(payload: Record<string, unknown>): Promise<void> {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.warn("[QA Telemetry] Failed to emit webhook", { error: error.message });
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error ?? "unknown");
  }
}

/**
 * Record a QA storage failure and emit telemetry if it crosses threshold.
 * Non-blocking: safe to call inline in route catch blocks.
 */
export async function recordQaStorageFailure(
  channel: QaChannel,
  operation: QaOperation,
  error: unknown,
): Promise<void> {
  const now = Date.now();
  const state = counters[channel];

  // Reset rolling window if expired
  if (now - state.windowStart > WINDOW_MS) {
    resetWindow(channel, now);
  }

  state.count += 1;

  logger.error("[QA Telemetry] Storage failure", {
    channel,
    operation,
    countInWindow: state.count,
    windowStart: new Date(state.windowStart).toISOString(),
    error: formatError(error),
  });

  // Emit a webhook when threshold is reached (once per window)
  if (state.count === ALERT_THRESHOLD) {
    void postToWebhook({
      channel,
      operation,
      severity: "error",
      countInWindow: state.count,
      windowStart: new Date(state.windowStart).toISOString(),
      timestamp: new Date(now).toISOString(),
      message: "Repeated QA storage failures detected",
    });
  }
}
