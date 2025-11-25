/**
 * NATS Event Type Definitions
 *
 * This file defines the structure of all events published to NATS.
 * Type-safe event schemas help maintain consistency across services.
 */

/**
 * Product lifecycle events
 */
export type ProductCreatedEvent = {
  type: "product.created";
  productId: string;
  fsin: string;
  orgId: string;
  categoryId: string;
  brandId?: string;
  title: string;
  price: number;
  timestamp: string;
};

export type ProductUpdatedEvent = {
  type: "product.updated";
  productId: string;
  fsin: string;
  orgId: string;
  changes: Record<string, unknown>;
  timestamp: string;
};

export type ProductDeletedEvent = {
  type: "product.deleted";
  productId: string;
  fsin: string;
  orgId: string;
  timestamp: string;
};

/**
 * Order lifecycle events
 */
export type OrderPlacedEvent = {
  type: "order.placed";
  orderId: string;
  customerId: string;
  orgId: string;
  total: number;
  currency: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  placedAt: string;
};

export type OrderShippedEvent = {
  type: "order.shipped";
  orderId: string;
  customerId: string;
  orgId: string;
  trackingNumber: string;
  shippedAt: string;
};

export type OrderDeliveredEvent = {
  type: "order.delivered";
  orderId: string;
  customerId: string;
  orgId: string;
  deliveredAt: string;
};

export type OrderCancelledEvent = {
  type: "order.cancelled";
  orderId: string;
  customerId: string;
  orgId: string;
  reason: string;
  cancelledAt: string;
};

/**
 * Invoice lifecycle events
 */
export type InvoicePaidEvent = {
  type: "invoice.paid";
  invoiceId: string;
  invoiceNumber: string;
  orgId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
};

export type InvoiceOverdueEvent = {
  type: "invoice.overdue";
  invoiceId: string;
  invoiceNumber: string;
  orgId: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  timestamp: string;
};

/**
 * Work order events
 */
export type WorkOrderCreatedEvent = {
  type: "workorder.created";
  workOrderId: string;
  workOrderNumber: string;
  orgId: string;
  propertyId?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  createdAt: string;
};

export type WorkOrderAssignedEvent = {
  type: "workorder.assigned";
  workOrderId: string;
  workOrderNumber: string;
  orgId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
};

export type WorkOrderCompletedEvent = {
  type: "workorder.completed";
  workOrderId: string;
  workOrderNumber: string;
  orgId: string;
  completedBy: string;
  completedAt: string;
};

/**
 * Payment events
 */
export type PaymentProcessedEvent = {
  type: "payment.processed";
  paymentId: string;
  invoiceId?: string;
  orgId: string;
  amount: number;
  currency: string;
  method: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  processedAt: string;
};

export type PaymentRefundedEvent = {
  type: "payment.refunded";
  paymentId: string;
  invoiceId?: string;
  orgId: string;
  amount: number;
  currency: string;
  reason: string;
  refundedAt: string;
};

/**
 * Union type of all possible events
 */
export type NatsEvent =
  | ProductCreatedEvent
  | ProductUpdatedEvent
  | ProductDeletedEvent
  | OrderPlacedEvent
  | OrderShippedEvent
  | OrderDeliveredEvent
  | OrderCancelledEvent
  | InvoicePaidEvent
  | InvoiceOverdueEvent
  | WorkOrderCreatedEvent
  | WorkOrderAssignedEvent
  | WorkOrderCompletedEvent
  | PaymentProcessedEvent
  | PaymentRefundedEvent;

/**
 * Event subject patterns for subscriptions
 */
export const EventSubjects = {
  PRODUCT: {
    ALL: "product.*",
    CREATED: "product.created",
    UPDATED: "product.updated",
    DELETED: "product.deleted",
  },
  ORDER: {
    ALL: "order.*",
    PLACED: "order.placed",
    SHIPPED: "order.shipped",
    DELIVERED: "order.delivered",
    CANCELLED: "order.cancelled",
  },
  INVOICE: {
    ALL: "invoice.*",
    PAID: "invoice.paid",
    OVERDUE: "invoice.overdue",
  },
  WORKORDER: {
    ALL: "workorder.*",
    CREATED: "workorder.created",
    ASSIGNED: "workorder.assigned",
    COMPLETED: "workorder.completed",
  },
  PAYMENT: {
    ALL: "payment.*",
    PROCESSED: "payment.processed",
    REFUNDED: "payment.refunded",
  },
} as const;
