/**
 * @fileoverview Tests for recommendation.ts
 * Tests Aqar listing recommendation engine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service module
vi.mock('@/services/aqar/recommendation-engine', () => ({
  AqarRecommendationEngine: {
    recommend: vi.fn(),
  },
}));

describe('recommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecommendedListings', () => {
    it('should call AqarRecommendationEngine.recommend', async () => {
      const { AqarRecommendationEngine } = await import('@/services/aqar/recommendation-engine');
      const { getRecommendedListings } = await import('@/lib/aqar/recommendation');

      const mockResponse = {
        listings: [
          { id: 'listing1', score: 0.95 },
          { id: 'listing2', score: 0.87 },
        ],
        totalCount: 2,
        page: 1,
        pageSize: 10,
      };

      vi.mocked(AqarRecommendationEngine.recommend).mockResolvedValue(mockResponse);

      const ctx = {
        userId: 'user123',
        intent: 'SALE' as const,
        propertyType: 'APARTMENT' as const,
        city: 'riyadh',
        budget: { min: 300000, max: 600000 },
      };

      const result = await getRecommendedListings(ctx);

      expect(AqarRecommendationEngine.recommend).toHaveBeenCalledWith(ctx);
      expect(result).toEqual(mockResponse);
    });

    it('should handle user preferences context', async () => {
      const { AqarRecommendationEngine } = await import('@/services/aqar/recommendation-engine');
      const { getRecommendedListings } = await import('@/lib/aqar/recommendation');

      vi.mocked(AqarRecommendationEngine.recommend).mockResolvedValue({
        listings: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
      });

      const ctx = {
        userId: 'user456',
        preferences: {
          minBedrooms: 2,
          maxBedrooms: 4,
          features: ['pool', 'garden'],
        },
      };

      await getRecommendedListings(ctx as any);

      expect(AqarRecommendationEngine.recommend).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            minBedrooms: 2,
          }),
        }),
      );
    });

    it('should handle location-based recommendations', async () => {
      const { AqarRecommendationEngine } = await import('@/services/aqar/recommendation-engine');
      const { getRecommendedListings } = await import('@/lib/aqar/recommendation');

      vi.mocked(AqarRecommendationEngine.recommend).mockResolvedValue({
        listings: [
          { id: 'nearby1', score: 0.99, distance: 0.5 },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 10,
      });

      const ctx = {
        userId: 'user789',
        location: {
          lat: 24.7136,
          lng: 46.6753,
          radiusKm: 5,
        },
      };

      await getRecommendedListings(ctx as any);

      expect(AqarRecommendationEngine.recommend).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            lat: 24.7136,
          }),
        }),
      );
    });

    it('should handle similar listing context', async () => {
      const { AqarRecommendationEngine } = await import('@/services/aqar/recommendation-engine');
      const { getRecommendedListings } = await import('@/lib/aqar/recommendation');

      vi.mocked(AqarRecommendationEngine.recommend).mockResolvedValue({
        listings: [
          { id: 'similar1', score: 0.92 },
          { id: 'similar2', score: 0.88 },
          { id: 'similar3', score: 0.85 },
        ],
        totalCount: 3,
        page: 1,
        pageSize: 10,
      });

      const ctx = {
        similarToListingId: 'listing123',
        excludeIds: ['listing123'],
      };

      await getRecommendedListings(ctx as any);

      expect(AqarRecommendationEngine.recommend).toHaveBeenCalledWith(
        expect.objectContaining({
          similarToListingId: 'listing123',
        }),
      );
    });

    it('should handle pagination context', async () => {
      const { AqarRecommendationEngine } = await import('@/services/aqar/recommendation-engine');
      const { getRecommendedListings } = await import('@/lib/aqar/recommendation');

      vi.mocked(AqarRecommendationEngine.recommend).mockResolvedValue({
        listings: [],
        totalCount: 100,
        page: 3,
        pageSize: 20,
      });

      const ctx = {
        userId: 'user123',
        page: 3,
        pageSize: 20,
      };

      const result = await getRecommendedListings(ctx as any);

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(20);
    });

    it('should propagate engine errors to the caller', async () => {
      const { AqarRecommendationEngine } = await import('@/services/aqar/recommendation-engine');
      const { getRecommendedListings } = await import('@/lib/aqar/recommendation');

      vi.mocked(AqarRecommendationEngine.recommend).mockRejectedValue(
        new Error('recommendation failed'),
      );

      await expect(
        getRecommendedListings({ userId: 'user123' } as any),
      ).rejects.toThrow('recommendation failed');
    });
  });

  describe('exports', () => {
    it('should re-export AqarRecommendationEngine', async () => {
      const recommendationModule = await import('@/lib/aqar/recommendation');
      expect(recommendationModule.AqarRecommendationEngine).toBeDefined();
    });

    it('should export getRecommendedListings function', async () => {
      const recommendationModule = await import('@/lib/aqar/recommendation');
      expect(typeof recommendationModule.getRecommendedListings).toBe('function');
    });
  });
});
