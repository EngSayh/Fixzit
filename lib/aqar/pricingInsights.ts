// Re-export from services for backwards compatibility
import {
  PricingInsightsService,
  type PricingInsightRequest,
  type PricingInsightResponse,
} from "@/services/aqar/pricing-insights-service";

export { PricingInsightsService, PricingInsightRequest, PricingInsightResponse };

/**
 * Backwards-compatible wrapper for computing pricing insights
 */
export async function computePricingInsight(params: {
  cityId: string;
  neighborhoodId?: string;
  propertyType?: string;
  intent?: string;
}): Promise<PricingInsightResponse> {
  return PricingInsightsService.getInsights({
    city: params.cityId,
    neighborhood: params.neighborhoodId,
    propertyType: params.propertyType as import("@/server/models/aqar/Listing").PropertyType,
    intent: params.intent as import("@/server/models/aqar/Listing").ListingIntent,
  });
}
