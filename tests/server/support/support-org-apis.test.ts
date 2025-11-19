import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/support/impersonation/route';
import { GET as searchGET } from '@/app/api/support/organizations/search/route';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn(),
}));

let findOneMock: vi.Mock;
let findMock: vi.Mock;

vi.mock('@/server/models/Organization', () => ({
  Organization: {
    findOne: (...args: unknown[]) => findOneMock(...args),
    find: (...args: unknown[]) => findMock(...args),
  },
}));

const authMock = auth as unknown as vi.Mock;
const connectMock = connectToDatabase as unknown as vi.Mock;

type CookieValue = { name: string; value: string };

function createCookieStore(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get: (name: string): CookieValue | undefined => {
      const value = store.get(name);
      return value ? { name, value } : undefined;
    },
  };
}

function createRequest(overrides: Partial<Request> & { cookies?: any } = {}) {
  return {
    cookies: overrides.cookies ?? createCookieStore(),
    json: overrides.json ?? (async () => ({})),
    url: overrides.url ?? 'https://fixzit.test/api',
  } as any;
}

function mockQueryResult<T>(value: T) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
  return chain;
}

describe('Support org impersonation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOneMock = vi.fn();
    findMock = vi.fn();
  });

  it('rejects non super admins in GET', async () => {
    authMock.mockResolvedValue({ user: { isSuperAdmin: false } });
    const res = await GET(createRequest());
    expect(res.status).toBe(403);
  });

  it('returns impersonated organization when cookie exists', async () => {
    authMock.mockResolvedValue({ user: { isSuperAdmin: true } });
    findOneMock.mockReturnValue(mockQueryResult({ orgId: 'org_cookie', name: 'Cookie Org' }));

    const res = await GET(
      createRequest({
        cookies: createCookieStore({ support_org_id: 'org_cookie' }),
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      organization: {
        orgId: 'org_cookie',
        name: 'Cookie Org',
        code: null,
        registrationNumber: null,
        subscriptionPlan: null,
      },
    });
  });

  it('sets impersonation cookie on POST', async () => {
    authMock.mockResolvedValue({ user: { isSuperAdmin: true } });
    findOneMock.mockReturnValue(
      mockQueryResult({
        orgId: 'org_post',
        name: 'Post Org',
        code: 'POST',
        legal: { registrationNumber: '123' },
        subscription: { plan: 'enterprise' },
      })
    );

    const res = await POST(
      createRequest({
        json: async () => ({ orgId: 'org_post' }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organization).toMatchObject({ orgId: 'org_post', name: 'Post Org' });
    expect(res.cookies.get('support_org_id')?.value).toBe('org_post');
  });

  it('clears impersonation cookie via DELETE', async () => {
    authMock.mockResolvedValue({ user: { isSuperAdmin: true } });
    const res = await DELETE(createRequest());
    expect(res.status).toBe(200);
    expect(res.cookies.get('support_org_id')?.value).toBe('');
  });
});

describe('Support org search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOneMock = vi.fn();
    findMock = vi.fn();
  });

  it('rejects non super admins', async () => {
    authMock.mockResolvedValue(null);
    const res = await searchGET(createRequest({ url: 'https://fixzit.test/api?q=1' }));
    expect(res.status).toBe(403);
  });

  it('returns matched organizations', async () => {
    authMock.mockResolvedValue({ user: { isSuperAdmin: true } });
    connectMock.mockResolvedValue(undefined);
    findMock.mockReturnValue(
      mockQueryResult([
        {
          orgId: 'org_select',
          name: 'Select Org',
          code: 'SEL',
          legal: { registrationNumber: 'REG' },
          subscription: { plan: 'enterprise' },
        },
      ])
    );

    const res = await searchGET(
      createRequest({
        url: 'https://fixzit.test/api/support/organizations/search?identifier=select',
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      results: [
        {
          orgId: 'org_select',
          name: 'Select Org',
          code: 'SEL',
          registrationNumber: 'REG',
          subscriptionPlan: 'enterprise',
        },
      ],
    });
  });
});
