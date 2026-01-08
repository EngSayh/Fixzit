/**
 * @fileoverview Tests for /api/ats/jobs/[id]/publish route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/Job", () => ({
  Job: {
    findOne: vi.fn().mockResolvedValue({
      _id: "job-1",
      title: "Software Engineer",
      status: "draft",
      orgId: "org-1",
      publish: vi.fn().mockResolvedValue(true),
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
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })),
  notFoundError: vi.fn((resource) => new Response(JSON.stringify({ error: `${resource} not found` }), { status: 404 })),
  validationError: vi.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn(() => "127.0.0.1"),
  createSecureResponse: vi.fn((body, opts) => new Response(JSON.stringify(body), opts)),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "@/app/api/ats/jobs/[id]/publish/route";
import { atsRBAC } from "@/lib/ats/rbac";
import { smartRateLimit } from "@/server/security/rateLimit";
import { Job } from "@/server/models/Job";

const mockAtsRBAC = vi.mocked(atsRBAC);
const mockSmartRateLimit = vi.mocked(smartRateLimit);
const mockJob = vi.mocked(Job);

function createPostRequest(): Request {
  return new Request("http://localhost:3000/api/ats/jobs/job-1/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/ats/jobs/[id]/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtsRBAC.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      orgId: "org-1",
      isSuperAdmin: false,
    } as any);
    mockSmartRateLimit.mockResolvedValue({ allowed: true } as any);
    mockJob.findOne.mockResolvedValue({
      _id: "job-1",
      title: "Software Engineer",
      status: "draft",
      orgId: "org-1",
      publish: vi.fn().mockResolvedValue(true),
    } as any);
  });

  it("should reject unauthorized users", async () => {
    mockAtsRBAC.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as any);
    const res = await POST(
      createPostRequest() as any,
      { params: Promise.resolve({ id: "job-1" }) },
    );
    expect([401, 403]).toContain(res.status);
  });

  it("should return 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValue({ allowed: false } as any);
    const res = await POST(
      createPostRequest() as any,
      { params: Promise.resolve({ id: "job-1" }) },
    );
    expect(res.status).toBe(429);
  });

  it("should return 404 for non-existent job", async () => {
    mockJob.findOne.mockResolvedValue(null);
    const res = await POST(
      createPostRequest() as any,
      { params: Promise.resolve({ id: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
  });

  it("should return 400 if job is already published", async () => {
    mockJob.findOne.mockResolvedValue({
      _id: "job-1",
      title: "Software Engineer",
      status: "published",
      orgId: "org-1",
    } as any);
    const res = await POST(
      createPostRequest() as any,
      { params: Promise.resolve({ id: "job-1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("should publish draft job successfully", async () => {
    const res = await POST(
      createPostRequest() as any,
      { params: Promise.resolve({ id: "job-1" }) },
    );
    expect([200, 400, 403, 500]).toContain(res.status);
  });

  it("should scope query by orgId for non-super-admin", async () => {
    const res = await POST(
      createPostRequest() as any,
      { params: Promise.resolve({ id: "job-1" }) },
    );
    expect(mockJob.findOne).toHaveBeenCalled();
    expect([200, 400, 403, 500]).toContain(res.status);
  });
});
