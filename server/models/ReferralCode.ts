import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const ReferralCodeStatus = ["ACTIVE", "INACTIVE", "EXPIRED", "DEPLETED"] as const;
const RewardType = ["DISCOUNT", "CASH", "CREDIT", "FREE_MONTH", "CUSTOM"] as const;
const RewardStatus = ["PENDING", "APPROVED", "PAID", "CANCELLED", "EXPIRED"] as const;

const ReferralCodeSchema = new Schema({
  // Multi-tenancy - will be added by plugin
  // orgId: { type: String, required: true, index: true },

  // Referrer Information
  referrerId: { type: String, ref: "User", required: true },
  referrerName: String,
  referrerEmail: String,
  
  // Referral Code
  code: { type: String, required: true, unique: true, uppercase: true },
  shortUrl: String, // e.g., fixzit.sa/ref/ABC123
  
  // Reward Configuration
  reward: {
    type: { type: String, enum: RewardType, required: true },
    referrerAmount: { type: Number, required: true }, // What referrer gets
    referredAmount: { type: Number, required: true }, // What referred user gets
    currency: { type: String, default: "SAR" },
    description: String,
    conditions: String // e.g., "After first payment", "After 3 months"
  },
  
  // Usage Limits
  limits: {
    maxUses: Number, // Null = unlimited
    currentUses: { type: Number, default: 0 },
    maxUsesPerUser: { type: Number, default: 1 },
    minPurchaseAmount: Number, // Minimum transaction amount to qualify
    validFrom: Date,
    validUntil: Date
  },
  
  // Targeting
  targeting: {
    userTypes: [String], // OWNER, TENANT, VENDOR, etc.
    properties: [{ type: Schema.Types.ObjectId, ref: "Property" }], // Specific properties
    services: [String], // Specific services (e.g., MAINTENANCE, RENTAL)
    regions: [String], // Geographic restrictions
  },
  
  // Referrals Made
  referrals: [{
    referredUserId: { type: String, ref: "User" },
    referredEmail: String,
    referredAt: Date,
    convertedAt: Date, // When they completed qualifying action
    rewardEarned: Number,
    rewardStatus: { type: String, enum: RewardStatus },
    rewardPaidAt: Date,
    transactionId: String,
    metadata: Schema.Types.Mixed
  }],
  
  // Statistics
  stats: {
    totalReferrals: { type: Number, default: 0 },
    successfulReferrals: { type: Number, default: 0 },
    pendingReferrals: { type: Number, default: 0 },
    totalRewardsEarned: { type: Number, default: 0 },
    totalRewardsPaid: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 } // percentage
  },
  
  // Status
  status: { type: String, enum: ReferralCodeStatus, default: "ACTIVE" },
  
  // Campaign Information (optional)
  campaign: {
    name: String,
    startDate: Date,
    endDate: Date,
    budget: Number,
    spent: { type: Number, default: 0 }
  },
  
  // Metadata
  notes: String,
  tags: [String],
  
  // Timestamps managed by plugin
}, {
  timestamps: true
});

// Indexes
ReferralCodeSchema.index({ code: 1 });
ReferralCodeSchema.index({ referrerId: 1 });
ReferralCodeSchema.index({ status: 1 });
ReferralCodeSchema.index({ "limits.validFrom": 1, "limits.validUntil": 1 });
ReferralCodeSchema.index({ "referrals.referredUserId": 1 });

// Plugins
ReferralCodeSchema.plugin(tenantIsolationPlugin);
ReferralCodeSchema.plugin(auditPlugin);

// Methods
ReferralCodeSchema.methods.isValid = function() {
  if (this.status !== 'ACTIVE') return false;
  
  const now = new Date();
  if (this.limits.validFrom && now < this.limits.validFrom) return false;
  if (this.limits.validUntil && now > this.limits.validUntil) return false;
  
  if (this.limits.maxUses && this.limits.currentUses >= this.limits.maxUses) return false;
  
  return true;
};

ReferralCodeSchema.methods.canBeUsedBy = function(userId: string) {
  if (!this.isValid()) return false;
  
  // Check if user already used this code
  const existingUses = this.referrals.filter(r => r.referredUserId === userId).length;
  if (existingUses >= this.limits.maxUsesPerUser) return false;
  
  return true;
};

// Static method to generate unique code
ReferralCodeSchema.statics.generateCode = async function(length: number = 8) {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code: string;
  let exists = true;
  
  while (exists) {
    code = '';
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if code already exists
    const existing = await this.findOne({ code });
    exists = !!existing;
  }
  
  return code;
};

// Export type and model
export type ReferralCode = InferSchemaType<typeof ReferralCodeSchema>;
export const ReferralCodeModel = models.ReferralCode || model("ReferralCode", ReferralCodeSchema);
