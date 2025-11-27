import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => vi.fn());
const connectMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: connectMock,
}));

vi.mock("@/server/services/hr/leave-type.service", () => ({
  LeaveTypeService: {
    list: listMock,
    create: createMock,
  },
}));

import { GET, POST } from "@/app/api/hr/leave-types/route";

describe("app/api/hr/leave-types route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authenticated session", async () => {
    authMock.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/hr/leave-types");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 403 when user lacks HR role", async () => {
    authMock.mockResolvedValue({ user: { orgId: "org-1", role: "TENANT" } });
    const request = new NextRequest("http://localhost/api/hr/leave-types");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("lists leave types for authenticated org with HR role", async () => {
    authMock.mockResolvedValue({ user: { orgId: "org-1", role: "HR_OFFICER" } });
    listMock.mockResolvedValue([
      { _id: "lt1", code: "ANNUAL", name: "Annual Leave" },
    ]);

    const request = new NextRequest(
      "http://localhost/api/hr/leave-types?search=annual&limit=5",
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(listMock).toHaveBeenCalledWith("org-1", "annual", { limit: 5 });
    expect(payload.leaveTypes).toHaveLength(1);
    expect(response.status).toBe(200);
  });

  it("validates POST body", async () => {
    authMock.mockResolvedValue({ user: { orgId: "org-1", role: "HR" } });
    const request = new NextRequest("http://localhost/api/hr/leave-types", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates leave type when payload is valid", async () => {
    authMock.mockResolvedValue({ user: { orgId: "org-1", role: "HR" } });
    createMock.mockResolvedValue({
      _id: "lt2",
      code: "EMERGENCY",
      name: "Emergency Leave",
    });
    const request = new NextRequest("http://localhost/api/hr/leave-types", {
      method: "POST",
      body: JSON.stringify({
        code: "EMERGENCY",
        name: "Emergency Leave",
        isPaid: false,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith("org-1", {
      code: "EMERGENCY",
      name: "Emergency Leave",
      description: undefined,
      isPaid: false,
      annualEntitlementDays: undefined,
    });
  });
});
