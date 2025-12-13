import { describe, it, expect, vi, beforeEach } from "vitest";

const getDatabaseMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: getDatabaseMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

describe("loadTenantConfigFromDatabase fail-closed behavior", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getDatabaseMock.mockRejectedValue(new Error("db down"));
  });

  it("logs and rejects when database access fails", async () => {
    const { loadTenantConfigFromDatabase } = await import("@/lib/config/tenant.server");

    await expect(loadTenantConfigFromDatabase("507f1f77bcf86cd799439011")).rejects.toThrow(
      /db down/i,
    );
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "[TenantConfig] Failed to load tenant configuration",
      expect.objectContaining({
        orgId: "507f1f77bcf86cd799439011",
      }),
    );
  });

  it("clears pending cache after failure so subsequent calls re-attempt", async () => {
    const { loadTenantConfigFromDatabase } = await import("@/lib/config/tenant.server");
    await expect(loadTenantConfigFromDatabase("org-a")).rejects.toThrow();
    await expect(loadTenantConfigFromDatabase("org-a")).rejects.toThrow();
    expect(getDatabaseMock).toHaveBeenCalledTimes(2);
  });
});
