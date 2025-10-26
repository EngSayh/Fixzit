import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const InvitationStatus = ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"] as const;
const MemberRole = ["ADMIN", "MEMBER", "VIEWER"] as const;

const FamilyMemberSchema = new Schema({
  // Multi-tenancy - will be added by plugin
  // orgId: { type: String, required: true, index: true },

  // Primary User (Family Admin)
  primaryUserId: { type: String, ref: "User", required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant" }, // Optional link to tenant
  
  // Family Member Information
  userId: { type: String, ref: "User" }, // If they have created account
  name: {
    first: String,
    middle: String,
    last: String,
    full: { type: String, required: true }
  },
  email: { type: String, required: true },
  phone: String,
  
  // Relationship
  relationship: { 
    type: String, 
    enum: ["SPOUSE", "CHILD", "PARENT", "SIBLING", "GRANDPARENT", "GRANDCHILD", "OTHER"],
    required: true 
  },
  relationshipDetails: String, // Additional context
  
  // Personal Information
  nationalId: String,
  dateOfBirth: Date,
  age: Number,
  gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"] },
  occupation: String,
  
  // Access Control
  role: { type: String, enum: MemberRole, default: "MEMBER" },
  permissions: {
    viewProperties: { type: Boolean, default: true },
    viewFinancials: { type: Boolean, default: false },
    submitMaintenanceRequests: { type: Boolean, default: true },
    makePayments: { type: Boolean, default: false },
    viewDocuments: { type: Boolean, default: true },
    receiveNotifications: { type: Boolean, default: true }
  },
  
  // Invitation Details
  invitation: {
    code: String,
    sentAt: Date,
    acceptedAt: Date,
    expiresAt: Date,
    status: { type: String, enum: InvitationStatus, default: "PENDING" }
  },
  
  // Emergency Contact (for children or elderly)
  isEmergencyContact: { type: Boolean, default: false },
  emergencyPriority: Number, // 1 = primary, 2 = secondary, etc.
  
  // Activity Tracking
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  
  // Status
  isActive: { type: Boolean, default: true },
  removedAt: Date,
  removedBy: String,
  removedReason: String,
  
  // Metadata
  notes: String,
  
  // Timestamps managed by plugin
}, {
  timestamps: true
});

// Indexes
FamilyMemberSchema.index({ primaryUserId: 1 });
FamilyMemberSchema.index({ userId: 1 });
FamilyMemberSchema.index({ email: 1 });
FamilyMemberSchema.index({ "invitation.code": 1 });
FamilyMemberSchema.index({ "invitation.status": 1 });

// Plugins
FamilyMemberSchema.plugin(tenantIsolationPlugin);
FamilyMemberSchema.plugin(auditPlugin);

// Virtual for display name
FamilyMemberSchema.virtual('displayName').get(function() {
  return this.name?.full || 'Unknown';
});

// Method to check if invitation is valid
FamilyMemberSchema.methods.isInvitationValid = function() {
  if (!this.invitation) return false;
  if (this.invitation.status !== 'PENDING') return false;
  if (!this.invitation.expiresAt) return false;
  const expiresAt = this.invitation.expiresAt instanceof Date 
    ? this.invitation.expiresAt 
    : new Date(this.invitation.expiresAt);
  if (isNaN(expiresAt.getTime())) return false;
  return new Date() < expiresAt;
};

// Export type and model
export type FamilyMember = InferSchemaType<typeof FamilyMemberSchema>;
export const FamilyMemberModel = models.FamilyMember || model("FamilyMember", FamilyMemberSchema);
