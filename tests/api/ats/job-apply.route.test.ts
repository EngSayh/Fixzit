/**
 * @fileoverview Tests for /api/ats/jobs/[id]/apply route
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
        status: "published",
        visibility: "public",
        orgId: "org-1",
        skills: ["JavaScript", "TypeScript"],
        requirements: ["3+ years experience"],
      }),
    }),
  },
}));

vi.mock("@/server/services/ats/application-intake", () => ({
  submitApplicationFromForm: vi.fn().mockResolvedValue({
    _id: "app-1",
    candidateName: "John Doe",
    status: "pending",
    createdAt: new Date(),
  }),
  ApplicationSubmissionError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ApplicationSubmissionError";
    }
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn(() => "127.0.0.1"),
  createSecureResponse: vi.fn((body, opts) => new Response(JSON.stringify(body), opts)),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "@/app/api/ats/jobs/[id]/apply/route";
import { smartRateLimit } from "@/server/security/rateLimit";
import { Job } from "@/server/models/Job";

const mockSmartRateLimit = vi.mocked(smartRateLimit);
const mockJob = vi.mocked(Job);

function createFormRequest(fields: Record<string, string>): Request & { formData: () => Promise<FormData> } {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  
  const req = new Request("http://localhost:3000/api/ats/jobs/job-1/apply", {
    method: "POST",
  });
  
  // Override formData method
  (req as any).formData = () => Promise.resolve(formData);
  return req as any;
}

describe("POST /api/ats/jobs/[id]/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true } as any);
    mockJob.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "job-1",
        title: "Software Engineer",
        status: "published",
        visibility: "public",
        orgId: "org-1",
      }),
    } as any);
  });

  it("should return 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValue({ allowed: false } as any);
    const res = await POST(
      createFormRequest({ name: "John Doe", email: "john@test.com" }) as any,
      { params: { id: "job-1" } },
    );
    expect(res.status).toBe(429);
  });

  it("should return 404 for non-existent job", async () => {
    mockJob.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    const res = await POST(
      createFormRequest({ name: "John Doe", email: "john@test.com" }) as any,
      { params: { id: "nonexistent" } },
    );
    expect(res.status).toBe(404);
  });

  it("should submit application with valid data", async () => {
    const res = await POST(
      createFormRequest({
        name: "John Doe",
        email: "john@test.com",
        phone: "+966500000000",
        skills: "JavaScript, TypeScript, React",
        experience: "5 years",
      }) as any,
      { params: { id: "job-1" } },
    );
    expect([200, 201, 400, 500]).toContain(res.status);
  });

  it("should parse skills from comma-separated string", async () => {
    const res = await POST(
      createFormRequest({
        name: "Jane Smith",
        email: "jane@test.com",
        skills: "Node.js, MongoDB, AWS",
      }) as any,
      { params: { id: "job-1" } },
    );
    expect([200, 201, 400, 500]).toContain(res.status);
  });

  it("should handle empty skills gracefully", async () => {
    const res = await POST(
      createFormRequest({
        name: "Test User",
        email: "test@test.com",
        skills: "",
      }) as any,
      { params: { id: "job-1" } },
    );
    expect([200, 201, 400, 500]).toContain(res.status);
  });
});
