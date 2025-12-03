import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "u1", email: "a@test.com", orgId: "507f1f77bcf86cd799439011", role: "SUPER_ADMIN" },
  }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/sms", () => ({
  sendSMS: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/communication-logger", () => ({
  logCommunication: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST } from "@/app/api/admin/notifications/send/route";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import * as mongo from "@/lib/mongodb-unified";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/notifications/send", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("admin/notifications/send route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: "u1", email: "a@test.com", orgId: ORG_ID, role: "SUPER_ADMIN" },
  });
});

  it("returns 404 when no recipients found", async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const find = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]), // no recipients
    });
    const collection = vi.fn().mockReturnValue({ find, insertOne });
    vi.mocked(mongo).getDatabase.mockResolvedValue({ collection } as any);

    const body = {
      recipients: { type: "users", ids: [] },
      channels: ["email"],
      subject: "s",
      message: "m",
      priority: "normal",
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(404);
  });

  it("scopes user fetches to orgId", async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const find = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId(), email: "u@test.com", name: "U" }]),
    });
    const collection = vi.fn().mockReturnValue({ find, insertOne });
    vi.mocked(mongo).getDatabase.mockResolvedValue({ collection } as any);

    const body = {
      recipients: { type: "users", ids: [] },
      channels: ["email"],
      subject: "s",
      message: "m",
      priority: "normal",
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect(find).toHaveBeenCalledWith({ orgId: new ObjectId(ORG_ID) });
  });

  it("scopes tenant fetches to orgId", async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const find = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId(), name: "T", contactEmail: "t@test.com" }]),
    });
    const collection = vi.fn().mockReturnValue({ find, insertOne });
    vi.mocked(mongo).getDatabase.mockResolvedValue({ collection } as any);

    const body = {
      recipients: { type: "tenants", ids: [] },
      channels: ["email"],
      subject: "s",
      message: "m",
      priority: "normal",
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect(find).toHaveBeenCalledWith({ orgId: new ObjectId(ORG_ID) });
  });
});
const ORG_ID = "507f1f77bcf86cd799439011";
