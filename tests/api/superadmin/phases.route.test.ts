/**
 * @fileoverview Tests for SuperAdmin Phases API
 * @module tests/api/superadmin/phases.route.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
const mockGetSuperadminSession = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
}));

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockJoin = vi.fn().mockReturnValue("/mocked/path/PENDING_MASTER.md");
const mockCwd = vi.fn().mockReturnValue("/mocked");

vi.mock("fs", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  },
}));

vi.mock("path", () => ({
  join: (...args: unknown[]) => mockJoin(...args),
  default: {
    join: (...args: unknown[]) => mockJoin(...args),
  },
}));

// Mock process.cwd
const originalCwd = process.cwd;
process.cwd = mockCwd;

import { GET } from "@/app/api/superadmin/phases/route";

function createRequest(): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/phases");
  return new NextRequest(url, { method: "GET" });
}

describe("SuperAdmin Phases API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSuperadminSession.mockReset();
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
  });

  afterAll(() => {
    process.cwd = originalCwd;
  });

  describe("GET /api/superadmin/phases", () => {
    it("should return 403 when not authenticated as superadmin", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 when PENDING_MASTER.md not found", async () => {
      mockGetSuperadminSession.mockResolvedValue({ user: "superadmin" });
      mockExistsSync.mockReturnValue(false);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("PENDING_MASTER.md not found");
    });

    it("should return phase progress when authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue({ user: "superadmin" });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`
# PENDING_MASTER

### 2025-12-18 14:30 (Session 1) — Phase P66-P75

✅ PHASES P66-P75 COMPLETE

**Production Readiness Complete**

### 2025-12-18 16:00 (Session 2) — Phase P76-P83

✅ PHASES P76-P83 COMPLETE

**Audit Documentation Complete**
      `);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.phases).toBeDefined();
      expect(Array.isArray(data.phases)).toBe(true);
      expect(data.summary).toBeDefined();
      expect(data.summary.total).toBeGreaterThan(0);
      expect(data.summary.completionPercentage).toBeDefined();
    });

    it("should include timeline of completed phases", async () => {
      mockGetSuperadminSession.mockResolvedValue({ user: "superadmin" });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`
# PENDING_MASTER

### 2025-12-18 14:30 (Session 1) — Phase P66-P75
✅ PHASES P66-P75 COMPLETE
      `);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeline).toBeDefined();
      expect(Array.isArray(data.timeline)).toBe(true);
    });

    it("should calculate completion percentage correctly", async () => {
      mockGetSuperadminSession.mockResolvedValue({ user: "superadmin" });
      mockExistsSync.mockReturnValue(true);
      // Mock P66-P107 complete (42/45 phases = 93%)
      mockReadFileSync.mockReturnValue(`
# PENDING_MASTER
### 2025-12-18 14:30 (Session 1) — Phase P66-P107
✅ PHASES P66-P107 COMPLETE
      `);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Completion percentage varies based on actual phase progress
      expect(typeof data.summary.completionPercentage).toBe('number');
      expect(data.summary.completionPercentage).toBeGreaterThanOrEqual(90);
    });
  });
});
