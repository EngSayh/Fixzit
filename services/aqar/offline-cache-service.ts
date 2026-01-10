import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongodb-unified";
import type { Db, Collection } from "mongodb";
import { AqarListing } from "@/server/models/aqar";
import {
  ListingStatus,
  type IListing,
  type IListingImmersive,
  type IListingPricingInsights,
  type IListingProptech,
  ListingIntent,
  PropertyType,
} from "@/server/models/aqar/Listing";
import type { FilterQuery } from "mongoose";
import { Types } from "mongoose";
import { COLLECTIONS } from "@/lib/db/collection-names";

// AqarListing is already typed as Model<IListing> from the import
const listingModel = AqarListing;

type OfflineBundleDoc = OfflineBundleRecord & { _id?: unknown };
type LeanListing = {
  _id: Types.ObjectId;
  title?: string;
  city?: string;
  neighborhood?: string;
  areaSqm?: number;
  price?: { amount?: number } | null;
  propertyType?: PropertyType;
  intent?: ListingIntent;
  rnplEligible?: boolean;
  ai?: { recommendationScore?: number } | null;
  immersive?: IListingImmersive;
  proptech?: IListingProptech;
  pricingInsights?: IListingPricingInsights;
  updatedAt?: Date | string;
  publishedAt?: Date | string;
};

export interface OfflineBundleInput {
  orgId?: string;
  city?: string;
  intent?: ListingIntent;
  limit?: number;
  includeAuctions?: boolean;
  cacheHint?: string;
  skipListingSync?: boolean;
}

export interface OfflineListingSnapshot {
  id: string;
  title?: string;
  city?: string;
  neighborhood?: string;
  price?: number;
  pricePerSqm?: number;
  propertyType?: PropertyType;
  intent?: ListingIntent;
  rnplEligible?: boolean;
  aiScore?: number;
  immersive?: IListingImmersive;
  proptech?: IListingProptech;
  pricingInsights?: IListingPricingInsights;
  updatedAt?: string;
}

export interface OfflineBundlePayload {
  version: number;
  generatedAt: string;
  listings: OfflineListingSnapshot[];
  facets: {
    propertyTypes: Record<string, number>;
    cities: Record<string, number>;
    proptech: Record<string, number>;
  };
}

export interface OfflineBundleRecord extends OfflineBundlePayload {
  cacheKey: string;
  checksum: string;
  expiresAt: Date;
  listingCount: number;
}

export class AqarOfflineCacheService {
  private static readonly COLLECTION = "aqar_offline_bundles";
  private static readonly TTL_MS = 15 * 60 * 1000;
  private static readonly PROJECTION =
    "_id title city neighborhood price areaSqm propertyType intent rnplEligible immersive proptech pricingInsights ai updatedAt publishedAt";
  private static ttlIndexPromise: Promise<void> | null = null;

  static async getOrBuildBundle(
    input: OfflineBundleInput,
  ): Promise<OfflineBundleRecord> {
    const dbHandle = await connectDb();
    const db = dbHandle as unknown as Db;
    const cacheKey = this.buildCacheKey(input);
    const now = new Date();

    const collection: Collection<OfflineBundleDoc> =
      db.collection<OfflineBundleDoc>(this.COLLECTION);
    await this.ensureIndexes(collection);
    const existing = (await collection.findOne({
      cacheKey,
      expiresAt: { $gt: now },
    })) as OfflineBundleDoc | null;

    if (existing) {
      const { _id, ...rest } = existing;
      return rest as OfflineBundleRecord;
    }

    const payload = await this.buildPayload(input);
    const checksum = this.computeChecksum(payload);
    const record: OfflineBundleRecord = {
      cacheKey,
      checksum,
      expiresAt: new Date(now.getTime() + this.TTL_MS),
      listingCount: payload.listings.length,
      ...payload,
    };

    await collection.updateOne(
      { cacheKey },
      { $set: record },
      { upsert: true },
    );

    if (!input.skipListingSync) {
      await this.flagListings(record);
    }

    return record;
  }

  private static async buildPayload(
    input: OfflineBundleInput,
  ): Promise<OfflineBundlePayload> {
    const filter = this.buildFilter(input);
    const limit = Math.min(input.limit ?? 120, 400);

    const listings = await listingModel
      .find(filter)
      .select(this.PROJECTION)
      .sort({ "ai.recommendationScore": -1, publishedAt: -1 })
      .limit(limit)
      .lean();
    // lean() returns plain objects matching the LeanListing type
    const typedListings = listings as LeanListing[];
    const toIsoString = (value?: string | Date): string | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) {
        return value.toISOString();
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    };
    const snapshots: OfflineListingSnapshot[] = typedListings.map((listing) => {
      const area = listing.areaSqm || 0;
      const pricePerSqm =
        area > 0 && listing.price?.amount
          ? Math.round(listing.price.amount / area)
          : undefined;
      return {
        id: listing._id.toHexString(),
        title: listing.title,
        city: listing.city,
        neighborhood: listing.neighborhood,
        price: listing.price?.amount,
        pricePerSqm,
        propertyType: listing.propertyType,
        intent: listing.intent,
        rnplEligible: listing.rnplEligible,
        aiScore: listing.ai?.recommendationScore,
        immersive: listing.immersive,
        proptech: listing.proptech,
        pricingInsights: listing.pricingInsights,
        updatedAt: toIsoString(listing.updatedAt || listing.publishedAt),
      };
    });

    const facets = {
      propertyTypes: this.buildFacet(
        snapshots,
        (item) => item.propertyType || "UNKNOWN",
      ),
      cities: this.buildFacet(snapshots, (item) => item.city || "UNKNOWN"),
      proptech: this.buildFacet(
        snapshots,
        (item) => item.proptech?.smartHomeLevel || "NONE",
      ),
    };

    const versionSeed = JSON.stringify({
      cacheHint: input.cacheHint ?? "",
      listingIds: snapshots.map((snapshot) => snapshot.id),
      facets,
    });

    return {
      version: this.computeVersion(versionSeed),
      generatedAt: new Date().toISOString(),
      listings: snapshots,
      facets,
    };
  }

  private static buildFilter(input: OfflineBundleInput): FilterQuery<IListing> {
    const filter: FilterQuery<IListing> = { status: ListingStatus.ACTIVE };
    if (input.city) {
      filter.city = input.city;
    }
    if (input.intent) {
      filter.intent = input.intent;
    }
    if (!input.includeAuctions) {
      filter["auction.isAuction"] = { $ne: true };
    }
    if (input.orgId && Types.ObjectId.isValid(input.orgId)) {
      filter.orgId = new Types.ObjectId(input.orgId);
    }
    return filter;
  }

  private static buildFacet(
    items: OfflineListingSnapshot[],
    resolver: (_item: OfflineListingSnapshot) => string,
  ): Record<string, number> {
    return items.reduce<Record<string, number>>((acc, item) => {
      const key = resolver(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  private static computeVersion(seed: string): number {
    const base = createHash("md5").update(seed).digest("hex");
    return Number.parseInt(base.slice(0, 8), 16) || 1;
  }

  private static computeChecksum(payload: OfflineBundlePayload): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  private static buildCacheKey(input: OfflineBundleInput): string {
    // ORGID-FIX: Explicitly distinguish between tenant-scoped and public caches
    // Use 'public' only for genuinely public listings, undefined for missing tenant
    const raw = JSON.stringify({
      orgId: input.orgId ?? "public",  // ✅ Nullish coalescing for explicit public cache
      city: input.city,
      intent: input.intent,
      includeAuctions: input.includeAuctions,
      limit: input.limit,
      cacheHint: input.cacheHint,
    });
    return createHash("sha1").update(raw).digest("hex");
  }

  private static async flagListings(
    bundle: OfflineBundleRecord,
  ): Promise<void> {
    const listingIds = bundle.listings
      .map((listing) => listing.id)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (!listingIds.length) {
      return;
    }

    try {
      await listingModel.updateMany(
        { _id: { $in: listingIds } },
        {
          $set: {
            offline: {
              cacheKey: bundle.cacheKey,
              payloadHash: bundle.checksum,
              version: bundle.version,
              lastSyncedAt: new Date(bundle.generatedAt),
            },
          },
        },
      );
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.warn("AQAR_OFFLINE_MARK_FAILED", {
        cacheKey: bundle.cacheKey,
        error: (error as Error)?.message ?? String(error),
      });
    }
  }

  /**
   * Sync offline changes from mobile devices
   * Persists favorites, search history, viewed listings, and draft inquiries
   */
  static async syncOfflineChanges(input: {
    userId: string;
    orgId?: string;
    favorites?: Array<{ listingId: string; addedAt?: string; removed?: boolean }>;
    searchHistory?: Array<{ query: string; timestamp?: string; filters?: Record<string, unknown> }>;
    viewedListings?: Array<{ listingId: string; viewedAt?: string; duration?: number }>;
    draftInquiries?: Array<{ listingId: string; message?: string; createdAt?: string }>;
    lastSyncTimestamp?: string;
    deviceId?: string;
  }): Promise<{
    favorites?: { synced: number; conflicts: number };
    searchHistory?: { synced: number };
    viewedListings?: { synced: number };
    draftInquiries?: { synced: number; created: number };
  }> {
    const dbHandle = await connectDb();
    const db = dbHandle as unknown as Db;
    const now = new Date();
    const result: {
      favorites?: { synced: number; conflicts: number };
      searchHistory?: { synced: number };
      viewedListings?: { synced: number };
      draftInquiries?: { synced: number; created: number };
    } = {};

    try {
      // Sync favorites
      if (input.favorites && input.favorites.length > 0) {
        const favoritesCollection = db.collection(COLLECTIONS.AQAR_USER_FAVORITES);
        let synced = 0;
        let conflicts = 0;

        for (const fav of input.favorites) {
          if (fav.removed) {
            // Remove favorite
            const deleteResult = await favoritesCollection.deleteOne({
              userId: input.userId,
              listingId: fav.listingId,
            });
            if (deleteResult.deletedCount > 0) synced++;
          } else {
            // Add or update favorite (upsert)
            const updateResult = await favoritesCollection.updateOne(
              { userId: input.userId, listingId: fav.listingId },
              {
                $setOnInsert: {
                  userId: input.userId,
                  listingId: fav.listingId,
                  orgId: input.orgId,
                  createdAt: fav.addedAt ? new Date(fav.addedAt) : now,
                },
                $set: { updatedAt: now, deviceId: input.deviceId },
              },
              { upsert: true },
            );
            if (updateResult.upsertedCount > 0 || updateResult.modifiedCount > 0) {
              synced++;
            } else {
              conflicts++;
            }
          }
        }
        result.favorites = { synced, conflicts };
      }

      // Sync search history
      if (input.searchHistory && input.searchHistory.length > 0) {
        const searchHistoryCollection = db.collection(COLLECTIONS.AQAR_SEARCH_HISTORY);
        const docs = input.searchHistory.map((sh) => ({
          userId: input.userId,
          orgId: input.orgId,
          query: sh.query,
          filters: sh.filters ?? {},
          timestamp: sh.timestamp ? new Date(sh.timestamp) : now,
          deviceId: input.deviceId,
          syncedAt: now,
        }));
        
        // Insert search history (don't dedupe, it's a log)
        const insertResult = await searchHistoryCollection.insertMany(docs);
        result.searchHistory = { synced: insertResult.insertedCount };
      }

      // Sync viewed listings
      if (input.viewedListings && input.viewedListings.length > 0) {
        const viewedCollection = db.collection(COLLECTIONS.AQAR_VIEWED_LISTINGS);
        let synced = 0;

        for (const view of input.viewedListings) {
          // Upsert view record, update duration if already exists
          const updateResult = await viewedCollection.updateOne(
            { userId: input.userId, listingId: view.listingId },
            {
              $setOnInsert: {
                userId: input.userId,
                listingId: view.listingId,
                orgId: input.orgId,
                firstViewedAt: view.viewedAt ? new Date(view.viewedAt) : now,
              },
              $set: {
                lastViewedAt: view.viewedAt ? new Date(view.viewedAt) : now,
                deviceId: input.deviceId,
              },
              $inc: { viewCount: 1, totalDuration: view.duration ?? 0 },
            },
            { upsert: true },
          );
          if (updateResult.upsertedCount > 0 || updateResult.modifiedCount > 0) {
            synced++;
          }
        }
        result.viewedListings = { synced };
      }

      // Sync draft inquiries
      if (input.draftInquiries && input.draftInquiries.length > 0) {
        const inquiriesCollection = db.collection(COLLECTIONS.AQAR_INQUIRIES);
        let synced = 0;
        let created = 0;

        for (const inquiry of input.draftInquiries) {
          // Check if inquiry already exists for this user/listing
          const existing = await inquiriesCollection.findOne({
            userId: input.userId,
            listingId: inquiry.listingId,
            status: "draft",
          });

          if (existing) {
            // Update existing draft
            await inquiriesCollection.updateOne(
              { _id: existing._id },
              {
                $set: {
                  message: inquiry.message,
                  updatedAt: now,
                  deviceId: input.deviceId,
                },
              },
            );
            synced++;
          } else {
            // Create new draft inquiry
            await inquiriesCollection.insertOne({
              userId: input.userId,
              listingId: inquiry.listingId,
              orgId: input.orgId,
              message: inquiry.message,
              status: "draft",
              createdAt: inquiry.createdAt ? new Date(inquiry.createdAt) : now,
              updatedAt: now,
              deviceId: input.deviceId,
            });
            created++;
          }
        }
        result.draftInquiries = { synced, created };
      }

      // Record sync event
      await db.collection(COLLECTIONS.AQAR_SYNC_LOG).insertOne({
        userId: input.userId,
        orgId: input.orgId,
        deviceId: input.deviceId,
        syncedAt: now,
        lastSyncTimestamp: input.lastSyncTimestamp,
        result,
      });

      return result;
    } catch (error) {
      logger.error("AQAR_OFFLINE_SYNC_FAILED", {
        userId: input.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private static async ensureIndexes(
    collection: Collection<OfflineBundleDoc>,
  ): Promise<void> {
    if (!this.ttlIndexPromise) {
      this.ttlIndexPromise = collection
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        .catch((_error) => {
          const error =
            _error instanceof Error ? _error : new Error(String(_error));
          logger.warn("AQAR_OFFLINE_TTL_INDEX_FAILED", {
            error: error.message,
          });
          this.ttlIndexPromise = null;
        }) as Promise<void>;
    }
    return this.ttlIndexPromise;
  }
}
