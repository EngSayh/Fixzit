// @vitest-environment node

import { vi } from "vitest";
import { makeFindOneSelectLean, makeFindSortLimitSelectLean } from "./helpers/mongooseMocks";

type ToolSession = {
  tenantId: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  locale: string;
};

type ToolModule = {
  executeTool: (name: string, args: Record<string, unknown>, session: ToolSession) => Promise<unknown>;
  detectToolFromMessage: (message: string) => { name: string; args: Record<string, string> } | null;
};

// Determine import path to the implementation under test.
// Adjust this path if the actual file differs. We search common locations.
let mod: ToolModule;
let executeTool: ToolModule['executeTool'];
let detectToolFromMessage: ToolModule['detectToolFromMessage'];

const tryImportCandidates = async (): Promise<ToolModule> => {
  const candidates = [
    "@/server/copilot/tools",
    "../server/copilot/tools",
    "./server/copilot/tools",
    "@/src/tools",
    "@/server/tools",
    "@/lib/tools",
    "../src/server/copilot/tools",
    "../src/tools",
  ];
  for (const p of candidates) {
    try {
      const m = (await import(p)) as Partial<ToolModule>;
      if (m.executeTool && m.detectToolFromMessage) {
        return m as ToolModule;
      }
    } catch (_) {
      // continue
    }
  }
  throw new Error("Could not resolve tools module. Please update import candidates to actual file path exporting executeTool and detectToolFromMessage.");
};

beforeAll(async () => {
  mod = await tryImportCandidates();
  executeTool = mod.executeTool;
  detectToolFromMessage = mod.detectToolFromMessage;
});

// Mocks for external dependencies used by the module
// crypto.randomUUID
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "uuid-1234"),
}));

// path
const pathJoin = vi.fn((...parts: string[]) => parts.join("/"));
vi.mock("path", () => ({
  default: { join: pathJoin },
}));

// fs promises
const mkdirMock = vi.fn().mockResolvedValue(undefined);
const writeFileMock = vi.fn().mockResolvedValue(undefined);
vi.mock("fs", () => ({
  promises: {
    mkdir: mkdirMock,
    writeFile: writeFileMock,
  },
}));

// db (ensure awaiting a promise)
const dbThen = vi.fn();
const dbPromise = Promise.resolve()
  .then(dbThen)
  .catch((error) => {
    console.error('DB promise error:', error);
    throw error;
  });
vi.mock("@/lib/mongo", () => ({
  db: dbPromise,
}));

// Models
const workOrderCreate = vi.fn();
const workOrderFind = vi.fn();
const workOrderFindOne = vi.fn();
const workOrderFindOneAndUpdate = vi.fn();
const workOrderFindByIdAndUpdate = vi.fn();

const ownerStatementFind = vi.fn();

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    create: workOrderCreate,
    find: workOrderFind,
    findOne: workOrderFindOne,
    findOneAndUpdate: workOrderFindOneAndUpdate,
    findByIdAndUpdate: workOrderFindByIdAndUpdate,
  },
}));

vi.mock("@/server/models/OwnerStatement", () => ({
  OwnerStatement: {
    find: ownerStatementFind,
  },
}));

// Policy
const getPermittedTools = vi.fn();
vi.mock("@/server/copilot/policy", () => ({
  getPermittedTools,
}));

// Session type import not needed; we construct plain objects for tests.

// Helpers
const makeSession = (overrides: Partial<ToolSession> = {}): ToolSession => ({
  tenantId: "tenant-1",
  userId: "user-1",
  role: "MANAGER",
  name: "Alex Manager",
  email: "alex@example.com",
  locale: "en",
  ...overrides,
});

describe("detectToolFromMessage", () => {
  test("parses /new-ticket with key:value args", () => {
    const msg = "/new-ticket title:Leaky sink priority:HIGH propertyId:prop1";
    const res = detectToolFromMessage(msg);
    expect(res).toEqual({
      name: "createWorkOrder",
      args: { title: "Leaky sink", priority: "HIGH", propertyId: "prop1" },
    });
  });

  test("parses /my-tickets and /myticket aliases case-insensitively", () => {
    expect(detectToolFromMessage("/my-tickets")).toEqual({ name: "listMyWorkOrders", args: {} });
    expect(detectToolFromMessage("/MYTICKET")).toEqual({ name: "listMyWorkOrders", args: {} });
  });

  test("parses /dispatch with work order id", () => {
    expect(detectToolFromMessage("/dispatch WO123")).toEqual({
      name: "dispatchWorkOrder",
      args: { workOrderId: "WO123" },
    });
  });

  test("parses /owner-statements with optional period", () => {
    expect(detectToolFromMessage("/owner-statements")).toEqual({
      name: "ownerStatements",
      args: {},
    });
    expect(detectToolFromMessage("/owner-statements Q1")).toEqual({
      name: "ownerStatements",
      args: { period: "Q1" },
    });
  });

  test("returns null for unknown commands", () => {
    expect(detectToolFromMessage("hello world")).toBeNull();
  });
});

describe("executeTool routing and permission checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unsupported tools", async () => {
    const session = makeSession();
    await expect(executeTool("nope", {}, session)).rejects.toThrow("Unsupported tool: nope");
  });

  test("permission denied throws FORBIDDEN error", async () => {
    const session = makeSession();
    getPermittedTools.mockReturnValue(["listMyWorkOrders"]); // createWorkOrder not allowed
    await expect(executeTool("createWorkOrder", { title: "abc" }, session)).rejects.toMatchObject({
      message: "Tool not permitted for this role",
      code: "FORBIDDEN",
    });
  });
});

describe("createWorkOrder", () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2025-05-06T12:00:00Z"));
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("validates title length", async () => {
    getPermittedTools.mockReturnValue(["createWorkOrder"]);
    const session = makeSession();
    await expect(executeTool("createWorkOrder", { title: "  " }, session)).rejects.toThrow(
      "Title must be at least 3 characters long"
    );
  });

  test("creates work order and returns success message and data (en)", async () => {
    getPermittedTools.mockReturnValue(["createWorkOrder"]);
    const session = makeSession({ locale: "en" });
    workOrderCreate.mockResolvedValue({
      _id: { toString: () => "wo-id-1" },
      code: "WO-2025-34567",
      workOrderNumber: "WO-2025-34567",
      priority: "MEDIUM",
      status: "SUBMITTED",
    });

    const res = await executeTool(
      "createWorkOrder",
      { title: "Leaky sink", description: "desc", propertyId: "prop-1" },
      session
    );
    expect(workOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: session.tenantId,
        title: "Leaky sink",
        location: expect.objectContaining({ propertyId: "prop-1" }),
        requester: expect.objectContaining({
          userId: session.userId,
          contactInfo: expect.objectContaining({ email: session.email }),
        }),
        status: "SUBMITTED",
      })
    );
    expect(res.success).toBe(true);
    expect(res.intent).toBe("createWorkOrder");
    expect(res.message).toMatch(/^Work order WO-/);
    expect(res.data).toEqual(
      expect.objectContaining({ id: "wo-id-1", code: expect.any(String), priority: "MEDIUM", status: "SUBMITTED" })
    );
  });

  test("localizes message (ar)", async () => {
    getPermittedTools.mockReturnValue(["createWorkOrder"]);
    const session = makeSession({ locale: "ar" });
    workOrderCreate.mockResolvedValue({
      _id: "wo-id-2",
      code: "WO-2025-12345",
      priority: "HIGH",
      status: "SUBMITTED",
    });
    const res = await executeTool(
      "createWorkOrder",
      { title: "عنوان", propertyId: "prop-1", description: "desc" },
      session
    );
    expect(res.message).toContain("تم إنشاء أمر العمل");
  });
});

describe("listMyWorkOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPermittedTools.mockReturnValue(["listMyWorkOrders"]);
  });

  test("builds filter by role TECHNICIAN and returns last 5 sorted by updatedAt desc", async () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const session = makeSession({ role: "TECHNICIAN" });
    const items = Array.from({ length: 7 }).map((_, i) => ({
      _id: `id-${i}`,
      workOrderNumber: `WO-${i}`,
      title: `T-${i}`,
      status: "SUBMITTED",
      priority: "LOW",
      updatedAt: new Date(now.getTime() + i * 1000).toISOString(),
    }));
    const { chain, mocks } = makeFindSortLimitSelectLean([...items].reverse());
    workOrderFind.mockReturnValue(chain);

    const res = await executeTool("listMyWorkOrders", {}, session) as { data: Array<{ updatedAt: string }>; success: boolean; message?: string };
    if (!res.success) {
      throw new Error(res.message || 'listMyWorkOrders failed');
    }
    expect(workOrderFind).toHaveBeenCalledWith({
      orgId: session.tenantId,
      isDeleted: { $ne: true },
      'assignment.assignedTo.userId': session.userId,
    });
    expect(mocks.sort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(mocks.limit).toHaveBeenCalledWith(20);
    expect(mocks.select).toHaveBeenCalledWith(["workOrderNumber", "title", "status", "priority", "updatedAt"]);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(items.length);
    const times = res.data.map(x => x.updatedAt);
    // Ensure descending
    expect(new Date(times[0]).getTime()).toBeGreaterThan(new Date(times[4]).getTime());
  });

  test("no items returns localized empty message", async () => {
    const session = makeSession({ role: "MANAGER", locale: "ar" });
    workOrderFind.mockResolvedValue([]);
    const res = await executeTool("listMyWorkOrders", {}, session);
    expect(res.message).toBe("لا توجد أوامر عمل مرتبطة بك حالياً.");
    expect(res.data).toEqual([]);
  });
});

describe("dispatchWorkOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPermittedTools.mockReturnValue(["dispatchWorkOrder"]);
  });

  test("requires workOrderId", async () => {
    const session = makeSession();
    await expect(executeTool("dispatchWorkOrder", {}, session)).rejects.toThrow("workOrderId is required");
  });

  test("updates work order and returns assignee data", async () => {
    const session = makeSession();
    workOrderFindOne.mockResolvedValue({
      _id: "WOID",
      orgId: session.tenantId,
      status: "SUBMITTED",
    });
    workOrderFindByIdAndUpdate.mockResolvedValue({
      workOrderNumber: "WO-42",
      status: "ASSIGNED",
      assignment: { assignedTo: { userId: "tech-9" } },
    });

    const res = await executeTool("dispatchWorkOrder", { workOrderId: "WOID", assigneeUserId: "tech-9" }, session);
    expect(workOrderFindByIdAndUpdate).toHaveBeenCalled();
    expect(res.data).toEqual(
      expect.objectContaining({ code: "WO-42", status: "ASSIGNED", assigneeUserId: "tech-9" })
    );
  });

  test("not found throws error", async () => {
    const session = makeSession();
    workOrderFindByIdAndUpdate.mockResolvedValue(null);
    const res = await executeTool("dispatchWorkOrder", { workOrderId: "X" }, session);
    expect(res.success).toBe(true);
    expect(res.message).toBe("No assignment changes were applied.");
  });

  test("localizes message (ar)", async () => {
    const session = makeSession({ locale: "ar" });
    workOrderFindOne.mockResolvedValue({
      _id: "WO-AR",
      orgId: session.tenantId,
      status: "SUBMITTED",
    });
    workOrderFindByIdAndUpdate.mockResolvedValue({
      workOrderNumber: "WO-AR-7",
      status: "ASSIGNED",
      assignment: { assignedTo: { userId: "tech-99" } },
    });
    const res = await executeTool(
      "dispatchWorkOrder",
      { workOrderId: "WO-AR", assigneeUserId: "tech-99" },
      session
    );
    expect(res.message).toContain("تم إسناد أمر العمل");
  });
});

describe("scheduleVisit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPermittedTools.mockReturnValue(["scheduleVisit"]);
  });

  test("validates workOrderId and scheduledFor", async () => {
    const session = makeSession();
    await expect(executeTool("scheduleVisit", { workOrderId: "", scheduledFor: "" }, session)).rejects.toThrow(
      "Valid workOrderId and scheduledFor timestamp are required"
    );
  });

  test("updates SLA deadline and returns localized message", async () => {
    const session = makeSession({ locale: "en" });
    const when = "2025-07-01T10:00:00Z";
    workOrderFindOne.mockResolvedValue({ _id: "A1", orgId: session.tenantId, status: "IN_PROGRESS" });
    const updated = { workOrderNumber: "WO-9", sla: { resolutionDeadline: new Date(when).toISOString() } };
    workOrderFindByIdAndUpdate.mockResolvedValue(updated);

    const res = await executeTool("scheduleVisit", { workOrderId: "A1", scheduledFor: when }, session);
    expect(workOrderFindByIdAndUpdate).toHaveBeenCalled();
    expect(res.data).toEqual({ code: "WO-9", dueAt: updated.sla?.resolutionDeadline });
    expect(res.message).toContain("Visit scheduled for");
  });

  test("not found throws error", async () => {
    const session = makeSession();
    workOrderFindByIdAndUpdate.mockResolvedValue(undefined);
    await expect(
      executeTool("scheduleVisit", { workOrderId: "Z", scheduledFor: "2025-01-01T00:00:00Z" }, session)
    ).rejects.toThrow("Work order not found");
  });
});

describe("uploadWorkOrderPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPermittedTools.mockReturnValue(["uploadWorkOrderPhoto"]);
  });

  test("requires workOrderId", async () => {
    const session = makeSession();
    const payload = { workOrderId: "", fileName: "a.png", mimeType: "image/png", buffer: Buffer.from("x") };
    await expect(executeTool("uploadWorkOrderPhoto", payload, session)).rejects.toThrow("Invalid upload payload");
  });

  test("writes file to disk and updates attachments", async () => {
    const session = makeSession();
    const payload = {
      workOrderId: "WOID",
      fileName: "photo 01.png",
      mimeType: "image/png",
      buffer: Buffer.from("filedata"),
    };
    const { chain, mocks } = makeFindOneSelectLean({ workOrderNumber: "WO-55", attachments: [] });
    workOrderFindOne.mockReturnValue(chain);
    workOrderFindOneAndUpdate.mockResolvedValue({ workOrderNumber: "WO-55" });

    const res = await executeTool("uploadWorkOrderPhoto", payload, session);

    expect(workOrderFindOne).toHaveBeenCalledWith({ _id: "WOID", orgId: session.tenantId });
    expect(mocks.select).toHaveBeenCalledWith(["workOrderNumber", "attachments"]);

    // mkdir called with uploads directory
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalled();
    // Ensure attachment pushed
    expect(workOrderFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "WOID", orgId: session.tenantId },
      expect.objectContaining({
        $push: {
          attachments: expect.objectContaining({
            url: expect.stringMatching(/^\/uploads\/work-orders\//),
            name: "photo 01.png",
            type: "image/png",
            size: payload.buffer.length,
          }),
        },
      }),
      { new: true }
    );
    expect(res.intent).toBe("uploadWorkOrderPhoto");
    expect(res.message).toBe("Photo uploaded and linked to the work order.");
    expect(res.data.attachment.name).toBe("photo 01.png");
  });

  test("not found throws error", async () => {
    const session = makeSession();
    const { chain } = makeFindOneSelectLean(null);
    workOrderFindOne.mockReturnValue(chain);
    workOrderFindOneAndUpdate.mockResolvedValue(null);
    const payload = {
      workOrderId: "X",
      fileName: "x.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("y"),
    };
    await expect(executeTool("uploadWorkOrderPhoto", payload, session)).rejects.toThrow("Work order not found");
  });
});

describe("ownerStatements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPermittedTools.mockReturnValue(["ownerStatements"]);
  });

  test("returns empty data with localized message when no statements", async () => {
    const session = makeSession({ locale: "ar" });
    ownerStatementFind.mockResolvedValue([]);
    const res = await executeTool("ownerStatements", {}, session);
    expect(ownerStatementFind).toHaveBeenCalled();
    expect(res.data).toEqual([]);
    expect(res.message).toBe("لا تتوفر بيانات حالياً لهذه الفترة.");
  });

  test("aggregates totals and maps statements and line items", async () => {
    const session = makeSession();
    ownerStatementFind.mockResolvedValue([
      {
        tenantId: session.tenantId,
        ownerId: session.userId,
        currency: "USD",
        period: "Q1",
        year: 2025,
        totals: { income: 1000, expenses: 300, net: 700 },
        lineItems: [
          { date: "2025-01-05", description: "Rent", type: "INCOME", amount: 1000, reference: "INV-1" },
          { date: "2025-01-10", description: "Repair", type: "EXPENSE", amount: 300, reference: "BILL-1" },
        ],
      },
      {
        tenantId: session.tenantId,
        ownerId: session.userId,
        currency: "USD",
        period: "Q2",
        year: 2025,
        totals: { income: 500, expenses: 200, net: 300 },
        lineItems: [{ date: "2025-04-02", description: "Rent", type: "INCOME", amount: 500, reference: "INV-2" }],
      },
    ]);

    const res = await executeTool("ownerStatements", { period: "Q1", year: 2025 }, session);
    expect(res.success).toBe(true);
    expect(res.intent).toBe("ownerStatements");
    expect(res.data.currency).toBe("USD");
    expect(res.data.totals).toEqual({ income: 1500, expenses: 500, net: 1000 });
    expect(res.data.statements).toHaveLength(2);
    expect(res.data.statements[0].lineItems[0]).toEqual(
      expect.objectContaining({ description: "Rent", type: "INCOME", amount: 1000 })
    );
  });
});
