import { NextRequest, NextResponse } from 'next/server';
import { db, getNativeDb } from '@/src/lib/mongo';
import { SupportTicket } from '@/src/server/models/SupportTicket';

// Accepts client diagnostic bundles and auto-creates a support ticket.
// This is non-blocking for the user flow; returns 202 on insert.
export async function POST(req: NextRequest) {
  await db;
  const native = await getNativeDb();

  const body = await req.json();
  const now = new Date();

  const incidentId: string = body?.incidentId || `INC-${now.getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const code: string = body?.code || 'UI-UI-UNKNOWN-000';
  const category: string = body?.category || 'Support';
  const severity: string = body?.severity || 'P2';
  const message: string = body?.message || 'Application error';
  const details: string | undefined = body?.details || body?.stack;

  // Store minimal incident document for indexing/analytics
  await native.collection('error_events').insertOne({
    incidentId,
    code,
    category,
    severity,
    message,
    details,
    userContext: body?.userContext || null,
    clientContext: body?.clientContext || null,
    createdAt: now
  });

  // Auto-create a Support Ticket (same model used by /api/support/tickets)
  const ticketCode = `SUP-${now.getFullYear()}-${Math.floor(Math.random() * 100000)}`;
  const ticket = await (SupportTicket as any).create({
    tenantId: body?.userContext?.tenant || undefined,
    code: ticketCode,
    subject: `[${code}] ${message}`.slice(0, 140),
    module: 'Other',
    type: 'Bug',
    priority: severity === 'P0' || severity === 'CRITICAL' ? 'Urgent' : severity === 'P1' ? 'High' : 'Medium',
    category: 'Technical',
    subCategory: 'Bug Report',
    status: 'New',
    createdByUserId: body?.userContext?.userId || undefined,
    requester: !body?.userContext?.userId && body?.userContext?.email ? {
      name: body?.userContext?.email.split('@')[0],
      email: body?.userContext?.email,
      phone: body?.userContext?.phone || ''
    } : undefined,
    messages: [
      {
        byUserId: body?.userContext?.userId || undefined,
        byRole: body?.userContext?.userId ? 'USER' : 'GUEST',
        text: `${message}\n\n${details || ''}`.trim(),
        at: now
      }
    ]
  });

  return NextResponse.json({ ok: true, incidentId, ticketId: ticket?.code }, { status: 202 });
}

