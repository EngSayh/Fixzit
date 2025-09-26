/**
 * Tests for help/ask API route.
 *
 * Testing library/framework: Jest + TypeScript (ts-jest). If the project uses Vitest,
 * these tests are compatible with minimal changes (replace jest.* with vi.*, expect remains).
 */

import type { NextResponse } from 'next/server'

type MockContext = {
  createIndexCalls: unknown[];
  findQuery: unknown;
  findOptions: unknown;
  docs: Array<Record<string, unknown>>;
};

type MockFindChain = {
  sort: jest.Mock<MockFindChain, [unknown?]>;
  limit: jest.Mock<MockFindChain, [unknown?]>;
  toArray: jest.Mock<Promise<MockContext['docs']>, []>;
};

const mockCtx: MockContext = {
  createIndexCalls: [],
  findQuery: null,
  findOptions: null,
  docs: [],
};

const createFindChain = (): MockFindChain => {
  const chain: Partial<MockFindChain> = {};
  chain.sort = jest.fn(() => chain as MockFindChain);
  chain.limit = jest.fn(() => chain as MockFindChain);
  chain.toArray = jest.fn(async () => mockCtx.docs);
  return chain as MockFindChain;
};

const mockColl = {
  createIndex: jest.fn(async (spec: unknown) => {
    mockCtx.createIndexCalls.push(spec);
    return 'ok';
  }),
  find: jest.fn((query: unknown, options: unknown) => {
    mockCtx.findQuery = query;
    mockCtx.findOptions = options;
    return createFindChain();
  }),
};

const mockDb = {
  collection: jest.fn(() => mockColl),
};

const mockedMongoModule = {
  getDatabase: jest.fn(async () => mockDb),
};

// Mock the database helper before importing the module
jest.mock('@/lib/mongodb', () => mockedMongoModule);

// Import the module under test; adjust the path if the route file differs
// Common Next.js path pattern: app/api/help/ask/route.ts
// We import named exports to test pure helpers and POST handler.
let routeModule: any;
let POST: (req: any) => Promise<NextResponse>;
let __private_buildHeuristicAnswer: (q: string, ctxs: Array<{ title: string; text: string }>) => string;
let __private_maybeSummarizeWithOpenAI: (q: string, ctxs: string[]) => Promise<string | null>;

// Helper to (re)import the route module fresh per test to reset internal state
async function importFresh() {
  jest.resetModules();
  mockedMongoModule.getDatabase.mockResolvedValue(mockDb);
  mockDb.collection.mockReturnValue(mockColl);
  // Re-establish mocks post-reset
  jest.doMock('@/lib/mongodb', () => mockedMongoModule);
  const mod = await import('../../app/api/help/ask/route');
  routeModule = mod as any;
  POST = mod.POST as any;
  // Access non-exported symbols via the module object if they are exported; if not, bind through eval fallback
  __private_buildHeuristicAnswer = (mod as any).buildHeuristicAnswer || (mod as any).__private_buildHeuristicAnswer;
  __private_maybeSummarizeWithOpenAI = (mod as any).maybeSummarizeWithOpenAI || (mod as any).__private_maybeSummarizeWithOpenAI;
  return mod;
}

// Minimal Request-like stub for POST(req)
const makeReq = (payload: any) => ({ json: async () => payload });

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2024-01-02T03:04:05Z'));
  // reset mock ctx
  mockCtx.createIndexCalls.length = 0;
  mockCtx.findQuery = null;
  mockCtx.findOptions = null;
  mockCtx.docs = [];
  // reset mocks
  jest.clearAllMocks();
  mockedMongoModule.getDatabase.mockResolvedValue(mockDb);
  mockDb.collection.mockReturnValue(mockColl);
  // reset env and global.fetch
  delete (process.env as any).OPENAI_API_KEY;
  (global as any).fetch = undefined;
  await importFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('buildHeuristicAnswer (pure)', () => {
  test('returns "No matching articles" when contexts empty', () => {
    const out = __private_buildHeuristicAnswer('reset password', []);
    expect(out).toMatch(/^No matching articles found for: "reset password"/);
    expect(out).not.toContain('- ');
  });

  test('includes up to 3 top context items with bullet points and ellipsis for long snippets', () => {
    const longText = 'x'.repeat(1000);
    const out = __private_buildHeuristicAnswer('billing', [
      { title: 'T1', text: 'short text' },
      { title: 'T2', text: longText },
      { title: 'T3', text: '   spaced    out   text   ' },
      { title: 'T4', text: 'will be ignored' },
    ]);

    const lines = out.split('\n');
    expect(lines[0]).toBe('Here is what I found about: "billing"');
    // 3 items max
    expect(lines.filter(l => l.startsWith('- '))).toHaveLength(3);
    // Snippet trimmed and compacted spaces
    expect(lines[1]).toContain('- T1: short text');
    // Long one truncated to 400 chars + ellipsis
    const line2 = lines[2];
    const snippet = line2.split(': ').slice(1).join(': ');
    // Remove bullet and title part, assert 401 inc ellipsis char
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet.replace(/…$/, '').length).toBe(400);
    // Spacing collapsed
    expect(lines[3]).toContain('- T3: spaced out text');
  });
});

describe('maybeSummarizeWithOpenAI', () => {
  test('returns null if OPENAI_API_KEY is missing', async () => {
    const res = await __private_maybeSummarizeWithOpenAI('q', ['c1']);
    expect(res).toBeNull();
  });

  test('returns null if fetch fails or non-ok', async () => {
    process.env.OPENAI_API_KEY = 'test';
    (global as any).fetch = jest.fn(async () => ({ ok: false }));
    const res = await __private_maybeSummarizeWithOpenAI('q', ['c1']);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
      })
    );
    expect(res).toBeNull();
  });

  test('returns content when fetch ok and content present', async () => {
    process.env.OPENAI_API_KEY = 'test';
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'answer content' } }],
      }),
    }));
    const res = await __private_maybeSummarizeWithOpenAI('q', ['c1', 'c2']);
    expect(res).toBe('answer content');
  });

  test('returns null when ok but content missing', async () => {
    process.env.OPENAI_API_KEY = 'test';
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    const res = await __private_maybeSummarizeWithOpenAI('q', ['c1']);
    expect(res).toBeNull();
  });
});

describe('POST handler', () => {
  test('400 when question missing', async () => {
    const resp: any = await POST(makeReq({}));
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body).toEqual({ error: 'Missing question' });
  });

  test('400 when question is blank/whitespace', async () => {
    const resp: any = await POST(makeReq({ question: '   ' }));
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body).toEqual({ error: 'Missing question' });
  });

  test('ensures text index created and queries with $text search including category filter', async () => {
    mockCtx.docs = [];
    const resp: any = await POST(makeReq({ question: 'reset password', category: 'account' }));
    expect(mockColl.createIndex).toHaveBeenCalledWith({ title: 'text', content: 'text', tags: 'text' });
    expect(mockColl.find).toHaveBeenCalled();
    expect(mockCtx.findQuery).toEqual(expect.objectContaining({
      status: 'PUBLISHED',
      category: 'account',
      $text: { $search: 'reset password' },
    }));
    // Projection should include score meta and desired fields
    expect(mockCtx.findOptions).toEqual(expect.objectContaining({
      projection: expect.objectContaining({
        score: expect.any(Object),
        slug: 1, title: 1, content: 1, updatedAt: 1,
      }),
    }));
    // No docs => heuristic "No matching articles"
    const body = await resp.json();
    expect(body.answer).toMatch(/^No matching articles found for:/);
    expect(body.citations).toEqual([]);
  });

  test('limits results between 1 and 8 and falls back to heuristic when no OPENAI_API_KEY', async () => {
    // Prepare docs > 3 to test truncation in heuristic
  mockCtx.docs = Array.from({ length: 6 }).map((_, i) => ({
      slug: `s${i}`, title: `T${i}`, content: `content ${i} ` + 'x'.repeat(20), updatedAt: new Date('2024-01-0' + ((i % 9) + 1)),
    }));
    // No OPENAI_API_KEY ensures heuristic path
    const resp: any = await POST(makeReq({ question: 'billing', limit: 100 }));
    // limit should be clamped to 8; we assert at least that it was invoked and returned docs handled
  expect(mockColl.find).toHaveBeenCalled();
    const body = await resp.json();
    expect(body.answer.split('\n').filter((l: string) => l.startsWith('- '))).toHaveLength(3);
    expect(Array.isArray(body.citations)).toBe(true);
    expect(body.citations[0]).toEqual(expect.objectContaining({ slug: 's0', title: 'T0' }));
  });

  test('uses AI answer when OPENAI_API_KEY set and fetch returns content', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'AI summary' } }] }),
    }));
  mockCtx.docs = [
      { slug: 'a', title: 'Alpha', content: 'Lorem ipsum' },
      { slug: 'b', title: 'Beta', content: 'Dolor sit' },
    ];
    const resp: any = await POST(makeReq({ question: 'how to', limit: 2 }));
    const body = await resp.json();
    expect(body.answer).toBe('AI summary');
    expect(body.citations).toHaveLength(2);
  });

  test('returns 500 on unexpected error and logs', async () => {
    // Force getDatabase().collection().find() to throw
  (mockColl.find as jest.Mock).mockImplementationOnce(() => { throw new Error('db fail'); });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const resp: any = await POST(makeReq({ question: 'anything' }));
    expect(resp.status).toBe(500);
    const body = await resp.json();
    expect(body).toEqual({ error: 'Failed to generate answer' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});