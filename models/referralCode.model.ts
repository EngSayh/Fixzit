import {
  Schema,
  model,
  models,
  Types,
  HydratedDocument,
  Model,
} from 'mongoose';

// ---------------- Enums ----------------
const ReferralCodeStatus = ['ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED'] as const;
const RewardType = ['DISCOUNT', 'CASH', 'CREDIT', 'FREE_MONTH', 'CUSTOM'] as const;
const RewardStatus = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED', 'EXPIRED'] as const;

type TReferralCodeStatus = typeof ReferralCodeStatus[number];
type TRewardType = typeof RewardType[number];
type TRewardStatus = typeof RewardStatus[number];

interface IReward {
  type: TRewardType;
  referrerAmount: number;   // what referrer gets
  referredAmount: number;   // what referred user gets
  currency?: string;        // default SAR
  description?: string;
  conditions?: string;      // "After first payment", etc.
}

interface ILimits {
  maxUses?: number | null;      // null/undefined = unlimited
  currentUses: number;          // running counter
  maxUsesPerUser: number;       // default 1
  minPurchaseAmount?: number;   // optional gate
  validFrom?: Date;
  validUntil?: Date;
}

interface ITargeting {
  userTypes?: string[];                  // OWNER, TENANT, VENDOR, ...
  properties?: Types.ObjectId[];         // specific properties
  services?: string[];                   // MAINTENANCE, RENTAL, ...
  regions?: string[];                    // e.g., "Riyadh"
}

interface IReferral {
  _id?: Types.ObjectId;
  referredUserId?: Types.ObjectId;
  referredEmail?: string;
  referredAt?: Date;
  convertedAt?: Date;            // when qualifying action completed
  rewardEarned?: number;         // referrer's reward (calculated)
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
  conversionRate?: number; // kept for legacy; we expose a virtual
}

interface ICampaign {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  spent?: number;
}

export interface IReferralCode {
  // Tenant (explicit for indexes/types; plugin enforces access)
  orgId: Types.ObjectId;

  // Referrer
  referrerId: Types.ObjectId;
  referrerName?: string;
  referrerEmail?: string;

  // Code
  code: string;             // unique per org
  shortUrl?: string;        // e.g., fixzit.sa/ref/ABC123

  // Config
  reward: IReward;

  // Usage & validity
  limits: ILimits;

  // Targeting (optional)
  targeting?: ITargeting;

  // Referrals made (consider splitting if it grows huge)
  referrals?: IReferral[];

  // Stats
  stats: IStats;

  // Status
  status: TReferralCodeStatus;

  // Campaign (optional)
  campaign?: ICampaign;

  // Meta
  notes?: string;
  tags?: string[];
}

// --------- Document & Model typing ----------
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
  }): Promise<unknown>;
  markConverted(args: {
    orgId: Types.ObjectId | string;
    code: string;
    referredUserId: Types.ObjectId | string;
    rewardEarned?: number;
    when?: Date;
    transactionId?: string;
  }): Promise<unknown>;
}

type ReferralCodeModelType = Model<IReferralCode> & ReferralCodeStaticMethods;

// ---------------- Schema ----------------
const ReferralCodeSchema = new Schema<IReferralCode, ReferralCodeModelType>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },

  referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referrerName: { type: String, trim: true },
  referrerEmail: { type: String, trim: true, lowercase: true },

  code: { type: String, required: true, uppercase: true, trim: true }, // unique per org (see indexes)
  shortUrl: { type: String, trim: true },

  reward: {
    type: {
      type: String, enum: RewardType, required: true,
    },
    referrerAmount: { type: Number, required: true, min: 0 },
    referredAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR', trim: true },
    description: { type: String, trim: true },
    conditions: { type: String, trim: true },
  },

  limits: {
    maxUses: { type: Number, min: 0 },
    currentUses: { type: Number, default: 0, min: 0 },
    maxUsesPerUser: { type: Number, default: 1, min: 1 },
    minPurchaseAmount: { type: Number, min: 0 },
    validFrom: { type: Date },
    validUntil: { type: Date },
  },

  targeting: {
    userTypes: [String],
    properties: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    services: [String],
    regions: [String],
  },

  referrals: [{
    referredUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    referredEmail: { type: String, trim: true, lowercase: true },
    referredAt: { type: Date, default: Date.now },
    convertedAt: { type: Date },
    rewardEarned: { type: Number, min: 0 },
    rewardStatus: { type: String, enum: RewardStatus },
    rewardPaidAt: { type: Date },
    transactionId: { type: String, trim: true },
    metadata: Schema.Types.Mixed,
  }],

  stats: {
    totalReferrals: { type: Number, default: 0, min: 0 },
    successfulReferrals: { type: Number, default: 0, min: 0 },
    pendingReferrals: { type: Number, default: 0, min: 0 },
    totalRewardsEarned: { type: Number, default: 0, min: 0 },
    totalRewardsPaid: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 }, // legacy; virtual exposes computed
  },

  status: { type: String, enum: ReferralCodeStatus, default: 'ACTIVE', index: true },

  campaign: {
    name: { type: String, trim: true, index: true },
    startDate: Date,
    endDate: Date,
    budget: { type: Number, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
  },

  notes: String,
  tags: [String],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ---------------- Indexes ----------------
// Tenant-scoped uniqueness
ReferralCodeSchema.index({ orgId: 1, code: 1 }, { unique: true, name: 'uniq_org_code' });
// Common filters
ReferralCodeSchema.index({ orgId: 1, status: 1 }, { name: 'org_status' });
ReferralCodeSchema.index({ orgId: 1, 'limits.validFrom': 1, 'limits.validUntil': 1 }, { name: 'org_validity' });
ReferralCodeSchema.index({ orgId: 1, 'referrals.referredUserId': 1 }, { name: 'org_referrals_user' });
ReferralCodeSchema.index({ orgId: 1, 'campaign.name': 1 }, { name: 'org_campaign_name' });

// ---------------- Virtuals ----------------
ReferralCodeSchema.virtual('conversionRateComputed').get(function (this: ReferralCodeDoc) {
  const total = this.stats?.totalReferrals ?? 0;
  const success = this.stats?.successfulReferrals ?? 0;
  return total > 0 ? (success / total) * 100 : 0;
});

// ---------------- Instance Methods ----------------
ReferralCodeSchema.methods.isValid = function (this: ReferralCodeDoc) {
  if (this.status !== 'ACTIVE') return false;
  const now = new Date();
  const { validFrom, validUntil, maxUses, currentUses } = this.limits || {};
  if (validFrom && now < validFrom) return false;
  if (validUntil && now > validUntil) return false;
  if (typeof maxUses === 'number' && maxUses >= 0 && (currentUses ?? 0) >= maxUses) return false;
  return true;
};

ReferralCodeSchema.methods.canBeUsedBy = function (this: ReferralCodeDoc, userId: Types.ObjectId) {
  if (!this.isValid()) return false;
  const cap = this.limits?.maxUsesPerUser ?? 1;
  if (!Array.isArray(this.referrals)) return true;
  const usedCount = this.referrals.filter(r => r.referredUserId?.toString() === userId.toString()).length;
  return usedCount < cap;
};

// ---------------- Static Methods ----------------
ReferralCodeSchema.statics.generateCode = async function (
  orgId: Types.ObjectId,
  length: number = 8,
): Promise<string> {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid ambiguous chars
  const maxRetries = 50;
  for (let tries = 0; tries < maxRetries; tries++) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const exists = await this.exists({ orgId, code });
    if (!exists) return code;
    // small backoff
    if (tries > 10) await new Promise(r => setTimeout(r, 10 * tries));
  }
  throw new Error(`ReferralCode.generateCode: exceeded ${maxRetries} attempts for org ${orgId.toString()}`);
};

// Atomically apply a code (record usage) if all conditions pass
ReferralCodeSchema.statics.applyCode = async function ({
  orgId, code, userId, userType, propertyId, service, region,
  orderAmount, now = new Date(), referredEmail, transactionId, metadata,
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
}) {
  const uid = new Types.ObjectId(userId as string);
  const org = new Types.ObjectId(orgId as string);

  // Query conditions (all enforced atomically)
  const query = {
    orgId: org,
    code: code.toUpperCase(),
    status: 'ACTIVE',
    $and: [
      // validFrom <= now or not set
      { $or: [{ 'limits.validFrom': { $exists: false } }, { 'limits.validFrom': { $lte: now } }] },
      // validUntil >= now or not set
      { $or: [{ 'limits.validUntil': { $exists: false } }, { 'limits.validUntil': { $gte: now } }] },
      // minPurchaseAmount check (if provided and configured)
      { $or: [
          { 'limits.minPurchaseAmount': { $exists: false } },
          ...(typeof orderAmount === 'number'
            ? [{ 'limits.minPurchaseAmount': { $lte: orderAmount } }]
            : []),
        ],
      },
      // currentUses < maxUses (if maxUses set)
      { $or: [
          { 'limits.maxUses': { $exists: false } },
          { $expr: { $lt: ['$limits.currentUses', '$limits.maxUses'] } },
        ],
      },
      // Per-user cap via $expr counting matches in referrals
      {
        $expr: {
          $lt: [
            {
              $size: {
                $filter: {
                  input: '$referrals',
                  as: 'r',
                  cond: { $eq: ['$$r.referredUserId', uid] },
                },
              },
            },
            '$limits.maxUsesPerUser',
          ],
        },
      },
    ],
  };

  // Optional targeting gates
  if (userType) query.$and.push({ $or: [{ 'targeting.userTypes': { $exists: false } }, { 'targeting.userTypes': userType }] } as never);
  if (service)  query.$and.push({ $or: [{ 'targeting.services': { $exists: false } }, { 'targeting.services': service }] } as never);
  if (region)   query.$and.push({ $or: [{ 'targeting.regions': { $exists: false } }, { 'targeting.regions': region }] } as never);
  if (propertyId) {
    const pid = new Types.ObjectId(propertyId as string);
    query.$and.push({ $or: [{ 'targeting.properties': { $exists: false } }, { 'targeting.properties': pid }] } as never);
  }

  // Update document atomically: add referral, increment counters, and deplete if needed
  // Use aggregation pipeline update to calculate post-increment depletion (MongoDB >=4.2)
  const update = [
    {
      $set: {
        referrals: {
          $concatArrays: [
            '$referrals',
            [{
              referredUserId: uid,
              referredEmail: referredEmail?.toLowerCase(),
              referredAt: now,
              rewardEarned: 0,
              rewardStatus: 'PENDING',
              transactionId,
              metadata,
            }],
          ],
        },
        'stats.totalReferrals': { $add: ['$stats.totalReferrals', 1] },
        'stats.pendingReferrals': { $add: ['$stats.pendingReferrals', 1] },
        'limits.currentUses': { $add: ['$limits.currentUses', 1] },
      },
    },
    // If maxUses reached, set status to DEPLETED
    {
      $set: {
        status: {
          $cond: [
            {
              $and: [
                { $ne: ['$limits.maxUses', null] },
                { $ne: ['$limits.maxUses', undefined] },
                { $gte: [{ $add: ['$limits.currentUses', 0] }, '$limits.maxUses'] }, // after increment
              ],
            },
            'DEPLETED',
            '$status',
          ],
        },
      },
    },
  ];

  const opts = { new: true };
  const doc: unknown = await this.findOneAndUpdate(query, update, opts);
  return doc;
};

// Mark a referral converted, compute rewards, and update stats
ReferralCodeSchema.statics.markConverted = async function ({
  orgId, code, referredUserId, rewardEarned = 0, when = new Date(), transactionId,
}: {
  orgId: Types.ObjectId | string;
  code: string;
  referredUserId: Types.ObjectId | string;
  rewardEarned?: number;
  when?: Date;
  transactionId?: string;
}) {
  const org = new Types.ObjectId(orgId as string);
  const uid = new Types.ObjectId(referredUserId as string);

  // Update the specific referral entry
  const doc: unknown = await this.findOneAndUpdate(
    {
      orgId: org,
      code: code.toUpperCase(),
      'referrals.referredUserId': uid,
      'referrals.convertedAt': { $exists: false },
    },
    {
      $set: {
        'referrals.$.convertedAt': when,
        'referrals.$.rewardEarned': rewardEarned,
        'referrals.$.rewardStatus': 'APPROVED',
        ...(transactionId ? { 'referrals.$.transactionId': transactionId } : {}),
      },
      $inc: {
        'stats.successfulReferrals': 1,
        'stats.pendingReferrals': -1,
        'stats.totalRewardsEarned': rewardEarned,
      },
    },
    { new: true },
  );

  return doc;
};

// ---------------- Hooks ----------------
ReferralCodeSchema.pre('save', function (next) {
  if (this.referrerEmail) this.referrerEmail = String(this.referrerEmail).trim().toLowerCase();

  // Auto-expire if outside date window
  const now = new Date();
  const { validUntil } = this.limits || {};
  if (validUntil && now > validUntil && this.status === 'ACTIVE') {
    this.status = 'EXPIRED';
  }

  // Keep legacy stats.conversionRate roughly in sync (UI should use virtual)
  const total = this.stats?.totalReferrals ?? 0;
  const success = this.stats?.successfulReferrals ?? 0;
  this.stats.conversionRate = total > 0 ? Math.min(100, (success / total) * 100) : 0;

  next();
});

// ---------------- Export ----------------
export type ReferralCode = IReferralCode;
export const ReferralCodeModel =
  (models.ReferralCode || model<IReferralCode, ReferralCodeModelType>('ReferralCode', ReferralCodeSchema)) as ReferralCodeModelType;
