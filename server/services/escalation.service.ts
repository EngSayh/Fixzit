/**
 * Escalation Service
 * 
 * Resolves escalation contacts for issues, tickets, and support requests.
 * Implements role-based authorization to determine appropriate contacts.
 * 
 * @module server/services/escalation.service
 * @since v2.0.0
 * 
 * @example
 * // Resolve escalation contact for a user
 * const contact = await resolveEscalationContact(sessionUser, 'work-order-123');
 * console.log(contact.email); // admin@org.com or support@fixzit.co
 */

import { EMAIL_DOMAINS } from '@/lib/config/domains';
import { logger } from '@/lib/logger';
import { connectMongo } from '@/lib/mongodb-unified';
import type { SessionUser } from '@/server/middleware/withAuthRbac';
import { Types } from 'mongoose';

/**
 * Contact information for escalation routing
 */
export type EscalationContact = {
  /** Role of the contact person */
  role: string;
  /** Display name of the contact */
  name?: string;
  /** Email address for escalation */
  email?: string;
  /** User ID if internal user */
  user_id?: string;
};

/**
 * Roles that can trigger escalation lookups
 * Ordered by priority (highest first)
 * @internal
 */
const PRIORITY_ROLES = [
  'SUPER_ADMIN',
  'CORPORATE_ADMIN',
  'ADMIN',
  'OWNER',
  'PROPERTY_OWNER',
  'CUSTOMER',
  'MARKETPLACE_ADMIN',
];

/**
 * User-like interface for display name derivation
 * @internal
 */
interface UserLike {
  username?: string;
  name?: string;
  personal?: {
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Derive display name from user object
 * Tries: username > name > firstName + lastName
 * @param user - User object to derive name from
 * @returns Display name or undefined if none found
 * @internal
 */
function deriveDisplayName(user: UserLike | null | undefined): string | undefined {
  return (
    user?.username ||
    user?.name ||
    `${user?.personal?.firstName || ''} ${user?.personal?.lastName || ''}`.trim() ||
    undefined
  );
}

/**
 * Resolve the appropriate escalation contact for a user
 * 
 * This function determines who should be contacted for escalation
 * based on the user's organization hierarchy and role.
 * 
 * @param user - Session user requesting escalation
 * @param context - Optional context string (e.g., ticket ID, work order ID)
 * @returns Promise resolving to escalation contact information
 * 
 * @example
 * // For a tenant user, returns their property manager or admin
 * const contact = await resolveEscalationContact(tenantUser);
 * 
 * @example
 * // For unauthorized roles, returns default support
 * const contact = await resolveEscalationContact(guestUser);
 * // contact.email === 'support@fixzit.co'
 * 
 * @security
 * - Only authorized roles can query organization contacts
 * - Unauthorized users receive generic support fallback
 * - Does not expose internal org structure to unauthorized users
 */
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
      email: process.env.ESCALATION_FALLBACK_EMAIL || EMAIL_DOMAINS.support,
      name: 'Fixzit Support Team',
    };
  }

  if (user?.orgId) {
    try {
      await connectMongo();
      const { User } = await import('@/server/models/User');
      
      // Use aggregation to sort by role priority order (not lexicographic)
      // PRIORITY_ROLES[0] = highest priority, PRIORITY_ROLES[n] = lowest
      const [contact] = await User.aggregate<{
        _id: Types.ObjectId;
        username?: string;
        email?: string;
        professional?: { role?: string };
        personal?: { firstName?: string; lastName?: string };
      }>([
        {
          $match: {
            orgId: user.orgId,
            'professional.role': { $in: PRIORITY_ROLES },
          },
        },
        {
          $addFields: {
            _roleRank: { $indexOfArray: [PRIORITY_ROLES, '$professional.role'] },
          },
        },
        { $sort: { _roleRank: 1, _id: 1 } },
        {
          $project: {
            username: 1,
            email: 1,
            professional: 1,
            personal: 1,
          },
        },
        { $limit: 1 },
      ]);

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

  const fallbackEmail = process.env.ESCALATION_FALLBACK_EMAIL || EMAIL_DOMAINS.support;
  
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
