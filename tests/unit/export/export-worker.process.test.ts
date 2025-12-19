import { describe, it, expect, vi, beforeEach } from "vitest";
import { processExportJob } from "@/jobs/export-worker";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const saveMock = vi.fn();

vi.mock("@/lib/storage/s3-config", () => ({
  assertS3Configured: vi.fn(() => ({ bucket: "test-bucket" })),
}));

vi.mock("@/lib/storage/s3", () => ({
  putObjectBuffer: vi.fn().mockResolvedValue(undefined),
  getPresignedGetUrl: vi.fn().mockResolvedValue("https://example.com/file.csv"),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

const exportJob = {
  _id: "job1",
  org_id: "org1",
  user_id: "user1",
  entity_type: "workOrders",
  format: "csv" as const,
  filters: {},
  ids: [],
  status: "queued",
  save: saveMock,
};

vi.mock("@/server/models/ExportJob", () => ({
  ExportJob: {
    findById: vi.fn().mockImplementation(async () => exportJob),
  },
}));

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    find: vi.fn(() => ({
      select: () => ({
        limit: () => ({
          lean: () => ({
            exec: () => Promise.resolve([{ workOrderNumber: "WO-1", title: "Fix AC", status: "OPEN" }]),
          }),
        }),
      }),
    })),
  },
}));

vi.mock("@/server/models/Invoice", () => ({ Invoice: { find: vi.fn() } }));
vi.mock("@/server/models/Employee", () => ({ Employee: { find: vi.fn() } }));
vi.mock("@/server/models/User", () => ({ User: { find: vi.fn() } }));
vi.mock("@/server/models/AuditLog", () => ({ AuditLog: { find: vi.fn() } }));
vi.mock("@/server/models/Property", () => ({ Property: { find: vi.fn() } }));
vi.mock("@/server/models/MarketplaceProduct", () => ({ MarketplaceProduct: { find: vi.fn() } }));

describe("processExportJob", () => {
  beforeEach(() => {
    saveMock.mockClear();
  });

  it("marks job completed and uploads CSV", async () => {
    const payload = {
      jobId: "job1",
      orgId: "org1",
      userId: "user1",
      entityType: "workOrders",
      format: "csv" as const,
      filters: {},
    };

    await processExportJob(payload);

    expect(exportJob.status).toBe("completed");
    expect(saveMock).toHaveBeenCalledTimes(2);
  });
});
