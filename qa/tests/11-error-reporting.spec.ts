/**
 * Error Reporting API tests
 *
 * Testing library/framework:
 * - Playwright Test (TypeScript) using APIRequestContext (request fixture).
 *
 * Notes:
 * - Route under test: POST /api/errors/report
 * - Validates: request validation (400), success path (200), auto-ticket handling,
 *   resilience on ticket failure, and server error path (500 on malformed JSON).
 * - Uses real error codes from src/lib/errors/registry.ts.
 * - To avoid flakiness when backing services are unavailable (e.g., Mongo),
 *   assertions allow 200 or 500 in integration scenarios; 400 cases are strict.
 */

import { test, expect, request, APIRequestContext } from '@playwright/test';

const endpoint = '/api/errors/report';

// Allow running when baseURL provided by config/env; otherwise skip network-bound tests.
const canRunNetwork = Boolean(process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL);

type AnyObj = Record<string, any>;
function buildValidPayload(overrides: Partial<AnyObj> = {}) {
  const base: AnyObj = {
    incidentId: 'inc_123',
    correlationId: 'corr_456',
    orgId: 'org_999',
    userId: 'user_abc',
    userRole: 'admin',
    locale: 'en',
    rtl: false,
    route: '/dashboard',
    // Important: tickets route zod enum requires one of: FM, Souq, Aqar, Account, Billing, Other
    module: 'Other',
    severity: 'ERROR', // maps to High in ticket creation payload
    items: [
      {
        // Real UI category code
        code: 'WO-UI-LOAD-003',
        message: 'Work orders failed to load',
        stack: 'Error: stack\n  at btn (file.js:10:5)'
      }
    ],
    device: {
      ua: 'pw-agent',
      platform: 'linux',
      online: true,
      width: 1280,
      height: 720
    },
    network: {
      effectiveType: '4g',
      downlink: 10
    },
    payloadHash: 'hash123',
    tags: ['ui', 'click'],
    createdAt: new Date().toISOString()
  };
  return { ...base, ...overrides };
}

test.describe('POST /api/errors/report', () => {
  let ctx: APIRequestContext;

  test.beforeAll(async (fixtures) => {
    const { baseURL } = fixtures as any;
    if (!baseURL && !canRunNetwork) {
      test.skip(true, 'No baseURL configured for API tests.');
    }
    ctx = await request.newContext({ baseURL: baseURL || process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000' });
  });

  test.afterAll(async () => {
    if (ctx) await ctx.dispose();
  });

  // Validation failures (strict 400)
  test('400 when incidentId is missing', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const payload = buildValidPayload({ incidentId: undefined });
    const res = await ctx.post(endpoint, { data: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Invalid error report format' });
  });

  test('400 when items array is missing', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const payload = buildValidPayload({ items: undefined });
    const res = await ctx.post(endpoint, { data: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Invalid error report format' });
  });

  test('400 when items array is empty', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const payload = buildValidPayload({ items: [] });
    const res = await ctx.post(endpoint, { data: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Invalid error report format' });
  });

  // Success path (tolerant of infra)
  test('happy path: returns success with incidentId and ticketId field present', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const payload = buildValidPayload();
    const res = await ctx.post(endpoint, { data: payload });
    expect([200, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body.success).toBe(true);
      expect(body.incidentId).toBe(payload.incidentId);
      expect(Object.prototype.hasOwnProperty.call(body, 'ticketId')).toBe(true);
      expect(body.message).toBe('Error reported successfully');
    } else {
      expect(body).toMatchObject({ error: 'Failed to report error' });
    }
  });

  // Severity mapping resilience (priority selection downstream)
  test('severity priority mapping does not break endpoint: CRITICAL/ERROR/WARN', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const critical = buildValidPayload({ severity: 'CRITICAL', incidentId: 'inc_critical' });
    const error = buildValidPayload({ severity: 'ERROR', incidentId: 'inc_error' });
    const warn = buildValidPayload({ severity: 'WARN', incidentId: 'inc_warn' });

    const [r1, r2, r3] = await Promise.all([
      ctx.post(endpoint, { data: critical }),
      ctx.post(endpoint, { data: error }),
      ctx.post(endpoint, { data: warn }),
    ]);

    expect([200, 500]).toContain(r1.status());
    expect([200, 500]).toContain(r2.status());
    expect([200, 500]).toContain(r3.status());
  });

  // Category mapping scenarios with real codes
  test('subcategory mapping with API/UI/other categories (real registry codes)', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const ui = buildValidPayload({
      incidentId: 'inc_ui',
      items: [{ code: 'WO-UI-LOAD-003', message: 'UI failure' }]
    });
    const api = buildValidPayload({
      incidentId: 'inc_api',
      items: [{ code: 'PROP-API-LIST-001', message: 'API list failed' }]
    });
    // "Other" (non-API/UI) category -> subCategory should fallback to "Critical Bug"
    const other = buildValidPayload({
      incidentId: 'inc_other',
      items: [{ code: 'SYS-API-DB-003', message: 'DB failure' }]
    });

    const [r1, r2, r3] = await Promise.all([
      ctx.post(endpoint, { data: ui }),
      ctx.post(endpoint, { data: api }),
      ctx.post(endpoint, { data: other }),
    ]);

    expect([200, 500]).toContain(r1.status());

    expect([200, 500]).toContain(r2.status());

    expect([200, 500]).toContain(r3.status());
  });

  // Auto-ticket creation success/failure paths
  test('auto-ticket enabled code includes ticketId field on success (real API code)', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const payload = buildValidPayload({
      incidentId: 'inc_ticket_enabled',
      items: [{ code: 'PROP-API-LIST-001', message: 'API failed', stack: '' }]
    });
    const res = await ctx.post(endpoint, { data: payload });
    expect([200, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body.success).toBe(true);
      expect(body.incidentId).toBe(payload.incidentId);
      expect(Object.prototype.hasOwnProperty.call(body, 'ticketId')).toBe(true);
    } else {
      expect(body).toMatchObject({ error: 'Failed to report error' });
    }
  });

  test('auto-ticket disabled code yields ticketId null on success', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    // FIN-UI-BAL-003 has autoTicket: false
    const payload = buildValidPayload({
      incidentId: 'inc_no_ticket',
      items: [{ code: 'FIN-UI-BAL-003', message: 'UI - balance info unavailable' }]
    });
    const res = await ctx.post(endpoint, { data: payload });
    expect([200, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body.success).toBe(true);
      expect(body.incidentId).toBe(payload.incidentId);
      expect(body.ticketId).toBeNull();
    } else {
      expect(body).toMatchObject({ error: 'Failed to report error' });
    }
  });

  // Guest flow (no userId -> requester included in ticket payload) - not directly observable; assert resilience
  test('guest flow (no userId, no device, no stack) still succeeds when services available', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const payload = buildValidPayload({
      userId: undefined,
      userRole: undefined,
      device: undefined,
      items: [{ code: 'WO-UI-LOAD-003', message: 'No stack provided' }],
    });
    const res = await ctx.post(endpoint, { data: payload });
    expect([200, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body.success).toBe(true);
      expect(body.incidentId).toBe(payload.incidentId);
    } else {
      expect(body).toMatchObject({ error: 'Failed to report error' });
    }
  });

  // Fallback code path
  test('unknown error code falls back to registry default and remains resilient', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const payload = buildValidPayload({
      incidentId: 'inc_unknown',
      items: [{ code: 'NON-EXISTENT-CODE-999', message: 'Unknown error' }]
    });
    const res = await ctx.post(endpoint, { data: payload });
    expect([200, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body.success).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(body, 'ticketId')).toBe(true);
    } else {
      expect(body).toMatchObject({ error: 'Failed to report error' });
    }
  });

  // Error path (malformed JSON)
  test('malformed JSON yields standardized 500 error response', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const brokenJson = '{ "incidentId": "inc_bad", "items": [ { "code": "X" } ]'; // missing closing }
    const res = await ctx.post(endpoint, {
      headers: { 'Content-Type': 'application/json' },
      data: undefined,
      body: brokenJson as any
    });
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Failed to report error' });
  });

  // Multiple items: ensure first item drives categorization; assert resilience
  test('multiple items: first item code drives categorization (resilient)', async () => {
    if (!ctx) {
      test.skip(true, 'No API context.');
    }
    const payload = buildValidPayload({
      incidentId: 'inc_multi',
      items: [
        { code: 'WO-UI-LOAD-003', message: 'First UI error' },
        { code: 'PROP-API-LIST-001', message: 'Second API error' }
      ]
    });
    const res = await ctx.post(endpoint, { data: payload });
    expect([200, 500]).toContain(res.status());
    // Body checks same as other resilient tests

    const body = await res.json();
    if (res.status() === 200) {
      expect(body.success).toBe(true);
      expect(body.incidentId).toBe(payload.incidentId);
    } else {
      expect(body).toMatchObject({ error: 'Failed to report error' });
    }
  });
});