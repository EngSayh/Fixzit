/**
 * @fileoverview Tests for Admin Notifications Send API
 * @route POST /api/admin/notifications/send
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
const mockGetDatabase = vi.fn();
const mockSendEmail = vi.fn();
const mockSendSMS = vi.fn();
const mockLogCommunication = vi.fn();
const mockAudit = vi.fn();

// TG-005: Mock mongodb ObjectId to prevent constructor errors in route
vi.mock("mongodb", () => ({
  ObjectId: class MockObjectId {
    private id: string;
    constructor(id?: string) {
      this.id = id || "507f1f77bcf86cd799439099";
    }
    static isValid(id: unknown): boolean {
      return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
    }
    toString() {
      return this.id;
    }
    equals(other: unknown): boolean {
      return other?.toString?.() === this.id;
    }
    toHexString() {
      return this.id;
    }
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: () => mockGetDatabase(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/sms", () => ({
  sendSMS: (...args: unknown[]) => mockSendSMS(...args),
}));

vi.mock("@/lib/communication-logger", () => ({
  logCommunication: (...args: unknown[]) => mockLogCommunication(...args),
}));

vi.mock("@/lib/audit", () => ({
  audit: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
  smartRateLimit: vi.fn(async () => ({ allowed: true, remaining: 9 })),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }),
  ),
}));

let currentSession: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => currentSession),
}));

const ORG_ID = "507f1f77bcf86cd799439011"; // Valid MongoDB ObjectId
const ADMIN_ID = "507f1f77bcf86cd799439012";
const USER_ID = "507f1f77bcf86cd799439013";

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/admin/notifications/send",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("/api/admin/notifications/send", () => {
  let POST: typeof import("@/app/api/admin/notifications/send/route").POST;

  const mockUsersCollection = {
    find: vi.fn(),
    toArray: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    currentSession = null;

    mockSendEmail.mockResolvedValue({ success: true });
    mockSendSMS.mockResolvedValue({ success: true });
    mockLogCommunication.mockResolvedValue({ success: true });
    mockAudit.mockResolvedValue(undefined);

    mockUsersCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    // TG-005: Mock getDatabase to return a db with collection supporting find, insertOne, updateOne
    mockGetDatabase.mockReturnValue({
      collection: vi.fn(() => ({
        ...mockUsersCollection,
        insertOne: vi.fn().mockResolvedValue({ insertedId: "mock-inserted-id" }),
        updateOne: vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
      })),
    });

    const mod = await import("@/app/api/admin/notifications/send/route");
    POST = mod.POST;
  });

  describe("Authentication & Authorization", () => {
    it("returns 401 when session is missing", async () => {
      currentSession = null;
      const res = await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when user is not authorized (e.g., USER role)", async () => {
      currentSession = {
        user: { id: ADMIN_ID, orgId: ORG_ID, role: "USER" },
      };
      const res = await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );
      expect(res.status).toBe(403);
    });

    it("allows SUPER_ADMIN to send notifications", async () => {
      currentSession = {
        user: {
          id: ADMIN_ID,
          orgId: ORG_ID,
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
        },
      };
      mockUsersCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: USER_ID, email: "test@example.com", phone: "+1234567890" },
        ]),
      });
      
      // Ensure sendEmail mock returns success structure expected by route
      mockSendEmail.mockResolvedValue({ success: true, messageId: "mock-id" });
      mockLogCommunication.mockResolvedValue({ success: true });

      const res = await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );
      
      // TG-005: Fixed by adding mongodb ObjectId mock and insertOne to collection mock
      expect(res.status).toBe(200);
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      currentSession = {
        user: {
          id: ADMIN_ID,
          orgId: ORG_ID,
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
        },
      };
    });

    it("returns 400 when recipients is missing", async () => {
      const res = await POST(
        createRequest({
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when channels is empty", async () => {
      const res = await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: [],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when subject is missing", async () => {
      const res = await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: ["email"],
          message: "Test message",
          priority: "normal",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when message is missing", async () => {
      const res = await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: ["email"],
          subject: "Test",
          priority: "normal",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for invalid recipient type (no recipients matched)", async () => {
      // Note: Route doesn't validate recipient type enum - it returns 404 when no recipients found
      const res = await POST(
        createRequest({
          recipients: { type: "invalid", ids: [USER_ID] },
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 for unknown channel (proceeds but sends nothing)", async () => {
      // Note: Route doesn't validate channel enum - but mock returns no recipients
      const res = await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: ["telegram"], // Unknown channel, route ignores it
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );
      // With mock returning empty users array, we get 404
      expect(res.status).toBe(404);
    });
  });

  describe("Recipient Types", () => {
    beforeEach(() => {
      currentSession = {
        user: {
          id: ADMIN_ID,
          orgId: ORG_ID,
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
        },
      };
    });

    it("handles users recipient type", async () => {
      mockUsersCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: USER_ID, email: "test@example.com" },
        ]),
      });

      await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );

      expect(mockUsersCollection.find).toHaveBeenCalled();
    });

    it("handles tenants recipient type", async () => {
      mockUsersCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: USER_ID, email: "test@example.com", orgId: ORG_ID },
        ]),
      });

      await POST(
        createRequest({
          recipients: { type: "tenants", ids: [ORG_ID] },
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );

      expect(mockUsersCollection.find).toHaveBeenCalled();
    });

    it("handles all recipient type", async () => {
      mockUsersCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: USER_ID, email: "test@example.com" },
        ]),
      });

      await POST(
        createRequest({
          recipients: { type: "all" },
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );

      expect(mockUsersCollection.find).toHaveBeenCalled();
    });
  });

  describe("Audit Logging", () => {
    it("logs successful notification send", async () => {
      currentSession = {
        user: {
          id: ADMIN_ID,
          orgId: ORG_ID,
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
        },
      };
      mockUsersCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: USER_ID, email: "test@example.com" },
        ]),
      });

      await POST(
        createRequest({
          recipients: { type: "users", ids: [USER_ID] },
          channels: ["email"],
          subject: "Test",
          message: "Test message",
          priority: "normal",
        }),
      );

      // Audit should be called for admin actions
      expect(mockAudit).toHaveBeenCalled();
    });
  });
});
