import { createHash } from 'crypto';
import { logger } from '@/lib/logger';
import { connectDb } from '@/lib/mongo';
import type { Db } from 'mongodb';
import { AqarListing } from '@/models/aqar';
import {
  ListingStatus,
  type IListing,
  type IListingImmersive,
  type IListingPricingInsights,
  type IListingProptech,
  ListingIntent,
  PropertyType,
} from '@/models/aqar/Listing';
import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';

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
  private static readonly COLLECTION = 'aqar_offline_bundles';
  private static readonly TTL_MS = 15 * 60 * 1000;
  private static readonly PROJECTION =
    '_id title city neighborhood price areaSqm propertyType intent rnplEligible immersive proptech pricingInsights ai updatedAt publishedAt';

  static async getOrBuildBundle(input: OfflineBundleInput): Promise<OfflineBundleRecord> {
    const dbHandle = await connectDb();
    const db = dbHandle as unknown as Db;
    const cacheKey = this.buildCacheKey(input);
    const now = new Date();

    const collection = db.collection(this.COLLECTION);
    const existing = await collection.findOne({ cacheKey, expiresAt: { $gt: now } }) as OfflineBundleDoc | null;

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
      { upsert: true }
    );

    if (!input.skipListingSync) {
      await this.flagListings(record);
    }

    return record;
  }

  private static async buildPayload(input: OfflineBundleInput): Promise<OfflineBundlePayload> {
    const filter = this.buildFilter(input);
    const limit = Math.min(input.limit ?? 120, 400);

    const listings = await listingModel
      .find(filter)
      .select(this.PROJECTION)
      .sort({ 'ai.recommendationScore': -1, publishedAt: -1 })
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
      const pricePerSqm = area > 0 && listing.price?.amount ? Math.round(listing.price.amount / area) : undefined;
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
      propertyTypes: this.buildFacet(snapshots, (item) => item.propertyType || 'UNKNOWN'),
      cities: this.buildFacet(snapshots, (item) => item.city || 'UNKNOWN'),
      proptech: this.buildFacet(snapshots, (item) => item.proptech?.smartHomeLevel || 'NONE'),
    };

    return {
      version: this.computeVersion(input),
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
      filter['auction.isAuction'] = { $ne: true };
    }
    if (input.orgId && Types.ObjectId.isValid(input.orgId)) {
      filter.orgId = new Types.ObjectId(input.orgId);
    }
    return filter;
  }

  private static buildFacet(
    items: OfflineListingSnapshot[],
    resolver: (_item: OfflineListingSnapshot) => string
  ): Record<string, number> {
    return items.reduce<Record<string, number>>((acc, item) => {
      const key = resolver(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  private static computeVersion(input: OfflineBundleInput): number {
    const hint = input.cacheHint ?? '';
    const base = hint ? createHash('md5').update(hint).digest('hex') : Date.now().toString(16);
    return Number.parseInt(base.slice(0, 8), 16) || Math.floor(Date.now() / 1000);
  }

  private static computeChecksum(payload: OfflineBundlePayload): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private static buildCacheKey(input: OfflineBundleInput): string {
    const raw = JSON.stringify({
      orgId: input.orgId || 'public',
      city: input.city,
      intent: input.intent,
      includeAuctions: input.includeAuctions,
      limit: input.limit,
      cacheHint: input.cacheHint,
    });
    return createHash('sha1').update(raw).digest('hex');
  }

  private static async flagListings(bundle: OfflineBundleRecord): Promise<void> {
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
        }
      );
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.warn('AQAR_OFFLINE_MARK_FAILED', {
        cacheKey: bundle.cacheKey,
        error: (error as Error)?.message ?? String(error),
      });
    }
  }
}
