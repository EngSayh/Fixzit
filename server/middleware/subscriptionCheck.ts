/**
 * Owner Portal Subscription Middleware
 *
 * Validates subscription status and feature access for owner portal endpoints
 *
 * Implements correct subscription checking:
 * - Validates `activeUntil` date (NOT `createdAt` - addresses code review finding)
 * - Returns 402 Payment Required for expired subscriptions
 * - Checks feature-level access based on plan tier
 * - Supports BASIC, PRO, and ENTERPRISE plans
 */

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { OwnerModel } from "@/server/models/Owner";
import { logger } from "@/lib/logger";
import { getSessionUser } from "./withAuthRbac";
import { isUnauthorizedError } from "@/server/utils/isUnauthorizedError";

export interface SubscriptionCheckOptions {
  requireFeature?: string; // Specific feature required (e.g., 'roiAnalytics', 'utilitiesTracking')
  requirePlan?: "BASIC" | "PRO" | "ENTERPRISE"; // Minimum plan required
  propertyLimitCheck?: boolean; // Check if owner exceeds property limit
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan: "BASIC" | "PRO" | "ENTERPRISE";
  hasFeature: boolean;
  withinPropertyLimit: boolean;
  daysUntilExpiry: number | null;
  features: {
    maxProperties: number;
    utilitiesTracking: boolean;
    roiAnalytics: boolean;
    customReports: boolean;
    apiAccess: boolean;
    dedicatedSupport: boolean;
    multiUserAccess: boolean;
    advancedDelegation: boolean;
  };
}

/**
 * Check owner's subscription status
 *
 * ⚡ FIX: Uses activeUntil field for expiry checks, not createdAt
 * Addresses code review finding about incorrect subscription validation
 */
export async function checkSubscriptionStatus(
  ownerId: Types.ObjectId,
  orgId: Types.ObjectId,
  options: SubscriptionCheckOptions = {},
): Promise<SubscriptionStatus> {
  const owner = await OwnerModel.findOne({ _id: ownerId, orgId }).lean();

  if (!owner) {
    throw new Error("Owner not found");
  }

  const now = new Date();

  // ⚡ CORRECT: Check activeUntil date, NOT createdAt
  const activeUntil = owner.subscription?.activeUntil;
  const isActive = activeUntil ? now <= activeUntil : false;

  const plan = owner.subscription?.plan || "BASIC";
  const features = owner.subscription?.features || {
    maxProperties: 1,
    utilitiesTracking: false,
    roiAnalytics: false,
    customReports: false,
    apiAccess: false,
    dedicatedSupport: false,
    multiUserAccess: false,
    advancedDelegation: false,
  };

  // Calculate days until expiry
  let daysUntilExpiry: number | null = null;
  if (activeUntil) {
    const diff = activeUntil.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Check specific feature access
  let hasFeature = true;
  if (options.requireFeature) {
    hasFeature = !!(features as Record<string, unknown>)[
      options.requireFeature
    ];
  }

  // Check minimum plan requirement
  if (options.requirePlan) {
    const planHierarchy: Record<string, number> = {
      BASIC: 1,
      PRO: 2,
      ENTERPRISE: 3,
    };
    const currentPlanLevel = planHierarchy[plan] || 0;
    const requiredPlanLevel = planHierarchy[options.requirePlan] || 0;
    if (currentPlanLevel < requiredPlanLevel) {
      hasFeature = false;
    }
  }

  // Check property limit
  let withinPropertyLimit = true;
  if (options.propertyLimitCheck) {
    const propertyCount = owner.portfolio?.totalProperties || 0;
    const maxProperties = features.maxProperties;

    // ENTERPRISE = unlimited (represented as -1 or very high number)
    if (maxProperties > 0 && propertyCount >= maxProperties) {
      withinPropertyLimit = false;
    }
  }

  return {
    isActive,
    plan,
    hasFeature,
    withinPropertyLimit,
    daysUntilExpiry,
    features,
  };
}

/**
 * Next.js API Route Middleware for Subscription Checks
 *
 * Usage in API routes:
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const subCheck = await requireSubscription(req, {
 *     requireFeature: 'roiAnalytics',
 *     requirePlan: 'PRO'
 *   });
 *
 *   if (subCheck.error) {
 *     return subCheck.error;
 *   }
 *
 *   // Continue with API logic
 * }
 * ```
 */
export async function requireSubscription(
  req: NextRequest,
  options: SubscriptionCheckOptions = {},
): Promise<{
  status?: SubscriptionStatus;
  error?: NextResponse;
  ownerId?: Types.ObjectId;
  orgId?: Types.ObjectId;
}> {
  try {
    let session;
    try {
      session = await getSessionUser(req);
    } catch (error) {
      // Use centralized guard - handles both real instances and test mocks
      if (isUnauthorizedError(error)) {
        return {
          error: NextResponse.json(
            { error: "Authentication required" },
            { status: 401 },
          ),
        };
      }
      // Other errors (DB issues, etc.) are service failures
      logger.error("[subscriptionCheck] Auth service failure", { error });
      return {
        error: NextResponse.json(
          { error: "Authentication service unavailable" },
          { status: 503 },
        ),
      };
    }
    if (!session) {
      return {
        error: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        ),
      };
    }

    const allowedRoles = new Set([
      "OWNER",
      "CORPORATE_OWNER",
      "ADMIN",
      "SUPER_ADMIN",
    ]);
    const isAllowed =
      allowedRoles.has(session.role) ||
      session.roles?.some((r) => allowedRoles.has(r.toUpperCase?.() || r));
    if (!isAllowed) {
      return {
        error: NextResponse.json(
          { error: "Forbidden" },
          { status: 403 },
        ),
      };
    }

    if (!session.orgId) {
      return {
        error: NextResponse.json(
          { error: "Organization context required" },
          { status: 401 },
        ),
      };
    }

    const ownerObjectId = new Types.ObjectId(session.id);
    const orgObjectId = new Types.ObjectId(session.orgId);

    // Check subscription status
    const status = await checkSubscriptionStatus(
      ownerObjectId,
      orgObjectId,
      options,
    );

    // ⚡ Return 402 Payment Required if subscription expired
    if (!status.isActive) {
      return {
        error: NextResponse.json(
          {
            error: "Subscription expired",
            message:
              "Your subscription has expired. Please renew to continue using this feature.",
            code: "SUBSCRIPTION_EXPIRED",
            daysExpired: status.daysUntilExpiry
              ? Math.abs(status.daysUntilExpiry)
              : null,
          },
          { status: 402 }, // 402 Payment Required
        ),
      };
    }

    // Check feature access
    if (!status.hasFeature) {
      const featureName = options.requireFeature || options.requirePlan;
      return {
        error: NextResponse.json(
          {
            error: "Feature not available",
            message: `This feature requires ${featureName}. Please upgrade your subscription.`,
            code: "FEATURE_NOT_AVAILABLE",
            currentPlan: status.plan,
            requiredPlan: options.requirePlan,
          },
          { status: 403 }, // 403 Forbidden
        ),
      };
    }

    // Check property limit
    if (options.propertyLimitCheck && !status.withinPropertyLimit) {
      return {
        error: NextResponse.json(
          {
            error: "Property limit exceeded",
            message: `You have reached the maximum number of properties for your ${status.plan} plan.`,
            code: "PROPERTY_LIMIT_EXCEEDED",
            currentPlan: status.plan,
            maxProperties: status.features.maxProperties,
          },
          { status: 403 },
        ),
      };
    }

    // Warn if subscription expiring soon (within 7 days)
    if (
      status.daysUntilExpiry &&
      status.daysUntilExpiry > 0 &&
      status.daysUntilExpiry <= 7
    ) {
      logger.warn(
        `Subscription expiring soon for owner ${ownerObjectId}: ${status.daysUntilExpiry} days remaining`,
      );
    }

    return {
      status,
      ownerId: ownerObjectId,
      orgId: orgObjectId,
    };
  } catch (error) {
    logger.error("Subscription check error", { error });
    return {
      error: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      ),
    };
  }
}

/**
 * Feature flags based on subscription plan
 */
export const PLAN_FEATURES = {
  BASIC: {
    maxProperties: 1,
    utilitiesTracking: false,
    roiAnalytics: false,
    customReports: false,
    apiAccess: false,
    dedicatedSupport: false,
    multiUserAccess: false,
    advancedDelegation: false,
  },
  PRO: {
    maxProperties: 5,
    utilitiesTracking: true,
    roiAnalytics: true,
    customReports: true,
    apiAccess: false,
    dedicatedSupport: false,
    multiUserAccess: true,
    advancedDelegation: true,
  },
  ENTERPRISE: {
    maxProperties: -1, // Unlimited
    utilitiesTracking: true,
    roiAnalytics: true,
    customReports: true,
    apiAccess: true,
    dedicatedSupport: true,
    multiUserAccess: true,
    advancedDelegation: true,
  },
} as const;
