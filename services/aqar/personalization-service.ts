import { Types } from "mongoose";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import {
  AqarFavorite,
  AqarListing,
  AqarPersonalizationEvent,
} from "@/server/models/aqar";
import { FavoriteType } from "@/server/models/aqar/Favorite";
import SavedSearch from "@/server/models/aqar/SavedSearch";
import type {
  IPersonalizationEvent,
  PersonalizationEventType,
} from "@/server/models/aqar/PersonalizationEvent";

export interface UserPreferenceProfile {
  preferredPropertyTypes: string[];
  preferredCities: string[];
  preferredNeighborhoods: string[];
  budgetMin?: number;
  budgetMax?: number;
  signals: {
    favorites: number;
    searches: number;
    events: number;
  };
}

type ProfileCacheEntry = {
  profile: UserPreferenceProfile;
  expiresAt: number;
};

const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, ProfileCacheEntry>();

const profileCacheKey = (userId: string, orgId?: string | null) =>
  `${userId}:${orgId ?? "global"}`;

const toObjectId = (value?: string | null) =>
  value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;

const bump = (map: Map<string, number>, key?: string | null, weight = 1) => {
  if (!key) return;
  const next = (map.get(key) ?? 0) + weight;
  map.set(key, next);
};

const topKeys = (map: Map<string, number>, limit: number) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);

export async function recordPersonalizationEvent(input: {
  userId?: string | null;
  orgId?: string | null;
  listingId?: string | null;
  type: PersonalizationEventType;
  path?: string | null;
  intent?: string | null;
  propertyType?: string | null;
  city?: string | null;
  source?: string | null;
}): Promise<void> {
  if (!input.userId) return;

  const userId = toObjectId(input.userId);
  if (!userId) return;

  try {
    const orgId = toObjectId(input.orgId ?? null);
    const listingId = toObjectId(input.listingId ?? null);
    await connectDb();
    await AqarPersonalizationEvent.create({
      userId,
      orgId: orgId ?? undefined,
      listingId: listingId ?? undefined,
      type: input.type,
      source: input.source ?? undefined,
      path: input.path ?? undefined,
      intent: input.intent ?? undefined,
      propertyType: input.propertyType ?? undefined,
      city: input.city ?? undefined,
    });
    cache.delete(profileCacheKey(input.userId, input.orgId));
  } catch (error) {
    logger.warn("[AqarPersonalization] Failed to record event", {
      error,
      type: input.type,
    });
  }
}

export async function buildUserPreferenceProfile(
  userId: string,
  orgId?: string | null,
): Promise<UserPreferenceProfile> {
  const cacheKey = profileCacheKey(userId, orgId);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  const userObjectId = toObjectId(userId);
  const orgObjectId = toObjectId(orgId ?? null);
  if (!userObjectId) {
    return {
      preferredPropertyTypes: [],
      preferredCities: [],
      preferredNeighborhoods: [],
      signals: { favorites: 0, searches: 0, events: 0 },
    };
  }

  await connectDb();

  const baseQuery = orgObjectId ? { orgId: orgObjectId } : {};

  const [favorites, savedSearches, events] = await Promise.all([
    AqarFavorite.find({
      ...baseQuery,
      userId: userObjectId,
      targetType: FavoriteType.LISTING,
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean(),
    SavedSearch.find({
      ...baseQuery,
      userId: userObjectId,
      active: true,
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
    AqarPersonalizationEvent.find({
      ...baseQuery,
      userId: userObjectId,
      createdAt: { $gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean<IPersonalizationEvent[]>(),
  ]);

  const listingIds = new Set<string>();
  favorites.forEach((fav) => listingIds.add(String(fav.targetId)));
  events.forEach((evt) => {
    if (evt.listingId) listingIds.add(String(evt.listingId));
  });

  const listings = listingIds.size
    ? await AqarListing.find({
        _id: {
          $in: Array.from(listingIds).map((id) => new Types.ObjectId(id)),
        },
      })
        .select("propertyType city neighborhood price")
        .lean()
    : [];

  const listingLookup = new Map(
    listings.map((doc) => [String(doc._id), doc]),
  );

  const propertyTypeWeights = new Map<string, number>();
  const cityWeights = new Map<string, number>();
  const neighborhoodWeights = new Map<string, number>();
  const minBudgetCandidates: number[] = [];
  const maxBudgetCandidates: number[] = [];

  favorites.forEach((fav) => {
    const listing = listingLookup.get(String(fav.targetId));
    if (!listing) return;
    bump(propertyTypeWeights, listing.propertyType, 4);
    bump(cityWeights, listing.city, 3);
    bump(neighborhoodWeights, listing.neighborhood, 2);
    if (listing.price?.amount) {
      minBudgetCandidates.push(listing.price.amount * 0.9);
      maxBudgetCandidates.push(listing.price.amount * 1.1);
    }
  });

  savedSearches.forEach((search) => {
    bump(cityWeights, search.criteria?.city, 2.5);
    (search.criteria?.neighborhoods || []).forEach((n) =>
      bump(neighborhoodWeights, n, 1.5),
    );
    (search.criteria?.propertyTypes || []).forEach((type) =>
      bump(propertyTypeWeights, type, 3),
    );
    if (typeof search.criteria?.minPrice === "number") {
      minBudgetCandidates.push(search.criteria.minPrice);
    }
    if (typeof search.criteria?.maxPrice === "number") {
      maxBudgetCandidates.push(search.criteria.maxPrice);
    }
  });

  events.forEach((event) => {
    if (event.propertyType) bump(propertyTypeWeights, event.propertyType, 2);
    if (event.city) bump(cityWeights, event.city, 1.5);

    const listing = event.listingId
      ? listingLookup.get(String(event.listingId))
      : undefined;
    if (listing) {
      bump(propertyTypeWeights, listing.propertyType, 2);
      bump(cityWeights, listing.city, 1.5);
      bump(neighborhoodWeights, listing.neighborhood, 1.5);
      if (listing.price?.amount) {
        minBudgetCandidates.push(listing.price.amount * 0.9);
        maxBudgetCandidates.push(listing.price.amount * 1.1);
      }
    }
  });

  const preferredPropertyTypes = topKeys(propertyTypeWeights, 4);
  const preferredCities = topKeys(cityWeights, 4);
  const preferredNeighborhoods = topKeys(neighborhoodWeights, 5);

  const budgetMin =
    minBudgetCandidates.length > 0
      ? Math.max(0, Math.round(Math.min(...minBudgetCandidates)))
      : undefined;
  const budgetMax =
    maxBudgetCandidates.length > 0
      ? Math.max(0, Math.round(Math.max(...maxBudgetCandidates)))
      : undefined;

  const profile: UserPreferenceProfile = {
    preferredPropertyTypes,
    preferredCities,
    preferredNeighborhoods,
    budgetMin,
    budgetMax,
    signals: {
      favorites: favorites.length,
      searches: savedSearches.length,
      events: events.length,
    },
  };

  cache.set(cacheKey, {
    profile,
    expiresAt: Date.now() + PROFILE_CACHE_TTL,
  });

  return profile;
}

export function clearPersonalizationCache(): void {
  cache.clear();
}
