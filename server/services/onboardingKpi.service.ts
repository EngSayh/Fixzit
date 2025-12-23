import { Types } from 'mongoose';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { VerificationDocument } from '@/server/models/onboarding/VerificationDocument';

export async function getOnboardingKPIs(orgId: string) {
  const orgObjectId = new Types.ObjectId(orgId);

  const avgTimes = await OnboardingCase.aggregate([
    { $match: { org_id: orgObjectId, status: 'APPROVED' } },
    { $group: { _id: '$role', avgTimeMs: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } },
  ]);

  const [drafts, total] = await Promise.all([
    OnboardingCase.countDocuments({ org_id: orgObjectId, status: 'DRAFT' }),
    OnboardingCase.countDocuments({ org_id: orgObjectId }),
  ]);

  // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: counting all expired documents
  const expiredDocs = await VerificationDocument.countDocuments({ status: 'EXPIRED' });

  return {
    avgTimes,
    dropOffRate: total > 0 ? drafts / total : 0,
    expiredDocs,
  };
}
