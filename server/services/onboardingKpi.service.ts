import { Types } from 'mongoose';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { VerificationDocument } from '@/server/models/onboarding/VerificationDocument';

export async function getOnboardingKPIs(orgId: string) {
  const orgObjectId = new Types.ObjectId(orgId);

  const avgTimes = await OnboardingCase.aggregate([
    { $match: { orgId: orgObjectId, status: 'APPROVED' } },
    { $group: { _id: '$role', avgTimeMs: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } },
  ]);

  const [drafts, total] = await Promise.all([
    OnboardingCase.countDocuments({ orgId: orgObjectId, status: 'DRAFT' }),
    OnboardingCase.countDocuments({ orgId: orgObjectId }),
  ]);

  const expiredDocsResult = await VerificationDocument.aggregate([
    { $match: { status: 'EXPIRED' } },
    {
      $lookup: {
        from: OnboardingCase.collection.name,
        localField: 'onboarding_case_id',
        foreignField: '_id',
        as: 'case',
      },
    },
    { $unwind: '$case' },
    { $match: { 'case.orgId': orgObjectId } },
    { $count: 'count' },
  ]);
  const expiredDocs = expiredDocsResult[0]?.count ?? 0;

  return {
    avgTimes,
    dropOffRate: total > 0 ? drafts / total : 0,
    expiredDocs,
  };
}
