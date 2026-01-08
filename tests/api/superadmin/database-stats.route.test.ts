/**
 * @fileoverview Tests for Superadmin Database Stats API
 * @route GET /api/superadmin/database/stats
 * @agent [AGENT-001-A]
 */
import { expectAuthFailure } from '@/tests/api/_helpers';
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock mongoose connection
const mockDb = {
  command: vi.fn(),
  listCollections: vi.fn(),
};

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("mongoose", () => ({
  default: {
    connection: {
      db: mockDb,
    },
  },
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Dynamic imports AFTER mocks
const { GET } = await import("@/app/api/superadmin/database/stats/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Database Stats API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
      orgId: "org-123",
    } as any);
  });

  describe("GET /api/superadmin/database/stats", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/database/stats");
      const response = await GET(request);

      expectAuthFailure(response);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/database/stats");
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it("should return database statistics", async () => {
      mockDb.command.mockImplementation((cmd) => {
        if (cmd.dbStats) {
          return Promise.resolve({
            db: "fixzit",
            collections: 50,
            dataSize: 1024000,
            storageSize: 2048000,
            indexes: 120,
            indexSize: 512000,
            ok: 1,
          });
        }
        if (cmd.collStats) {
          return Promise.resolve({
            count: 1000,
            size: 50000,
            avgObjSize: 50,
            storageSize: 60000,
            nindexes: 3,
            totalIndexSize: 10000,
          });
        }
        if (cmd.serverStatus) {
          return Promise.resolve({
            connections: { current: 10, available: 100, totalCreated: 50 },
            mem: { resident: 100, virtual: 200, mapped: 50 },
            opcounters: { insert: 10, query: 100, update: 20, delete: 5 },
            uptime: 3600,
            version: "5.0.0",
          });
        }
        return Promise.resolve({});
      });

      mockDb.listCollections.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { name: "users" },
          { name: "organizations" },
        ]),
      });

      const request = new NextRequest("http://localhost/api/superadmin/database/stats");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.database).toBeDefined();
      expect(data.collections).toBeDefined();
      expect(data.collections).toHaveLength(2);
      expect(data.connections).toBeDefined();
      expect(data.health).toBeDefined();
    });

    it("should handle missing db connection", async () => {
      // Temporarily set db to null
      const mongoose = await import("mongoose");
      const originalDb = mongoose.default.connection.db;
      (mongoose.default.connection as any).db = null;

      const request = new NextRequest("http://localhost/api/superadmin/database/stats");
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain("Database connection");

      // Restore
      (mongoose.default.connection as any).db = originalDb;
    });

    it("should handle collection stats errors gracefully", async () => {
      mockDb.command.mockImplementation((cmd) => {
        if (cmd.dbStats) {
          return Promise.resolve({
            db: "fixzit",
            collections: 2,
          });
        }
        if (cmd.collStats) {
          throw new Error("Collection not found");
        }
        return Promise.resolve({});
      });

      mockDb.listCollections.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ name: "problematic_collection" }]),
      });

      const request = new NextRequest("http://localhost/api/superadmin/database/stats");
      const response = await GET(request);

      // Should still return 200, just with empty/partial collection stats
      expect(response.status).toBe(200);
    });
  });
});
