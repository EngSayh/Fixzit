/**
 * AI Agent Audit Log Model (STRICT v4.1)
 * 
 * Persistent audit trail for AI agent actions.
 * Tracks which agent performed what action on behalf of which user.
 * 
 * Compliance: GDPR Article 30 (records of processing), SOC 2, ISO 27001
 */

import { Schema, model, models, Model, Document } from "mongoose";

export interface IAgentAuditLog extends Document {
  agent_id: string;
  assumed_user_id: string;
  timestamp: Date;
  action_summary: string;
  resource_type: string;
  resource_id?: string;
  orgId: string; // AUDIT-2025-11-29: Changed from org_id to orgId
  targetOrgId?: string; // When acting cross-tenant (platform admin)
  request_path?: string;
  success: boolean;
  error_message?: string;
  
  // Metadata
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

const AgentAuditLogSchema = new Schema<IAgentAuditLog>(
  {
    // Agent identification
    agent_id: {
      type: String,
      required: true,
      index: true,
      description: "AI agent identifier (e.g., 'copilot-swe-agent', 'fixzit-assistant')",
    },
    
    // User being represented
    assumed_user_id: {
      type: String,
      required: true,
      index: true,
      ref: "User",
      description: "User ID the agent is acting on behalf of (inherits RBAC)",
    },
    
    // Timestamp
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
      description: "When the action occurred",
    },
    
    // Action details
    action_summary: {
      type: String,
      required: true,
      maxlength: 1000,
      description: "Human-readable summary of what the agent did",
    },
    
    resource_type: {
      type: String,
      required: true,
      enum: [
        "work_order",
        "property",
        "user",
        "finance_record",
        "hr_record",
        "report",
        "config",
        "cross_tenant_action",
        "other",
      ],
      description: "Type of resource affected",
    },
    
    resource_id: {
      type: String,
      description: "ID of the specific resource (optional)",
    },
    
    // Organization context
    // AUDIT-2025-11-29: Changed from org_id to orgId
    orgId: {
      type: String,
      required: true,
      index: true,
      description: "Tenant organization ID for multi-tenant isolation",
    },
    targetOrgId: {
      type: String,
      description: "Target tenant org when acting cross-tenant (platform admin only)",
    },
    
    // HTTP request context
    request_path: {
      type: String,
      maxlength: 500,
      description: "API endpoint or route accessed",
    },
    
    // Outcome
    success: {
      type: Boolean,
      required: true,
      default: false,
      description: "Whether the action succeeded",
    },
    
    error_message: {
      type: String,
      maxlength: 2000,
      description: "Error message if action failed",
    },
    
    // Metadata for forensics
    ip_address: {
      type: String,
      description: "IP address of the request",
    },
    
    user_agent: {
      type: String,
      maxlength: 500,
      description: "User agent string of the client",
    },
    
    session_id: {
      type: String,
      description: "Session identifier for request correlation",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "agent_audit_logs",
    // Indexes are managed centrally in lib/db/collections.ts
    autoIndex: false,
  }
);

// Virtual for easier querying
AgentAuditLogSchema.virtual("age_days").get(function () {
  return Math.floor((Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60 * 24));
});

// Model export (handles already-defined model edge case)
export const AgentAuditLog: Model<IAgentAuditLog> =
  models.AgentAuditLog || model<IAgentAuditLog>("AgentAuditLog", AgentAuditLogSchema);
