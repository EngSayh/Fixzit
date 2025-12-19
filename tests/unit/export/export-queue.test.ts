import { describe, it, expect, vi } from "vitest";
import { enqueueExportJob } from "@/lib/export/export-queue";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


vi.mock("@/lib/queues/setup", () => ({
  addJob: vi.fn(async (_queue: string, _name: string, data: unknown) => ({
    id: "job-123",
    data,
  })),
  QUEUE_NAMES: { EXPORTS: "fm:exports" },
}));

describe("enqueueExportJob", () => {
  it("sends export job payload to exports queue", async () => {
    const payload = {
      jobId: "abc",
      orgId: "org1",
      userId: "user1",
      entityType: "workOrders" as const,
      format: "csv" as const,
      filters: { status: "OPEN" },
      search: "pump",
      ids: ["1", "2"],
    };

    const job = await enqueueExportJob(payload);
    expect(job.data).toMatchObject(payload);
  });
});
