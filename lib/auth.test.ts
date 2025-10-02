/**
 * Note: Testing framework used: This test file is designed for Jest-style APIs
 * (describe/it/expect/jest.mock). If this repository uses Vitest, replace jest.*
 * with vi.* and ensure mocks align with Vitest's API. The structure and assertions
 * remain compatible with typical Jest/Vitest setups.
 */

import type { AuthToken } from './auth';

// Defer module import to control env and mocks per test
const loadAuthModule = async () => {
  // Clear module cache to re-evaluate JWT secret resolution each time
  jest.resetModules();
  return await import('./auth');
};

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async (pwd: string, _rounds: number) => `hashed:${pwd}`),
    compare: jest.fn(async (pwd: string, hashed: string) => hashed === `hashed:${pwd}`),
  },
  hash: jest.fn(async (pwd: string, _rounds: number) => `hashed:${pwd}`),
  compare: jest.fn(async (pwd: string, hashed: string) => hashed === `hashed:${pwd}`),
}));

// Capture jsonwebtoken sign/verify; allow verifying signature-less for unit focus
const signSpy = jest.fn((payload: object, _secret: string, _opts?: any) => {
  // Encode minimal token representation
  return `token:${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
});
const verifySpy = jest.fn((token: string, _secret: string) => {
  if (!token.startsWith('token:')) {
    throw new Error('invalid token format');
  }
  const b64 = token.slice('token:'.length);
  const json = Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json);
});
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: (...args: any[]) => signSpy.apply(null, args),
    verify: (...args: any[]) => verifySpy.apply(null, args),
  },
  sign: (...args: any[]) => signSpy.apply(null, args),
  verify: (...args: any[]) => verifySpy.apply(null, args),
}));

// Mock mongo layer to control isMockDB and db connection behavior
// We expose a mutable stub to vary isMockDB between tests if needed.
let mockIsMockDB = true;
const dbConnectSpy = jest.fn(async () => Promise.resolve());
jest.mock('@/lib/mongo', () => ({
  __esModule: true,
  get isMockDB() {
    return mockIsMockDB;
  },
  db: dbConnectSpy(),
}));

// Helper to replace console.warn so we can assert ephemeral secret warnings
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('auth lib - crypto and password helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hashPassword hashes with bcrypt and verifyPassword validates correctly (happy path)', async () => {
    const auth = await loadAuthModule();
    const password = 'P@ssw0rd!';
    const hashed = await auth.hashPassword(password);
    expect(hashed).toBe(`hashed:${password}`);

    await expect(auth.verifyPassword(password, hashed)).resolves.toBe(true);
    await expect(auth.verifyPassword('wrong', hashed)).resolves.toBe(false);
  });
});

describe('auth lib - JWT generation and verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    mockIsMockDB = true; // keep mock DB for model stubbing in module
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('generateToken uses jsonwebtoken.sign and verifyToken returns payload on valid token', async () => {
    const auth = await loadAuthModule();

    const payload: AuthToken = {
      id: '1',
      email: 'test@test.com',
      role: 'user',
      orgId: 'org1',
      tenantId: 't',
    };    const token = auth.generateToken(payload);
    expect(typeof token).toBe('string');
    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(signSpy.mock.calls[0][0]).toEqual(payload);

    const verified = auth.verifyToken(token);
    expect(verified).toEqual(payload);
    expect(verifySpy).toHaveBeenCalledTimes(1);
  });

  it('verifyToken returns null when jsonwebtoken throws', async () => {
    const original = verifySpy.mockImplementation(() => {
      throw new Error('bad token');
    });

    const auth = await loadAuthModule();
    const result = auth.verifyToken('token:invalid');
    expect(result).toBeNull();

    // restore
    verifySpy.mockImplementation(original as any);
  });

  it('uses ephemeral secret when JWT_SECRET is unset (non-production) and warns once on module init', async () => {
    delete process.env.JWT_SECRET;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    const beforeWarns = consoleWarnSpy.mock.calls.length;
    await loadAuthModule();
    const afterWarns = consoleWarnSpy.mock.calls.length;

    expect(afterWarns).toBe(beforeWarns + 1);
    const msg = consoleWarnSpy.mock.calls.at(-1)?.[0] as string;
    expect(String(msg)).toMatch(/JWT_SECRET is not set\. Using an ephemeral secret/);
  });

  it('throws on module init if in production without JWT_SECRET', async () => {
    delete process.env.JWT_SECRET;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    await expect(loadAuthModule()).rejects.toThrow(
      'JWT_SECRET environment variable must be configured in production environments.'
    );
  });

  it('uses provided JWT_SECRET when set', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    process.env.JWT_SECRET = 'fixed-secret';
    await loadAuthModule();

    // Call generateToken to ensure sign receives the fixed secret
    const auth = await import('./auth');
    const payload: AuthToken = {
      id: 'id-1',
      email: 'e@x.com',
      role: 'USER',
      tenantId: 't',
      orgId: "org-1",
    };
    auth.generateToken(payload);
    expect(signSpy).toHaveBeenCalledWith(payload, 'fixed-secret', expect.any(Object));
  });
});

describe('auth lib - authenticateUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure stable env and mock DB to use inline mock User model path
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    delete process.env.JWT_SECRET;
    mockIsMockDB = true;
  });

  const makeUser = (overrides: Partial<any> = {}) => ({
    _id: '1',
    code: 'USR-001',
    username: 'superadmin',
    email: 'superadmin@fixzit.co',
    password: 'hashed:Admin@123', // matches bcrypt mock behavior
    personal: { firstName: 'System', lastName: 'Administrator' },
    professional: { role: 'SUPER_ADMIN' },
    status: 'ACTIVE',
    tenantId: 'demo-tenant',
    ...overrides,
  });

  it('authenticates with personal login (email) and returns token and user profile', async () => {
    const auth = await loadAuthModule();
    const result = await auth.authenticateUser('superadmin@fixzit.co', 'Admin@123', 'personal');

    expect(result).toHaveProperty('token');
    expect(result.user).toEqual({
      id: expect.any(String),
      email: 'superadmin@fixzit.co',
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
      tenantId: 'demo-tenant',
    });
  });

  it('authenticates with corporate login (username) path', async () => {
    const auth = await loadAuthModule();
    const res = await auth.authenticateUser('superadmin', 'Admin@123', 'corporate');
    expect((res.user as any).username).toBeUndefined(); // public shape excludes username
    expect(res.user.email).toBe('superadmin@fixzit.co');
  });

  it('fails when user not found', async () => {
    const auth = await loadAuthModule();
    await expect(auth.authenticateUser('unknown@x.com', 'any', 'personal')).rejects.toThrow(
      'Invalid credentials'
    );
  });

  it('fails when password invalid', async () => {
    const auth = await loadAuthModule();
    await expect(auth.authenticateUser('superadmin@fixzit.co', 'wrong', 'personal')).rejects.toThrow(
      'Invalid credentials'
    );
  });

  it('fails when account is not active', async () => {
    mockIsMockDB = false;
    jest.doMock('@/modules/users/schema', () => {
      const inactive = Object.assign(makeUser({ status: 'SUSPENDED', email: 'inactive@x.com' }));
      return {
        __esModule: true,
        User: {
          findOne: jest.fn(async (q: any) => {
            if (q.email === 'inactive@x.com') return inactive;
            if (q.username === 'inactive') return inactive;
            return null;
          }),
          findById: jest.fn(),
        },
      };
    });

    const bcrypt = await import('bcryptjs');
    (bcrypt as any).compare.mockResolvedValue(true);

    const auth = await loadAuthModule();
    await expect(auth.authenticateUser('inactive@x.com', 'irrelevant', 'personal')).rejects.toThrow(
      'Account is not active'
    );
  });
});

describe('auth lib - getUserFromToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    delete process.env.JWT_SECRET;
  });

  it('returns null when token is invalid or verification fails', async () => {
    const auth = await loadAuthModule();

    // Make verify throw
    verifySpy.mockImplementationOnce(() => {
      throw new Error('bad token');
    });

    const res = await auth.getUserFromToken('not-a-valid-token');
    expect(res).toBeNull();
  });

  it('returns null when user not found', async () => {
    (global as any).mockIsMockDB = false;
    mockIsMockDB = false;

    jest.doMock('@/modules/users/schema', () => {
      return {
        __esModule: true,
        User: {
          findById: jest.fn(async () => null),
        },
      };
    });

    const auth = await loadAuthModule();

    const payload: AuthToken = {
      id: 'missing-id',
      email: 'none@x.com',
      role: 'USER',
      orgId: 'org1',
      tenantId: 't',
    };
    const token = auth.generateToken(payload);
    const res = await auth.getUserFromToken(token);
    expect(res).toBeNull();
  });

  it('returns null when user is not ACTIVE', async () => {
    mockIsMockDB = false;

    jest.doMock('@/modules/users/schema', () => {
      return {
        __esModule: true,
        User: {
          findById: jest.fn(async () => ({
            _id: '1',
            email: 'blocked@x.com',
            personal: { firstName: 'Blocked', lastName: 'User' },
            professional: { role: 'USER' },
            status: 'SUSPENDED',
            tenantId: 't',
          })),
        },
      };
    });

    const auth = await loadAuthModule();
    const token = auth.generateToken({
      id: '1',
      email: 'blocked@x.com',
      role: 'USER',
      orgId: 'org1',
      tenantId: 't',
    });
    const res = await auth.getUserFromToken(token);
    expect(res).toBeNull();
  });

  it('returns trimmed public user object for ACTIVE users', async () => {
    mockIsMockDB = false;

    jest.doMock('@/modules/users/schema', () => {
      return {
        __esModule: true,
        User: {
          findById: jest.fn(async () => ({
            _id: '42',
            email: 'ok@x.com',
            personal: { firstName: 'Ok', lastName: 'User' },
            professional: { role: 'ADMIN' },
            status: 'ACTIVE',
            tenantId: 'tenant-42',
          })),
        },
      };
    });

    const auth = await loadAuthModule();
    const token = auth.generateToken({
      id: '42',
      email: 'ok@x.com',
      role: 'ADMIN',
      tenantId: 'tenant-42',
      orgId: 'org42',
    });
    const res = await auth.getUserFromToken(token);
    expect(res).toEqual({
      id: '42',
      email: 'ok@x.com',
      name: 'Ok User',
      role: 'ADMIN',
      tenantId: 'tenant-42',
    });
  });
});
