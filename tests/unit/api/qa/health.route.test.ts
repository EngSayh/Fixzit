/**
 * Unit tests for api/qa/health route.
 *
 * Testing framework: Jest (ts-jest), Node test environment.
 * - We mock next/server's NextResponse.json to a simple object with { status, json() } to avoid Next runtime coupling.
 * - We mock "@/lib/mongo" per test using jest.doMock and reload the route to cover different branches.
 * - If your project uses Vitest, replace jest.* with vi.* and adjust doMock equivalents.
 */

type RouteModule = {
  GET: (req: any) => Promise<{ status: number; json: () => Promise<any> }>;
  POST: (req: any) => Promise<{ status: number; json: () => Promise<any> }>;
};

type MockOptions = {
  dbReject?: Error;
  queryFail?: boolean;
  collectionsCount?: number;
};

function mockNextServer() {
  // Minimal NextResponse.json shim returning a fetch-like Response facade

  return {
    __esModule: true,
    NextResponse: {
      json: (body: any, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
        json: async () => body
      })
    },
    // Type placeholder; not used by route logic in tests
    NextRequest: class NextRequest {}
  };
}

function makeMongoMock(opts: MockOptions) {
  const db =
    opts.dbReject
      ? new Promise((_, reject) => setTimeout(() => reject(opts.dbReject), 0))
      : Promise.resolve();

  const getDatabase = jest.fn(async () => ({
    listCollections: () => ({
      toArray: async () => {
        if (opts.queryFail) {
          throw new Error('query failed');
        }
        const n = opts.collectionsCount ?? 0;
        return Array.from({ length: n }, (_, i) => ({ name: `c${i}` }));
      }
    })
  }));

  return {
    __esModule: true,
    connectToDatabase: db,
    getDatabase
  };
}

async function loadRouteWithMocks(opts: MockOptions): Promise<RouteModule> {
  jest.resetModules();
  jest.doMock('next/server', () => mockNextServer(), { virtual: true });
  jest.doMock('@/lib/mongodb-unified', () => makeMongoMock(opts), { virtual: true });

  const candidates = [
    '../../../../src/app/api/qa/health/route',
    '../../../../app/api/qa/health/route',
    'src/app/api/qa/health/route',
    'app/api/qa/health/route',
    '@/app/api/qa/health/route',
    '@/app/api/qa/health/route'
  ];

  let lastErr: any;
  for (const p of candidates) {
    try {
      const mod = (await import(p)) as unknown as RouteModule;
      if (mod && typeof mod.GET === 'function' && typeof mod.POST === 'function') {
        return mod;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  // If none of the candidates work, rethrow last error to help diagnose path mapping.
  throw lastErr;
}

describe('api/qa/health route - GET', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
    delete (process as any).env.npm_package_version;
  });

    const version = '9.9.9-test';
    (process as any).env.npm_package_version = version;

    const memSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100 * 1024 * 1024,
      heapUsed: 50 * 1024 * 1024
      // other fields are not used by the code under test
    } as unknown as NodeJS.MemoryUsage);

    const res = await GET({} as any);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.status).toBe('healthy');
    expect(body.database).toBe('mock-connected');
    expect(body.mockDatabase).toBe(true);
    expect(body.version).toBe(version);
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
    expect(body.memory).toBe('RSS: 100MB, Heap: 50MB');

    memSpy.mockRestore();
  });

  it('returns healthy and includes collection count when real DB query succeeds', async () => {
    const res = await GET({} as any);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected (2 collections)');
    expect(body.mockDatabase).toBe(false);
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns healthy and marks query failure when listing collections throws', async () => {
    const res = await GET({} as any);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected (query failed)');
  });

  it('returns critical (503) when DB connection fails', async () => {
    const err = new Error('DB down');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET({} as any);

    expect(errorSpy).toHaveBeenCalled(); // ensure error path logged
    errorSpy.mockRestore();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('critical');
    expect(body.database).toBe('disconnected');
  });

  it('handles memory usage retrieval failures gracefully', async () => {
    const memSpy = jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
      throw new Error('memory unavailable');
    });

    const res = await GET({} as any);
    const body = await res.json();

    expect(body.memory).toBe('unknown');

    memSpy.mockRestore();
  });
});

describe('api/qa/health route - POST', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

    const res = await POST({} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Mock database refreshed');
    expect(typeof body.timestamp).toBe('string');
  });

    const res = await POST({} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Database reconnected');
  });

  it('returns failure (500) when real DB reconnection fails', async () => {
    const res = await POST({} as any);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to reconnect database');
    expect(String(body.details)).toContain('reconnect failed');
  });
});

