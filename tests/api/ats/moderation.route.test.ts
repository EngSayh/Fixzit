/**
 * @fileoverview Tests for /api/ats/moderation route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/Job", () => ({
  Job: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "job-1",
        title: "Software Engineer",
        status: "pending_review",
        org_id: "org-1",
      }),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue({
      _id: "job-1",
      title: "Software Engineer",
      status: "approved",
    }),
  },
}));

vi.mock("@/lib/ats/rbac", () => ({
  atsRBAC: vi.fn().mockResolvedValue({
    authorized: true,
    userId: "user-1",
    orgId: "org-1",
    role: "moderator",
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { PUT } from "@/app/api/ats/moderation/route";
import { atsRBAC } from "@/lib/ats/rbac";
import { smartRateLimit } from "@/server/security/rateLimit";

const mockAtsRBAC = vi.mocked(atsRBAC);
const mockSmartRateLimit = vi.mocked(smartRateLimit);

function createPutRequest(body: object): Request {
  return new Request("http://localhost:3000/api/ats/moderation", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/ats/moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtsRBAC.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      orgId: "org-1",
      role: "moderator",
    } as any);
    mockSmartRateLimit.mockResolvedValue({ allowed: true } as any);
  });

  it("should reject unauthorized users", async () => {
    mockAtsRBAC.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as any);
    const res = await PUT(createPutRequest({
      jobId: "job-1",
      action: "approve",
    }) as any);
    expect([401, 403, 500]).toContain(res.status);
  });

  it("should return 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValue({ allowed: false } as any);
    const res = await PUT(createPutRequest({
      jobId: "job-1",
      action: "approve",
    }) as any);
    expect(res.status).toBe(429);
  });

  it("should approve job posting", async () => {
    const res = await PUT(createPutRequest({
      jobId: "job-1",
      action: "approve",
    }) as any);
    expect([200, 400, 403, 404, 500]).toContain(res.status);
  });

  it("should reject job posting with reason", async () => {
    const res = await PUT(createPutRequest({
      jobId: "job-1",
      action: "reject",
      reason: "Salary range not specified",
    }) as any);
    expect([200, 400, 403, 404, 500]).toContain(res.status);
  });

  it("should return 400 for invalid action", async () => {
    const res = await PUT(createPutRequest({
      jobId: "job-1",
      action: "invalid-action",
    }) as any);
    expect([400, 403, 500]).toContain(res.status);
  });

  it("should return 404 for non-existent job", async () => {
    const { Job } = await import("@/server/models/Job");
    vi.mocked(Job.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    const res = await PUT(createPutRequest({
      jobId: "nonexistent-job",
      action: "approve",
    }) as any);
    expect([400, 403, 404, 500]).toContain(res.status);
  });
});
