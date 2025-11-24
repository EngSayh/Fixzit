import { Types } from 'mongoose';
import type { SessionUser } from '@/server/middleware/withAuthRbac';
import { connectMongo } from '@/lib/mongo';
import { logger } from '@/lib/logger';

export type EscalationContact = {
  role: string;
  name?: string;
  email?: string;
  user_id?: string;
};

const PRIORITY_ROLES = [
  'SUPER_ADMIN',
  'CORPORATE_ADMIN',
  'ADMIN',
  'OWNER',
  'PROPERTY_OWNER',
  'CUSTOMER',
  'MARKETPLACE_ADMIN',
];

interface UserLike {
  username?: string;
  name?: string;
  personal?: {
    firstName?: string;
    lastName?: string;
  };
}

function deriveDisplayName(user: UserLike | null | undefined): string | undefined {
  return (
    user?.username ||
    user?.name ||
    `${user?.personal?.firstName || ''} ${user?.personal?.lastName || ''}`.trim() ||
    undefined
  );
}

export async function resolveEscalationContact(
  user: SessionUser,
  context?: string,
): Promise<EscalationContact> {
  // Authorization check: Only allow users with elevated roles to query org contacts
  const allowedRoles = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN', 'OWNER', 'TENANT', 'VENDOR', 'AGENT'];
  if (!allowedRoles.includes(user.role)) {
    // Return fallback for unauthorized users without exposing org structure
    return {
      role: 'SUPPORT',
      email: process.env.ESCALATION_FALLBACK_EMAIL || 'support@fixzit.sa',
      name: 'Fixzit Support Team',
    };
  }

  if (user?.orgId) {
    try {
      await connectMongo();
      const { User } = await import('@/server/models/User');
      const contact = await User.findOne({
        orgId: user.orgId,
        'professional.role': { $in: PRIORITY_ROLES },
      })
        .sort({ 'professional.role': 1, _id: 1 })
        .select('username email professional.role personal.firstName personal.lastName')
        .lean<{
          _id: Types.ObjectId;
          username?: string;
          email?: string;
          professional?: { role?: string };
          personal?: { firstName?: string; lastName?: string };
        }>();

      if (contact) {
        const contactRole = contact.professional?.role || 'ADMIN';
        return {
          role: contactRole,
          name: deriveDisplayName(contact),
          email: contact.email,
          user_id: contact._id?.toString?.(),
        };
      }
    } catch (err) {
      logger.error('[resolveEscalationContact] DB lookup failed, using fallback', {
        orgId: user.orgId,
        error: err instanceof Error ? err.message : String(err),
      });
      // fallback below
    }
  }

  const fallbackEmail = process.env.ESCALATION_FALLBACK_EMAIL || 'support@fixzit.co';
  
  logger.info('[resolveEscalationContact] Using fallback contact', {
    userId: user.id,
    hasOrgId: !!user.orgId,
    fallbackEmail,
    context,
  });

  return {
    role: user.role || 'ADMIN',
    name: user.name || 'Support',
    email: user.email || fallbackEmail,
    user_id: user.id,
  };
}
