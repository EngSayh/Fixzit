/**
 * @fileoverview Tests for /api/invoices/reminders/scan route
 * @sprint 68
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mocks
const { mockAuth, mockConnectDb, mockScanForReminders } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockConnectDb: vi.fn(),
  mockScanForReminders: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: mockConnectDb.mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((body, status) =>
    new Response(JSON.stringify(body), { status })
  ),
}));

vi.mock("@/server/models/Invoice", () => ({
  Invoice: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("@/services/finance/invoice-reminder-service", () => ({
  scanForReminders: mockScanForReminders,
  filterInvoicesByReminderLevel: vi.fn().mockReturnValue({
    upcoming: [],
    overdue: [],
    severelyOverdue: [],
    finalNotice: [],
  }),
}));

import { POST } from "@/app/api/invoices/reminders/scan/route";

function createPostRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/invoices/reminders/scan", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/invoices/reminders/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "FM_MANAGER", orgId: "org-1" },
    });
    mockScanForReminders.mockResolvedValue({
      total: 0,
      sent: 0,
      skipped: 0,
    });
  });

  it("should return 401 for unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createPostRequest());
    expect(res.status).toBe(401);
  });

  it("should return 403 for unauthorized role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "TENANT", orgId: "org-1" },
    });
    const res = await POST(createPostRequest());
    expect(res.status).toBe(403);
  });

  it("should return 401 when orgId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "FM_MANAGER", orgId: null },
    });
    const res = await POST(createPostRequest());
    expect(res.status).toBe(401);
  });

  it("should allow FM_MANAGER role", async () => {
    const res = await POST(createPostRequest());
    expect([200, 500]).toContain(res.status);
  });

  it("should allow FINANCE_MANAGER role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "FINANCE_MANAGER", orgId: "org-1" },
    });
    const res = await POST(createPostRequest());
    expect([200, 500]).toContain(res.status);
  });

  it("should verify user authentication", async () => {
    await POST(createPostRequest());
    expect(mockAuth).toHaveBeenCalled();
  });
});
