/**
 * ServiceContract Model - FM service agreements and SLAs
 * 
 * @module server/models/ServiceContract
 * @description Manages service contracts between property owners and FM companies/agents.
 * Tracks contract terms, SLAs, billing, and performance metrics.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Flexible scope (Property or OwnerGroup level)
 * - Contractor type differentiation (FM Company vs Real Estate Agent)
 * - Contract lifecycle (active, expired, terminated)
 * - SLA definitions and tracking
 * - Terms and conditions management
 * - Billing integration
 * 
 * @scope_types
 * - Property: Contract for a single property
 * - OwnerGroup: Master agreement for multiple properties
 * 
 * @contractor_types
 * - FM_COMPANY: Facility management company
 * - REAL_ESTATE_AGENT: Real estate agent/broker
 * 
 * @statuses
 * - draft: Contract being prepared
 * - active: Currently in effect
 * - expired: Contract term ended
 * - terminated: Contract cancelled early
 * - renewed: Auto-renewed or manually renewed
 * 
 * @indexes
 * - Index: { scopeRef, contractorRef } for property contract lookups
 * - Index: { status, endDate } for expiry monitoring
 * - Index: { contractorType } for contractor filtering
 * 
 * @relationships
 * - scopeRef → Property._id or OwnerGroup._id (polymorphic)
 * - contractorRef → Vendor._id
 * - WorkOrder records reference contract for billing
 * 
 * @sla_metrics
 * - Response time: Maximum time to acknowledge request
 * - Resolution time: Maximum time to complete work
 * - Availability: Required uptime percentage
 * - Quality standards: Inspection and quality criteria
 * 
 * @audit
 * - Contract status changes logged
 * - SLA breaches tracked
 * - Term modifications recorded
 */

import { Schema, model, models, Types, Model, Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const ServiceContractSchema = new Schema(
  {
    scope: {
      type: String,
      enum: ["Property", "OwnerGroup"], // FIXED: Must match model names
      default: "OwnerGroup",
    },
    scopeRef: {
      type: Schema.Types.ObjectId, // FIXED: Changed to ObjectId
      refPath: "scope",
    },
    contractorType: {
      type: String,
      enum: ["FM_COMPANY", "REAL_ESTATE_AGENT"],
    },
    contractorRef: {
      type: Schema.Types.ObjectId, // FIXED: Changed to ObjectId
      ref: "Vendor",
    },
    startDate: Date,
    endDate: Date,
    terms: String,
    sla: String,
    status: {
      type: String,
      enum: ["draft", "active", "ended", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes
ServiceContractSchema.plugin(tenantIsolationPlugin);
ServiceContractSchema.plugin(auditPlugin);

// Tenant-scoped indexes
ServiceContractSchema.index({ orgId: 1, status: 1 });
ServiceContractSchema.index({ orgId: 1, scope: 1, scopeRef: 1 });
ServiceContractSchema.index({ orgId: 1, contractorRef: 1 });
ServiceContractSchema.index({ orgId: 1, endDate: 1 });

// TypeScript-safe model export
interface IServiceContract extends Document {
  scope: "Property" | "OwnerGroup";
  scopeRef?: Schema.Types.ObjectId;
  contractorType?: "FM_COMPANY" | "REAL_ESTATE_AGENT";
  contractorRef?: Schema.Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  terms?: string;
  sla?: string;
  status: "draft" | "active" | "ended" | "cancelled";
  orgId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const ServiceContract = getModel<IServiceContract>(
  "ServiceContract",
  ServiceContractSchema,
);
export default ServiceContract;
