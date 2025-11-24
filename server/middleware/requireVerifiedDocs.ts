import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { connectMongo } from '@/lib/mongo';
import { OnboardingCase } from '@/models/onboarding/OnboardingCase';
import { resolveEscalationContact } from '@/server/services/escalation.service';
import { setTenantContext } from '@/server/plugins/tenantIsolation';
import type { SessionUser } from './withAuthRbac';

type RequiredRole = 'TENANT' | 'VENDOR';

// i18n messages (server-side)
const messages = {
  en: {
    verificationPending: 'Verification pending. Please complete onboarding.',
    systemError: 'Unable to verify documents. Please try again.',
  },
  ar: {
    verificationPending: 'التحقق قيد الانتظار. يرجى إكمال عملية الإعداد.',
    systemError: 'تعذر التحقق من المستندات. يرجى المحاولة مرة أخرى.',
  },
};

export async function ensureVerifiedDocs(
  user: SessionUser,
  requiredRole: RequiredRole,
  _path?: string,
) {
  const locale = (user as SessionUser & { locale?: string }).locale || 'en';
  const t = messages[locale as keyof typeof messages] || messages.en;
  const correlationId = randomUUID();

  try {
    // Set tenant context before querying multi-tenant collections
    if (user.orgId) {
      setTenantContext({ orgId: user.orgId });
    }

    await connectMongo();
    const caseRecord = await OnboardingCase.findOne({
      subject_user_id: new Types.ObjectId(user.id),
      role: requiredRole,
      status: 'APPROVED',
    }).populate('documents');

    const docs = caseRecord?.documents as Array<{ status?: string }> | undefined;
    const notVerified =
      !caseRecord ||
      !Array.isArray(docs) ||
      docs.length === 0 ||
      docs.some((doc) => doc.status !== 'VERIFIED');

    if (notVerified) {
      const escalation = await resolveEscalationContact(user);
      return {
        error: NextResponse.json(
          {
            name: 'VerificationRequiredError',
            code: 'DOCS_NOT_VERIFIED',
            userMessage: t.verificationPending,
            devMessage: `User ${user.id} has unverified documents for role ${requiredRole}`,
            correlationId,
            escalate_to: escalation,
          },
          { status: 403 },
        ),
      };
    }

    return {};
  } catch (error) {
    console.error('[ensureVerifiedDocs] DB operation failed:', {
      userId: user.id,
      requiredRole,
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error: NextResponse.json(
        {
          name: 'SystemError',
          code: 'DB_ERROR',
          userMessage: t.systemError,
          devMessage: error instanceof Error ? error.message : String(error),
          correlationId,
        },
        { status: 500 },
      ),
    };
  }
}
