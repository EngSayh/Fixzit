import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { resolveEscalationContact } from '@/server/services/escalation.service';
import { connectMongo } from '@/lib/mongo';
import { SupportTicket } from '@/server/models/SupportTicket';
import { setTenantContext } from '@/server/plugins/tenantIsolation';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { module?: string; attempted_action?: string };
  const { module: moduleParam, attempted_action } = body;
  const moduleNormalized = ['FM', 'Souq', 'Aqar', 'Account', 'Billing', 'Other'].includes(
    moduleParam || '',
  )
    ? (moduleParam as string)
    : 'Other';

  await connectMongo();
  if (user.orgId) setTenantContext({ orgId: user.orgId });

  const escalation = await resolveEscalationContact(user, moduleNormalized);
  const code = `HELP-${Date.now()}`;

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
}
