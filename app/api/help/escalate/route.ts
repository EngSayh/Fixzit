/**
 * @fileoverview Support Escalation API
 * @description Creates support tickets for access requests and escalations,
 * routing to appropriate support contacts.
 * 
 * @module api/help/escalate
 * @requires Authenticated user
 * 
 * @endpoints
 * - POST /api/help/escalate - Create an escalation ticket
 * 
 * @requestBody
 * - module: Module context (FM, Souq, Aqar, Account, Billing, Other)
 * - attempted_action: Description of the action user was trying to perform
 * 
 * @response
 * - ticket_id: Created support ticket ID
 * - escalated_to: Contact information for assigned support person
 * 
 * @workflow
 * 1. Resolve escalation contact based on module
 * 2. Create support ticket with HELP prefix
 * 3. Assign to escalation contact
 * 4. Return ticket details
 * 
 * @security
 * - Authenticated users only
 * - Tenant-scoped: Ticket linked to user's organization
 * - Unique ticket codes prevent collisions
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { resolveEscalationContact } from '@/server/services/escalation.service';
import { connectMongo } from '@/lib/mongo';
import { SupportTicket } from '@/server/models/SupportTicket';
import { setTenantContext, clearTenantContext } from '@/server/plugins/tenantIsolation';
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

export async function POST(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 20, windowMs: 60_000, keyPrefix: "help:escalate" });
  if (rateLimitResponse) return rateLimitResponse;

  const sessionResult = await getSessionOrNull(req, { route: "help:escalate" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: body, error: parseError } = await parseBodySafe<{ module?: string; attempted_action?: string }>(req, { logPrefix: "[help:escalate]" });
  if (parseError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { module: moduleParam, attempted_action } = body || {};
  const moduleNormalized = ['FM', 'Souq', 'Aqar', 'Account', 'Billing', 'Other'].includes(
    moduleParam || '',
  )
    ? (moduleParam as string)
    : 'Other';

  await connectMongo();
  if (user.orgId) setTenantContext({ orgId: user.orgId });

  try {
    const escalation = await resolveEscalationContact(user);
    
    // Defensive check: ensure escalation contact has a valid user_id
    if (!escalation || !escalation.user_id) {
      return NextResponse.json(
        { error: 'Unable to resolve escalation contact for this module' },
        { status: 500 }
      );
    }
    
    // Generate unique ticket code with timestamp + random suffix to prevent collisions
    const code = `HELP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // PLATFORM-WIDE: Escalation routing uses user.orgId when present
    const ticket = await SupportTicket.create({
      code,
      subject: `Access request: ${attempted_action || 'Unknown action'}`,
      module: moduleNormalized,
      type: 'Access',
      priority: 'Medium',
      requester: { name: user.name, email: user.email },
      messages: [
        {
          text: `User ${user.email} requested access for ${attempted_action || 'unknown action'} on module ${moduleParam || 'n/a'}.`,
        },
      ],
      assignment: { assignedTo: { userId: escalation.user_id } },
      ...(user.orgId ? { orgId: user.orgId } : {}),
    });

    return NextResponse.json({ ticket_id: ticket._id, escalated_to: escalation }, { status: 201 });
  } finally {
    // Prevent tenant context leakage across requests
    clearTenantContext();
  }
}
