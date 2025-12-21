/**
 * @module server/models/CustomerRequestEvent
 * @description Audit event model for customer request tracking.
 * Records all status changes, comments, and actions on customer requests.
 *
 * @features
 * - Tenant isolation (tenantId required)
 * - Event type classification (status_change, comment, assignment, link, sla_breach)
 * - Actor tracking (who performed the action)
 * - Metadata storage for event-specific data
 *
 * @indexes
 * - { tenantId: 1, requestId: 1, createdAt: -1 } - Request event history
 * - { tenantId: 1, type: 1 } - Event type filtering
 */
import { Schema, model, models, type Document, type Types } from 'mongoose';

/**
 * Event type classification
 */
export type CustomerRequestEventType =
  | 'created'
  | 'status_change'
  | 'comment'
  | 'assignment'
  | 'link_system_issue'
  | 'unlink_system_issue'
  | 'sla_breach'
  | 'severity_change'
  | 'edit';

/**
 * CustomerRequestEvent document interface
 */
export interface ICustomerRequestEvent extends Document {
  _id: Types.ObjectId;
  tenantId: string;
  requestId: string;
  type: CustomerRequestEventType;
  message: string;
  actor: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const CustomerRequestEventSchema = new Schema<ICustomerRequestEvent>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'created',
        'status_change',
        'comment',
        'assignment',
        'link_system_issue',
        'unlink_system_issue',
        'sla_breach',
        'severity_change',
        'edit',
      ],
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    actor: {
      type: String,
      required: true,
    },
    meta: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'customer_request_events',
  }
);

// Compound indexes for efficient queries
CustomerRequestEventSchema.index({ tenantId: 1, requestId: 1, createdAt: -1 });
CustomerRequestEventSchema.index({ tenantId: 1, type: 1 });

const CustomerRequestEvent =
  models.CustomerRequestEvent ||
  model<ICustomerRequestEvent>('CustomerRequestEvent', CustomerRequestEventSchema);

export default CustomerRequestEvent;
