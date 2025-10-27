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
  code: { type: String, required: true, uppercase: true }, // ⚡ Removed unique: true - enforced via compound index below
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

// Plugins (apply BEFORE indexes so orgId field exists)
ReferralCodeSchema.plugin(tenantIsolationPlugin);
ReferralCodeSchema.plugin(auditPlugin);

// Indexes (after plugins to ensure orgId exists)
ReferralCodeSchema.index({ orgId: 1, code: 1 }, { unique: true }); // ⚡ Tenant-scoped uniqueness
ReferralCodeSchema.index({ orgId: 1, referrerId: 1 });
ReferralCodeSchema.index({ orgId: 1, status: 1 });
ReferralCodeSchema.index({ orgId: 1, "limits.validFrom": 1, "limits.validUntil": 1 });
ReferralCodeSchema.index({ orgId: 1, "referrals.referredUserId": 1 });

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
  const existingUses = this.referrals.filter((r: { referredUserId: string }) => r.referredUserId === userId).length;
  if (existingUses >= this.limits.maxUsesPerUser) return false;
  
  return true;
};

// Static method to generate unique code
ReferralCodeSchema.statics.generateCode = async function(length: number = 8): Promise<string> {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  const maxRetries = 50; // Prevent infinite loops
  let code = '';
  let retries = 0;
  
  while (retries < maxRetries) {
    code = '';
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    try {
      // Check if code already exists
      const existing = await this.findOne({ code });
      if (!existing) {
        return code; // Found unique code
      }
      
      retries++;
      // Small backoff on collision
      if (retries > 10) {
        await new Promise(resolve => setTimeout(resolve, 10 * retries));
      }
    } catch (error) {
      // Handle DB errors
      retries++;
      if (retries >= maxRetries) {
        throw new Error(`ReferralCode.generateCode: Failed to generate unique code after ${maxRetries} attempts due to DB error: ${error}`);
      }
      // Backoff on DB error
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  throw new Error(`ReferralCode.generateCode: Failed to generate unique code after ${maxRetries} attempts. Code length: ${length}`);
};

// Export type and model
export type ReferralCode = InferSchemaType<typeof ReferralCodeSchema>;

// Define static methods interface
export interface ReferralCodeStaticMethods {
  generateCode(length?: number): Promise<string>;
}

// Type the model with statics
export type ReferralCodeModelType = import('mongoose').Model<ReferralCode> & ReferralCodeStaticMethods;

export const ReferralCodeModel = (models.ReferralCode || model("ReferralCode", ReferralCodeSchema)) as ReferralCodeModelType;
