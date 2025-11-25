import { describe, expect, it } from "vitest";
import { validateEscrowEventPayload } from "@/services/souq/settlements/escrow-events.contract";

const basePayload = {
  escrowAccountId: "escrow-123",
  orgId: "org-123",
  amount: 1500,
  currency: "SAR",
  transactionId: "txn-1",
};

describe("escrow webhook payload contract", () => {
  it("accepts funded payload with extras", () => {
    const parsed = validateEscrowEventPayload("escrow.funded", {
      ...basePayload,
      sourceId: "order-1",
      idempotencyKey: "abc",
    });

    expect(parsed.escrowAccountId).toBe(basePayload.escrowAccountId);
    expect(parsed.amount).toBe(basePayload.amount);
    expect(parsed.sourceId).toBe("order-1");
  });

  it("enforces required escrow id and org id", () => {
    expect(() =>
      validateEscrowEventPayload("escrow.created", {
        amount: 10,
      }),
    ).toThrowError();
  });

  it("supports release payload contract", () => {
    const parsed = validateEscrowEventPayload("escrow.released", {
      ...basePayload,
      releaseId: "rel-1",
    });
    expect(parsed.releaseId).toBe("rel-1");
  });
});
