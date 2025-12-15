import crypto from "crypto";
import { connectDb } from "@/lib/mongo";
import { AqarListing } from "@/server/models/aqar";
import {
  ListingStatus,
  type IListing,
  type IListingPricingInsights,
  ListingIntent,
  PropertyType,
} from "@/server/models/aqar/Listing";
import type { FilterQuery, PipelineStage } from "mongoose";
import { Types } from "mongoose";

const PRICE_BUCKETS = [
  0, 250_000, 500_000, 1_000_000, 2_000_000, 4_000_000, 8_000_000,
];
// AqarListing is already typed as Model<IListing> from the import
const listingModel = AqarListing;

export interface PricingInsightRequest {
  city?: string;
  neighborhood?: string;
  propertyType?: PropertyType;
  intent?: ListingIntent;
  orgId?: string;
  correlationId?: string;
}

export interface PricingInsightResponse {
  correlationId: string;
  city?: string;
  neighborhood?: string;
  propertyType?: PropertyType;
  intent?: ListingIntent;
  sampleSize: number;
  confidence: number;
  currentAveragePrice: number;
  currentPricePerSqm?: number;
  neighborhoodAverage?: number;
  yoyChangePct?: number;
  projectedAppreciationPct?: number;
  demandScore: number;
  dynamicRange: {
    conservative: number;
    base: number;
    bullish: number;
  };
  marketSignals: string[];
  priceBuckets: Array<{ label: string; count: number }>;
  timeline: Array<{ period: string; pricePerSqm: number; listings: number }>;
}

interface BucketRow {
  label: string;
  count: number;
  min: number;
  max: number;
}

export class PricingInsightsService {
  static async getInsights(
    request: PricingInsightRequest,
  ): Promise<PricingInsightResponse> {
    const correlationId = request.correlationId ?? crypto.randomUUID();
    await connectDb();

    const match = this.buildMatch(request);
    const pipeline = this.buildPipeline(match);
    const [result] = await listingModel.aggregate(pipeline);

    const stats = Array.isArray(result?.stats) ? result.stats[0] || {} : {};
    const sampleSize = Number(stats?.sampleSize || 0);
    const avgPrice: number = Number(stats?.avgPrice || 0);
    const avgPricePerSqm: number | undefined =
      stats?.avgPricePerSqm || undefined;
    const neighborhoodAverage = Number(stats?.avgPrice || 0) || undefined;
    const stdDev: number = Number(stats?.stdDevPrice || 0);
    const avgViews: number = Number(stats?.avgViews || 0);
    const avgInquiries: number = Number(stats?.avgInquiries || 0);

    const timeline = Array.isArray(result?.timeline)
      ? result.timeline.map(
          (row: { _id: string; avgPricePerSqm: number; listings: number }) => ({
            period: row._id,
            pricePerSqm: Number(row.avgPricePerSqm || 0),
            listings: row.listings,
          }),
        )
      : [];
    const yoyChange = this.computeYoyChange(timeline);

    const bucketRows = this.buildBucketRows(result?.buckets || []);
    const demandScore = this.computeDemandScore(avgViews, avgInquiries);
    const confidence = this.computeConfidence(sampleSize);
    const projectedAppreciation = yoyChange
      ? yoyChange * Math.min(1, (confidence + demandScore / 100) / 2)
      : undefined;
    const dynamicRange = this.buildDynamicRange(avgPrice, stdDev);
    const marketSignals = this.buildSignals({
      yoyChange,
      demandScore,
      confidence,
      sampleSize,
    });

    return {
      correlationId,
      city: request.city,
      neighborhood: request.neighborhood,
      propertyType: request.propertyType,
      intent: request.intent,
      sampleSize,
      confidence,
      currentAveragePrice: Number(avgPrice.toFixed(0)),
      currentPricePerSqm: avgPricePerSqm
        ? Number(avgPricePerSqm.toFixed(0))
        : undefined,
      neighborhoodAverage,
      yoyChangePct: yoyChange,
      projectedAppreciationPct: projectedAppreciation,
      demandScore,
      dynamicRange,
      marketSignals,
      priceBuckets: bucketRows.map((row) => ({
        label: row.label,
        count: row.count,
      })),
      timeline,
    };
  }

  static async updateListingInsights(
    listingId: string,
    orgId?: string,
  ): Promise<IListingPricingInsights | null> {
    if (!Types.ObjectId.isValid(listingId)) {
      return null;
    }

    const listingObjectId = new Types.ObjectId(listingId);
    const orgObjectId =
      orgId && Types.ObjectId.isValid(orgId)
        ? new Types.ObjectId(orgId)
        : null;

    await connectDb();
    const listingFilter: FilterQuery<IListing> = { _id: listingObjectId };
    if (orgObjectId) {
      listingFilter.orgId = orgObjectId;
    }

    const listing = await listingModel
      .findOne(listingFilter)
      .select("city neighborhood propertyType intent areaSqm price orgId")
      .lean<{
        city?: string;
        neighborhood?: string;
        propertyType?: PropertyType;
        intent?: ListingIntent;
        areaSqm?: number;
        price?: { amount: number };
        orgId?: Types.ObjectId;
      } | null>();

    if (!listing) {
      return null;
    }

    const response = await this.getInsights({
      city: listing.city,
      neighborhood: listing.neighborhood,
      propertyType: listing.propertyType,
      intent: listing.intent,
      orgId: listing.orgId?.toHexString() ?? orgId,
    });

    const insights: IListingPricingInsights = {
      pricePerSqm: response.currentPricePerSqm,
      percentile: this.estimatePercentileFromAverage(response),
      neighborhoodAvg: response.neighborhoodAverage,
      projectedAppreciationPct: response.projectedAppreciationPct,
      demandScore: response.demandScore,
      dynamicRange: response.dynamicRange,
      confidence: response.confidence,
      lastComputedAt: new Date(),
    };

    await listingModel.findOneAndUpdate(listingFilter, {
      $set: { pricingInsights: insights },
    });

    return insights;
  }

  private static buildMatch(
    request: PricingInsightRequest,
  ): FilterQuery<IListing> {
    const match: FilterQuery<IListing> = { status: ListingStatus.ACTIVE };
    if (request.city) {
      match.city = request.city;
    }
    if (request.neighborhood) {
      match.neighborhood = request.neighborhood;
    }
    if (request.propertyType) {
      match.propertyType = request.propertyType;
    }
    if (request.intent) {
      match.intent = request.intent;
    }
    if (request.orgId && Types.ObjectId.isValid(request.orgId)) {
      match.orgId = new Types.ObjectId(request.orgId);
    }
    return match;
  }

  private static buildPipeline(match: FilterQuery<IListing>): PipelineStage[] {
    return [
      { $match: match },
      {
        $addFields: {
          pricePerSqm: {
            $cond: [
              { $gt: ["$areaSqm", 0] },
              { $divide: ["$price.amount", "$areaSqm"] },
              null,
            ],
          },
          publishedMonth: {
            $dateToString: {
              format: "%Y-%m",
              date: { $ifNull: ["$publishedAt", "$createdAt"] },
            },
          },
        },
      },
      {
        $facet: {
          stats: [
            {
              $group: {
                _id: null,
                avgPrice: { $avg: "$price.amount" },
                avgPricePerSqm: { $avg: "$pricePerSqm" },
                stdDevPrice: { $stdDevPop: "$price.amount" },
                avgViews: { $avg: "$analytics.views" },
                avgInquiries: { $avg: "$analytics.inquiries" },
                sampleSize: { $sum: 1 },
              },
            },
          ],
          timeline: [
            {
              $group: {
                _id: "$publishedMonth",
                avgPricePerSqm: { $avg: "$pricePerSqm" },
                listings: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 12 },
          ],
          buckets: [
            {
              $bucket: {
                groupBy: "$price.amount",
                boundaries: PRICE_BUCKETS,
                default: "10M+",
                output: { count: { $sum: 1 } },
              },
            },
          ],
        },
      },
    ];
  }

  private static buildBucketRows(
    rows: Array<{ _id: number | string; count: number }>,
  ): BucketRow[] {
    return rows.map((row, idx) => {
      const min =
        typeof row._id === "number"
          ? row._id
          : PRICE_BUCKETS[Math.min(idx, PRICE_BUCKETS.length - 1)];
      const max = PRICE_BUCKETS[idx + 1] ?? Number.POSITIVE_INFINITY;
      const label = Number.isFinite(max)
        ? `${min.toLocaleString()} - ${max.toLocaleString()} SAR`
        : `${min.toLocaleString()}+ SAR`;
      return {
        label,
        count: row.count,
        min,
        max,
      };
    });
  }

  private static estimatePercentile(
    buckets: BucketRow[],
    value: number,
    total: number,
  ): number | undefined {
    if (!value || !total) {
      return undefined;
    }
    let cumulative = 0;
    for (const bucket of buckets) {
      if (value > bucket.max) {
        cumulative += bucket.count;
        continue;
      }
      const range = bucket.max - bucket.min || 1;
      const intraBucket = Math.max(
        0,
        Math.min(1, (value - bucket.min) / range),
      );
      const percentile =
        ((cumulative + bucket.count * intraBucket) / total) * 100;
      return Number(Math.min(99, Math.max(1, percentile)).toFixed(1));
    }
    return undefined;
  }

  private static estimatePercentileFromAverage(
    response: PricingInsightResponse,
  ): number | undefined {
    return this.estimatePercentile(
      response.priceBuckets.map((bucket, idx) => ({
        label: bucket.label,
        count: bucket.count,
        min: PRICE_BUCKETS[idx] ?? PRICE_BUCKETS[PRICE_BUCKETS.length - 1] ?? 0,
        max: PRICE_BUCKETS[idx + 1] ?? Number.POSITIVE_INFINITY,
      })),
      response.currentAveragePrice,
      response.sampleSize,
    );
  }

  private static computeDemandScore(views: number, inquiries: number): number {
    const normalizedViews = Math.min(views / 300, 1);
    const normalizedInquiries = Math.min(inquiries / 8, 1);
    return Number(
      ((normalizedViews * 0.6 + normalizedInquiries * 0.4) * 100).toFixed(0),
    );
  }

  private static computeConfidence(sampleSize: number): number {
    if (!sampleSize) {
      return 0;
    }
    return Math.min(1, sampleSize / 50);
  }

  private static computeYoyChange(
    timeline: Array<{ period: string; pricePerSqm: number }>,
  ): number | undefined {
    if (timeline.length < 2) {
      return undefined;
    }
    const first = timeline[0];
    const last = timeline[timeline.length - 1];
    if (!first?.pricePerSqm || !last?.pricePerSqm) {
      return undefined;
    }
    const change =
      ((last.pricePerSqm - first.pricePerSqm) / first.pricePerSqm) * 100;
    return Number(change.toFixed(1));
  }

  private static buildDynamicRange(
    avgPrice: number,
    stdDev: number,
  ): {
    conservative: number;
    base: number;
    bullish: number;
  } {
    if (!avgPrice) {
      return { conservative: 0, base: 0, bullish: 0 };
    }
    const delta = stdDev || avgPrice * 0.08;
    return {
      conservative: Math.max(0, Number((avgPrice - delta).toFixed(0))),
      base: Number(avgPrice.toFixed(0)),
      bullish: Number((avgPrice + delta).toFixed(0)),
    };
  }

  private static buildSignals(params: {
    yoyChange?: number;
    demandScore: number;
    confidence: number;
    sampleSize: number;
  }): string[] {
    const signals: string[] = [];
    if (params.yoyChange && params.yoyChange > 0) {
      signals.push(`📈 نمو سنوي +${params.yoyChange.toFixed(1)}٪`);
    } else if (params.yoyChange && params.yoyChange < 0) {
      signals.push(`📉 تصحيح -${Math.abs(params.yoyChange).toFixed(1)}٪`);
    }
    if (params.demandScore > 70) {
      signals.push("🔥 طلب مرتفع من المشترين");
    }
    if (params.confidence < 0.4) {
      signals.push("⚠️ عينة محدودة، يوصى بجمع بيانات إضافية");
    }
    if (params.sampleSize > 200) {
      signals.push("✅ بيانات قوية على مستوى الحي");
    }
    return signals;
  }
}
