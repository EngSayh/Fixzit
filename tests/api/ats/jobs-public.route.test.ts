import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

process.env.SKIP_ENV_VALIDATION = 'true';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.PUBLIC_JOBS_ORG_ID = 'test-org-123';

type JsonBody = { error?: string; success?: boolean; data?: unknown[]; pagination?: object } | Record<string, string | number | boolean | null | object>;

// Mock headers class for NextResponse
class MockHeaders {
  private map = new Map<string, string>();
  set(key: string, value: string) { this.map.set(key, value); }
  get(key: string) { return this.map.get(key); }
}

type JsonResponse = { status: number; body: JsonBody; headers: MockHeaders };

vi.mock('next/server', () => {
  class MockHeadersInner {
    private map = new Map<string, string>();
    set(key: string, value: string) { this.map.set(key, value); }
    get(key: string) { return this.map.get(key); }
  }
  return {
    NextRequest: class {},
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => ({
        status: init?.status ?? 200,
        body,
        headers: new MockHeadersInner()
      })
    }
  };
});

vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/server/security/rateLimit', () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true }),
  smartRateLimit: vi.fn(async () => ({ allowed: true })),
  buildOrgAwareRateLimitKey: vi.fn(() => 'test-rate-limit-key')
}));

vi.mock('@/server/utils/errorResponses', () => ({
  rateLimitError: vi.fn().mockReturnValue({ status: 429, body: { error: 'Rate limit exceeded' } })
}));

vi.mock('@/server/security/headers', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}));

// Mock cache to bypass cache for testing query logic
vi.mock('@/lib/cache', () => ({
  getCached: vi.fn().mockImplementation(async (_key: string, _ttl: number, fn: () => Promise<unknown>) => {
    return fn();
  }),
  CacheTTL: {
    FIFTEEN_MINUTES: 900
  }
}));

const mockJobs = [
  {
    _id: 'job-1',
    title: 'Senior Software Engineer',
    description: 'Build scalable systems',
    department: 'Engineering',
    location: { city: 'Dubai', country: 'UAE', mode: 'hybrid' },
    jobType: 'full-time',
    skills: ['TypeScript', 'Node.js', 'MongoDB'],
    tags: ['senior', 'backend'],
    slug: 'senior-software-engineer',
    createdAt: new Date(),
  },
  {
    _id: 'job-2',
    title: 'Product Manager',
    description: 'Lead product strategy',
    department: 'Product',
    location: { city: 'Muscat', country: 'Oman', mode: 'onsite' },
    jobType: 'full-time',
    skills: ['Product Strategy', 'Agile'],
    tags: ['product', 'leadership'],
    slug: 'product-manager',
    createdAt: new Date(),
  }
];

const queryChain = (jobs = mockJobs) => ({
  select: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(jobs)
});

const JobMock = {
  find: vi.fn().mockReturnValue(queryChain()),
  countDocuments: vi.fn().mockResolvedValue(2),
};

vi.mock('@/server/models/Job', () => ({
  Job: JobMock
}));

let GET: (req: NextRequest) => Promise<JsonResponse>;

describe('API /api/ats/jobs/public - Edge Cases & Input Validation', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/app/api/ats/jobs/public/route'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    JobMock.find.mockReturnValue(queryChain());
    JobMock.countDocuments.mockResolvedValue(2);
  });

  const callGET = async (query: string = '') => {
    const req = { url: `https://example.com/api/ats/jobs/public${query}` } as NextRequest;
    return GET(req);
  };

  describe('Search Input Handling', () => {
    it('handles empty search gracefully', async () => {
      const res = await callGET('');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(JobMock.find).toHaveBeenCalledTimes(1);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.$or).toBeUndefined(); // No $or clause when no search
    });

    it('handles 256+ character search string (truncated for query, not rejected)', async () => {
      const longSearch = 'a'.repeat(300); // 300 chars
      const res = await callGET(`?search=${encodeURIComponent(longSearch)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify the search was clamped to 256 chars for the query
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
      const regex = filter.$or[0].title;
      // The regex pattern should be at most 256 chars (clamped)
      expect(regex.source.length).toBeLessThanOrEqual(256);
    });

    it('escapes special regex characters in search to prevent injection', async () => {
      const maliciousSearch = 'test.*+?^${}()|[]\\injection';
      const res = await callGET(`?search=${encodeURIComponent(maliciousSearch)}`);

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
      
      // Verify regex is escaped (should not throw when constructed)
      const regex = filter.$or[0].title;
      expect(regex instanceof RegExp).toBe(true);
      // The pattern should have escaped special chars
      expect(regex.source).toContain('\\.');
      expect(regex.source).toContain('\\*');
      expect(regex.source).toContain('\\+');
    });

    it('handles unicode and RTL characters in search', async () => {
      const arabicSearch = 'مهندس برمجيات';
      const res = await callGET(`?search=${encodeURIComponent(arabicSearch)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
      const regex = filter.$or[0].title;
      expect(regex.source).toContain(arabicSearch);
    });

    it('trims whitespace from search input', async () => {
      const paddedSearch = '   software engineer   ';
      const res = await callGET(`?search=${encodeURIComponent(paddedSearch)}`);

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
      const regex = filter.$or[0].title;
      expect(regex.source).toBe('software engineer');
    });
  });

  describe('Department Filter Edge Cases', () => {
    it('handles case-insensitive department matching', async () => {
      const res = await callGET('?department=ENGINEERING');

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.department).toBeDefined();
      // Now uses $regex object format for better index compatibility
      expect(filter.department.$regex).toBe('^ENGINEERING$');
      expect(filter.department.$options).toBe('i'); // Case-insensitive flag
    });

    it('handles department with special characters', async () => {
      const specialDept = 'R&D (Research & Development)';
      const res = await callGET(`?department=${encodeURIComponent(specialDept)}`);

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.department).toBeDefined();
      // Should be escaped to prevent regex injection
      // escapeRegex escapes: [.*+?^${}()|[\]\\]
      // Parentheses ( and ) should be escaped as \( and \)
      // Note: & is NOT a regex special char, so it won't be escaped
      expect(filter.department.$regex).toContain('\\(Research');
      expect(filter.department.$regex).toContain('Development\\)');
    });

    it('handles long department name (256+ chars)', async () => {
      const longDept = 'Dept'.repeat(100); // 400 chars
      const res = await callGET(`?department=${encodeURIComponent(longDept)}`);

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.department).toBeDefined();
      // Should be clamped to 256 chars
      expect(filter.department.$regex.length).toBeLessThanOrEqual(260); // +2 for ^$
    });
  });

  describe('Job Type Filter Edge Cases', () => {
    it('handles standard job types', async () => {
      const res = await callGET('?jobType=full-time');

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.jobType).toBeDefined();
      expect(filter.jobType.$regex).toBe('^full-time$');
    });

    it('handles job type with mixed case', async () => {
      const res = await callGET('?jobType=Full-Time');

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.jobType).toBeDefined();
      expect(filter.jobType.$options).toBe('i');
    });
  });

  describe('Location Filter Edge Cases', () => {
    it('handles location search across city, country, and mode', async () => {
      const res = await callGET('?location=Dubai');

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.$and).toBeDefined();
      expect(filter.$and[0].$or).toHaveLength(3); // city, country, mode
    });

    it('handles location with unicode characters', async () => {
      const arabicLocation = 'دبي';
      const res = await callGET(`?location=${encodeURIComponent(arabicLocation)}`);

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.$and).toBeDefined();
      const locationOr = filter.$and[0].$or;
      expect(locationOr[0]['location.city'].source).toContain(arabicLocation);
    });
  });

  describe('Pagination Edge Cases', () => {
    it('rejects invalid page parameter (non-numeric)', async () => {
      const res = await callGET('?page=abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed');
    });

    it('rejects zero page parameter', async () => {
      const res = await callGET('?page=0');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed');
    });

    it('rejects negative page parameter', async () => {
      const res = await callGET('?page=-1');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed');
    });

    it('rejects invalid limit parameter', async () => {
      const res = await callGET('?limit=notanumber');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed');
    });

    it('caps limit to maximum of 50', async () => {
      const res = await callGET('?limit=100');

      expect(res.status).toBe(200);
      // The limit should be capped at 50
      const limitCall = JobMock.find().limit;
      expect(limitCall).toHaveBeenCalled();
    });

    it('uses default pagination when not specified', async () => {
      const res = await callGET('');

      expect(res.status).toBe(200);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      });
    });

    it('handles large page numbers gracefully', async () => {
      const res = await callGET('?page=9999');

      expect(res.status).toBe(200);
      // Should return empty data with correct pagination info
    });
  });

  describe('Combined Filters', () => {
    it('handles all filters combined', async () => {
      const res = await callGET('?search=engineer&department=Engineering&location=Dubai&jobType=full-time&page=1&limit=10');

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      
      // All filters should be present
      expect(filter.$or).toBeDefined(); // search
      expect(filter.department).toBeDefined();
      expect(filter.jobType).toBeDefined();
      expect(filter.$and).toBeDefined(); // location
      expect(filter.orgId).toBe('test-org-123');
      expect(filter.status).toBe('published');
      expect(filter.visibility).toBe('public');
    });

    it('handles filters with empty values gracefully', async () => {
      const res = await callGET('?search=&department=&location=&jobType=');

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      
      // Empty filters should not be added to query
      expect(filter.$or).toBeUndefined();
      expect(filter.department).toBeUndefined();
      expect(filter.jobType).toBeUndefined();
      expect(filter.$and).toBeUndefined();
    });
  });

  describe('Security', () => {
    it('always scopes to configured org (no arbitrary orgId)', async () => {
      const res = await callGET('?orgId=malicious-org-id');

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      // Should use env var, not query param
      expect(filter.orgId).toBe('test-org-123');
    });

    it('always requires published status and public visibility', async () => {
      const res = await callGET('');

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      expect(filter.status).toBe('published');
      expect(filter.visibility).toBe('public');
    });

    it('handles SQL injection attempts in search (treated as literal text)', async () => {
      const sqlInjection = "'; DROP TABLE jobs; --";
      const res = await callGET(`?search=${encodeURIComponent(sqlInjection)}`);

      expect(res.status).toBe(200);
      // SQL is meaningless in MongoDB, but verify it doesn't cause issues
      expect(res.body.success).toBe(true);
    });

    it('handles NoSQL injection attempts in search', async () => {
      // Common MongoDB injection attempt
      const noSqlInjection = '{"$gt": ""}';
      const res = await callGET(`?search=${encodeURIComponent(noSqlInjection)}`);

      expect(res.status).toBe(200);
      const filter = JobMock.find.mock.calls[0][0];
      // Should be treated as literal string, not parsed as JSON
      expect(filter.$or[0].title.source).toContain('\\{');
    });
  });

  describe('Response Structure', () => {
    it('returns correct response structure on success', async () => {
      const res = await callGET('');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      });
    });

    it('returns 503 when org is not configured', async () => {
      // Save both env vars to restore after test (prevent cross-test leakage)
      const originalPublicJobsOrgId = process.env.PUBLIC_JOBS_ORG_ID;
      const originalPlatformOrgId = process.env.PLATFORM_ORG_ID;
      
      delete process.env.PUBLIC_JOBS_ORG_ID;
      delete process.env.PLATFORM_ORG_ID;

      // Re-import to get new module with updated env
      vi.resetModules();
      vi.doMock('@/lib/mongodb-unified', () => ({ connectToDatabase: vi.fn().mockResolvedValue(undefined) }));
      vi.doMock('@/server/security/rateLimit', () => ({
        rateLimit: vi.fn().mockReturnValue({ allowed: true }),
        smartRateLimit: vi.fn(async () => ({ allowed: true })),
        buildOrgAwareRateLimitKey: vi.fn(() => 'test-rate-limit-key')
      }));
      vi.doMock('@/server/utils/errorResponses', () => ({ rateLimitError: vi.fn() }));
      vi.doMock('@/server/security/headers', () => ({ getClientIP: vi.fn().mockReturnValue('127.0.0.1') }));
      vi.doMock('@/lib/cache', () => ({ getCached: vi.fn(), CacheTTL: { FIFTEEN_MINUTES: 900 } }));
      vi.doMock('@/server/models/Job', () => ({ Job: JobMock }));
      
      const { GET: GET2 } = await import('@/app/api/ats/jobs/public/route');
      const req = { url: 'https://example.com/api/ats/jobs/public' } as NextRequest;
      const res = await GET2(req);

      expect(res.status).toBe(503);
      expect(res.body.error).toContain('Service not configured');

      // Restore both env vars to prevent cross-test leakage
      if (originalPublicJobsOrgId !== undefined) {
        process.env.PUBLIC_JOBS_ORG_ID = originalPublicJobsOrgId;
      }
      if (originalPlatformOrgId !== undefined) {
        process.env.PLATFORM_ORG_ID = originalPlatformOrgId;
      }
    });
  });
});

describe('API /api/ats/jobs/public - Cache Key Normalization', () => {
  beforeAll(async () => {
    vi.resetModules();
    // Re-register mocks after module reset
    vi.doMock('@/server/security/rateLimit', () => ({
      rateLimit: vi.fn().mockReturnValue({ allowed: true }),
      smartRateLimit: vi.fn(async () => ({ allowed: true })),
      buildOrgAwareRateLimitKey: vi.fn(() => 'test-rate-limit-key')
    }));
    vi.doMock('@/lib/cache', () => ({
      getCached: vi.fn().mockImplementation(async (_key: string, _ttl: number, fn: () => Promise<unknown>) => {
        return fn();
      }),
      CacheTTL: {
        FIFTEEN_MINUTES: 900
      }
    }));
    ({ GET } = await import('@/app/api/ats/jobs/public/route'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    JobMock.find.mockReturnValue(queryChain());
    JobMock.countDocuments.mockResolvedValue(2);
  });

  const callGET = async (query: string = '') => {
    const req = { url: `https://example.com/api/ats/jobs/public${query}` } as NextRequest;
    return GET(req);
  };

  it('generates cache keys independent of search case', async () => {
    const { getCached } = await import('@/lib/cache');
    
    await callGET('?search=Engineer');
    const firstCacheKey = (getCached as ReturnType<typeof vi.fn>).mock.calls[0][0];
    
    vi.clearAllMocks();
    JobMock.find.mockReturnValue(queryChain());
    
    await callGET('?search=ENGINEER');
    const secondCacheKey = (getCached as ReturnType<typeof vi.fn>).mock.calls[0][0];
    
    // Cache keys should be identical (both lowercased)
    expect(firstCacheKey).toBe(secondCacheKey);
  });

  it('clamps cache key segments to 64 chars while preserving query fidelity', async () => {
    const { getCached } = await import('@/lib/cache');
    const longSearch = 'a'.repeat(100);
    
    await callGET(`?search=${encodeURIComponent(longSearch)}`);
    
    const cacheKey = (getCached as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const segments = cacheKey.split(':');
    
    // The search segment should be clamped to 64 chars
    const searchSegment = segments[2]; // public-jobs:orgId:search:...
    expect(searchSegment.length).toBeLessThanOrEqual(64);
    
    // Verify the cache key contains the clamped 64-char version
    expect(searchSegment).toBe('a'.repeat(64));
  });

  it('sets Cache-Control header for public jobs endpoint', async () => {
    const response = await callGET('?page=1&limit=10');
    
    // Verify cache header is set correctly
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=600');
  });
});

