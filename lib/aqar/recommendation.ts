// Re-export from services for backwards compatibility
import {
  AqarRecommendationEngine,
  type RecommendationContext,
  type RecommendationResponse,
  type RecommendationResultItem,
} from "@/services/aqar/recommendation-engine";

export {
  AqarRecommendationEngine,
  RecommendationContext,
  RecommendationResponse,
  RecommendationResultItem,
};

/**
 * Backwards-compatible wrapper for getting recommended listings
 */
export async function getRecommendedListings(
  ctx: RecommendationContext,
): Promise<RecommendationResponse> {
  return AqarRecommendationEngine.recommend(ctx);
}
