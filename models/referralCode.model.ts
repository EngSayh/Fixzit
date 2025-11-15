import {
  Schema,
  model,
  models,
  Types,
  HydratedDocument,
  Model,
} from 'mongoose';
 
import { tenantIsolationPlugin } from '../server/plugins/tenantIsolation';
 
import { auditPlugin } from '../server/plugins/auditPlugin';

// ---------------- Enums ----------------
const ReferralCodeStatus = ['ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED'] as const;
const RewardType = ['DISCOUNT', 'CASH', 'CREDIT', 'FREE_MONTH', 'CUSTOM'] as const;
const RewardStatus = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED', 'EXPIRED'] as const;

type TReferralCodeStatus = typeof ReferralCodeStatus[number];
type TRewardType = typeof RewardType[number];
type TRewardStatus = typeof RewardStatus[number];

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
  conversionRate?: number; // legacy; use virtual
}

interface ICampaign {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  spent?: number;
}

export interface IReferralCode {
  orgId: Types.ObjectId;
  referrerId: Types.ObjectId;
  referrerName?: string;
  referrerEmail?: string;

  code: string;            // unique per org
  shortUrl?: string;

  reward: IReward;
  limits: ILimits;
  targeting?: ITargeting;
  referrals?: IReferral[];
  stats: IStats;

  status: TReferralCodeStatus;
  campaign?: ICampaign;

  notes?: string;
  tags?: string[];
}

// --------- Document & Model typing ----------
/* eslint-disable no-unused-vars */
export type ReferralCodeDoc = HydratedDocument<IReferralCode> & {
  conversionRateComputed: number;
  isValid(): boolean;
  canBeUsedBy(userId: Types.ObjectId): boolean;
};
/* eslint-enable no-unused-vars */

/* eslint-disable no-unused-vars */
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
/* eslint-enable no-unused-vars */

type ReferralCodeModelType = Model & ReferralCodeStaticMethods;

// ---------------- Schema ----------------
const ReferralCodeSchema = new Schema<IReferralCode, ReferralCodeModelType>({
  orgId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' },

  referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referrerName: { type: String, trim: true },
  referrerEmail: { type: String, trim: true, lowercase: true },

  code: { type: String, required: true, uppercase: true, trim: true },
  shortUrl: { type: String, trim: true },

  reward: {
    type: { type: String, enum: RewardType, required: true },
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
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
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

// ---------------- Plugins ----------------
// @ts-expect-error - plugin type signatures are too strict for our typed schema
ReferralCodeSchema.plugin(tenantIsolationPlugin);
// @ts-expect-error - plugin type signatures are too strict for our typed schema
ReferralCodeSchema.plugin(auditPlugin);

// ---------------- Indexes ----------------
ReferralCodeSchema.index({ orgId: 1, code: 1 }, { unique: true, name: 'uniq_org_code' });
ReferralCodeSchema.index({ orgId: 1, status: 1 }, { name: 'org_status' });
ReferralCodeSchema.index({ orgId: 1, 'limits.validFrom': 1, 'limits.validUntil': 1 }, { name: 'org_validity' });
ReferralCodeSchema.index({ orgId: 1, 'referrals.referredUserId': 1 }, { name: 'org_referrals_user' });
ReferralCodeSchema.index({ orgId: 1, 'campaign.name': 1 }, { name: 'org_campaign_name' });

// ---------------- Virtuals ----------------
// eslint-disable-next-line no-unused-vars
ReferralCodeSchema.virtual('conversionRateComputed').get(function (this: ReferralCodeDoc) {
  const total = this.stats?.totalReferrals ?? 0;
  const success = this.stats?.successfulReferrals ?? 0;
  return total > 0 ? (success / total) * 100 : 0;
});

// ---------------- Instance Methods ----------------
// eslint-disable-next-line no-unused-vars
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
}): Promise<ReferralCodeDoc | null> {
  const uid = new Types.ObjectId(userId as string);
  const org = new Types.ObjectId(orgId as string);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andConds: any[] = [
    { $or: [{ 'limits.validFrom': { $exists: false } }, { 'limits.validFrom': { $lte: now } }] },
    { $or: [{ 'limits.validUntil': { $exists: false } }, { 'limits.validUntil': { $gte: now } }] },
    {
      $or: [
        { 'limits.minPurchaseAmount': { $exists: false } },
        ...(typeof orderAmount === 'number' ? [{ 'limits.minPurchaseAmount': { $lte: orderAmount } }] : []),
      ],
    },
    {
      $or: [
        { 'limits.maxUses': { $exists: false } },
        { $expr: { $lt: [{ $ifNull: ['$limits.currentUses', 0] }, '$limits.maxUses'] } },
      ],
    },
    // Per-user cap (treat missing referrals as [])
    {
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ['$referrals', []] },
                as: 'r',
                cond: { $eq: ['$$r.referredUserId', uid] },
              },
            },
          },
          '$limits.maxUsesPerUser',
        ],
      },
    },
    // Block self-referral
    { $expr: { $ne: ['$referrerId', uid] } },
  ];

  if (userType) andConds.push({ $or: [{ 'targeting.userTypes': { $exists: false } }, { 'targeting.userTypes': userType }] });
  if (service)  andConds.push({ $or: [{ 'targeting.services': { $exists: false } }, { 'targeting.services': service }] });
  if (region)   andConds.push({ $or: [{ 'targeting.regions': { $exists: false } }, { 'targeting.regions': region }] });
  if (propertyId) {
    const pid = new Types.ObjectId(propertyId as string);
    andConds.push({ $or: [{ 'targeting.properties': { $exists: false } }, { 'targeting.properties': pid }] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    orgId: org,
    code: code.toUpperCase(),
    status: 'ACTIVE',
    $and: andConds,
  };

  // Pipeline update with $ifNull guards to avoid null math
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any[] = [
    {
      $set: {
        referrals: {
          $concatArrays: [
            { $ifNull: ['$referrals', []] },
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
        'stats.totalReferrals': { $add: [{ $ifNull: ['$stats.totalReferrals', 0] }, 1] },
        'stats.pendingReferrals': { $add: [{ $ifNull: ['$stats.pendingReferrals', 0] }, 1] },
        'limits.currentUses': { $add: [{ $ifNull: ['$limits.currentUses', 0] }, 1] },
      },
    },
    {
      $set: {
        status: {
          $cond: [
            {
              $and: [
                { $ne: ['$limits.maxUses', null] },
                { $ne: ['$limits.maxUses', undefined] },
                { $gte: ['$limits.currentUses', '$limits.maxUses'] },
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
  const doc = await this.findOneAndUpdate(query, update, opts);
  return doc as ReferralCodeDoc | null;
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
}): Promise<ReferralCodeDoc | null> {
  const org = new Types.ObjectId(orgId as string);
  const uid = new Types.ObjectId(referredUserId as string);

  const doc = await this.findOneAndUpdate(
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

  return doc as ReferralCodeDoc | null;
};

// ---------------- Hooks ----------------
ReferralCodeSchema.pre('save', function (next) {
  if (this.referrerEmail) this.referrerEmail = String(this.referrerEmail).trim().toLowerCase();

  const now = new Date();
  const { validUntil } = this.limits || {};
  if (validUntil && now > validUntil && this.status === 'ACTIVE') {
    this.status = 'EXPIRED';
  }

  const total = this.stats?.totalReferrals ?? 0;
  const success = this.stats?.successfulReferrals ?? 0;
  this.stats.conversionRate = total > 0 ? Math.min(100, (success / total) * 100) : 0;

  next();
});

// ---------------- Export ----------------
export const ReferralCodeModel =
  (models.ReferralCode || model<IReferralCode, ReferralCodeModelType>('ReferralCode', ReferralCodeSchema)) as ReferralCodeModelType;
