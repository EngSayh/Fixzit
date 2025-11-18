import { type FilterQuery } from 'mongoose';
import Listing, {
  ListingStatus,
  type IListing,
  ListingIntent,
  PropertyType,
} from '@/models/aqar/Listing';

export interface PricingInsightParams {
  cityId: string;
  neighborhoodId?: string;
  propertyType?: PropertyType;
  intent: ListingIntent;
}

export interface PricingInsight {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
}

export async function computePricingInsight(
  params: PricingInsightParams
): Promise<PricingInsight | null> {
  const match: FilterQuery<IListing> = {
    status: ListingStatus.ACTIVE,
    intent: params.intent,
    'location.cityId': params.cityId,
  };

  if (params.neighborhoodId) {
    match['location.neighborhoodId'] = params.neighborhoodId;
  }
  if (params.propertyType) {
    match.propertyType = params.propertyType;
  }

  const agg = await Listing.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        avgPrice: { $avg: '$price.amount' },
        minPrice: { $min: '$price.amount' },
        maxPrice: { $max: '$price.amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (!agg.length) {
    return null;
  }

  const stats = agg[0];
  const avgPrice = Math.round(Number(stats.avgPrice || 0));
  const minPrice = Math.round(Number(stats.minPrice || 0));
  const maxPrice = Math.round(Number(stats.maxPrice || 0));
  const count = Number(stats.count || 0);

  // Return only numeric values - let presentation layer handle localization
  return {
    avgPrice,
    minPrice,
    maxPrice,
    count,
  };
}

export { ListingIntent };
