/**
 * Referral Program Configuration
 * Centralized settings for referral rewards, limits, and expiry
 */

// Helper to safely parse integers with fallback
function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

// Helper to safely parse nullable integers
function safeParseNullableInt(value: string | undefined): number | null {
  if (!value || value === "null" || value === "unlimited") return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

// Referral reward configuration
const ALLOWED_REWARD_TYPES = ["CASH", "CREDIT", "DISCOUNT"] as const;
type RewardType = (typeof ALLOWED_REWARD_TYPES)[number];

// Validate reward type with runtime check
function validateRewardType(value: string | undefined): RewardType {
  const rawValue = (value || "CASH").toUpperCase();
  if (ALLOWED_REWARD_TYPES.includes(rawValue as RewardType)) {
    return rawValue as RewardType;
  }
  console.warn(
    `[Config] Invalid REFERRAL_REWARD_TYPE: ${rawValue}. Falling back to 'CASH'.`,
  );
  return "CASH";
}

export const REFERRAL_REWARD = {
  type: validateRewardType(process.env.REFERRAL_REWARD_TYPE),
  referrerAmount: safeParseInt(
    process.env.REFERRAL_REWARD_REFERRER_AMOUNT,
    100,
  ),
  referredAmount: safeParseInt(process.env.REFERRAL_REWARD_REFERRED_AMOUNT, 50),
  currency: process.env.REFERRAL_REWARD_CURRENCY || "SAR",
  description:
    process.env.REFERRAL_REWARD_DESCRIPTION ||
    "Cash reward for successful referrals",
} as const;

// Referral limits configuration
export const REFERRAL_LIMITS = {
  maxUses: safeParseNullableInt(process.env.REFERRAL_MAX_USES), // null = unlimited
  maxUsesPerUser: safeParseInt(process.env.REFERRAL_MAX_USES_PER_USER, 1),
  minPurchaseAmount: safeParseInt(process.env.REFERRAL_MIN_PURCHASE_AMOUNT, 0),
} as const;

// Referral validity configuration
export const REFERRAL_VALIDITY = {
  validityDays: safeParseNullableInt(process.env.REFERRAL_VALIDITY_DAYS), // null = no expiry
} as const;

/**
 * Compute validFrom and validUntil dates based on config
 */
export function getReferralValidity(): {
  validFrom: Date;
  validUntil: Date | null;
} {
  const validFrom = new Date();
  const validUntil = REFERRAL_VALIDITY.validityDays
    ? new Date(
        Date.now() + REFERRAL_VALIDITY.validityDays * 24 * 60 * 60 * 1000,
      )
    : null;

  return { validFrom, validUntil };
}
