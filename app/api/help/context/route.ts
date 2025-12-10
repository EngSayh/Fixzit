import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { resolveEscalationContact } from '@/server/services/escalation.service';

const MODULES = ['FM', 'Souq', 'Aqar', 'Account', 'Billing', 'Other'] as const;

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const moduleParam = new URL(req.url).searchParams.get('module') || '';
  const moduleNormalized = MODULES.includes(moduleParam as (typeof MODULES)[number])
    ? (moduleParam as (typeof MODULES)[number])
    : 'Other';

  const escalation = await resolveEscalationContact(user, moduleNormalized);

  // ROADMAP: Integrate KnowledgeBase collection for contextual articles
  // Currently returns empty articles array with escalation contact only
  return NextResponse.json({ articles: [], escalation }, { status: 200 });
}
