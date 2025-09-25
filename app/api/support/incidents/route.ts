import { NextRequest, NextResponse } from 'next/server';
import { db, getNativeDb } from '@/src/lib/mongo';
import { SupportTicket } from '@/src/server/models/SupportTicket';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';
import { z } from 'zod';

// Accepts client diagnostic bundles and auto-creates a support ticket.
// This is non-blocking for the user flow; returns 202 on insert.
export async function POST(req: NextRequest) {
  await db;
  const native = await getNativeDb();

  const body = await req.json();
  const schema = z.object({
    code: z.string().max(50).optional(),
    message: z.string().max(500).optional(),
    details: z.string().max(4000).optional(),
    stack: z.string().max(4000).optional(),
    severity: z.enum(['CRITICAL','P0','P1','P2','P3']).optional(),
    category: z.string().max(50).optional(),
    incidentId: z.string().max(64).optional(),
    incidentKey: z.string().max(128).optional(),
    userContext: z.object({ userId: z.string().optional(), tenant: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional() }).optional(),
    clientContext: z.record(z.any()).optional()
  });
  const safe = schema.parse(body);
  const now = new Date();

  const incidentId: string = safe.incidentId || `INC-${now.getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const incidentKey: string | undefined = safe.incidentKey || incidentId;
  const code: string = safe.code || 'UI-UI-UNKNOWN-000';
  const category: string = safe.category || 'Support';
  const severity: string = safe.severity || 'P2';
  const message: string = (safe.message || 'Application error');
  const details: string | undefined = (safe.details || safe.stack);

  // Derive authenticated user/tenant if available; ignore spoofed body.userContext
  let sessionUser: { id: string; role: string; tenantId: string } | null = null;
  try {
    const user = await getSessionUser(req);
    sessionUser = { id: user.id, role: user.role, tenantId: user.tenantId } as any;
  } catch {
    sessionUser = null;
  }

  // Dedupe: return existing if same incidentKey exists
  const existing = incidentKey
    ? await native.collection('error_events').findOne(
        sessionUser?.tenantId
          ? { incidentKey, $or: [{ 'sessionUser.tenantId': sessionUser.tenantId }, { sessionUser: null }] }
          : { incidentKey, sessionUser: null }
      )
    : null;
  if (existing) {
    return NextResponse.json({ ok: true, incidentId: existing.incidentId, ticketId: existing.ticketId }, { status: 202 });
  }

  // Store minimal incident document for indexing/analytics
  await native.collection('error_events').insertOne({
    incidentKey,
    incidentId,
    code,
    category,
    severity,
    message,
    details,
    sessionUser: sessionUser || null,
    clientContext: body?.clientContext || null,
    tenantScope: sessionUser?.tenantId || null,
    createdAt: now
  });

  // Auto-create a Support Ticket (same model used by /api/support/tickets)
  let ticket: any | null = null;
  const genCode = () => `SUP-${now.getFullYear()}-${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`;
  for (let i = 0; i < 5; i++) {
    const ticketCode = genCode();
    try {
      ticket = await (SupportTicket as any).create({
    tenantId: sessionUser?.tenantId || undefined,
        code: ticketCode,
    subject: `[${code}] ${message}`.slice(0, 140),
    module: 'Other',
    type: 'Bug',
    priority: severity === 'P0' || severity === 'CRITICAL' ? 'Urgent' : severity === 'P1' ? 'High' : 'Medium',
    category: 'Technical',
    subCategory: 'Bug Report',
    status: 'New',
    createdByUserId: sessionUser?.id || undefined,
    requester: !sessionUser && body?.userContext?.email ? {
      name: String(body?.userContext?.email).split('@')[0],
      email: body?.userContext?.email,
      phone: body?.userContext?.phone || ''
    } : undefined,
    messages: [
      {
        byUserId: sessionUser?.id || undefined,
        byRole: sessionUser ? 'USER' : 'GUEST',
            text: `${message}\n\n${details || ''}`.trim(),
        at: now
      }
        ]
      });
      break;
    } catch (e: any) {
      if (e?.code === 11000) continue; // duplicate code -> retry
      throw e;
    }
  }

  // Persist ticket linkage for dedupe/analytics
  if (ticket) {
    await native.collection('error_events').updateOne(
      { incidentId },
      { $set: { ticketId: ticket.code } }
    );
  }

  return NextResponse.json({ ok: true, incidentId, ticketId: ticket?.code }, { status: 202 });
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}

