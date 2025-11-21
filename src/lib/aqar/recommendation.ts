import { Types, type FilterQuery } from 'mongoose';
import Listing, {
  ListingStatus,
  type IListing,
  ListingIntent,
  PropertyType,
} from '@/models/aqar/Listing';

export interface RecommendationInput {
  listingId?: string;
  userId?: string;
  city?: string;
  intent?: ListingIntent;
  propertyType?: PropertyType;
  limit?: number;
}

export type RecommendedListing = Pick<
  IListing,
  | 'title'
  | 'price'
  | 'areaSqm'
  | 'city'
  | 'neighborhood'
  | 'propertyType'
  | 'intent'
  | 'rnplEligible'
  | 'ai'
  | 'proptech'
  | 'immersive'
  | 'pricingInsights'
  | 'iotFeatures'
  | 'pricing'
> & {
  _id: Types.ObjectId;
  location?: {
    cityId?: Types.ObjectId;
    neighborhoodId?: Types.ObjectId;
  };
  boost?: {
    dailyBudget?: number;
  };
};

/**
 * Simple heuristic-based recommendation helper.
 * Falls back to featured listings when no listingId/userId seed is provided.
 */
export async function getRecommendedListings({
  listingId,
  userId,
  city,
  intent,
  propertyType,
  limit = 6,
}: RecommendationInput): Promise<RecommendedListing[]> {
  const baseQuery: FilterQuery<IListing> = {
    status: ListingStatus.ACTIVE,
  };

  let seedListing: RecommendedListing | null = null;

  if (listingId && Types.ObjectId.isValid(listingId)) {
    seedListing = await Listing.findById(listingId)
      .select(
        '_id title price areaSqm city neighborhood propertyType intent rnplEligible ai proptech immersive pricingInsights iotFeatures pricing location'
      )
      .lean<RecommendedListing | null>();
  }

  if (seedListing) {
    baseQuery.intent = seedListing.intent;
    baseQuery.propertyType = seedListing.propertyType;
    if (seedListing.location?.cityId) {
      baseQuery['location.cityId'] = seedListing.location.cityId;
    } else if (seedListing.city) {
      baseQuery.city = seedListing.city;
    }
    if (seedListing.location?.neighborhoodId) {
      baseQuery['location.neighborhoodId'] = seedListing.location.neighborhoodId;
    } else if (seedListing.neighborhood) {
      baseQuery.neighborhood = seedListing.neighborhood;
    }
    const basePrice = seedListing.price?.amount;
    if (typeof basePrice === 'number' && Number.isFinite(basePrice) && basePrice > 0) {
      baseQuery['price.amount'] = {
        $gte: basePrice * 0.8,
        $lte: basePrice * 1.2,
      };
    }
    baseQuery._id = { $ne: seedListing._id };
  } else {
    if (city) {
      baseQuery.city = city;
    }
    if (intent) {
      baseQuery.intent = intent;
    }
    if (propertyType) {
      baseQuery.propertyType = propertyType;
    }
    /**
     * TODO(feature): User personalization for recommendations
     * 
     * Future enhancement to integrate viewing and favorites history for personalized recommendations.
     * When implemented, use userId to fetch:
     * - User's viewed listings (from analytics/tracking collection)
     * - User's favorite properties (from favorites collection)
     * - User's search history patterns
     * 
     * Algorithm should:
     * 1. Weight recommendations based on user's past interactions
     * 2. Include similar properties to previously viewed/favorited items
     * 3. Consider user's price range and location preferences
     * 
     * Related: Personalization service module (to be created)
     */
    void userId;
  }

  const docs = await Listing.find(baseQuery)
    .sort({ featuredLevel: -1, 'boost.dailyBudget': -1, createdAt: -1 })
    .limit(Math.max(1, Math.min(limit, 12)))
    .lean<RecommendedListing[]>();

  return docs;
}
