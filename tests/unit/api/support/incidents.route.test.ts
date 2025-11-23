/**
 * Unit tests for /api/support/incidents route (POST).
 * Framework: Vitest
 *
 * We mock:
 * - next/server: NextResponse.json to return simple object with status + payload.
 * - @/lib/mongodb-unified: getDatabase().collection('error_events').insertOne
 * - @/server/models/SupportTicket: .create
 *
 * Tests cover:
 * - Happy path with explicit fields
 * - Defaults when fields missing (incidentId generation, default code/category/severity/message)
 * - Severity-to-priority mapping
 * - Guest requester derivation when userId missing but email present
 * - Subject length truncation to 140 chars
 * - Message composition with details/stack
 */

import { vi, describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: vi.fn((payload: Record<string, unknown>, init?: { status?: number }) => ({
        ok: true,
        status: init?.status ?? 200,
        json: payload
      })),
    },
  };
});

const insertOneMock = vi.fn().mockResolvedValue({ acknowledged: true, insertedId: 'mocked-id' });
const findOneMock = vi.fn().mockResolvedValue(null);
const updateOneMock = vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
const collectionMock = vi.fn().mockReturnValue({
  insertOne: insertOneMock,
  findOne: findOneMock,
  updateOne: updateOneMock,
});
const getDatabaseMock = vi.fn().mockResolvedValue({ collection: collectionMock });

vi.mock('@/lib/mongodb-unified', () => ({
  getDatabase: getDatabaseMock,
}));

const supportTicketCreateMock = vi.fn(async (doc: Record<string, unknown>) => ({
  ...doc,
  code: doc.code || 'SUP-2024-99999',
}));

vi.mock('@/server/models/SupportTicket', () => ({
  SupportTicket: {
    create: supportTicketCreateMock,
  },
}));

const getSessionUserMock = vi.fn(async () => ({
  id: 'user-1',
  role: 'ADMIN',
  orgId: 'org-1',
}));

vi.mock('@/server/middleware/withAuthRbac', () => ({
  getSessionUser: getSessionUserMock,
}));

const redisIncrMock = vi.fn();
const redisExpireMock = vi.fn();

vi.mock('@/lib/redis', () => ({
  getRedisClient: () => ({
    incr: redisIncrMock,
    expire: redisExpireMock,
  }),
}));

vi.mock('@/server/security/rateLimit', () => ({
  rateLimit: vi.fn(() => ({ allowed: true })),
}));

vi.mock('@/server/security/rateLimitKey', () => ({
  buildRateLimitKey: vi.fn(() => 'rate-key'),
}));

// Import after mocks
let POST: any;
let NextResponse: any;
let getDatabase: any;
let SupportTicket: any;

beforeAll(async () => {
  // Import the route handler
  ({ POST } = await import('@/app/api/support/incidents/route'));
  
  // Get references to mocked modules
  ({ NextResponse } = await import('next/server'));
  ({ getDatabase } = await import('@/lib/mongodb-unified'));
  ({ SupportTicket } = await import('@/server/models/SupportTicket'));
});

describe('POST /api/support/incidents', () => {
  const FIXED_DATE = new Date('2024-06-15T12:34:56.000Z');
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    NextResponse.json.mockClear();
    getDatabase.mockClear();
    SupportTicket.create.mockClear();
    insertOneMock.mockReset();
    insertOneMock.mockResolvedValue({ acknowledged: true, insertedId: 'mocked-id' });
    findOneMock.mockReset();
    findOneMock.mockResolvedValue(null);
    updateOneMock.mockReset();
    updateOneMock.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    collectionMock.mockClear();
    supportTicketCreateMock.mockClear();
    getSessionUserMock.mockReset();
    getSessionUserMock.mockResolvedValue({
      id: 'user-1',
      role: 'ADMIN',
      orgId: 'org-1',
    });
    redisIncrMock.mockReset();
    redisIncrMock.mockResolvedValue(1);
    redisExpireMock.mockReset();
    redisExpireMock.mockResolvedValue(undefined);
    delete process.env.ENABLE_ANONYMOUS_INCIDENTS;
  });

  afterEach(() => {
    randomSpy.mockRestore();
    vi.useRealTimers();
  });

  function mkReq(body: any): NextRequest {
    return { 
      json: async () => body,
      headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      url: 'http://localhost/api/support/incidents'
    } as unknown as NextRequest;
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
    const [payload, init] = NextResponse.json.mock.calls[0];
    expect(payload).toMatchObject({
      ok: true,
      incidentId: 'INC-2024-ABCD12',
    });
    expect(payload.ticketId).toMatch(/^SUP-2024-[A-Z0-9]{6}$/);
    expect(init).toEqual({ status: 202 });

    const native = await getDatabase.mock.results[0].value;
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
        sessionUser: { id: 'user-1', role: 'ADMIN', orgId: 'org-1' },
        clientContext: body.clientContext,
        tenantScope: 'org-1',
        createdAt: FIXED_DATE,
      })
    );

    expect(SupportTicket.create).toHaveBeenCalledTimes(1);
    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        code: expect.stringMatching(/^SUP-2024-[A-Z0-9]{6}$/),
        subject: '[UI-CORE-500] Unexpected error occurred',
        module: 'Other',
        type: 'Bug',
        priority: 'High',
        category: 'Technical',
        subCategory: 'Bug Report',
        status: 'New',
        createdBy: 'user-1',
        requester: undefined,
        messages: [
          expect.objectContaining({
            byUserId: 'user-1',
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
    expect(res.json.ticketId).toMatch(/^SUP-2024-[A-Z0-9]{6}$/);
  });

  it('uses defaults when fields are missing and generates incidentId', async () => {
    const body = {};

    const res = await POST(mkReq(body));

    const expectedIncPrefix = `INC-${FIXED_DATE.getFullYear()}-`;
    const payload = (NextResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const statusInit = (NextResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(statusInit).toEqual({ status: 202 });
    expect(payload.ok).toBe(true);
    expect(payload.incidentId).toMatch(/^INC-2024-[A-Z0-9]{8}$/);
    expect(payload.incidentId.startsWith(expectedIncPrefix)).toBe(true);

    const native = await getDatabase.mock.results[0].value;
    const insertOne = native.collection('error_events').insertOne;
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UI-UI-UNKNOWN-000',
        category: 'Support',
        severity: 'P2',
        message: 'Application error',
        details: undefined,
        sessionUser: { id: 'user-1', role: 'ADMIN', orgId: 'org-1' },
        clientContext: null,
        tenantScope: 'org-1',
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
      { input: 'P0', expected: 'Urgent' },
      { input: 'CRITICAL', expected: 'Urgent' },
      { input: 'P1', expected: 'High' },
      { input: 'P2', expected: 'Medium' },
      { input: 'P3', expected: 'Medium' },
    ];

    for (const { input, expected } of severities) {
      SupportTicket.create.mockClear();
      await POST(mkReq({ severity: input }));
      expect(SupportTicket.create).toHaveBeenCalled();
      const call = SupportTicket.create.mock.calls[0][0];
      expect(call.priority).toBe(expected);
    }
  });

  it('derives requester when userId is absent but email present (anonymous mode)', async () => {
    process.env.ENABLE_ANONYMOUS_INCIDENTS = 'true';
    getSessionUserMock.mockRejectedValueOnce(new Error('no session'));
    const body = {
      message: 'A thing happened',
      userContext: { email: 'guest.user@example.com', phone: '123-456' },
    };

    await POST(mkReq(body));

    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
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
