/**
 * @fileoverview Tests for SuperAdmin Phases API
 * @module tests/api/superadmin/phases.route.test
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// Mocks
const mockGetSuperadminSession = vi.fn();
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockJoin = vi.fn((...parts: string[]) => parts.join("/"));
const mockCwd = vi.fn().mockReturnValue("/mocked");

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
}));

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
  default: { join: (...args: unknown[]) => mockJoin(...args) },
}));

// Mock process.cwd
const originalCwd = process.cwd;
process.cwd = mockCwd;

import { GET } from "@/app/api/superadmin/phases/route";

function createRequest(): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/superadmin/phases"), {
    method: "GET",
  });
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

  it("returns 403 when not authenticated as superadmin", async () => {
    mockGetSuperadminSession.mockResolvedValue(null);
    const res = await GET(createRequest());
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 404 when PENDING_MASTER.md not found", async () => {
    mockGetSuperadminSession.mockResolvedValue({ user: "superadmin" });
    mockExistsSync.mockReturnValue(false);
    const res = await GET(createRequest());
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe("PENDING_MASTER.md not found");
  });

  it("returns phase progress when authenticated", async () => {
    mockGetSuperadminSession.mockResolvedValue({ user: "superadmin" });
    mockExistsSync.mockImplementation((p: string) => p.includes("PENDING_MASTER.md"));
    mockReadFileSync.mockImplementation((p: string) => {
      if (p.includes("PENDING_MASTER.md")) {
        return [
          "# PENDING_MASTER",
          "",
          "### 2025-12-18 14:30 (Session 1) \\u2014 Phase P66-P75",
          "",
          "\\u2705 PHASES P66-P75 COMPLETE",
          "",
          "**Production Readiness Complete**",
          "",
          "### 2025-12-18 16:00 (Session 2) \\u2014 Phase P76-P83",
          "",
          "\\u2705 PHASES P76-P83 COMPLETE",
          "",
          "**Audit Documentation Complete**",
        ].join("\n");
      }
      return "";
    });

    const res = await GET(createRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.phases)).toBe(true);
    expect(data.summary.total).toBeGreaterThan(0);
  });

  it("includes timeline of completed phases", async () => {
    mockGetSuperadminSession.mockResolvedValue({ user: "superadmin" });
    mockExistsSync.mockImplementation((p: string) => p.includes("PENDING_MASTER.md"));
    mockReadFileSync.mockImplementation((p: string) => {
      if (p.includes("PENDING_MASTER.md")) {
        return [
          "# PENDING_MASTER",
          "",
          "### 2025-12-18 14:30 (Session 1) \\u2014 Phase P66-P75",
          "\\u2705 PHASES P66-P75 COMPLETE",
        ].join("\n");
      }
      return "";
    });

    const res = await GET(createRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.timeline)).toBe(true);
  });

  it("calculates completion percentage correctly", async () => {
    mockGetSuperadminSession.mockResolvedValue({ user: "superadmin" });
    mockExistsSync.mockImplementation((p: string) => p.includes("PENDING_MASTER.md"));
    mockReadFileSync.mockImplementation((p: string) => {
      if (p.includes("PENDING_MASTER.md")) {
        return [
          "# PENDING_MASTER",
          "### 2025-12-18 14:30 (Session 1) \\u2014 Phase P66-P107",
          "\\u2705 PHASES P66-P107 COMPLETE",
        ].join("\n");
      }
      return "";
    });

    const res = await GET(createRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(typeof data.summary.completionPercentage).toBe("number");
    expect(data.summary.completionPercentage).toBeGreaterThanOrEqual(90);
  });
});
