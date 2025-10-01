/**
 * Unit tests for /api/support/incidents route (POST).
 * Framework: Jest (ts-jest).
 *
 * We mock:
 * - next/server: NextResponse.json to return simple object with status + payload.
 * - @/lib/mongo: db (awaited promise) and getNativeDb().collection('error_events').insertOne
 * - @/db/models/SupportTicket: .create
 *
 * Tests cover:
 * - Happy path with explicit fields
 * - Defaults when fields missing (incidentId generation, default code/category/severity/message)
 * - Severity-to-priority mapping
 * - Guest requester derivation when userId missing but email present
 * - Subject length truncation to 140 chars
 * - Message composition with details/stack
 */

import type { NextRequest } from 'next/server';

jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn((payload: any, init?: { status?: number }) => ({
        ok: true,
        status: init?.status ?? 200,
        json: payload
      })),
    },
  };
});

jest.mock('@/lib/mongo', () => {
  const insertOne = jest.fn().mockResolvedValue({ acknowledged: true, insertedId: 'mocked-id' });
  const collection = jest.fn().mockReturnValue({ insertOne });
  const getNativeDb = jest.fn().mockResolvedValue({ collection });
  const db = Promise.resolve(true);
  return { db, getNativeDb };
});

jest.mock('@/db/models/SupportTicket', () => {
  return {
    SupportTicket: {
      create: jest.fn(async (doc: any) => ({ ...doc, code: doc.code || 'SUP-2024-99999' })),
    },
  };
});

// Import after mocks
let POST: any;
beforeAll(async () => {
  try {
    ({ POST } = await import('@/app/api/support/incidents/route'));
  } catch {
    try {
      ({ POST } = await import('app/api/support/incidents/route'));
    } catch {
      try {
        ({ POST } = await import('@/app/api/support/incidents/route'));
      } catch {
        // Not found; tests will throw a clear error in cases below.
      }
    }
  }
});

const { NextResponse } = jest.requireMock('next/server') as { NextResponse: { json: jest.Mock } };
const { getNativeDb } = jest.requireMock('@/lib/mongo') as { getNativeDb: jest.Mock };
const { SupportTicket } = jest.requireMock('@/db/models/SupportTicket') as { SupportTicket: { create: jest.Mock } };

describe('POST /api/support/incidents', () => {
  const FIXED_DATE = new Date('2024-06-15T12:34:56.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_DATE);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    NextResponse.json.mockClear();
    getNativeDb.mockClear();
    SupportTicket.create.mockClear();
  });

  afterEach(() => {
    (Math.random as jest.Mock).mockRestore?.();
    jest.useRealTimers();
  });

  function mkReq(body: any): NextRequest {
    return { json: async () => body } as unknown as NextRequest;
  }

  it('creates incident and ticket with provided fields (happy path)', async () => {
    const body = {
      incidentId: 'INC-2024-ABCD12',
      code: 'UI-CORE-500',
      category: 'Crash',
      severity: 'P1',
      message: 'Unexpected error occurred',
      details: 'Stack trace...',
      userContext: { userId: 'u_1', tenant: 't_1', email: 'user@example.com', phone: '+1-555-0100' },
      clientContext: { os: 'macOS', version: '1.2.3' },
    };

    const res = await POST(mkReq(body));
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        incidentId: 'INC-2024-ABCD12',
        ticketId: expect.stringMatching(/^SUP-\d{4}-\d+$/),
      }),
      { status: 202 }
    );

    const native = await getNativeDb.mock.results[0].value;
    const insertOne = native.collection('error_events').insertOne;
    expect(insertOne).toHaveBeenCalledTimes(1);
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: 'INC-2024-ABCD12',
        code: 'UI-CORE-500',
        category: 'Crash',
        severity: 'P1',
        message: 'Unexpected error occurred',
        details: 'Stack trace...',
        userContext: body.userContext,
        clientContext: body.clientContext,
        createdAt: FIXED_DATE,
      })
    );

    expect(SupportTicket.create).toHaveBeenCalledTimes(1);
    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't_1',
        code: expect.stringMatching(/^SUP-2024-\d{1,5}$/),
        subject: '[UI-CORE-500] Unexpected error occurred',
        module: 'Other',
        type: 'Bug',
        priority: 'High',
        category: 'Technical',
        subCategory: 'Bug Report',
        status: 'New',
        createdByUserId: 'u_1',
        requester: undefined,
        messages: [
          expect.objectContaining({
            byUserId: 'u_1',
            byRole: 'USER',
            text: 'Unexpected error occurred\n\nStack trace...',
            at: FIXED_DATE,
          }),
        ],
      })
    );

    expect(res.status).toBe(202);
    expect(res.json.ok).toBe(true);
    expect(res.json.incidentId).toBe('INC-2024-ABCD12');
    expect(res.json.ticketId).toMatch(/^SUP-2024-\d{1,5}$/);
  });

  it('uses defaults when fields are missing and generates incidentId', async () => {
    const body = {};

    const res = await POST(mkReq(body));

    const expectedIncPrefix = `INC-${FIXED_DATE.getFullYear()}-`;
    const payload = (NextResponse.json as jest.Mock).mock.calls[0][0];
    const statusInit = (NextResponse.json as jest.Mock).mock.calls[0][1];
    expect(statusInit).toEqual({ status: 202 });
    expect(payload.ok).toBe(true);
    expect(payload.incidentId).toMatch(/^INC-2024-[A-Z0-9]{6}$/);
    expect(payload.incidentId.startsWith(expectedIncPrefix)).toBe(true);

    const native = await getNativeDb.mock.results[0].value;
    const insertOne = native.collection('error_events').insertOne;
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UI-UI-UNKNOWN-000',
        category: 'Support',
        severity: 'P2',
        message: 'Application error',
        details: undefined,
        userContext: null,
        clientContext: null,
        createdAt: FIXED_DATE,
      })
    );

    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'Medium',
        subject: '[UI-UI-UNKNOWN-000] Application error',
      })
    );
  });

  it('maps severity to priority correctly (P0, CRITICAL => Urgent; P1 => High; others => Medium)', async () => {
    const severities = [
      { in: 'P0', out: 'Urgent' },
      { in: 'CRITICAL', out: 'Urgent' },
      { in: 'P1', out: 'High' },
      { in: 'P2', out: 'Medium' },
      { in: 'LOW', out: 'Medium' },
    ];

    for (const { in: sev, out } of severities) {
      SupportTicket.create.mockClear();
      await POST(mkReq({ severity: sev }));
      expect(SupportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: out })
      );
    }
  });

  it('derives requester when userId is absent but email present', async () => {
    const body = {
      message: 'A thing happened',
      userContext: { email: 'guest.user@example.com', phone: '123-456' },
    };

    await POST(mkReq(body));

    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdByUserId: undefined,
        requester: {
          name: 'guest.user',
          email: 'guest.user@example.com',
          phone: '123-456',
        },
        messages: [
          expect.objectContaining({
            byUserId: undefined,
            byRole: 'GUEST',
            text: 'A thing happened',
            at: FIXED_DATE,
          }),
        ],
      })
    );
  });

  it('truncates subject to 140 chars', async () => {
    const longMsg = 'X'.repeat(200);
    await POST(mkReq({ code: 'C-1', message: longMsg }));

    const call = SupportTicket.create.mock.calls[0][0];
    expect(call.subject.length).toBeLessThanOrEqual(140);
    expect(call.subject).toBe(`[C-1] ${longMsg}`.slice(0, 140));
  });

  it('includes details/stack in first message if provided', async () => {
    await POST(mkReq({ message: 'boom', details: 'trace' }));
    let call = SupportTicket.create.mock.calls[0][0];
    expect(call.messages[0].text).toBe('boom\n\ntrace');

    SupportTicket.create.mockClear();
    await POST(mkReq({ message: 'boom', stack: 'stack-lines' }));
    call = SupportTicket.create.mock.calls[0][0];
    expect(call.messages[0].text).toBe('boom\n\nstack-lines');

    SupportTicket.create.mockClear();
    await POST(mkReq({ message: 'boom' }));
    call = SupportTicket.create.mock.calls[0][0];
    expect(call.messages[0].text).toBe('boom');
  });
});

