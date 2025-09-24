import { test, expect } from '@playwright/test';

test.describe('API /api/notifications', () => {
  test('GET returns expected shape with defaults', async ({ request }) => {
    const res = await request.get('/api/notifications');
    expect(res.status(), 'status should be 200').toBe(200);
    const json = await res.json();

    expect(json).toHaveProperty('items');
    expect(Array.isArray(json.items)).toBe(true);
    expect(json).toMatchObject({
      total: expect.any(Number),
      page: 1,
      limit: 20,
      hasMore: expect.any(Boolean),
    });
  });

  test('GET clamps page to >=1 and limit to <=100 (upper bound)', async ({ request }) => {
    const res = await request.get('/api/notifications?page=0&limit=500');
    expect(res.status()).toBe(200);
    const json = await res.json();

    expect(json.page).toBe(1);
    expect(json.limit).toBeLessThanOrEqual(100);
  });

  test('GET clamps limit lower bound to 1', async ({ request }) => {
    const res = await request.get('/api/notifications?page=-10&limit=0');
    expect(res.status()).toBe(200);
    const json = await res.json();

    expect(json.page).toBe(1);
    expect(json.limit).toBe(1);
  });

  test('GET accepts query filters without crashing', async ({ request }) => {
    const res = await request.get('/api/notifications?q=alpha&category=vendor&priority=high&read=true&page=2&limit=10');
    expect(res.status()).toBe(200);
    const json = await res.json();

    // Only assert stable envelope; content depends on DB state
    expect(json).toHaveProperty('items');
    expect(json).toMatchObject({
      total: expect.any(Number),
      page: 2,
      limit: 10,
      hasMore: expect.any(Boolean),
    });
  });

  test('POST rejects invalid payload (schema enforcement)', async ({ request }) => {
    const res = await request.post('/api/notifications', {
      data: {
        title: '',               // invalid (min(1))
        message: '',             // invalid (min(1))
        type: 'unknown',         // invalid enum
        priority: 'urgent',      // invalid enum
        category: 'misc',        // invalid enum
      },
    });

    // zod.parse throws -> Next returns an error (commonly 500). Accept any 4xx/5xx.
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(600);
  });

  test('POST returns 503 when DB unavailable or 201 when available (with cleanup)', async ({ request }) => {
    const res = await request.post('/api/notifications', {
      data: {
        title: 'Test Notification',
        message: 'Hello world',
        type: 'system',
        priority: 'low',
        category: 'system',
      },
    });

    const status = res.status();
    if (status === 503) {
      const body = await res.json();
      expect(body).toMatchObject({ error: 'DB unavailable' });
    } else {
      expect(status).toBe(201);
      const body = await res.json();
      // Validate key fields on successful insert
      expect(body).toMatchObject({
        title: 'Test Notification',
        message: 'Hello world',
        type: 'system',
        priority: 'low',
        category: 'system',
        read: false,
      });
      expect(typeof body.timestamp).toBe('string');
      expect(body).toHaveProperty('_id');

      // Cleanup if DELETE endpoint is available
      const del = await request.delete(`/api/notifications/${body._id}`);
      expect(del.status()).toBeLessThan(400);
      const delJson = await del.json();
      expect(delJson).toMatchObject({ success: true });
    }
  });
});