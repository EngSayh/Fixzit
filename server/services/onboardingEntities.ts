import { Types, startSession } from 'mongoose';
import { randomUUID } from 'crypto';
import { setTenantContext } from '@/server/plugins/tenantIsolation';
import { logger } from '@/lib/logger';
import { type IOnboardingCase } from '@/models/onboarding/OnboardingCase';

type OnboardingCaseLean = IOnboardingCase & { _id: Types.ObjectId };

// i18n messages for support ticket (server-side)
const ticketMessages = {
  en: {
    subject: (role: string) => `Onboarding provisioning needed: ${role}`,
    message: (caseId: Types.ObjectId | string, role: string) => `Auto-created from onboarding approval. Case: ${caseId}. Role: ${role}.`,
  },
  ar: {
    subject: (role: string) => `مطلوب تجهيز الإعداد: ${role}`,
    message: (caseId: Types.ObjectId | string, role: string) => `تم الإنشاء تلقائيًا من الموافقة على الإعداد. الحالة: ${caseId}. الدور: ${role}.`,
  },
};

/**
 * Minimal entity wiring that:
 * - Ensures tenant context is set (orgId) for downstream models with tenantIsolationPlugin.
 * - Creates a SupportTicket for provisioning so admins can complete org/user/tenancy/vendor wiring.
 * - Logs ZATCA/Ejar hooks as stubs to be replaced with real integrations.
 *
 * This avoids hard failures from partially-known schemas while still creating
 * a CRM trail and setting the right tenant context.
 */
export async function createEntitiesFromCase(onboarding: OnboardingCaseLean): Promise<void> {
  const role = onboarding.role as string;
  const orgId =
    onboarding.org_id ||
    onboarding.subject_org_id ||
    (onboarding as { orgId?: Types.ObjectId }).orgId;

  if (orgId) {
    setTenantContext({ orgId });
  }

  let requesterOrg = orgId?.toString();
  let requesterUserId = onboarding.created_by_id?.toString?.();

  // Fetch creator to pick up org if missing
  if (!requesterOrg || !requesterUserId) {
    try {
      const { User } = await import('@/server/models/User');
      const creator = await User.findById(onboarding.created_by_id)
        .select('orgId')
        .lean<{ orgId?: Types.ObjectId }>();
      requesterOrg = requesterOrg || creator?.orgId?.toString();
      requesterUserId = requesterUserId || onboarding.created_by_id?.toString();
      if (requesterOrg) setTenantContext({ orgId: requesterOrg });
    } catch (error) {
      logger.warn('[Onboarding] Could not resolve creator org', { error });
    }
  }

  const summary = {
    role,
    onboardingCaseId: onboarding._id?.toString?.(),
    orgId: requesterOrg,
    subjectUserId: onboarding.subject_user_id?.toString?.(),
  };

  // Use transaction to ensure atomicity
  const session = await startSession();
  session.startTransaction();

  try {
    const { SupportTicket } = await import('@/server/models/SupportTicket');
    const locale = 'en'; // Default to EN, can be enhanced to detect from onboarding.locale
    const t = ticketMessages[locale];
    
    // Use UUID for guaranteed uniqueness
    const code = `ONB-${randomUUID().substring(0, 8).toUpperCase()}`;
    const subject = t.subject(role);
    const ticketModule = ['VENDOR', 'AGENT'].includes(role) ? 'Souq' : 'Account';

    await SupportTicket.create(
      [
        {
          code,
          subject,
          module: ticketModule,
          type: 'Access',
          priority: 'Medium',
          requester: {
            name: onboarding.basic_info?.name,
            email: onboarding.basic_info?.email,
          },
          messages: [
            {
              text: t.message(onboarding._id, role),
            },
          ],
          ...(requesterOrg ? { orgId: requesterOrg } : {}),
          assignment: {},
        },
      ],
      { session },
    );

    await session.commitTransaction();
    logger.info('[Onboarding] SupportTicket created successfully', { code, summary });
  } catch (error) {
    await session.abortTransaction();
    logger.error('[Onboarding] Transaction failed, rolling back', { error, summary });
    throw error; // Re-throw to prevent partial state
  } finally {
    session.endSession();
  }

  // Stub hooks to be replaced with actual integrations.
  switch (role) {
    case 'PROPERTY_OWNER':
    case 'OWNER': {
      logger.info('[Onboarding] Org provisioning stub (owner)', summary);
      break;
    }
    case 'VENDOR': {
      logger.info('[Onboarding] Vendor provisioning stub; invoke ZATCA registration here', summary);
      break;
    }
    case 'TENANT': {
      logger.info('[Onboarding] Tenant provisioning stub; invoke Ejar registration here', summary);
      break;
    }
    case 'AGENT': {
      logger.info('[Onboarding] Agent provisioning stub', summary);
      break;
    }
    default:
      logger.info('[Onboarding] Unknown role provisioning stub', summary);
  }
}
