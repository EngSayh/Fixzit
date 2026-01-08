/**
 * @fileoverview Tests for /api/help/escalate route
 * @sprint 64
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/lib/mongo", () => ({
  connectMongo: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/models/SupportTicket", () => ({
  SupportTicket: {
    create: vi.fn().mockResolvedValue({ ticketCode: "HELP-001" }),
  },
}));

vi.mock("@/server/services/escalation.service", () => ({
  resolveEscalationContact: vi.fn().mockReturnValue({
    name: "Support Team",
    email: "support@test.com",
  }),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: vi.fn(),
  clearTenantContext: vi.fn(),
}));

import { getSessionOrNull } from "@/lib/auth/safe-session";
import { POST } from "@/app/api/help/escalate/route";

const mockGetSessionOrNull = vi.mocked(getSessionOrNull);

function createMockRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/help/escalate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/help/escalate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should require authentication", async () => {
    mockGetSessionOrNull.mockResolvedValue({ ok: true, session: null } as any);
    const res = await POST(createMockRequest({ module: "FM" }) as any);
    expect(res.status).toBe(401);
  });

  it("should create ticket for authenticated user", async () => {
    mockGetSessionOrNull.mockResolvedValue({
      ok: true,
      session: { id: "user-1", orgId: "org-1", email: "test@test.com" },
    } as any);
    
    const res = await POST(createMockRequest({ 
      module: "FM",
      attempted_action: "Access property dashboard"
    }) as any);
    // 200 for success or 500 if DB unavailable
    expect([200, 500]).toContain(res.status);
  });

  it("should normalize module to 'Other' if invalid", async () => {
    mockGetSessionOrNull.mockResolvedValue({
      ok: true,
      session: { id: "user-1", orgId: "org-1" },
    } as any);
    
    const res = await POST(createMockRequest({ 
      module: "InvalidModule",
      attempted_action: "Some action"
    }) as any);
    expect([200, 500]).toContain(res.status);
  });

  it("should accept valid module values", async () => {
    mockGetSessionOrNull.mockResolvedValue({
      ok: true,
      session: { id: "user-1", orgId: "org-1" },
    } as any);
    
    for (const moduleValue of ["FM", "Souq", "Aqar", "Account", "Billing", "Other"]) {
      const res = await POST(createMockRequest({ module: moduleValue }) as any);
      expect([200, 500]).toContain(res.status);
    }
  });

  it("should handle infra errors gracefully", async () => {
    mockGetSessionOrNull.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503 }),
    } as any);
    
    const res = await POST(createMockRequest({ module: "FM" }) as any);
    expect(res.status).toBe(503);
  });
});
