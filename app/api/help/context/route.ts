import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { resolveEscalationContact } from '@/server/services/escalation.service';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const escalation = await resolveEscalationContact(user);

  // TODO: integrate KnowledgeBase collection for contextual articles
  return NextResponse.json({ articles: [], escalation }, { status: 200 });
}
