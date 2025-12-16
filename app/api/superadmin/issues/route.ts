import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { connectMongo } from '@/lib/db/mongoose';
import BacklogIssue from '@/server/models/BacklogIssue';
import BacklogEvent from '@/server/models/BacklogEvent';

export async function GET(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const category = url.searchParams.get('category');

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  const issues = await BacklogIssue.find(filter).sort({ priority: 1, impact: -1, updatedAt: -1 }).limit(100).lean();

  return NextResponse.json({ issues });
}

export async function POST(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const body = await req.json();
  const { key, status, comment } = body;

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const issue = await BacklogIssue.findOne({ key });
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const actor = session.username || session.email || 'superadmin';

  if (status) {
    issue.status = status;
    await BacklogEvent.create({
      issueKey: key,
      type: 'status_change',
      message: `Status changed to ${status}`,
      actor,
      meta: { newStatus: status },
    });
  }

  if (comment) {
    await BacklogEvent.create({
      issueKey: key,
      type: 'comment',
      message: comment,
      actor,
    });
  }

  await issue.save();

  return NextResponse.json({ success: true, issue });
}
