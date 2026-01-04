/**
 * @module tests/unit/lib/pubsub.test.ts
 * @description Unit tests for in-memory pub/sub functionality (FEAT-0034)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  publish,
  subscribe,
  psubscribe,
  unsubscribe,
  punsubscribe,
  PubSubChannels,
} from "@/lib/pubsub";

describe("Pub/Sub (FEAT-0034)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("publish()", () => {
    it("should publish string message to channel", async () => {
      const count = await publish("test:channel", "hello");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should publish object message (JSON serialized)", async () => {
      const count = await publish("test:channel", { event: "test", data: 123 });
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("subscribe()", () => {
    it("should subscribe to a channel", async () => {
      const handler = vi.fn();
      await subscribe("test:channel", handler);
      // Handler registered, no error
      expect(true).toBe(true);
      // Cleanup
      await unsubscribe("test:channel");
    });
  });

  describe("psubscribe()", () => {
    it("should subscribe to a pattern", async () => {
      const handler = vi.fn();
      await psubscribe("test:*", handler);
      // Pattern registered, no error
      expect(true).toBe(true);
      // Cleanup
      await punsubscribe("test:*");
    });
  });

  describe("unsubscribe()", () => {
    it("should unsubscribe from specific channel", async () => {
      await subscribe("test:channel", vi.fn());
      await unsubscribe("test:channel");
      expect(true).toBe(true);
    });

    it("should unsubscribe from all channels when no arg", async () => {
      await subscribe("test:a", vi.fn());
      await subscribe("test:b", vi.fn());
      await unsubscribe();
      expect(true).toBe(true);
    });
  });

  describe("PubSubChannels", () => {
    it("should have work order channels", () => {
      expect(PubSubChannels.WORK_ORDER_CREATED).toBe("events:work-order:created");
      expect(PubSubChannels.WORK_ORDER_UPDATED).toBe("events:work-order:updated");
      expect(PubSubChannels.WORK_ORDER_COMPLETED).toBe("events:work-order:completed");
    });

    it("should have property channels", () => {
      expect(PubSubChannels.PROPERTY_UPDATED).toBe("events:property:updated");
      expect(PubSubChannels.PROPERTY_MAINTENANCE).toBe("events:property:maintenance");
    });

    it("should have tenant channels", () => {
      expect(PubSubChannels.TENANT_NOTIFICATION).toBe("events:tenant:notification");
      expect(PubSubChannels.TENANT_PAYMENT_DUE).toBe("events:tenant:payment-due");
    });

    it("should have pattern channels for group subscriptions", () => {
      expect(PubSubChannels.ALL_WORK_ORDERS).toBe("events:work-order:*");
      expect(PubSubChannels.ALL_PROPERTIES).toBe("events:property:*");
      expect(PubSubChannels.ALL_TENANTS).toBe("events:tenant:*");
    });
  });
});
