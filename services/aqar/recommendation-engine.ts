import crypto from "crypto";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongodb-unified";
import { AqarListing } from "@/server/models/aqar";
import {
  ListingStatus,
  type IListing,
  type IListingAnalytics,
  type IListingImmersive,
  type IListingPricingInsights,
  type IListingProptech,
  ListingIntent,
  PropertyType,
  SmartHomeLevel,
} from "@/server/models/aqar/Listing";
import {
  buildUserPreferenceProfile,
  type UserPreferenceProfile,
} from "@/services/aqar/personalization-service";
import type { FilterQuery } from "mongoose";
import { Types } from "mongoose";

// AqarListing is already typed as Model<IListing> from the import
const listingModel = AqarListing;

export type RecommendationBadge =
  | "smart-home"
  | "vr-ready"
  | "rnpl-ready"
  | "auction"
  | "pricing-insight"
  | "fm-lifecycle";

export interface BudgetPreference {
  min?: number;
  max?: number;
  currency?: string;
}

export interface RecommendationContext {
  intent?: ListingIntent;
  propertyTypes?: PropertyType[];
  preferredCity?: string;
  preferredNeighborhoods?: string[];
  budget?: BudgetPreference;
  favorites?: string[];
  currentListingId?: string;
  userId?: string;
  orgId?: string;
  tenantId?: string;
  limit?: number;
  includeExperimental?: boolean;
  updateAiSnapshot?: boolean;
  correlationId?: string;
  variant?: "primary" | "neighbor" | "experimental";
  personalize?: boolean;
  userProfile?: UserPreferenceProfile;
  locale?: string;
}

export interface RecommendationResultItem {
  listingId: string;
  score: number;
  reasons: string[];
  badges: RecommendationBadge[];
  highlights: string[];
  listing: {
    title?: string;
    city?: string;
    neighborhood?: string;
    price?: number;
    pricePerSqm?: number;
    propertyType?: PropertyType;
    intent?: ListingIntent;
    rnplEligible?: boolean;
    immersive?: IListingImmersive;
    proptech?: IListingProptech;
    pricingInsights?: IListingPricingInsights;
  };
}

export interface RecommendationResponse {
  cacheKey: string;
  correlationId: string;
  generatedAt: string;
  primary: RecommendationResultItem[];
  experimental: RecommendationResultItem[];
  appliedFilters: {
    intent?: ListingIntent;
    propertyTypes?: PropertyType[];
    city?: string;
    neighborhoods?: string[];
    budget?: BudgetPreference;
  };
  personalization?: {
    applied: boolean;
    budgetMin?: number;
    budgetMax?: number;
    signals?: UserPreferenceProfile["signals"];
  };
}

type ListingProjection = {
  _id: Types.ObjectId;
  title?: string;
  city?: string;
  neighborhood?: string;
  price?: { amount: number; currency?: string };
  areaSqm?: number;
  propertyType?: PropertyType;
  intent?: ListingIntent;
  amenities?: string[];
  rnplEligible?: boolean;
  auction?: IListing["auction"];
  proptech?: IListingProptech;
  immersive?: IListingImmersive;
  ai?: IListing["ai"];
  pricingInsights?: IListingPricingInsights;
  analytics?: IListingAnalytics;
  fmLifecycle?: IListing["fmLifecycle"];
  status: ListingStatus;
};

export class AqarRecommendationEngine {
  private static readonly PROJECTION =
    "_id title city neighborhood price areaSqm propertyType intent amenities rnplEligible auction proptech immersive ai pricingInsights analytics fmLifecycle status";

  private static async resolvePersonalization(
    context: RecommendationContext,
  ): Promise<{ profile?: UserPreferenceProfile; budget?: BudgetPreference }> {
    if (context.personalize === false) {
      return { profile: undefined, budget: context.budget };
    }

    try {
      const profile =
        context.userProfile ??
        (context.userId
          ? await buildUserPreferenceProfile(
              context.userId,
              context.orgId ?? context.tenantId,
            )
          : undefined);

      const budget =
        context.budget ??
        (profile?.budgetMin || profile?.budgetMax
          ? {
              min: profile?.budgetMin,
              max: profile?.budgetMax,
            }
          : undefined);

      return { profile, budget };
    } catch (error) {
      logger.warn("[AqarRecommendationEngine] Failed to resolve personalization", {
        error,
      });
      return { profile: undefined, budget: context.budget };
    }
  }

  static async recommend(
    context: RecommendationContext = {},
  ): Promise<RecommendationResponse> {
    const correlationId = context.correlationId ?? crypto.randomUUID();
    await connectDb();

    const { profile, budget } = await this.resolvePersonalization(context);
    const effectiveContext: RecommendationContext = {
      ...context,
      budget: context.budget ?? budget,
    };

    const baseFilter = this.buildFilter(effectiveContext);
    const limit = Math.min(24, Math.max(context.limit ?? 12, 6));
    const fetchLimit = Math.min(200, Math.max(limit * 5, 60));

    let listings = await listingModel
      .find(baseFilter)
      .select(this.PROJECTION)
      .sort({ "ai.recommendationScore": -1, publishedAt: -1 })
      .limit(fetchLimit)
      .lean<ListingProjection[]>();

    if (!listings.length && baseFilter.city) {
      const fallbackFilter = { ...baseFilter } as FilterQuery<IListing>;
      delete fallbackFilter.city;
      listings = await listingModel
        .find(fallbackFilter)
        .select(this.PROJECTION)
        .sort({ publishedAt: -1 })
        .limit(fetchLimit)
        .lean<ListingProjection[]>();
    }

    const scored = listings
      .map((listing) =>
        this.scoreListing(
          listing,
          effectiveContext,
          profile,
          effectiveContext.budget,
        ),
      )
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const primary = scored.slice(0, limit);
    const experimental =
      context.includeExperimental === false
        ? []
        : scored.slice(limit, limit + 6);

    if (context.updateAiSnapshot !== false) {
      await Promise.all(
        primary
          .slice(0, 5)
          .map((item) =>
            this.updateListingSnapshot(item, context, correlationId),
          ),
      );
    }

    return {
      cacheKey: this.buildCacheKey(context),
      correlationId,
      generatedAt: new Date().toISOString(),
      primary,
      experimental,
      appliedFilters: {
        intent: context.intent,
        propertyTypes: context.propertyTypes,
        city: context.preferredCity,
        neighborhoods: context.preferredNeighborhoods,
        budget: effectiveContext.budget,
      },
      personalization: {
        applied: Boolean(profile),
        budgetMin: profile?.budgetMin,
        budgetMax: profile?.budgetMax,
        signals: profile?.signals,
      },
    };
  }

  static async refreshForListing(
    listingId: string,
    input?: RecommendationContext,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(listingId)) {
      return;
    }
    const context: RecommendationContext = {
      ...(input || {}),
      currentListingId: listingId,
      updateAiSnapshot: true,
      includeExperimental: true,
      limit: 6,
    };
    await this.recommend(context);
  }

  private static buildFilter(
    context: RecommendationContext,
  ): FilterQuery<IListing> {
    const query: FilterQuery<IListing> = {
      status: ListingStatus.ACTIVE,
    };

    // Multi-tenancy: scope by org/tenant when provided to avoid cross-tenant leakage
    const scopedOrgId = context.orgId || context.tenantId;
    if (scopedOrgId && Types.ObjectId.isValid(scopedOrgId)) {
      query.orgId = new Types.ObjectId(scopedOrgId);
    }

    if (context.intent) {
      query.intent = context.intent;
    }
    if (context.propertyTypes?.length) {
      query.propertyType = { $in: context.propertyTypes };
    }
    if (context.preferredCity) {
      query.city = context.preferredCity;
    }
    if (context.preferredNeighborhoods?.length) {
      query.neighborhood = { $in: context.preferredNeighborhoods };
    }
    if (
      context.budget?.min !== undefined ||
      context.budget?.max !== undefined
    ) {
      query["price.amount"] = {} as Record<string, number>;
      if (context.budget.min !== undefined) {
        (query["price.amount"] as Record<string, number>).$gte =
          context.budget.min * 0.9;
      }
      if (context.budget.max !== undefined) {
        (query["price.amount"] as Record<string, number>).$lte =
          context.budget.max * 1.1;
      }
    }
    const idFilters: Record<string, unknown> = {};
    if (
      context.currentListingId &&
      Types.ObjectId.isValid(context.currentListingId)
    ) {
      idFilters.$ne = new Types.ObjectId(context.currentListingId);
    }
    if (context.favorites?.length) {
      const favoriteIds = context.favorites
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      if (favoriteIds.length) {
        idFilters.$nin = favoriteIds;
      }
    }
    if (Object.keys(idFilters).length) {
      query._id = idFilters;
    }
    // NOTE: orgId/tenantId scoping is handled at the start of buildFilter via scopedOrgId
    // to avoid duplicate assignments which could cause confusion during debugging

    return query;
  }

  private static scoreListing(
    listing: ListingProjection,
    context: RecommendationContext,
    profile?: UserPreferenceProfile,
    budgetOverride?: BudgetPreference,
  ): RecommendationResultItem {
    let score = listing.ai?.recommendationScore ?? 32;
    const reasons: string[] = [];

    if (context.intent && listing.intent === context.intent) {
      score += 8;
      reasons.push("intent");
    }

    if (
      context.propertyTypes?.length &&
      listing.propertyType &&
      context.propertyTypes.includes(listing.propertyType)
    ) {
      score += 6;
      reasons.push("property-type");
    }

    if (context.preferredCity && listing.city === context.preferredCity) {
      score += 10;
      reasons.push("city");
    }

    if (
      context.preferredNeighborhoods?.length &&
      listing.neighborhood &&
      context.preferredNeighborhoods.includes(listing.neighborhood)
    ) {
      score += 8;
      reasons.push("neighborhood");
    }

    const priceScore = this.computePriceScore(
      listing.price?.amount,
      budgetOverride ?? context.budget,
    );
    score += priceScore.value;
    if (priceScore.reason) {
      reasons.push(priceScore.reason);
    }

    if (
      listing.proptech?.smartHomeLevel &&
      listing.proptech.smartHomeLevel !== SmartHomeLevel.NONE
    ) {
      score +=
        listing.proptech.smartHomeLevel === SmartHomeLevel.ADVANCED ? 8 : 4;
      reasons.push("smart-home");
    }

    if (listing.immersive?.vrTour?.ready) {
      score += 4;
      reasons.push("vr");
    }

    if (listing.rnplEligible) {
      score += 3;
      reasons.push("rnpl");
    }

    if (listing.auction?.isAuction) {
      score += 2;
      reasons.push("auction");
    }

    if (listing.pricingInsights?.projectedAppreciationPct) {
      const appreciation = Math.min(
        listing.pricingInsights.projectedAppreciationPct,
        25,
      );
      score += appreciation / 2;
      reasons.push("appreciation");
    }

    if (listing.pricingInsights?.demandScore) {
      score += Math.min(listing.pricingInsights.demandScore / 10, 6);
      reasons.push("demand");
    }

    if (listing.analytics) {
      const viewBoost = Math.min((listing.analytics.views || 0) / 200, 5);
      if (viewBoost > 0) {
        score += viewBoost;
        reasons.push("views");
      }
      const inquiryBoost = Math.min((listing.analytics.inquiries || 0) / 5, 5);
      if (inquiryBoost > 0) {
        score += inquiryBoost;
        reasons.push("inquiries");
      }
    }

    if (listing.fmLifecycle?.autoCreateOn?.length) {
      score += 2;
      reasons.push("fm-lifecycle");
    }

    const pricePerSqm = this.calculatePricePerSqm(listing);
    if (pricePerSqm && listing.pricingInsights?.neighborhoodAvg) {
      const delta =
        ((listing.pricingInsights.neighborhoodAvg - pricePerSqm) /
          listing.pricingInsights.neighborhoodAvg) *
        100;
      if (delta > 3) {
        score += 4;
        reasons.push("below-neighborhood");
      }
    }

    const personalization = this.applyPersonalization(
      listing,
      profile,
      budgetOverride ?? context.budget,
    );
    score += personalization.delta;
    reasons.push(...personalization.reasons);

    const highlights = this.buildHighlights(listing, pricePerSqm);
    const badges = this.buildBadges(listing, reasons);

    return {
      listingId: listing._id.toHexString(),
      score: this.clampScore(score),
      reasons: Array.from(new Set(reasons)),
      badges,
      highlights,
      listing: {
        title: listing.title,
        city: listing.city,
        neighborhood: listing.neighborhood,
        price: listing.price?.amount,
        pricePerSqm,
        propertyType: listing.propertyType,
        intent: listing.intent,
        rnplEligible: listing.rnplEligible,
        immersive: listing.immersive,
        proptech: listing.proptech,
        pricingInsights: listing.pricingInsights,
      },
    };
  }

  private static calculatePricePerSqm(
    listing: ListingProjection,
  ): number | undefined {
    if (listing.pricingInsights?.pricePerSqm) {
      return listing.pricingInsights.pricePerSqm;
    }
    if (listing.price?.amount && listing.areaSqm) {
      return Number((listing.price.amount / listing.areaSqm).toFixed(0));
    }
    return undefined;
  }

  private static computePriceScore(
    price?: number,
    budget?: BudgetPreference,
  ): { value: number; reason?: string } {
    if (!price || !budget) {
      return { value: 0 };
    }
    const target = budget.max ?? budget.min ?? price;
    if (!target) {
      return { value: 0 };
    }
    if (budget.max && price > budget.max * 1.15) {
      return { value: -8, reason: "above-budget" };
    }
    if (budget.min && price < budget.min * 0.85) {
      return { value: -4, reason: "below-budget" };
    }
    const delta = Math.abs(price - target) / target;
    if (delta <= 0.05) {
      return { value: 12, reason: "price-sweet-spot" };
    }
    return { value: Math.max(2, 10 - delta * 20), reason: "price-fit" };
  }

  private static buildHighlights(
    listing: ListingProjection,
    pricePerSqm?: number,
  ): string[] {
    const highlights: string[] = [];
    if (listing.pricingInsights?.projectedAppreciationPct) {
      highlights.push(
        `نمو متوقع ${listing.pricingInsights.projectedAppreciationPct.toFixed(1)}٪`,
      );
    }
    if (pricePerSqm) {
      highlights.push(`سعر المتر ${pricePerSqm.toLocaleString()} ﷼`);
    }
    if (listing.immersive?.vrTour?.ready) {
      highlights.push("جولة VR جاهزة");
    }
    if (listing.proptech?.smartHomeLevel === SmartHomeLevel.ADVANCED) {
      highlights.push("منزل ذكي متكامل");
    }
    if (listing.rnplEligible) {
      highlights.push("تمويل RNPL متاح");
    }
    if (listing.auction?.isAuction) {
      highlights.push("مزايدة نشطة");
    }
    return highlights;
  }

  private static applyPersonalization(
    listing: ListingProjection,
    profile?: UserPreferenceProfile,
    budget?: BudgetPreference,
  ): { delta: number; reasons: string[] } {
    if (!profile) return { delta: 0, reasons: [] };

    let delta = 0;
    const reasons: string[] = [];
    const weights = [6, 4, 3, 2];

    const applyListMatch = (
      preferences: string[],
      value?: string | null,
      reason?: string,
    ) => {
      if (!value) return;
      const idx = preferences.findIndex((item) => item === value);
      if (idx >= 0) {
        delta += weights[idx] ?? 1.5;
        if (reason) reasons.push(reason);
      }
    };

    applyListMatch(
      profile.preferredPropertyTypes,
      listing.propertyType,
      "personalized-property-type",
    );
    applyListMatch(
      profile.preferredCities,
      listing.city,
      "personalized-city",
    );
    applyListMatch(
      profile.preferredNeighborhoods,
      listing.neighborhood,
      "personalized-neighborhood",
    );

    if (budget && listing.price?.amount) {
      const min = budget.min ?? profile.budgetMin;
      const max = budget.max ?? profile.budgetMax;

      if (
        (min === undefined || listing.price.amount >= min) &&
        (max === undefined || listing.price.amount <= max)
      ) {
        delta += 5;
        reasons.push("personalized-budget");
      } else if (max && listing.price.amount <= max * 1.1) {
        delta += 2;
        reasons.push("near-budget");
      }
    }

    return { delta, reasons };
  }

  private static buildBadges(
    listing: ListingProjection,
    reasons: string[],
  ): RecommendationBadge[] {
    const badges: RecommendationBadge[] = [];
    if (
      listing.proptech?.smartHomeLevel &&
      listing.proptech.smartHomeLevel !== SmartHomeLevel.NONE
    ) {
      badges.push("smart-home");
    }
    if (listing.immersive?.vrTour?.ready) {
      badges.push("vr-ready");
    }
    if (listing.rnplEligible) {
      badges.push("rnpl-ready");
    }
    if (listing.auction?.isAuction) {
      badges.push("auction");
    }
    if (
      reasons.includes("price-sweet-spot") ||
      reasons.includes("below-neighborhood")
    ) {
      badges.push("pricing-insight");
    }
    if (listing.fmLifecycle?.autoCreateOn?.length) {
      badges.push("fm-lifecycle");
    }
    return Array.from(new Set(badges));
  }

  private static clampScore(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Number(value.toFixed(2))));
  }

  private static buildCacheKey(context: RecommendationContext): string {
    const raw = JSON.stringify({
      intent: context.intent,
      propertyTypes: context.propertyTypes,
      city: context.preferredCity,
      neighborhoods: context.preferredNeighborhoods,
      budget: context.budget,
      limit: context.limit,
    });
    return crypto.createHash("sha1").update(raw).digest("hex");
  }

  private static async updateListingSnapshot(
    item: RecommendationResultItem,
    context: RecommendationContext,
    correlationId: string,
  ): Promise<void> {
    try {
      const similar: Types.ObjectId[] = [];
      if (
        context.currentListingId &&
        Types.ObjectId.isValid(context.currentListingId)
      ) {
        similar.push(new Types.ObjectId(context.currentListingId));
      }

      const update: Record<string, unknown> = {
        ai: {
          recommendationScore: item.score,
          variant: context.variant ?? "primary",
          explanation: item.reasons,
          badges: item.badges,
          similarListingIds: similar,
          demandSignal: item.listing.pricingInsights?.demandScore
            ? item.listing.pricingInsights.demandScore / 100
            : undefined,
          lastRunAt: new Date(),
        },
      };

      if (item.listing.pricingInsights) {
        update.pricingInsights = item.listing.pricingInsights;
      }

      await listingModel
        .findByIdAndUpdate(item.listingId, { $set: update })
        .lean();
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.warn("AQAR_AI_SNAPSHOT_FAILED", {
        correlationId,
        listingId: item.listingId,
        error: (error as Error)?.message ?? String(error),
      });
    }
  }
}
