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
    clientContext: z.record(z.string(), z.unknown()).optional()
  });
  let safe: z.infer<typeof schema>;
  try {
    safe = schema.parse(body);
  } catch (err: any) {
    const issues = err?.issues ?? [];
    return NextResponse.json(
      {
        type: 'https://docs.fixzit/errors/invalid-incident-payload',
        title: 'Invalid incident payload',
        status: 400,
        detail: 'One or more fields are invalid',
        errors: issues
      },
      { status: 400, headers: { 'content-type': 'application/problem+json' } }
    );
  }
  const now = new Date();

  const incidentId: string = safe.incidentId || `INC-${now.getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const incidentKey: string | undefined = safe.incidentKey || incidentId;
  const code: string = safe.code || 'UI-UI-UNKNOWN-000';
  const category: string = safe.category || 'Support';
  const severity: string = safe.severity || 'P2';
  const message: string = (safe.message || 'Application error');
  const details: string | undefined = (safe.details || safe.stack);

  // Derive authenticated user/tenant if available; ignore spoofed body.userContext
  let sessionUser: { id: string; role: string; orgId: string } | null = null;
  try {
    const user = await getSessionUser(req);
    sessionUser = { id: user.id, role: user.role, orgId: (user as any)?.orgId } as any;
  } catch {
    sessionUser = null;
  }

  // Simple in-memory rate limiting (best-effort) per user or IP
  const globalAny: any = global as any;
  if (!globalAny.__incidentsRate) globalAny.__incidentsRate = new Map<string, { ts: number; count: number }>();
  const ip = (req as any).ip || 'anonymous';
  const rateKey = sessionUser?.id ? `u:${sessionUser.id}` : `ip:${ip}`;
  const nowMs = Date.now();
  const windowMs = 30_000; // 30s window
  const entry = globalAny.__incidentsRate.get(rateKey);
  if (!entry || nowMs - entry.ts > windowMs) {
    globalAny.__incidentsRate.set(rateKey, { ts: nowMs, count: 1 });
  } else {
    entry.count += 1;
    if (entry.count > 3) {
      return new NextResponse(null, { status: 429 });
    }
  }

  // Determine tenant scope and dedupe within that scope only
  const tenantScope = sessionUser?.orgId || req.headers.get('x-org-id') || req.headers.get('x-org') || null;
  const existing = incidentKey
    ? await native.collection('error_events').findOne({ incidentKey, tenantScope })
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
    tenantScope: sessionUser?.orgId || null,
    createdAt: now
  });

  // Auto-create a Support Ticket (same model used by /api/support/tickets)
  let ticket: any | null = null;
  const genCode = () => `SUP-${now.getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  for (let i = 0; i < 5; i++) {
    const ticketCode = genCode();
    try {
      ticket = await SupportTicket.create({
    orgId: sessionUser?.orgId || undefined,
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
      { incidentId, tenantScope },
      { $set: { ticketId: ticket.code } }
    );
  }

  return NextResponse.json({ ok: true, incidentId, ticketId: ticket?.code }, { status: 202 });
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}

