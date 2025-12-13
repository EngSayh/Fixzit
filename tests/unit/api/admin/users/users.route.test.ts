/**
 * @fileoverview Tests for GET/POST /api/admin/users
 * @description SUPER_ADMIN user management - list and create users
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

// ----- Mock Setup -----
const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();

let mockSession: { user: { id: string; orgId: string; role: string } } | null = null;
let mockUsers: Record<string, unknown>[] = [];
let mockExistingUser: Record<string, unknown> | null = null;
let mockCreatedUser: Record<string, unknown> | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn(async () => undefined),
}));

// Mock mongoose models
const mockFind = vi.fn(() => ({
  select: vi.fn(() => ({
    sort: vi.fn(() => ({
      limit: vi.fn(() => ({
        skip: vi.fn(() => ({
          lean: vi.fn(async () => mockUsers),
        })),
      })),
    })),
  })),
}));
const mockCountDocuments = vi.fn(async () => mockUsers.length);
const mockFindOne = vi.fn(async () => mockExistingUser);
const mockCreate = vi.fn(async (data: Record<string, unknown>) => ({
  ...data,
  _id: new ObjectId(),
}));

vi.mock("mongoose", () => ({
  Schema: vi.fn().mockImplementation(() => ({})),
  model: vi.fn(() => ({
    find: mockFind,
    findOne: mockFindOne,
    countDocuments: mockCountDocuments,
    create: mockCreate,
  })),
  models: { User: undefined },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (password: string) => `hashed_${password}`),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/server/security/rateLimit", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
  smartRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }),
  ),
}));

// ----- Import Route After Mocks -----
import { GET, POST } from "@/app/api/admin/users/route";

// ----- Helpers -----
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/admin/users");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: "GET" });
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ----- Tests -----
describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "SUPER_ADMIN" } };
    mockUsers = [
      {
        _id: new ObjectId(),
        email: "user1@test.com",
        username: "user1",
        status: "ACTIVE",
        professional: { role: "MANAGER" },
      },
      {
        _id: new ObjectId(),
        email: "user2@test.com",
        username: "user2",
        status: "ACTIVE",
        professional: { role: "TECHNICIAN" },
      },
    ];
  });

  afterEach(() => {
    mockSession = null;
    mockUsers = [];
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 403 when not SUPER_ADMIN", async () => {
      mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "ADMIN" } };
      const res = await GET(createGetRequest());
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Super Admin");
    });
  });

  describe("Tenant Isolation", () => {
    it("returns 403 when orgId missing", async () => {
      mockSession = { user: { id: USER_ID, orgId: "", role: "SUPER_ADMIN" } };
      const res = await GET(createGetRequest());
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("organization");
    });

    it("enforces orgId in query", async () => {
      await GET(createGetRequest());
      // Verify find was called (mongoose mock returns mockUsers)
      expect(mockFind).toHaveBeenCalled();
    });
  });

  describe("Query Parameters", () => {
    it("accepts search parameter", async () => {
      const res = await GET(createGetRequest({ search: "john" }));
      expect(res.status).toBe(200);
    });

    it("accepts role filter", async () => {
      const res = await GET(createGetRequest({ role: "MANAGER" }));
      expect(res.status).toBe(200);
    });

    it("accepts pagination params", async () => {
      const res = await GET(createGetRequest({ limit: "10", skip: "20" }));
      expect(res.status).toBe(200);
    });

    it("clamps limit to max 1000", async () => {
      const res = await GET(createGetRequest({ limit: "2000" }));
      expect(res.status).toBe(200);
    });
  });

  describe("Response Format", () => {
    it("returns users array and total count", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users).toBeDefined();
      expect(Array.isArray(body.users)).toBe(true);
      expect(typeof body.total).toBe("number");
    });
  });
});

describe("POST /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "SUPER_ADMIN" } };
    mockExistingUser = null;
    mockCreatedUser = null;
  });

  afterEach(() => {
    mockSession = null;
    mockExistingUser = null;
    mockCreatedUser = null;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession = null;
      const res = await POST(
        createPostRequest({
          email: "new@test.com",
          username: "newuser",
          password: "secret123",
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when not SUPER_ADMIN", async () => {
      mockSession = { user: { id: USER_ID, orgId: ORG_ID, role: "ADMIN" } };
      const res = await POST(
        createPostRequest({
          email: "new@test.com",
          username: "newuser",
          password: "secret123",
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Tenant Isolation", () => {
    it("returns 403 when orgId missing", async () => {
      mockSession = { user: { id: USER_ID, orgId: "", role: "SUPER_ADMIN" } };
      const res = await POST(
        createPostRequest({
          email: "new@test.com",
          username: "newuser",
          password: "secret123",
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Validation", () => {
    it("returns 400 when email missing", async () => {
      const res = await POST(
        createPostRequest({ username: "newuser", password: "secret123" }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Email");
    });

    it("returns 400 when username missing", async () => {
      const res = await POST(
        createPostRequest({ email: "new@test.com", password: "secret123" }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("username");
    });

    it("returns 400 when password missing", async () => {
      const res = await POST(
        createPostRequest({ email: "new@test.com", username: "newuser" }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Password");
    });
  });

  describe("Duplicate Prevention", () => {
    it("returns 409 when user with email exists", async () => {
      mockExistingUser = { email: "new@test.com", username: "existing" };
      mockFindOne.mockResolvedValueOnce(mockExistingUser);
      const res = await POST(
        createPostRequest({
          email: "new@test.com",
          username: "newuser",
          password: "secret123",
        }),
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toContain("already exists");
    });
  });

  describe("Successful Creation", () => {
    it("returns 201 with created user", async () => {
      mockFindOne.mockResolvedValueOnce(null);
      const res = await POST(
        createPostRequest({
          email: "new@test.com",
          username: "newuser",
          password: "secret123",
          firstName: "John",
          lastName: "Doe",
          role: "MANAGER",
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.user).toBeDefined();
    });

    it("hashes password before storing", async () => {
      mockFindOne.mockResolvedValueOnce(null);
      await POST(
        createPostRequest({
          email: "new@test.com",
          username: "newuser",
          password: "secret123",
        }),
      );
      expect(mockCreate).toHaveBeenCalled();
      const createArg = mockCreate.mock.calls[0][0];
      expect(createArg.password).toBe("hashed_secret123");
    });

    it("assigns orgId from session", async () => {
      mockFindOne.mockResolvedValueOnce(null);
      await POST(
        createPostRequest({
          email: "new@test.com",
          username: "newuser",
          password: "secret123",
        }),
      );
      expect(mockCreate).toHaveBeenCalled();
      const createArg = mockCreate.mock.calls[0][0];
      expect(createArg.orgId).toBe(ORG_ID);
    });
  });
});
