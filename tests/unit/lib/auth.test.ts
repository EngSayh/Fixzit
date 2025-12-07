import { logger } from "@/lib/logger";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AuthToken } from "@/lib/auth";

// Store original env
const originalEnv = { ...process.env };

// Defer module import to control env and mocks per test
const loadAuthModule = async () => {
  // Clear module cache to re-evaluate JWT secret resolution each time
  vi.resetModules();
  return await import("@/lib/auth");
};

// FIX: Move all function implementations INSIDE the factory to avoid top-level variable references
vi.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: vi.fn(async (pwd: string, _rounds: number) => `hashed:${pwd}`),
    compare: vi.fn(
      async (pwd: string, hashed: string) => hashed === `hashed:${pwd}`,
    ),
  },
  hash: vi.fn(async (pwd: string, _rounds: number) => `hashed:${pwd}`),
  compare: vi.fn(
    async (pwd: string, hashed: string) => hashed === `hashed:${pwd}`,
  ),
}));

// FIX: Create factory function inside the mock to avoid hoisting issues
const mockSign = vi.fn((payload: object, _secret: string, _opts?: unknown) => {
  return `token:${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
});
const mockVerify = vi.fn((token: string, _secret: string) => {
  if (!token.startsWith("token:")) {
    throw new Error("invalid token format");
  }
  const b64 = token.slice("token:".length);
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
});

vi.mock("jsonwebtoken", () => {
  return {
    __esModule: true,
    default: {
      sign: mockSign,
      verify: mockVerify,
    },
    sign: mockSign,
    verify: mockVerify,
  };
});

// Export spies for test assertions
const signSpy = mockSign;
const verifySpy = mockVerify;

// Mock database flag
let mockIsMockDB = true;

// FIX: Move dbConnectSpy declaration OUTSIDE mock factory
vi.mock("@/lib/mongo", () => ({
  __esModule: true,
  connectDb: vi.fn(async () => Promise.resolve()),
  get isMockDB() {
    return mockIsMockDB;
  },
  db: Promise.resolve(),
}));

// Mock secrets service for JWT_SECRET management
const mockGetJWTSecret = vi.fn();
const mockGetSecret = vi.fn();
vi.mock("@/lib/secrets", () => ({
  __esModule: true,
  getJWTSecret: mockGetJWTSecret,
  getSecret: mockGetSecret,
  getDatabaseURL: vi.fn(async () => "mongodb://mock"),
  getSendGridAPIKey: vi.fn(async () => null),
  clearSecretCache: vi.fn(),
}));

// Mock User model
const mockFindOne = vi.fn();
const mockFindById = vi.fn();
vi.mock("@/server/models/User", () => ({
  __esModule: true,
  User: {
    findOne: mockFindOne,
    findById: mockFindById,
  },
  UserRole: {},
}));

// Capture console.warn for JWT_SECRET fallback tests
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  // Restore env to original state
  process.env = { ...originalEnv };
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  process.env = { ...originalEnv };
});

describe("auth lib - crypto and password helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hashPassword hashes with bcrypt and verifyPassword validates correctly (happy path)", async () => {
    const auth = await loadAuthModule();
    const password = "P@ssw0rd!";
    const hashed = await auth.hashPassword(password);
    expect(hashed).toBe(`hashed:${password}`);

    await expect(auth.verifyPassword(password, hashed)).resolves.toBe(true);
    await expect(auth.verifyPassword("wrong", hashed)).resolves.toBe(false);
  });
});

describe("auth lib - JWT generation and verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JWT_SECRET;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      writable: true,
      configurable: true,
    });
    mockIsMockDB = true; // keep mock DB for model stubbing in module
    // Default: return a mock secret
    mockGetJWTSecret.mockResolvedValue("test-secret-key");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("generateToken uses jsonwebtoken.sign and verifyToken returns payload on valid token", async () => {
    const auth = await loadAuthModule();

    const payload: AuthToken = {
      id: "1",
      email: "test@test.com",
      role: "user",
      orgId: "org1",
      tenantId: "t",
    };
    const token = await auth.generateToken(payload);
    expect(typeof token).toBe("string");
    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(signSpy.mock.calls[0][0]).toEqual(payload);

    const verified = await auth.verifyToken(token);
    expect(verified).toEqual(payload);
    expect(verifySpy).toHaveBeenCalledTimes(1);
  });

  it("verifyToken returns null when jsonwebtoken throws", async () => {
    // Use mockImplementationOnce so we don't need to restore the implementation
    verifySpy.mockImplementationOnce(() => {
      throw new Error("bad token");
    });

    const auth = await loadAuthModule();
    const result = await auth.verifyToken("token:invalid");
    expect(result).toBeNull();
  });

  it("uses ephemeral secret when JWT_SECRET is unset (non-production) and warns once on module init", async () => {
    delete process.env.JWT_SECRET;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });

    // Mock getJWTSecret to return ephemeral secret and log warning
    const ephemeralSecret =
      "ephemeral-dev-secret-12345678901234567890123456789012";
    mockGetJWTSecret.mockImplementation(async () => {
      logger.warn(
        "[Secrets] No JWT_SECRET configured. Using ephemeral secret for development.",
      );
      return ephemeralSecret;
    });

    const beforeWarns = consoleWarnSpy.mock.calls.length;
    const auth = await loadAuthModule();

    // Call a function that uses the secret to trigger the warning
    await auth.generateToken({
      id: "1",
      email: "test@test.com",
      role: "user",
      orgId: "org1",
      tenantId: "t",
    });

    const afterWarns = consoleWarnSpy.mock.calls.length;
    expect(afterWarns).toBe(beforeWarns + 1);
    const msg = consoleWarnSpy.mock.calls.at(-1)?.[0] as string;
    expect(String(msg)).toMatch(
      /No JWT_SECRET configured\. Using ephemeral secret/,
    );
  });

  it("throws on module init if in production without JWT_SECRET", async () => {
    delete process.env.JWT_SECRET;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });

    // Mock getJWTSecret to throw production error
    mockGetJWTSecret.mockRejectedValue(
      new Error(
        "JWT_SECRET is required in production. Configure it in AWS Secrets Manager (using secret name 'prod/fixzit/jwt-secret') or as environment variable 'JWT_SECRET'.",
      ),
    );

    const auth = await loadAuthModule();

    // The error happens when trying to generate a token, not at module load
    await expect(
      auth.generateToken({
        id: "1",
        email: "test@test.com",
        role: "user",
        orgId: "org1",
        tenantId: "t",
      }),
    ).rejects.toThrow(/JWT_SECRET.*required.*production/);
  });

  it("uses provided JWT_SECRET when set", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      writable: true,
      configurable: true,
    });
    process.env.JWT_SECRET = "fixed-secret";

    // Mock getJWTSecret to return the fixed secret
    mockGetJWTSecret.mockResolvedValue("fixed-secret");

    await loadAuthModule();

    // Call generateToken to ensure sign receives the fixed secret
    const auth = await import("@/lib/auth");
    const payload: AuthToken = {
      id: "id-1",
      email: "e@x.com",
      role: "USER",
      tenantId: "t",
      orgId: "t",
    };
    await auth.generateToken(payload);
    expect(signSpy).toHaveBeenCalledWith(
      payload,
      "fixed-secret",
      expect.any(Object),
    );
  });
});

describe("auth lib - authenticateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure stable env and mock DB to use inline mock User model path
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      writable: true,
      configurable: true,
    });
    delete process.env.JWT_SECRET;
    mockIsMockDB = true;
    mockGetJWTSecret.mockResolvedValue("test-secret-key");
  });

  type MockUser = {
    _id: { toString: () => string };
    code: string;
    username: string;
    email: string;
    password: string;
    personal: { firstName: string; lastName: string };
    professional: { role: string };
    status: string;
    tenantId: string;
    orgId: { toString: () => string };
    [key: string]: unknown;
  };

  const makeUser = (overrides: Partial<MockUser> = {}): MockUser => ({
    _id: { toString: () => "1" }, // Mock MongoDB ObjectId
    code: "USR-001",
    username: "superadmin",
    email: "superadmin@fixzit.co",
    password: "hashed:admin123", // matches bcrypt mock behavior
    personal: { firstName: "System", lastName: "Administrator" },
    professional: { role: "SUPER_ADMIN" },
    status: "ACTIVE",
    tenantId: "demo-tenant",
    orgId: { toString: () => "org1" }, // Mock MongoDB ObjectId
    ...overrides,
  });

  it("authenticates with personal login (email) and returns token and user profile", async () => {
    const user = makeUser();
    mockFindOne.mockResolvedValue(user);

    const auth = await loadAuthModule();
    const result = await auth.authenticateUser(
      "superadmin@fixzit.co",
      "admin123",
      "personal",
      "org1", // orgId required for personal login
    );

    expect(mockFindOne).toHaveBeenCalledWith({ email: "superadmin@fixzit.co", orgId: "org1" });
    expect(result).toHaveProperty("token");
    expect(result.user).toEqual({
      id: expect.any(String),
      email: "superadmin@fixzit.co",
      name: "System Administrator",
      role: "SUPER_ADMIN",
      orgId: expect.any(String),
    });
  });

  it("authenticates with corporate login (username) path", async () => {
    const user = makeUser();
    mockFindOne.mockResolvedValue(user);

    const auth = await loadAuthModule();
    const res = await auth.authenticateUser(
      "superadmin",
      "admin123",
      "corporate",
      undefined,
      "ACME-001", // companyCode required for corporate login
    );

    expect(mockFindOne).toHaveBeenCalledWith({ username: "superadmin", code: "ACME-001" });
    expect(res.user.email).toBe("superadmin@fixzit.co");
  });

  it("fails when user not found", async () => {
    mockFindOne.mockResolvedValue(null);

    const auth = await loadAuthModule();
    await expect(
      auth.authenticateUser("unknown@x.com", "any", "personal", "org1"),
    ).rejects.toThrow("Invalid credentials");
  });

  it("fails when password invalid", async () => {
    const user = makeUser();
    mockFindOne.mockResolvedValue(user);

    const auth = await loadAuthModule();
    await expect(
      auth.authenticateUser("superadmin@fixzit.co", "wrong", "personal", "org1"),
    ).rejects.toThrow("Invalid credentials");
  });

  it("fails when account is not active", async () => {
    const inactiveUser = makeUser({
      status: "SUSPENDED",
      email: "inactive@x.com",
    });
    mockFindOne.mockResolvedValue(inactiveUser);

    const auth = await loadAuthModule();
    await expect(
      auth.authenticateUser("inactive@x.com", "admin123", "personal", "org1"),
    ).rejects.toThrow("Account is not active");
  });

  it("fails when orgId is missing for personal login", async () => {
    const auth = await loadAuthModule();
    await expect(
      auth.authenticateUser("user@example.com", "password", "personal"),
    ).rejects.toThrow("orgId required for personal login");
  });

  it("fails when companyCode is missing for corporate login", async () => {
    const auth = await loadAuthModule();
    await expect(
      auth.authenticateUser("EMP001", "password", "corporate"),
    ).rejects.toThrow("companyCode required for corporate login");
  });
});

describe("auth lib - getUserFromToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      writable: true,
      configurable: true,
    });
    delete process.env.JWT_SECRET;
    // CRITICAL: Re-set the mock after clearAllMocks
    mockGetJWTSecret.mockResolvedValue("test-secret-key");
  });

  it("returns null when token is invalid or verification fails", async () => {
    const auth = await loadAuthModule();

    // Make verify throw
    verifySpy.mockImplementationOnce(() => {
      throw new Error("bad token");
    });

    const res = await auth.getUserFromToken("not-a-valid-token");
    expect(res).toBeNull();
  });

  it("returns null when user not found", async () => {
    mockFindById.mockResolvedValue(null);

    const auth = await loadAuthModule();

    const payload: AuthToken = {
      id: "missing-id",
      email: "none@x.com",
      role: "USER",
      orgId: "org1",
      tenantId: "t",
    };
    const token = await auth.generateToken(payload);
    const res = await auth.getUserFromToken(token);
    expect(res).toBeNull();
  });

  it("returns null when user is not ACTIVE", async () => {
    const inactiveUser = {
      _id: { toString: () => "1" }, // Mock MongoDB ObjectId
      email: "blocked@x.com",
      personal: { firstName: "Blocked", lastName: "User" },
      professional: { role: "USER" },
      status: "SUSPENDED",
      tenantId: "t",
      orgId: { toString: () => "org1" }, // Mock MongoDB ObjectId
    };
    mockFindById.mockResolvedValue(inactiveUser);

    const auth = await loadAuthModule();
    const token = await auth.generateToken({
      id: "1",
      email: "blocked@x.com",
      role: "USER",
      orgId: "org1",
      tenantId: "t",
    });
    const res = await auth.getUserFromToken(token);
    expect(res).toBeNull();
  });

  it("returns trimmed public user object for ACTIVE users", async () => {
    const auth = await loadAuthModule();

    const activeUser = {
      _id: { toString: () => "42" }, // Mock MongoDB ObjectId
      email: "ok@x.com",
      personal: { firstName: "Ok", lastName: "User" },
      professional: { role: "ADMIN" },
      status: "ACTIVE",
      tenantId: "tenant-42",
      orgId: { toString: () => "org42" }, // Mock MongoDB ObjectId
    };
    mockFindById.mockResolvedValue(activeUser);

    const token = await auth.generateToken({
      id: "42",
      email: "ok@x.com",
      role: "ADMIN",
      tenantId: "tenant-42",
      orgId: "org42",
    });

    const res = await auth.getUserFromToken(token);
    expect(res).toEqual({
      id: "42",
      email: "ok@x.com",
      name: "Ok User",
      role: "ADMIN",
      orgId: "org42",
    });
  });
});
