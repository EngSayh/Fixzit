import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mocks
const authMock = vi.hoisted(() => vi.fn());
const findOneMock = vi.hoisted(() => vi.fn());
const getSettingsMock = vi.hoisted(() => vi.fn());
const enableMock = vi.hoisted(() => vi.fn());
const disableMock = vi.hoisted(() => vi.fn());
const repriceMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/models/souq/Seller", () => ({
  SouqSeller: {
    findOne: (...args: unknown[]) => ({
      lean: () => findOneMock(...args),
    }),
  },
}));

vi.mock("@/services/souq/auto-repricer-service", () => ({
  AutoRepricerService: {
    getRepricerSettings: getSettingsMock,
    enableAutoRepricer: enableMock,
    disableAutoRepricer: disableMock,
    repriceSeller: repriceMock,
  },
}));

let settingsHandler: typeof import("@/app/api/souq/repricer/settings/route").GET;
let settingsPostHandler: typeof import("@/app/api/souq/repricer/settings/route").POST;
let settingsDeleteHandler: typeof import("@/app/api/souq/repricer/settings/route").DELETE;
let runHandler: typeof import("@/app/api/souq/repricer/run/route").POST;

describe("repricer routes seller resolution", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    ({ GET: settingsHandler, POST: settingsPostHandler, DELETE: settingsDeleteHandler } =
      await import("@/app/api/souq/repricer/settings/route"));
    ({ POST: runHandler } = await import("@/app/api/souq/repricer/run/route"));
  });

  it("returns 404 when seller not found (settings GET)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", orgId: "org-1" } });
    findOneMock.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/souq/repricer/settings", {
      method: "GET",
    });
    const res = await settingsHandler(req);
    expect(res.status).toBe(404);
  });

  it("returns 404 when seller not found (settings POST)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", orgId: "org-1" } });
    findOneMock.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/souq/repricer/settings", {
      method: "POST",
      body: JSON.stringify({ settings: { enabled: true, rules: {} } }),
    });
    const res = await settingsPostHandler(req);
    expect(res.status).toBe(404);
    expect(enableMock).not.toHaveBeenCalled();
  });

  it("returns 404 when seller not found (settings DELETE)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", orgId: "org-1" } });
    findOneMock.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/souq/repricer/settings", {
      method: "DELETE",
    });
    const res = await settingsDeleteHandler(req);
    expect(res.status).toBe(404);
    expect(disableMock).not.toHaveBeenCalled();
  });

  it("returns 404 when seller not found (run POST)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", orgId: "org-1" } });
    findOneMock.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/souq/repricer/run", {
      method: "POST",
    });
    const res = await runHandler(req);
    expect(res.status).toBe(404);
    expect(repriceMock).not.toHaveBeenCalled();
  });

  it("calls service when seller exists", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", orgId: "org-1" } });
    findOneMock.mockResolvedValue({ _id: "seller-1" });
    getSettingsMock.mockResolvedValue({ enabled: true });

    const req = new NextRequest("http://localhost/api/souq/repricer/settings", {
      method: "GET",
    });
    const res = await settingsHandler(req);
    expect(res.status).toBe(200);
    expect(getSettingsMock).toHaveBeenCalledWith("seller-1", "org-1");
  });
});
