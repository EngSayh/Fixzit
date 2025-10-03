import * as svc from "./wo.service";
// Removed references to deleted modules - tests need updating
import { withIdempotency, createIdempotencyKey } from "@/server/security/idempotency";
import { WoCreate, WoUpdate } from "./wo.schema";

// Jest/Vitest compatibility shims
const g = global as any;
const isVitest = typeof g.vi !== "undefined";
const testRunner = isVitest ? g.vi : g.jest;

testRunner.mock("./wo.repo", () => ({
  woCreate: testRunner.fn(),
  woUpdate: testRunner.fn(),
  woGet: testRunner.fn(),
  woList: testRunner.fn(),
}));
testRunner.mock("@/server/utils/audit", () => ({
  audit: testRunner.fn(),
}));
testRunner.mock("@/server/security/idempotency", () => ({
  withIdempotency: testRunner.fn(),
  createIdempotencyKey: testRunner.fn(),
}));
testRunner.mock("./wo.schema", () => ({
  WoCreate: { parse: testRunner.fn() },
  WoUpdate: { parse: testRunner.fn() },
}));

// Mock the repo and audit imports (referenced below but not imported)
const repo = {
  woCreate: jest.fn(),
  woUpdate: jest.fn(),
  woGet: jest.fn(),
  woList: jest.fn(),
};

const audit = jest.fn();

const mocked = {
  woCreate: (repo as any).woCreate as jest.Mock,
  woUpdate: (repo as any).woUpdate as jest.Mock,
  woGet: (repo as any).woGet as jest.Mock,
  woList: (repo as any).woList as jest.Mock,
  audit: audit as unknown as jest.Mock,
  withIdempotency: withIdempotency as unknown as jest.Mock,
  createIdempotencyKey: createIdempotencyKey as unknown as jest.Mock,
  WoCreateParse: (WoCreate as any).parse as jest.Mock,
  WoUpdateParse: (WoUpdate as any).parse as jest.Mock,
};

describe("wo.service", () => {
  const tenantId = "t-123";
  const actorId = "u-456";
  const ip = "127.0.0.1";

  beforeEach(() => {
    testRunner.clearAllMocks();
  });

  describe("create", () => {
    it("creates a work order with idempotency and audits the action (happy path)", async () => {
      const input = { foo: "bar" };
      const parsed = { tenantId, code: "WO-1", foo: "bar" };
      const key = "idem:wo:create:t-123:abc";
      const wo = { id: "1", code: "WO-1", tenantId };

      mocked.WoCreateParse.mockReturnValue(parsed);
      mocked.createIdempotencyKey.mockReturnValue(key);
      mocked.withIdempotency.mockImplementation(async (_key: string, cb: any) => cb());
      mocked.woCreate.mockResolvedValue(wo);
      mocked.audit.mockResolvedValue(undefined);

      const res = await svc.create(input, actorId, ip);

      expect(mocked.WoCreateParse).toHaveBeenCalledWith(input);
      expect(mocked.createIdempotencyKey).toHaveBeenCalledWith("wo:create", { tenantId, payload: parsed });
      expect(mocked.withIdempotency).toHaveBeenCalledTimes(1);
      expect(mocked.withIdempotency.mock.calls[0][0]).toBe(key);
      // Ensure the idempotent callback invoked repo.woCreate with parsed payload
      expect(mocked.woCreate).toHaveBeenCalledWith(parsed);
      expect(mocked.audit).toHaveBeenCalledWith(tenantId, actorId, "wo.create", `workOrder:${wo.code}`, { wo }, ip);
      expect(res).toEqual(wo);
    });

    it("propagates validation error and does not create or audit when schema parse fails", async () => {
      const input = { bad: true };
      const err = new Error("invalid");
      mocked.WoCreateParse.mockImplementation(() => { throw err; });

      await expect(svc.create(input, actorId, ip)).rejects.toThrow(err);

      expect(mocked.woCreate).not.toHaveBeenCalled();
      expect(mocked.withIdempotency).not.toHaveBeenCalled();
      expect(mocked.audit).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    const id = "wo-id-1";

    it("updates with non-status patch without fetching existing (skips transition checks)", async () => {
      const input = { description: "new" };
      const patch = { description: "new" };
      const updated = { id, code: "WO-2", tenantId, description: "new" };

      mocked.WoUpdateParse.mockReturnValue(patch);
      mocked.woUpdate.mockResolvedValue(updated);
      mocked.audit.mockResolvedValue(undefined);

      const res = await svc.update(id, input, tenantId, actorId, ip);

      expect(mocked.WoUpdateParse).toHaveBeenCalledWith(input);
      expect(mocked.woGet).not.toHaveBeenCalled();
      expect(mocked.woUpdate).toHaveBeenCalledWith(id, patch);
      expect(mocked.audit).toHaveBeenCalledWith(tenantId, actorId, "wo.update", `workOrder:${updated.code}`, { patch }, ip);
      expect(res).toEqual(updated);
    });

    it("allows valid status transition and audits", async () => {
      const input = { status: "ASSIGNED" };
      const patch = { status: "ASSIGNED" };
      const existing = { id, code: "WO-3", tenantId, status: "NEW" };
      const updated = { ...existing, status: "ASSIGNED" };

      mocked.WoUpdateParse.mockReturnValue(patch);
      mocked.woGet.mockResolvedValue(existing);
      mocked.woUpdate.mockResolvedValue(updated);
      mocked.audit.mockResolvedValue(undefined);

      const res = await svc.update(id, input, tenantId, actorId, ip);

      expect(mocked.woGet).toHaveBeenCalledWith(id);
      expect(mocked.woUpdate).toHaveBeenCalledWith(id, patch);
      expect(mocked.audit).toHaveBeenCalledWith(tenantId, actorId, "wo.update", `workOrder:${updated.code}`, { patch }, ip);
      expect(res).toEqual(updated);
    });

    it("rejects invalid status transition", async () => {
      const input = { status: "COMPLETED" }; // invalid from NEW
      const patch = { status: "COMPLETED" };
      const existing = { id, code: "WO-4", tenantId, status: "NEW" };

      mocked.WoUpdateParse.mockReturnValue(patch);
      mocked.woGet.mockResolvedValue(existing);

      await expect(svc.update(id, input, tenantId, actorId, ip))
        .rejects
        .toThrow("Invalid transition NEW -> COMPLETED");

      expect(mocked.woUpdate).not.toHaveBeenCalled();
      expect(mocked.audit).not.toHaveBeenCalled();
    });

    it("throws Not found when wo missing or tenant mismatched", async () => {
      const input = { status: "CANCELLED" };
      const patch = { status: "CANCELLED" };

      mocked.WoUpdateParse.mockReturnValue(patch);
      mocked.woGet.mockResolvedValue(null);

      await expect(svc.update(id, input, tenantId, actorId, ip)).rejects.toThrow("Not found");
      expect(mocked.woUpdate).not.toHaveBeenCalled();
      expect(mocked.audit).not.toHaveBeenCalled();

      // Tenant mismatch case
      mocked.woGet.mockResolvedValue({ id, code: "WO-5", tenantId: "other", status: "ASSIGNED" });
      await expect(svc.update(id, input, tenantId, actorId, ip)).rejects.toThrow("Not found");
      expect(mocked.woUpdate).not.toHaveBeenCalled();
      expect(mocked.audit).not.toHaveBeenCalled();
    });

    it("propagates validation error from WoUpdate.parse and skips repo calls", async () => {
      const input = { status: 123 }; // invalid
      const err = new Error("invalid patch");
      mocked.WoUpdateParse.mockImplementation(() => { throw err; });

      await expect(svc.update(id, input, tenantId, actorId, ip)).rejects.toThrow(err);

      expect(mocked.woGet).not.toHaveBeenCalled();
      expect(mocked.woUpdate).not.toHaveBeenCalled();
      expect(mocked.audit).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("returns list using provided filters", async () => {
      const rows = [{ id: "1" }, { id: "2" }];
      mocked.woList.mockResolvedValue(rows);

      const res = await svc.list(tenantId, "abc", "NEW");

      expect(mocked.woList).toHaveBeenCalledWith(tenantId, "abc", "NEW");
      expect(res).toEqual(rows);
    });

    it("supports undefined filters", async () => {
      const rows = [{ id: "3" }];
      mocked.woList.mockResolvedValue(rows);

      const res = await svc.list(tenantId);

      expect(mocked.woList).toHaveBeenCalledWith(tenantId, undefined, undefined);
      expect(res).toEqual(rows);
    });
  });
});