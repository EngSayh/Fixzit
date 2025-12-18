import { describe, it, expect, beforeEach, vi } from "vitest";
import { aggregateWithTenantScope } from "@/server/db/aggregateWithTenantScope";

describe("aggregateWithTenantScope", () => {
  const aggregateMock = vi.fn();
  const model = { aggregate: aggregateMock } as unknown as {
    aggregate: typeof aggregateMock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    aggregateMock.mockResolvedValue([]);
  });

  it("prepends orgId match and preserves pipeline", async () => {
    const pipeline = [{ $match: { status: "OPEN" } }, { $group: { _id: "$status" } }];
    await aggregateWithTenantScope(model as any, "org-123", pipeline, {});

    expect(aggregateMock).toHaveBeenCalledTimes(1);
    const [finalPipeline, opts] = aggregateMock.mock.calls[0];
    expect(finalPipeline[0]).toEqual({ $match: { status: "OPEN", orgId: "org-123" } });
    expect(finalPipeline.slice(1)).toEqual(pipeline.slice(1));
    expect(opts).toMatchObject({ maxTimeMS: 30_000 });
  });

  it("appends limit and respects maxTimeMS override", async () => {
    const pipeline = [{ $match: { status: "OPEN" } }];
    await aggregateWithTenantScope(model as any, "org-123", pipeline, {
      maxResults: 50,
      maxTimeMS: 10_000,
    });

    const [finalPipeline, opts] = aggregateMock.mock.calls[0];
    expect(finalPipeline.at(-1)).toEqual({ $limit: 50 });
    expect(opts).toMatchObject({ maxTimeMS: 10_000 });
  });
});
