import { Schema, model, models, Types, HydratedDocument } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

export const ReferralCodeStatus = [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
  "DEPLETED",
] as const;
export const RewardType = [
  "DISCOUNT",
  "CASH",
  "CREDIT",
  "FREE_MONTH",
  "CUSTOM",
] as const;
export const RewardStatus = [
  "PENDING",
  "APPROVED",
  "PAID",
  "CANCELLED",
  "EXPIRED",
] as const;

type TReferralCodeStatus = (typeof ReferralCodeStatus)[number];
type TRewardType = (typeof RewardType)[number];
type TRewardStatus = (typeof RewardStatus)[number];

interface IReward {
  type: TRewardType;
  referrerAmount: number;
  referredAmount: number;
  currency?: string;
  description?: string;
  conditions?: string;
}

interface ILimits {
  maxUses?: number | null;
  currentUses: number;
  maxUsesPerUser: number;
  minPurchaseAmount?: number;
  validFrom?: Date;
  validUntil?: Date;
}

interface ITargeting {
  userTypes?: string[];
  properties?: Types.ObjectId[];
  services?: string[];
  regions?: string[];
}

interface IReferral {
  _id?: Types.ObjectId;
  referredUserId?: Types.ObjectId;
  referredEmail?: string;
  referredAt?: Date;
  convertedAt?: Date;
  rewardEarned?: number;
  rewardStatus?: TRewardStatus;
  rewardPaidAt?: Date;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

interface IStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardsEarned: number;
  totalRewardsPaid: number;
  conversionRate?: number;
}

export interface IReferralCode {
  orgId: Types.ObjectId;

  // Referrer
  referrerId: Types.ObjectId;
  referrerName?: string;
  referrerEmail?: string;

  // Code
  code: string; // uppercase enforced via schema
  shortUrl?: string; // e.g., https://fixzit.sa/ref/ABC123

  // Reward
  reward: IReward;
  limits: ILimits;
  targeting?: ITargeting;
  referrals?: IReferral[];
  stats: IStats;
  status: TReferralCodeStatus;

  // Campaign
  campaign?: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
    spent?: number;
  };

  // Meta
  notes?: string;
  tags?: string[];
}

type ReferralCodeDoc = HydratedDocument<IReferralCode> & {
  conversionRateComputed: number;
  isValid(): boolean;
  canBeUsedBy(userId: Types.ObjectId): boolean;
};

export interface ReferralCodeStaticMethods {
  generateCode(orgId: Types.ObjectId, length?: number): Promise<string>;
  applyCode(args: {
    orgId: Types.ObjectId | string;
    code: string;
    userId: Types.ObjectId | string;
    userType?: string;
    propertyId?: Types.ObjectId | string;
    service?: string;
    region?: string;
    orderAmount?: number;
    now?: Date;
    referredEmail?: string;
    transactionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ReferralCodeDoc | null>;
  markConverted(args: {
    orgId: Types.ObjectId | string;
    code: string;
    referredUserId: Types.ObjectId | string;
    rewardEarned?: number;
    when?: Date;
    transactionId?: string;
  }): Promise<ReferralCodeDoc | null>;
}

type ReferralCodeModelType = MModel<IReferralCode> & ReferralCodeStaticMethods;

// ---------------- Schema ----------------
const ReferralCodeSchema = new Schema<IReferralCode>(
  {
    // tenant via plugin, but declare for typing + indices
    // Multi-tenancy: which organization this referral code belongs to
    // Note: index: true removed from orgId to avoid duplicate index warning
    // orgId is indexed via composite indexes below (orgId+code, orgId+referrerId, etc.)
    orgId: { type: Schema.Types.ObjectId, required: true, ref: "Organization" },

    referrerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referrerName: { type: String, trim: true },
    referrerEmail: { type: String, trim: true, lowercase: true },

    code: { type: String, required: true, uppercase: true, trim: true },
    shortUrl: { type: String, trim: true },

    reward: {
      type: {
        type: String,
        enum: RewardType,
        required: true,
      },
      referrerAmount: { type: Number, required: true, min: 0 },
      referredAmount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: "SAR", trim: true },
      description: { type: String, trim: true },
      conditions: { type: String, trim: true },
    },

    limits: {
      maxUses: { type: Number, min: 0 },
      currentUses: { type: Number, default: 0, min: 0 },
      maxUsesPerUser: { type: Number, default: 1, min: 1 },
      minPurchaseAmount: { type: Number, min: 0 },
      validFrom: Date,
      validUntil: Date,
    },

    targeting: {
      userTypes: [String],
      properties: [{ type: Schema.Types.ObjectId, ref: "Property" }],
      services: [String],
      regions: [String],
    },

    referrals: [
      {
        referredUserId: { type: Schema.Types.ObjectId, ref: "User" },
        referredEmail: { type: String, trim: true, lowercase: true },
        referredAt: { type: Date, default: Date.now },
        convertedAt: Date,
        rewardEarned: { type: Number, min: 0 },
        rewardStatus: { type: String, enum: RewardStatus },
        rewardPaidAt: Date,
        transactionId: { type: String, trim: true },
        metadata: Schema.Types.Mixed,
      },
    ],

    stats: {
      totalReferrals: { type: Number, default: 0, min: 0 },
      successfulReferrals: { type: Number, default: 0, min: 0 },
      pendingReferrals: { type: Number, default: 0, min: 0 },
      totalRewardsEarned: { type: Number, default: 0, min: 0 },
      totalRewardsPaid: { type: Number, default: 0, min: 0 },
      conversionRate: { type: Number, default: 0, min: 0, max: 100 },
    },

    status: {
      type: String,
      enum: ReferralCodeStatus,
      default: "ACTIVE",
      index: true,
    },

    campaign: {
      name: { type: String, trim: true },
      startDate: Date,
      endDate: Date,
      budget: { type: Number, min: 0 },
      spent: { type: Number, default: 0, min: 0 },
    },

    notes: String,
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Plugins
ReferralCodeSchema.plugin(tenantIsolationPlugin);
ReferralCodeSchema.plugin(auditPlugin);

// Indices (post-plugin so orgId exists)
ReferralCodeSchema.index(
  { orgId: 1, code: 1 },
  { unique: true, name: "uniq_org_code" },
);
ReferralCodeSchema.index({ orgId: 1, referrerId: 1 });
ReferralCodeSchema.index({ orgId: 1, "referrals.referredUserId": 1 });
ReferralCodeSchema.index({
  orgId: 1,
  "limits.validFrom": 1,
  "limits.validUntil": 1,
});
ReferralCodeSchema.index({ orgId: 1, status: 1 });

// Virtuals
ReferralCodeSchema.virtual("conversionRateComputed").get(function (
  this: ReferralCodeDoc,
) {
  const total = this.stats?.totalReferrals ?? 0;
  const success = this.stats?.successfulReferrals ?? 0;
  return total > 0 ? (success / total) * 100 : 0;
});

// Instance methods
ReferralCodeSchema.methods.isValid = function (this: ReferralCodeDoc) {
  if (this.status !== "ACTIVE") return false;
  const now = new Date();
  const lim = this.limits || {};
  const maxU = typeof lim.maxUses === "number" ? lim.maxUses : Infinity;
  const cur = typeof lim.currentUses === "number" ? lim.currentUses : 0;
  if (lim.validFrom && now < lim.validFrom) return false;
  if (lim.validUntil && now > lim.validUntil) return false;
  if (cur >= maxU) return false;
  return true;
};

ReferralCodeSchema.methods.canBeUsedBy = function (
  this: ReferralCodeDoc,
  userId: Types.ObjectId,
) {
  if (!this.isValid()) return false;
  const cap = this.limits?.maxUsesPerUser ?? 1;
  const used = (this.referrals || []).filter(
    (r) => r.referredUserId?.toString() === String(userId),
  ).length;
  return used < cap;
};

// Static methods
ReferralCodeSchema.statics.generateCode = async function (
  orgId: Types.ObjectId,
  length: number = 8,
): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const maxRetries = 50;
  for (let i = 0; i < maxRetries; i++) {
    let code = "";
    for (let j = 0; j < length; j++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const exists = await this.exists({ orgId, code });
    if (!exists) return code;
    if (i > 10) await new Promise((r) => setTimeout(r, 10 * i));
  }
  throw new Error(
    `ReferralCode.generateCode: unable to produce unique code after ${maxRetries} attempts`,
  );
};

ReferralCodeSchema.statics.applyCode = async function ({
  orgId,
  code,
  userId,
  userType,
  propertyId,
  service,
  region,
  orderAmount,
  now = new Date(),
  referredEmail,
  transactionId,
  metadata,
}: {
  orgId: Types.ObjectId | string;
  code: string;
  userId: Types.ObjectId | string;
  userType?: string;
  propertyId?: Types.ObjectId | string;
  service?: string;
  region?: string;
  orderAmount?: number;
  now?: Date;
  referredEmail?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<ReferralCodeDoc | null> {
  const uid = new Types.ObjectId(userId as string);
  const org = new Types.ObjectId(orgId as string);

  const ands: Array<Record<string, unknown>> = [
    { status: "ACTIVE" },
    { orgId: org },
    { code: code.toUpperCase() },
    {
      $or: [
        { "limits.validFrom": { $exists: false } },
        { "limits.validFrom": { $lte: now } },
      ],
    },
    {
      $or: [
        { "limits.validUntil": { $exists: false } },
        { "limits.validUntil": { $gte: now } },
      ],
    },
    {
      $or: [
        { "limits.maxUses": { $exists: false } },
        {
          $expr: {
            $lt: [{ $ifNull: ["$limits.currentUses", 0] }, "$limits.maxUses"],
          },
        },
      ],
    },
    {
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$referrals", []] },
                as: "r",
                cond: { $eq: ["$$r.referredUserId", uid] },
              },
            },
          },
          "$limits.maxUsesPerUser",
        ],
      },
    },
    { $expr: { $ne: ["$referrerId", uid] } },
  ];

  if (userType)
    ands.push({
      $or: [
        { "targeting.userTypes": { $exists: false } },
        { "targeting.userTypes": userType },
      ],
    });
  if (service)
    ands.push({
      $or: [
        { "targeting.services": { $exists: false } },
        { "targeting.services": service },
      ],
    });
  if (region)
    ands.push({
      $or: [
        { "targeting.regions": { $exists: false } },
        { "targeting.regions": region },
      ],
    });
  if (propertyId) {
    const pid = new Types.ObjectId(propertyId as string);
    ands.push({
      $or: [
        { "targeting.properties": { $exists: false } },
        { "targeting.properties": pid },
      ],
    });
  }
  if (typeof orderAmount === "number") {
    ands.push({
      $or: [
        { "limits.minPurchaseAmount": { $exists: false } },
        { "limits.minPurchaseAmount": { $lte: orderAmount } },
      ],
    });
  }

  const update: Array<Record<string, unknown>> = [
    {
      $set: {
        referrals: {
          $concatArrays: [
            { $ifNull: ["$referrals", []] },
            [
              {
                referredUserId: uid,
                referredEmail: referredEmail?.toLowerCase(),
                referredAt: now,
                rewardEarned: 0,
                rewardStatus: "PENDING",
                transactionId,
                metadata,
              },
            ],
          ],
        },
        "stats.totalReferrals": {
          $add: [{ $ifNull: ["$stats.totalReferrals", 0] }, 1],
        },
        "stats.pendingReferrals": {
          $add: [{ $ifNull: ["$stats.pendingReferrals", 0] }, 1],
        },
        "limits.currentUses": {
          $add: [{ $ifNull: ["$limits.currentUses", 0] }, 1],
        },
      },
    },
    {
      $set: {
        status: {
          $cond: [
            {
              $and: [
                { $ne: ["$limits.maxUses", null] },
                { $ne: ["$limits.maxUses", undefined] },
                { $gte: ["$limits.currentUses", "$limits.maxUses"] },
              ],
            },
            "DEPLETED",
            "$status",
          ],
        },
      },
    },
  ];

  const doc = await this.findOneAndUpdate({ $and: ands }, update, {
    new: true,
  });
  return doc as ReferralCodeDoc | null;
};

ReferralCodeSchema.statics.markConverted = async function ({
  orgId,
  code,
  referredUserId,
  rewardEarned = 0,
  when = new Date(),
  transactionId,
}: {
  orgId: Types.ObjectId | string;
  code: string;
  referredUserId: Types.ObjectId | string;
  rewardEarned?: number;
  when?: Date;
  transactionId?: string;
}): Promise<ReferralCodeDoc | null> {
  const org = new Types.ObjectId(orgId as string);
  const uid = new Types.ObjectId(referredUserId as string);

  const doc = await this.findOneAndUpdate(
    {
      orgId: org,
      code: code.toUpperCase(),
      "referrals.referredUserId": uid,
      "referrals.convertedAt": { $exists: false },
    },
    {
      $set: {
        "referrals.$.convertedAt": when,
        "referrals.$.rewardEarned": rewardEarned,
        "referrals.$.rewardStatus": "APPROVED",
        ...(transactionId
          ? { "referrals.$.transactionId": transactionId }
          : {}),
      },
      $inc: {
        "stats.successfulReferrals": 1,
        "stats.pendingReferrals": -1,
        "stats.totalRewardsEarned": rewardEarned,
      },
    },
    { new: true },
  );
  return doc as ReferralCodeDoc | null;
};

// Pre-save normalization & auto-expire
ReferralCodeSchema.pre("save", function (next) {
  if (this.referrerEmail)
    this.referrerEmail = String(this.referrerEmail).trim().toLowerCase();
  if (this.code) this.code = String(this.code).toUpperCase().trim();

  const now = new Date();
  if (
    this.limits?.validUntil &&
    now > this.limits.validUntil &&
    this.status === "ACTIVE"
  ) {
    this.status = "EXPIRED";
  }

  // Update conversion rate
  const total = this.stats?.totalReferrals ?? 0;
  const success = this.stats?.successfulReferrals ?? 0;
  if (this.stats) {
    this.stats.conversionRate = total > 0 ? (success / total) * 100 : 0;
  }

  next();
});

// Final export
export const ReferralCodeModel = getModel<IReferralCode, ReferralCodeModelType>(
  "ReferralCode",
  ReferralCodeSchema,
);
