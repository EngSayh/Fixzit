import { Types } from 'mongoose';
import type { SessionUser } from '@/server/middleware/withAuthRbac';
import { connectMongo } from '@/lib/mongo';

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

function deriveDisplayName(user: any) {
  return (
    user?.username ||
    user?.name ||
    `${user?.personal?.firstName || ''} ${user?.personal?.lastName || ''}`.trim() ||
    undefined
  );
}

export async function resolveEscalationContact(
  user: SessionUser,
  context: string,
): Promise<EscalationContact> {
  if (user?.orgId) {
    try {
      await connectMongo();
      const { User } = await import('@/server/models/User');
      const contact = await User.findOne({
        orgId: user.orgId,
        'professional.role': { $in: PRIORITY_ROLES },
      })
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
    } catch (_err) {
      // fallback below
    }
  }

  return {
    role: user.role || 'ADMIN',
    name: user.name || 'Support',
    email: user.email || 'support@fixzit.co',
    user_id: user.id,
  };
}
