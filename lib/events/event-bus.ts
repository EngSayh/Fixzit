/**
 * @fileoverview In-Memory Event Bus with MongoDB Persistence
 * @module lib/events/event-bus
 * 
 * A Redis-free event bus for real-time features in single-instance deployments.
 * Uses in-memory pub/sub for immediate delivery and MongoDB for persistence.
 * 
 * Features:
 * - In-memory pub/sub for instant event delivery
 * - MongoDB persistence for durability and multi-instance sync
 * - Tenant-scoped events (orgId isolation)
 * - Event replay from MongoDB for missed events
 * - Heartbeat and connection tracking
 * - Type-safe event types
 * 
 * For multi-instance scaling (Vercel Edge/serverless):
 * - Events are written to MongoDB
 * - Polling-based sync for cross-instance delivery
 * - SSE clients reconnect and replay from last event ID
 * 
 * @status PRODUCTION
 * @author [AGENT-0008]
 * @created 2026-01-03
 */

import { ObjectId, ChangeStream, ChangeStreamDocument } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types
// ============================================================================

/**
 * Event types supported by the bus
 */
export type EventType =
  | "notification"
  | "work_order_update"
  | "bid_received"
  | "payment_confirmed"
  | "maintenance_alert"
  | "system_announcement"
  | "inspection_update"
  | "approval_request"
  | "user_action"
  | "heartbeat";

/**
 * Event payload structure
 */
export interface BusEvent<T = unknown> {
  id: string;
  type: EventType;
  orgId: string;
  userId?: string;
  data: T;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Event stored in MongoDB
 */
interface StoredEvent extends BusEvent {
  _id?: ObjectId;
  processed: boolean;
  processingInstance?: string;
}

/**
 * Subscriber callback
 */
type EventHandler<T = unknown> = (event: BusEvent<T>) => void | Promise<void>;

/**
 * Subscription info
 */
interface Subscription {
  id: string;
  orgId: string;
  userId?: string;
  eventTypes: EventType[] | "*";
  handler: EventHandler;
  createdAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

const EVENTS_COLLECTION = "event_bus_events";
const INSTANCE_ID = `instance-${process.pid}-${Date.now().toString(36)}`;
const EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const POLL_INTERVAL_MS = 5000; // 5 seconds for multi-instance sync

// ============================================================================
// Event Bus Implementation
// ============================================================================

class EventBus {
  private subscriptions = new Map<string, Subscription>();
  private subscriptionCounter = 0;
  private changeStream: ChangeStream | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastEventTime: Date = new Date();
  private initialized = false;

  /**
   * Initialize the event bus (connects to MongoDB change stream if available)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const db = await getDatabase();
      
      // Create TTL index for auto-cleanup
      await db.collection(EVENTS_COLLECTION).createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, background: true }
      ).catch(() => {
        // Index may already exist
      });
      
      // Create index for efficient queries
      await db.collection(EVENTS_COLLECTION).createIndex(
        { orgId: 1, createdAt: -1 },
        { background: true }
      ).catch(() => {
        // Index may already exist
      });
      
      // Try to set up change stream (requires replica set)
      try {
        this.changeStream = db.collection(EVENTS_COLLECTION).watch(
          [{ $match: { operationType: "insert" } }],
          { fullDocument: "updateLookup" }
        );
        
        this.changeStream.on("change", (change: ChangeStreamDocument) => {
          if (change.operationType === "insert" && change.fullDocument) {
            this.handleIncomingEvent(change.fullDocument as StoredEvent);
          }
        });
        
        this.changeStream.on("error", (error) => {
          logger.warn("Change stream error, falling back to polling", {
            component: "event-bus",
            error: error.message,
          });
          this.startPolling();
        });
        
        logger.info("Event bus initialized with change stream", {
          component: "event-bus",
          instanceId: INSTANCE_ID,
        });
      } catch {
        // Change streams require replica set - fall back to polling
        this.startPolling();
        logger.info("Event bus initialized with polling (no replica set)", {
          component: "event-bus",
          instanceId: INSTANCE_ID,
        });
      }
      
      this.initialized = true;
    } catch (error) {
      logger.error("Failed to initialize event bus", {
        component: "event-bus",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start polling for events (fallback when change streams unavailable)
   */
  private startPolling(): void {
    if (this.pollInterval) return;
    
    this.pollInterval = setInterval(async () => {
      await this.pollEvents();
    }, POLL_INTERVAL_MS);
  }

  /**
   * Poll MongoDB for new events
   */
  private async pollEvents(): Promise<void> {
    try {
      const db = await getDatabase();
      
      const events = await db.collection(EVENTS_COLLECTION).find({
        createdAt: { $gt: this.lastEventTime },
        processingInstance: { $ne: INSTANCE_ID },
      }).sort({ createdAt: 1 }).limit(100).toArray() as StoredEvent[];
      
      for (const event of events) {
        this.handleIncomingEvent(event);
        this.lastEventTime = event.createdAt;
      }
    } catch (error) {
      logger.error("Event polling failed", {
        component: "event-bus",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle an incoming event (from change stream or polling)
   */
  private handleIncomingEvent(event: StoredEvent): void {
    // Don't process events we published ourselves
    if (event.processingInstance === INSTANCE_ID) return;
    
    // Dispatch to local subscribers
    this.dispatchToSubscribers({
      id: event.id,
      type: event.type,
      orgId: event.orgId,
      userId: event.userId,
      data: event.data,
      createdAt: event.createdAt,
      expiresAt: event.expiresAt,
    });
  }

  /**
   * Dispatch event to matching subscribers
   */
  private dispatchToSubscribers(event: BusEvent): void {
    for (const subscription of this.subscriptions.values()) {
      // Check org scope
      if (subscription.orgId !== event.orgId) continue;
      
      // Check user scope (if specified)
      if (subscription.userId && event.userId && subscription.userId !== event.userId) continue;
      
      // Check event type
      if (subscription.eventTypes !== "*" && !subscription.eventTypes.includes(event.type)) continue;
      
      // Deliver event
      try {
        const result = subscription.handler(event);
        if (result instanceof Promise) {
          result.catch(err => {
            logger.error("Event handler error", {
              component: "event-bus",
              subscriptionId: subscription.id,
              eventType: event.type,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      } catch (error) {
        logger.error("Event handler threw", {
          component: "event-bus",
          subscriptionId: subscription.id,
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Publish an event
   */
  async publish<T = unknown>(event: Omit<BusEvent<T>, "id" | "createdAt">): Promise<string> {
    await this.initialize();
    
    const eventId = new ObjectId().toString();
    const now = new Date();
    
    const fullEvent: BusEvent<T> = {
      id: eventId,
      type: event.type,
      orgId: event.orgId,
      userId: event.userId,
      data: event.data,
      createdAt: now,
      expiresAt: event.expiresAt || new Date(now.getTime() + EVENT_TTL_MS),
    };
    
    // Dispatch to local subscribers immediately
    this.dispatchToSubscribers(fullEvent as BusEvent);
    
    // Persist to MongoDB for durability and multi-instance sync
    try {
      const db = await getDatabase();
      const storedEvent: StoredEvent = {
        ...fullEvent,
        processed: false,
        processingInstance: INSTANCE_ID,
      };
      
      await db.collection(EVENTS_COLLECTION).insertOne(storedEvent);
    } catch (error) {
      logger.error("Failed to persist event", {
        component: "event-bus",
        eventId,
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    return eventId;
  }

  /**
   * Subscribe to events
   */
  subscribe(params: {
    orgId: string;
    userId?: string;
    eventTypes: EventType[] | "*";
    handler: EventHandler;
  }): () => void {
    const subscriptionId = `sub-${++this.subscriptionCounter}-${Date.now()}`;
    
    const subscription: Subscription = {
      id: subscriptionId,
      orgId: params.orgId,
      userId: params.userId,
      eventTypes: params.eventTypes,
      handler: params.handler,
      createdAt: new Date(),
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    logger.debug("Event subscription created", {
      component: "event-bus",
      subscriptionId,
      orgId: params.orgId,
    });
    
    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId);
      logger.debug("Event subscription removed", {
        component: "event-bus",
        subscriptionId,
      });
    };
  }

  /**
   * Get recent events for replay (on SSE reconnect)
   */
  async getRecentEvents(params: {
    orgId: string;
    userId?: string;
    since?: Date;
    limit?: number;
  }): Promise<BusEvent[]> {
    try {
      const db = await getDatabase();
      
      const query: Record<string, unknown> = {
        orgId: params.orgId,
        expiresAt: { $gt: new Date() },
      };
      
      if (params.userId) {
        query.$or = [
          { userId: params.userId },
          { userId: { $exists: false } },
        ];
      }
      
      if (params.since) {
        query.createdAt = { $gt: params.since };
      }
      
      const events = await db.collection(EVENTS_COLLECTION)
        .find(query)
        .sort({ createdAt: 1 })
        .limit(params.limit || 100)
        .toArray() as StoredEvent[];
      
      return events.map(e => ({
        id: e.id,
        type: e.type,
        orgId: e.orgId,
        userId: e.userId,
        data: e.data,
        createdAt: e.createdAt,
        expiresAt: e.expiresAt,
      }));
    } catch (error) {
      logger.error("Failed to get recent events", {
        component: "event-bus",
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get bus status
   */
  getStatus(): {
    initialized: boolean;
    subscriptionCount: number;
    instanceId: string;
    mode: "change_stream" | "polling";
  } {
    return {
      initialized: this.initialized,
      subscriptionCount: this.subscriptions.size,
      instanceId: INSTANCE_ID,
      mode: this.changeStream ? "change_stream" : "polling",
    };
  }

  /**
   * Shutdown the event bus
   */
  async shutdown(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    if (this.changeStream) {
      await this.changeStream.close();
      this.changeStream = null;
    }
    
    this.subscriptions.clear();
    this.initialized = false;
    
    logger.info("Event bus shutdown", {
      component: "event-bus",
      instanceId: INSTANCE_ID,
    });
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const eventBus = new EventBus();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Publish a notification event
 */
export async function publishNotification(params: {
  orgId: string;
  userId: string;
  title: string;
  message: string;
  link?: string;
  priority?: "low" | "medium" | "high" | "critical";
}): Promise<string> {
  return eventBus.publish({
    type: "notification",
    orgId: params.orgId,
    userId: params.userId,
    data: {
      title: params.title,
      message: params.message,
      link: params.link,
      priority: params.priority || "medium",
    },
  });
}

/**
 * Publish a work order update event
 */
export async function publishWorkOrderUpdate(params: {
  orgId: string;
  workOrderId: string;
  status: string;
  updatedBy: string;
}): Promise<string> {
  return eventBus.publish({
    type: "work_order_update",
    orgId: params.orgId,
    data: {
      workOrderId: params.workOrderId,
      status: params.status,
      updatedBy: params.updatedBy,
    },
  });
}

/**
 * Publish an approval request event (for admin notifications)
 */
export async function publishApprovalRequest(params: {
  orgId: string;
  requestId: string;
  action: string;
  requestedBy: string;
  targetUserId: string;
}): Promise<string> {
  return eventBus.publish({
    type: "approval_request",
    orgId: params.orgId,
    data: {
      requestId: params.requestId,
      action: params.action,
      requestedBy: params.requestedBy,
      targetUserId: params.targetUserId,
    },
  });
}

export default eventBus;
