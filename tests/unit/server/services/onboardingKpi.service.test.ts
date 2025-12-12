/**
 * @fileoverview Tests for onboardingKpi.service.ts
 * Tests KPI calculation for onboarding metrics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

// Mock dependencies
vi.mock('@/server/models/onboarding/OnboardingCase', () => ({
  OnboardingCase: {
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('@/server/models/onboarding/VerificationDocument', () => ({
  VerificationDocument: {
    countDocuments: vi.fn(),
  },
}));

describe('onboardingKpi.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOnboardingKPIs', () => {
    it('should calculate average processing times by role', async () => {
      const { OnboardingCase } = await import('@/server/models/onboarding/OnboardingCase');
      const { VerificationDocument } = await import('@/server/models/onboarding/VerificationDocument');
      const { getOnboardingKPIs } = await import('@/server/services/onboardingKpi.service');

      vi.mocked(OnboardingCase.aggregate).mockResolvedValue([
        { _id: 'VENDOR', avgTimeMs: 86400000 }, // 1 day
        { _id: 'TENANT', avgTimeMs: 43200000 }, // 12 hours
      ]);
      vi.mocked(OnboardingCase.countDocuments)
        .mockResolvedValueOnce(5) // drafts
        .mockResolvedValueOnce(20); // total
      vi.mocked(VerificationDocument.countDocuments).mockResolvedValue(2);

      const result = await getOnboardingKPIs('507f1f77bcf86cd799439011');

      expect(result.avgTimes).toHaveLength(2);
      expect(result.dropOffRate).toBe(0.25); // 5/20
      expect(result.expiredDocs).toBe(2);
    });

    it('should handle zero total cases (no drop-off)', async () => {
      const { OnboardingCase } = await import('@/server/models/onboarding/OnboardingCase');
      const { VerificationDocument } = await import('@/server/models/onboarding/VerificationDocument');
      const { getOnboardingKPIs } = await import('@/server/services/onboardingKpi.service');

      vi.mocked(OnboardingCase.aggregate).mockResolvedValue([]);
      vi.mocked(OnboardingCase.countDocuments)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.mocked(VerificationDocument.countDocuments).mockResolvedValue(0);

      const result = await getOnboardingKPIs('507f1f77bcf86cd799439011');

      expect(result.avgTimes).toEqual([]);
      expect(result.dropOffRate).toBe(0);
      expect(result.expiredDocs).toBe(0);
    });

    it('should calculate correct drop-off rate', async () => {
      const { OnboardingCase } = await import('@/server/models/onboarding/OnboardingCase');
      const { VerificationDocument } = await import('@/server/models/onboarding/VerificationDocument');
      const { getOnboardingKPIs } = await import('@/server/services/onboardingKpi.service');

      vi.mocked(OnboardingCase.aggregate).mockResolvedValue([]);
      vi.mocked(OnboardingCase.countDocuments)
        .mockResolvedValueOnce(30) // 30 drafts
        .mockResolvedValueOnce(100); // 100 total
      vi.mocked(VerificationDocument.countDocuments).mockResolvedValue(5);

      const result = await getOnboardingKPIs('507f1f77bcf86cd799439011');

      expect(result.dropOffRate).toBe(0.3); // 30%
    });

    it('should convert orgId string to ObjectId', async () => {
      const { OnboardingCase } = await import('@/server/models/onboarding/OnboardingCase');
      const { VerificationDocument } = await import('@/server/models/onboarding/VerificationDocument');
      const { getOnboardingKPIs } = await import('@/server/services/onboardingKpi.service');

      vi.mocked(OnboardingCase.aggregate).mockResolvedValue([]);
      vi.mocked(OnboardingCase.countDocuments).mockResolvedValue(0);
      vi.mocked(VerificationDocument.countDocuments).mockResolvedValue(0);

      await getOnboardingKPIs('507f1f77bcf86cd799439011');

      expect(OnboardingCase.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              org_id: expect.any(Types.ObjectId),
            }),
          }),
        ]),
      );
    });

    it('should handle multiple role averages', async () => {
      const { OnboardingCase } = await import('@/server/models/onboarding/OnboardingCase');
      const { VerificationDocument } = await import('@/server/models/onboarding/VerificationDocument');
      const { getOnboardingKPIs } = await import('@/server/services/onboardingKpi.service');

      vi.mocked(OnboardingCase.aggregate).mockResolvedValue([
        { _id: 'VENDOR', avgTimeMs: 172800000 }, // 2 days
        { _id: 'TENANT', avgTimeMs: 86400000 },  // 1 day
        { _id: 'OWNER', avgTimeMs: 259200000 },  // 3 days
        { _id: 'AGENT', avgTimeMs: 43200000 },   // 12 hours
      ]);
      vi.mocked(OnboardingCase.countDocuments).mockResolvedValue(0);
      vi.mocked(VerificationDocument.countDocuments).mockResolvedValue(0);

      const result = await getOnboardingKPIs('507f1f77bcf86cd799439011');

      expect(result.avgTimes).toHaveLength(4);
      expect(result.avgTimes.find(t => t._id === 'VENDOR')?.avgTimeMs).toBe(172800000);
    });
  });
});
