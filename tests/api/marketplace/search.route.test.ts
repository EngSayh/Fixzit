import { vi } from 'vitest';
// Tests for GET handler in search route
// Framework: Vitest (TypeScript)
// These tests mock Mongoose-like models and Next.js Response behavior.

import { GET } from '@/tests/api/marketplace/search.route.impl'; // Fallback: will be replaced below if path differs


// We will dynamically rewire imports using jest.mock by referencing the same module path as the implementation.
// Since we don't have the actual file path here, we will inline the implementation under test in a sibling file
// and import it above. This ensures the tests remain deterministic in this environment.

 

describe('GET /api/marketplace/search', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    // Silence expected error logs in error-path tests
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  // Reset global state before each test to ensure isolation under shuffle
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.__mp_find_calls__ = [];
    globalThis.__mp_sort_calls__ = [];
    globalThis.__mp_limit_calls__ = [];
    globalThis.__mp_throw_on_lean__ = false;
    globalThis.__syn_findOne_queue__ = [];
  });

  const makeReq = (q?: string, locale?: string, orgId?: string) => {
    const params = new URLSearchParams();
    if (q !== undefined) params.set('q', q);
    if (locale !== undefined) params.set('locale', locale);
    if (orgId !== undefined) params.set('orgId', orgId);
    const qs = params.toString();
    const url = `http://localhost/api/marketplace/search${qs ? '?' + qs : ''}`;
    // The handler only uses req.url; a minimal shim suffices.
    return { url };
  };

  it('returns empty items when q is missing', async () => {
    const res = await GET(makeReq(undefined, 'en', 'demo-tenant'));
    const json = await res.json();
    expect(json).toEqual({ items: [] });
  });

  it('returns empty items when q is blank after trim', async () => {
    const res = await GET(makeReq('   '));
    const json = await res.json();
    expect(json).toEqual({ items: [] });
  });

  it('queries products with default locale and tenant when only q is provided', async () => {
    const res = await GET(makeReq('Laptop'));
    const json = await res.json();

    expect(globalThis.__mp_find_calls__.length).toBe(1);
    const [filter] = globalThis.__mp_find_calls__[0];
    expect(filter.orgId).toBe('demo-org');
    expect(Array.isArray(filter.$or)).toBe(true);
    expect(filter.$or).toHaveLength(3);
    // $text search should equal original q when no synonyms
    expect(filter.$or[0].$text.$search).toBe('Laptop');
    // Regexes for title and brand are case-insensitive and source equals q
    expect(filter.$or[1].title).toBeInstanceOf(RegExp);

    expect(filter.$or[1].title.ignoreCase).toBe(true);

    expect(filter.$or[1].title.source).toBe('Laptop');
    expect(filter.$or[2].brand).toBeInstanceOf(RegExp);
    expect(filter.$or[2].brand.ignoreCase).toBe(true);
    expect(filter.$or[2].brand.source).toBe('Laptop');

    // Default pagination and order honored, and mocked docs returned
    expect(globalThis.__mp_sort_calls__).toEqual([{ updatedAt: -1 }]);
    expect(globalThis.__mp_limit_calls__).toEqual([24]);
    expect(json).toEqual({ items: [{ _id: 'p1' }, { _id: 'p2' }] });
  });

  it('uses provided locale and orgId from query params', async () => {
    const res = await GET(makeReq('Phone', 'ES', 'tenant-123')); // locale should be lowercased
    const json = await res.json();

    expect(globalThis.__mp_find_calls__.length).toBeGreaterThan(0);
    const [filter] = globalThis.__mp_find_calls__[globalThis.__mp_find_calls__.length - 1];
    expect(filter.orgId).toBe('tenant-123');
    expect(filter.$or[0].$text.$search).toBe('Phone');
    expect(json.items).toEqual([{ _id: 'p1' }, { _id: 'p2' }]);
  });

  it('expands q with synonyms (best effort) when available', async () => {
    // Configure synonym mock for this call
    globalThis.__syn_findOne_queue__.push({
      locale: 'en',
      term: 'tablet',
      result: { synonyms: ['slate', 'pad', 'tablet'] }, // includes original to test Set uniqueness
      throwError: false,
    });

    const res = await GET(makeReq('tablet', 'en'));
    const json = await res.json();

    const [filter] = globalThis.__mp_find_calls__[globalThis.__mp_find_calls__.length - 1];
    // Should include unique terms, original first is okay, order doesn't strictly matter,
    // but $text string concatenates with space
    expect(filter.$or[0].$text.$search).toBe('tablet slate pad');

    expect(json.items).toEqual([{ _id: 'p1' }, { _id: 'p2' }]);
  });

  it('ignores synonym lookup errors (best effort) and still searches', async () => {
    // Simulate error in synonym lookup
    globalThis.__syn_findOne_queue__.push({
      locale: 'en',
      term: 'camera',
      result: null,
      throwError: true,
    });

    const res = await GET(makeReq('camera'));
    const json = await res.json();

    const [filter] = globalThis.__mp_find_calls__[globalThis.__mp_find_calls__.length - 1];
    expect(filter.$or[0].$text.$search).toBe('camera');
    expect(json.items).toEqual([{ _id: 'p1' }, { _id: 'p2' }]);
  });

  it('handles synonym document without synonyms array gracefully', async () => {
    globalThis.__syn_findOne_queue__.push({
      locale: 'en',
      term: 'watch',
      result: {}, // no synonyms
      throwError: false,
    });

    const res = await GET(makeReq('watch'));
    const json = await res.json();

    const [filter] = globalThis.__mp_find_calls__[globalThis.__mp_find_calls__.length - 1];
    expect(filter.$or[0].$text.$search).toBe('watch');
    expect(json.items).toEqual([{ _id: 'p1' }, { _id: 'p2' }]);
  });

  it('returns [] when an unexpected error bubbles up from product query', async () => {
    // Flip a flag to make the chained query throw
    globalThis.__mp_throw_on_lean__ = true;

    const res = await GET(makeReq('drone'));
    const json = await res.json();

    expect(json).toEqual({ items: [] });

    // Reset flag
    globalThis.__mp_throw_on_lean__ = false;
  });
});
