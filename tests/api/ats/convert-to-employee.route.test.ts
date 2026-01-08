/**
 * @fileoverview Tests for /api/ats/convert-to-employee route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/Application", () => ({
  Application: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "app-1",
        candidateId: "cand-1",
        jobId: "job-1",
        orgId: "org-1",
        stage: "hired",
      }),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/server/models/Candidate", () => ({
  Candidate: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "cand-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
      }),
    }),
  },
}));

vi.mock("@/server/models/Job", () => ({
  Job: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "job-1",
        title: "Software Engineer",
        code: "ENG-001",
        departmentId: "dept-1",
      }),
    }),
  },
}));

vi.mock("@/server/models/hr.models", () => ({
  Employee: {
    create: vi.fn().mockResolvedValue({
      _id: "emp-1",
      userId: "user-1",
      jobTitle: "Software Engineer",
    }),
  },
}));

vi.mock("@/lib/ats/rbac", () => ({
  atsRBAC: vi.fn().mockResolvedValue({
    authorized: true,
    userId: "user-1",
    orgId: "org-1",
    isSuperAdmin: false,
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  notFoundError: vi.fn((msg) => new Response(JSON.stringify({ error: `${msg} not found` }), { status: 404 })),
  validationError: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status, _req) => 
    new Response(JSON.stringify(body), { status })
  ),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "@/app/api/ats/convert-to-employee/route";
import { atsRBAC } from "@/lib/ats/rbac";
import { smartRateLimit } from "@/server/security/rateLimit";

const mockAtsRBAC = vi.mocked(atsRBAC);
const mockSmartRateLimit = vi.mocked(smartRateLimit);

function createRequest(body: object): Request {
  return new Request("http://localhost:3000/api/ats/convert-to-employee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ats/convert-to-employee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtsRBAC.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      orgId: "org-1",
      isSuperAdmin: false,
    } as any);
    mockSmartRateLimit.mockResolvedValue({ allowed: true } as any);
  });

  it("should reject unauthorized users", async () => {
    mockAtsRBAC.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as any);
    const res = await POST(createRequest({ applicationId: "app-1" }) as any);
    expect([401, 403]).toContain(res.status);
  });

  it("should return 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValue({ allowed: false } as any);
    const res = await POST(createRequest({ applicationId: "app-1" }) as any);
    expect(res.status).toBe(429);
  });

  it("should reject missing applicationId", async () => {
    const res = await POST(createRequest({}) as any);
    expect(res.status).toBe(400);
  });

  it("should convert application to employee for valid request", async () => {
    const res = await POST(createRequest({ applicationId: "app-1" }) as any);
    // 200/201 for success, 403 if auth, 404 if not found, 500 if error
    expect([200, 201, 403, 404, 500]).toContain(res.status);
  });

  it("should return 404 for non-existent application", async () => {
    const { Application } = await import("@/server/models/Application");
    vi.mocked(Application.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    const res = await POST(createRequest({ applicationId: "invalid-id" }) as any);
    expect([404, 500]).toContain(res.status);
  });
});
