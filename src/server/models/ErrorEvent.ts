// src/server/models/ErrorEvent.ts - MongoDB models for error tracking
import { Schema, model, models } from 'mongoose';

// Error event schema (main record per incident)
const ErrorEventSchema = new Schema({
  incidentId: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true, index: true },
  severity: { type: String, required: true, index: true },
  module: { type: String, required: true, index: true },
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true, index: true },
  occurrences: { type: Number, default: 1 },
  
  // User & org context
  orgId: { type: String, index: true },
  user: {
    userId: String,
    email: String,
    role: String,
    name: String
  },
  
  // Request context
  route: String,
  url: String,
  locale: String,
  rtl: Boolean,
  
  // HTTP context
  http: {
    status: Number,
    method: String,
    path: String
  },
  
  // Device/client info
  device: {
    ua: String,
    platform: String,
    vendor: String,
    mobile: Boolean
  },
  
  // Problem details (RFC 9457)
  problem: {
    type: String,
    title: String,
    status: Number,
    detail: String,
    instance: String,
    traceId: String,
    correlationId: String
  },
  
  // Error items (for multi-error scenarios)
  errorItems: [{
    path: String,
    message: String,
    code: String
  }],
  
  // Stack trace
  stack: String,
  
  // Full client context
  clientContext: Schema.Types.Mixed,
  
  // Linked support ticket
  ticketId: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  
  // Tags for categorization
  tags: [String]
  
}, { timestamps: true });

// Compound indexes for efficient queries
ErrorEventSchema.index({ orgId: 1, lastSeenAt: -1 });
ErrorEventSchema.index({ code: 1, lastSeenAt: -1 });
ErrorEventSchema.index({ module: 1, severity: 1, lastSeenAt: -1 });
ErrorEventSchema.index({ 'user.userId': 1, lastSeenAt: -1 });

// Error occurrence schema (individual instances)
const ErrorOccurrenceSchema = new Schema({
  incidentId: { type: String, required: true, index: true },
  details: String,
  stack: String,
  http: Schema.Types.Mixed,
  clientContext: Schema.Types.Mixed,
  createdAt: { type: Date, required: true, index: true }
});

// Index for efficient time-based queries
ErrorOccurrenceSchema.index({ incidentId: 1, createdAt: -1 });
ErrorOccurrenceSchema.index({ createdAt: -1 }); // For cleanup jobs

// Virtual for formatted incident ID display
ErrorEventSchema.virtual('displayId').get(function() {
  return this.incidentId.slice(0, 12) + '...';
});

// Method to check if error is critical
ErrorEventSchema.methods.isCritical = function() {
  return this.severity === 'P0' || this.severity === 'P1';
};

// Static method to get error summary by module
ErrorEventSchema.statics.getModuleSummary = async function(orgId: string, timeRange: { start: Date; end: Date }) {
  return this.aggregate([
    {
      $match: {
        orgId,
        lastSeenAt: { $gte: timeRange.start, $lte: timeRange.end }
      }
    },
    {
      $group: {
        _id: {
          module: '$module',
          severity: '$severity'
        },
        count: { $sum: '$occurrences' },
        uniqueErrors: { $addToSet: '$code' }
      }
    },
    {
      $group: {
        _id: '$_id.module',
        severities: {
          $push: {
            severity: '$_id.severity',
            count: '$count',
            uniqueErrors: { $size: '$uniqueErrors' }
          }
        },
        totalCount: { $sum: '$count' }
      }
    },
    {
      $sort: { totalCount: -1 }
    }
  ]);
};

export const ErrorEvent = models.ErrorEvent || model('ErrorEvent', ErrorEventSchema);
export const ErrorOccurrence = models.ErrorOccurrence || model('ErrorOccurrence', ErrorOccurrenceSchema);
