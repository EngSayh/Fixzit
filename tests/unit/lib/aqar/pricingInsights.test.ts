/**
 * @fileoverview Tests for pricingInsights.ts
 * Tests pricing insight calculations for Aqar listings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service module
vi.mock('@/services/aqar/pricing-insights-service', () => ({
  PricingInsightsService: {
    getInsights: vi.fn(),
  },
}));

describe('pricingInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computePricingInsight', () => {
    it('should call PricingInsightsService.getInsights with correct params', async () => {
      const { PricingInsightsService } = await import('@/services/aqar/pricing-insights-service');
      const { computePricingInsight } = await import('@/lib/aqar/pricingInsights');

      const mockResponse = {
        avgPrice: 500000,
        medianPrice: 480000,
        minPrice: 300000,
        maxPrice: 800000,
        pricePerSqm: 5000,
        sampleSize: 50,
        trend: 'stable' as const,
      };

      vi.mocked(PricingInsightsService.getInsights).mockResolvedValue(mockResponse);

      const result = await computePricingInsight({
        cityId: 'riyadh',
        neighborhoodId: 'olaya',
        propertyType: 'APARTMENT',
        intent: 'SALE',
      });

      expect(PricingInsightsService.getInsights).toHaveBeenCalledWith({
        city: 'riyadh',
        neighborhood: 'olaya',
        propertyType: 'APARTMENT',
        intent: 'SALE',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle missing optional params', async () => {
      const { PricingInsightsService } = await import('@/services/aqar/pricing-insights-service');
      const { computePricingInsight } = await import('@/lib/aqar/pricingInsights');

      vi.mocked(PricingInsightsService.getInsights).mockResolvedValue({
        avgPrice: 400000,
        medianPrice: 380000,
        minPrice: 250000,
        maxPrice: 600000,
        pricePerSqm: 4500,
        sampleSize: 30,
        trend: 'rising',
      });

      await computePricingInsight({
        cityId: 'jeddah',
      });

      expect(PricingInsightsService.getInsights).toHaveBeenCalledWith({
        city: 'jeddah',
        neighborhood: undefined,
        propertyType: undefined,
        intent: undefined,
      });
    });

    it('should handle RENT intent', async () => {
      const { PricingInsightsService } = await import('@/services/aqar/pricing-insights-service');
      const { computePricingInsight } = await import('@/lib/aqar/pricingInsights');

      vi.mocked(PricingInsightsService.getInsights).mockResolvedValue({
        avgPrice: 50000,
        medianPrice: 45000,
        minPrice: 30000,
        maxPrice: 80000,
        pricePerSqm: 500,
        sampleSize: 100,
        trend: 'stable',
      });

      await computePricingInsight({
        cityId: 'dammam',
        intent: 'RENT',
      });

      expect(PricingInsightsService.getInsights).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: 'RENT',
        }),
      );
    });

    it('should handle different property types', async () => {
      const { PricingInsightsService } = await import('@/services/aqar/pricing-insights-service');
      const { computePricingInsight } = await import('@/lib/aqar/pricingInsights');

      vi.mocked(PricingInsightsService.getInsights).mockResolvedValue({
        avgPrice: 2000000,
        medianPrice: 1800000,
        minPrice: 1000000,
        maxPrice: 5000000,
        pricePerSqm: 4000,
        sampleSize: 20,
        trend: 'declining',
      });

      await computePricingInsight({
        cityId: 'riyadh',
        propertyType: 'VILLA',
      });

      expect(PricingInsightsService.getInsights).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyType: 'VILLA',
        }),
      );
    });

    it('should surface errors from the service layer', async () => {
      const { PricingInsightsService } = await import('@/services/aqar/pricing-insights-service');
      const { computePricingInsight } = await import('@/lib/aqar/pricingInsights');

      vi.mocked(PricingInsightsService.getInsights).mockRejectedValue(
        new Error('service unavailable'),
      );

      await expect(
        computePricingInsight({
          cityId: 'riyadh',
        }),
      ).rejects.toThrow('service unavailable');
    });
  });

  describe('exports', () => {
    it('should re-export PricingInsightsService', async () => {
      const pricingModule = await import('@/lib/aqar/pricingInsights');
      expect(pricingModule.PricingInsightsService).toBeDefined();
    });

    it('should export computePricingInsight function', async () => {
      const pricingModule = await import('@/lib/aqar/pricingInsights');
      expect(typeof pricingModule.computePricingInsight).toBe('function');
    });
  });
});
