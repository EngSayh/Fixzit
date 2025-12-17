import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => ({
    get: () => null,
  }),
}));

vi.mock("@/lib/i18n/server", () => ({
  getServerI18n: vi.fn().mockResolvedValue({ locale: "en" }),
}));

// Avoid pulling client components/hooks into the test environment
vi.mock("@/components/superadmin/SuperadminLayoutClient", () => ({
  SuperadminLayoutClient: ({ children }: { children: ReactNode }) => (
    <div data-testid="superadmin-layout-client">{children}</div>
  ),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSessionFromCookies: vi.fn(),
}));

import SuperadminLayout from "@/app/superadmin/layout";
import { redirect } from "next/navigation";
import { getSuperadminSessionFromCookies } from "@/lib/superadmin/auth";

describe("SuperadminLayout auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login when session is missing", async () => {
    vi.mocked(getSuperadminSessionFromCookies).mockResolvedValue(null);

    await SuperadminLayout({ children: <div>content</div> });

    expect(redirect).toHaveBeenCalledWith("/superadmin/login");
  });

  it("redirects to login when session is expired", async () => {
    vi.mocked(getSuperadminSessionFromCookies).mockResolvedValue({
      username: "root",
      role: "super_admin",
      expiresAt: Date.now() - 1_000,
    } as any);

    await SuperadminLayout({ children: <div>content</div> });

    expect(redirect).toHaveBeenCalledWith("/superadmin/login");
  });

  it("renders when session is valid", async () => {
    vi.mocked(getSuperadminSessionFromCookies).mockResolvedValue({
      username: "root",
      role: "super_admin",
      expiresAt: Date.now() + 60_000,
    } as any);

    const result = await SuperadminLayout({ children: <div>ok</div> });

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
