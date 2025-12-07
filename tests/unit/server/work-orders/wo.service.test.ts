// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockConnect,
  mockCreate,
  mockFindById,
  mockFindByIdAndUpdate,
  mockWithIdempotency,
  mockCreateIdempotencyKey,
  mockWoCreateParse,
  mockWoUpdateParse,
} = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindByIdAndUpdate: vi.fn(),
  mockWithIdempotency: vi.fn(async (_key: string, cb: () => Promise<unknown>) =>
    cb(),
  ),
  mockCreateIdempotencyKey: vi.fn(() => "idem-key"),
  mockWoCreateParse: vi.fn(),
  mockWoUpdateParse: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: mockConnect,
}));

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    create: mockCreate,
    findById: mockFindById,
    findByIdAndUpdate: mockFindByIdAndUpdate,
  },
}));

vi.mock("@/server/security/idempotency", () => ({
  withIdempotency: mockWithIdempotency,
  createIdempotencyKey: mockCreateIdempotencyKey,
}));

vi.mock("./wo.schema", () => ({
  WoCreate: { parse: mockWoCreateParse },
  WoUpdate: { parse: mockWoUpdateParse },
}));

import * as service from "@/server/work-orders/wo.service";

describe("wo.service", () => {
  const actorId = "actor-1";
  const orgId = "tenant-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a work order with validation, idempotency, and defaults applied", async () => {
    const input = {
      orgId,
      title: "Leaky faucet",
      description: "Kitchen sink",
      propertyId: "prop-1",
      requesterId: "req-1",
    };
    const validated = {
      ...input,
      slaHours: 72,
      responseMinutes: 120,
      priority: "MEDIUM",
      type: "MAINTENANCE",
      category: "GENERAL",
    };
    const created = {
      id: "wo-1",
      workOrderNumber: "WO-1",
      status: "SUBMITTED",
    };

    mockWoCreateParse.mockReturnValue(validated);
    mockWithIdempotency.mockImplementation(async (_key, cb) => cb());
    mockCreate.mockResolvedValue(created);

    const result = await service.create(input as any, actorId, "127.0.0.1");

    expect(mockConnect).toHaveBeenCalled();
    expect(mockWoCreateParse).toHaveBeenCalledWith(input);
    expect(mockCreateIdempotencyKey).toHaveBeenCalledWith("wo:create", {
      orgId,
      title: validated.title,
    });
    expect(mockWithIdempotency).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        title: validated.title,
        status: "SUBMITTED",
        statusHistory: expect.any(Array),
      }),
    );
    expect(result).toBe(created);
  });

  it("propagates validation errors before idempotency or persistence", async () => {
    const err = new Error("invalid");
    mockWoCreateParse.mockImplementation(() => {
      throw err;
    });

    await expect(service.create({} as any, actorId)).rejects.toThrow(err);

    expect(mockCreateIdempotencyKey).not.toHaveBeenCalled();
    expect(mockWithIdempotency).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("updates a work order with valid transition and SLA adjustments", async () => {
    const id = "wo-123";
    const patch = { status: "IN_PROGRESS", responseMinutes: 90 };
    const existing = { _id: id, status: "ASSIGNED", orgId };
    const updated = { ...existing, status: "IN_PROGRESS" };

    mockWoUpdateParse.mockReturnValue(patch);
    mockFindById.mockResolvedValue(existing);
    mockFindByIdAndUpdate.mockResolvedValue(updated);

    const res = await service.update(
      id,
      patch as any,
      orgId,
      actorId,
      "10.0.0.1",
    );

    expect(mockConnect).toHaveBeenCalled();
    expect(mockWoUpdateParse).toHaveBeenCalledWith(patch);
    expect(mockFindById).toHaveBeenCalledWith(id);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      id,
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "IN_PROGRESS",
          "sla.responseTimeMinutes": 90,
        }),
      }),
      { new: true },
    );
    expect(res).toEqual(updated);
  });

  it("rejects invalid status transitions", async () => {
    const id = "wo-404";
    mockWoUpdateParse.mockReturnValue({ status: "IN_PROGRESS" });
    mockFindById.mockResolvedValue({ _id: id, status: "CLOSED", orgId });

    await expect(
      service.update(id, { status: "IN_PROGRESS" }, orgId, actorId),
    ).rejects.toThrow(/Invalid state transition/);

    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});
