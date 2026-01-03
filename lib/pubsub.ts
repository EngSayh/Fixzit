/**
 * @module lib/pubsub
 * @description In-memory pub/sub helpers for single-instance deployments.
 */
import { MemoryKV } from "@/lib/memory-kv";
import { logger } from "@/lib/logger";

let client: MemoryKV | null = null;
let subscriber: MemoryKV | null = null;

function ensureClient(): MemoryKV {
  if (!client) {
    client = new MemoryKV();
  }
  return client;
}

function ensureSubscriber(): MemoryKV {
  if (!subscriber) {
    subscriber = ensureClient().duplicate();
    logger.info("[PubSub] Created subscriber client");
  }
  return subscriber;
}

export async function publish(channel: string, message: unknown): Promise<number> {
  const kv = ensureClient();
  try {
    const serialized = typeof message === "string" ? message : JSON.stringify(message);
    const count = await kv.publish(channel, serialized);
    logger.info(`[PubSub] Published to ${channel} (${count} subscribers)`);
    return count;
  } catch (error) {
    logger.error(`[PubSub] Publish error on ${channel}`, { error });
    return 0;
  }
}

export async function subscribe(
  channel: string,
  handler: (message: string, channel: string) => void,
): Promise<void> {
  const sub = ensureSubscriber();
  try {
    await sub.subscribe(channel, handler);
    logger.info(`[PubSub] Subscribed to ${channel}`);
  } catch (error) {
    logger.error(`[PubSub] Subscribe error on ${channel}`, { error });
  }
}

export async function psubscribe(
  pattern: string,
  handler: (message: string, channel: string, pattern: string) => void,
): Promise<void> {
  const sub = ensureSubscriber();
  try {
    await sub.psubscribe(pattern, handler);
    logger.info(`[PubSub] Pattern subscribed to ${pattern}`);
  } catch (error) {
    logger.error(`[PubSub] Pattern subscribe error on ${pattern}`, { error });
  }
}

export async function unsubscribe(channel?: string): Promise<void> {
  if (!subscriber) return;
  try {
    await subscriber.unsubscribe(channel);
    logger.info(`[PubSub] Unsubscribed from ${channel ?? "all channels"}`);
  } catch (error) {
    logger.error("[PubSub] Unsubscribe error", { error });
  }
}

export async function punsubscribe(pattern?: string): Promise<void> {
  if (!subscriber) return;
  try {
    await subscriber.punsubscribe(pattern);
    logger.info(`[PubSub] Pattern unsubscribed from ${pattern ?? "all patterns"}`);
  } catch (error) {
    logger.error("[PubSub] Pattern unsubscribe error", { error });
  }
}

export async function closeSubscriber(): Promise<void> {
  if (!subscriber) return;
  try {
    await subscriber.quit();
  } catch (error) {
    logger.error("[PubSub] Error closing subscriber", { error });
  }
  subscriber = null;
  logger.info("[PubSub] Subscriber client closed");
}

export const PubSubChannels = {
  WORK_ORDER_CREATED: "events:work-order:created",
  WORK_ORDER_UPDATED: "events:work-order:updated",
  WORK_ORDER_COMPLETED: "events:work-order:completed",
  PROPERTY_UPDATED: "events:property:updated",
  PROPERTY_MAINTENANCE: "events:property:maintenance",
  TENANT_NOTIFICATION: "events:tenant:notification",
  TENANT_PAYMENT_DUE: "events:tenant:payment-due",
  CACHE_INVALIDATION: "events:cache:invalidate",
  CONFIG_RELOAD: "events:config:reload",
  ALL_WORK_ORDERS: "events:work-order:*",
  ALL_PROPERTIES: "events:property:*",
  ALL_TENANTS: "events:tenant:*",
  ALL_SYSTEM: "events:system:*",
} as const;
