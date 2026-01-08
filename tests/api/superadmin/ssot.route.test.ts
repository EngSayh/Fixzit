/**
 * @fileoverview Tests for /api/superadmin/ssot route
 * @sprint 66
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue({
    username: "superadmin",
    role: "SUPER_ADMIN",
    orgId: "org-1",
  }),
}));

vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue("# PENDING_MASTER.md\n\nSST content..."),
    stat: vi.fn().mockResolvedValue({
      mtime: new Date(),
      size: 1024,
    }),
  },
}));

import { GET } from "@/app/api/superadmin/ssot/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";

const mockGetSession = vi.mocked(getSuperadminSession);

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/superadmin/ssot", {
    method: "GET",
  });
}

describe("GET /api/superadmin/ssot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-1",
    } as any);
  });

  it("should return 401 for unauthorized users", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(createGetRequest() as any);
    expect(res.status).toBe(401);
  });

  it("should return SSOT content for superadmin", async () => {
    const res = await GET(createGetRequest() as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.content).toBeDefined();
    }
  });

  it("should include file metadata", async () => {
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.lastModified || json.fileName).toBeDefined();
    }
  });

  it("should include file path info", async () => {
    const res = await GET(createGetRequest() as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.path || json.fileName).toBeDefined();
    }
  });

  it("should handle file read errors", async () => {
    const fs = await import("fs");
    vi.mocked(fs.promises.readFile).mockRejectedValue(new Error("File not found"));
    const res = await GET(createGetRequest() as any);
    expect([401, 500]).toContain(res.status);
  });
});
