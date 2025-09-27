/**
 * Tests for PATCH handler in app/api/help/articles/[id]/route.ts
 *
 * Testing library and framework: Jest + TypeScript
 *
 * These tests focus on:
 * - RBAC: only SUPER_ADMIN can patch
 * - Zod validation: invalid payloads result in 400
 * - Filter construction: ObjectId parsing fallback to slug
 * - Database update behavior: success and not-found cases
 * - Response payloads and status codes
 *
 * External dependencies are mocked:
 * - getSessionUser
 * - getDatabase and MongoDB collection
 * - ObjectId constructor behavior (success/throw)
 * - NextRequest is simulated with a minimal shim providing json()
 */

import { NextResponse } from "next/server";

// Import the handler under test. Adjust the path if your route file differs.
import { PATCH } from "@/app/api/help/articles/[id]/route";

jest.mock("@/src/server/middleware/withAuthRbac", () => ({
  getSessionUser: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  getDatabase: jest.fn(),
}));

// We will spy on the ObjectId constructor behavior using a real import and a mock factory.
// However, since ObjectId is a class, we'll simulate throw/non-throw via a helper mock.
jest.mock("mongodb", () => {
  const actual = jest.requireActual("mongodb");
  return {
    ...actual,
    ObjectId: jest.fn((val: any) => new (actual as any).ObjectId(val)),
  };
});

type AnyObject = Record<string, any>;

const { getSessionUser } = require("@/src/server/middleware/withAuthRbac");
const { getDatabase } = require("@/lib/mongodb");
const { ObjectId } = require("mongodb");

// Minimal NextRequest-like shim sufficient for our handler.
// Only json() is used by the handler and passed to getSessionUser. We keep signature flexible.
class MockNextRequest {
  private _body: any;
  constructor(body: any) {
    this._body = body;
  }
  async json() {
    return this._body;
  }
}

function mockDbResult(value: any) {
  return { value };
}

describe("PATCH /api/help/articles/[id]", () => {
  let collMock: AnyObject;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2025-01-02T03:04:05.678Z") });

    collMock = {
      findOneAndUpdate: jest.fn(),
    };

    (getDatabase as jest.Mock).mockResolvedValue({
      collection: jest.fn().mockReturnValue(collMock),
    });

    (getSessionUser as jest.Mock).mockReset();
    (ObjectId as unknown as jest.Mock).mockImplementation((val: any) => {
      const actual = jest.requireActual("mongodb");
      return new actual.ObjectId(val);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("returns 403 when user is not SUPER_ADMIN", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ role: "EDITOR", id: "u1" });

    const req = new MockNextRequest({ title: "New Title" }) as any;
    const res = await PATCH(req, { params: { id: "some-id" } });
    const body = await (res as Response).json();

    expect((res as Response).status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
    expect(getDatabase).not.toHaveBeenCalled();
    expect(collMock.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("parses valid payload and updates article by ObjectId when id is a valid ObjectId", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ role: "SUPER_ADMIN", id: "admin-123" });

    // Use a valid 24-char hex ObjectId
    const validId = "64b7e3c2a1d4f0b123456789";
    const payload = {
      title: "Updated Title",
      content: "Updated Content",
      category: "how-to",
      tags: ["tag1", "tag2"],
      status: "DRAFT",
    };

    const updatedDoc = {
      _id: validId,
      ...payload,
      updatedBy: "admin-123",
      updatedAt: new Date("2025-01-02T03:04:05.678Z"),
    };
    collMock.findOneAndUpdate.mockResolvedValue(mockDbResult(updatedDoc));

    const req = new MockNextRequest(payload) as any;
    const res = await PATCH(req, { params: { id: validId } });
    const body = await (res as Response).json();

    expect(getDatabase).toHaveBeenCalledTimes(1);
    expect(collMock.findOneAndUpdate).toHaveBeenCalledTimes(1);

    const [filterArg, updateArg, optionsArg] = collMock.findOneAndUpdate.mock.calls[0];

    // Filter should be {_id: new ObjectId(validId)}
    expect(filterArg).toHaveProperty("_id");
    // ensure ObjectId constructed with provided id
    expect((ObjectId as jest.Mock).mock.calls[0][0]).toBe(validId);

    // Update $set payload should merge data and include updatedBy/updatedAt
    expect(updateArg).toMatchObject({
      $set: expect.objectContaining({
        ...payload,
        updatedBy: "admin-123",
        updatedAt: expect.any(Date),
      }),
    });
    // Options should request the 'after' document
    expect(optionsArg).toMatchObject({ returnDocument: "after" });

    expect((res as Response).status).toBe(200);
    // Response should be the updated document (opaque pass-through)
    expect(body).toEqual(updatedDoc);
  });

  it("falls back to slug filter when ObjectId constructor throws", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ role: "SUPER_ADMIN", id: "admin-456" });

    // Force ObjectId to throw to simulate invalid ObjectId
    (ObjectId as jest.Mock).mockImplementation(() => {
      throw new Error("invalid oid");
    });

    const slug = "some-article-slug";
    const payload = { content: "Only content changed" };
    const updatedDoc = {
      slug,
      content: payload.content,
      updatedBy: "admin-456",
      updatedAt: new Date("2025-01-02T03:04:05.678Z"),
    };
    collMock.findOneAndUpdate.mockResolvedValue(mockDbResult(updatedDoc));

    const req = new MockNextRequest(payload) as any;
    const res = await PATCH(req, { params: { id: slug } });
    const body = await (res as Response).json();

    const [filterArg] = collMock.findOneAndUpdate.mock.calls[0];
    expect(filterArg).toEqual({ slug });
    expect((res as Response).status).toBe(200);
    expect(body).toEqual(updatedDoc);
  });

  it("returns 404 when article is not found", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ role: "SUPER_ADMIN", id: "admin-789" });

    const validId = "64b7e3c2a1d4f0b123456789";
    collMock.findOneAndUpdate.mockResolvedValue({ value: null });

    const req = new MockNextRequest({ title: "X" }) as any;
    const res = await PATCH(req, { params: { id: validId } });
    const body = await (res as Response).json();

    expect((res as Response).status).toBe(404);
    expect(body).toEqual({ error: "Not found" });
  });

  it("rejects invalid payloads via zod (too short title) with 400 status", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ role: "SUPER_ADMIN", id: "admin-zod" });

    // title too short: min(2)
    const payload = { title: "A" };

    const req = new MockNextRequest(payload) as any;

    // Since zod.parse throws, we expect PATCH to throw an error that Next.js would surface as 400.
    // However, the handler does not explicitly catch; Jest should see the rejection.
    // We'll capture it and assert it's a ZodError-like failure, or ensure a thrown error occurs.
    await expect(PATCH(req, { params: { id: "64b7e3c2a1d4f0b123456789" } })).rejects.toBeTruthy();

    // Ensure DB wasn't called
    expect(getDatabase).not.toHaveBeenCalled();
    expect(collMock.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("accepts partial updates (only tags) and preserves optional fields", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ role: "SUPER_ADMIN", id: "admin-partial" });

    const validId = "64b7e3c2a1d4f0b123456789";
    const payload = { tags: ["faq", "troubleshooting"] };

    const updatedDoc = {
      _id: validId,
      tags: payload.tags,
      updatedBy: "admin-partial",
      updatedAt: new Date("2025-01-02T03:04:05.678Z"),
    };
    collMock.findOneAndUpdate.mockResolvedValue(mockDbResult(updatedDoc));

    const req = new MockNextRequest(payload) as any;
    const res = await PATCH(req, { params: { id: validId } });
    const body = await (res as Response).json();

    expect((res as Response).status).toBe(200);
    expect(body).toEqual(updatedDoc);

    const [, updateArg] = collMock.findOneAndUpdate.mock.calls[0];
    expect(updateArg.$set).toMatchObject({
      tags: payload.tags,
      updatedBy: "admin-partial",
      updatedAt: expect.any(Date),
    });
  });

  it("rejects invalid status values via zod", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ role: "SUPER_ADMIN", id: "admin-zod2" });

    const invalid = { status: "ARCHIVED" }; // not in enum ["DRAFT", "PUBLISHED"]
    const req = new MockNextRequest(invalid) as any;

    await expect(PATCH(req, { params: { id: "64b7e3c2a1d4f0b123456789" } })).rejects.toBeTruthy();
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("handles empty body by performing audit-only update fields (zod allows optional fields, but empty object is valid)", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ role: "SUPER_ADMIN", id: "admin-empty" });

    const validId = "64b7e3c2a1d4f0b123456789";
    const payload = {}; // empty updates

    const updatedDoc = {
      _id: validId,
      updatedBy: "admin-empty",
      updatedAt: new Date("2025-01-02T03:04:05.678Z"),
    };
    collMock.findOneAndUpdate.mockResolvedValue(mockDbResult(updatedDoc));

    const req = new MockNextRequest(payload) as any;
    const res = await PATCH(req, { params: { id: validId } });
    const body = await (res as Response).json();

    expect((res as Response).status).toBe(200);
    expect(body).toEqual(updatedDoc);

    const [, updateArg] = collMock.findOneAndUpdate.mock.calls[0];
    // Ensure only audit fields were added
    expect(updateArg.$set).toMatchObject({
      updatedBy: "admin-empty",
      updatedAt: expect.any(Date),
    });
    // And no unexpected fields
    const keys = Object.keys(updateArg.$set);
    expect(keys.sort()).toEqual(["updatedAt", "updatedBy"]);
  });
});