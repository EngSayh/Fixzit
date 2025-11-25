import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";

vi.mock("@/components/fm/useFmOrgGuard", () => ({
  useFmOrgGuard: vi.fn(),
}));

const mockUseFmOrgGuard = useFmOrgGuard as unknown as vi.Mock;

afterEach(() => {
  vi.clearAllMocks();
});

describe("FmGuardedPage", () => {
  it("renders guard UI when org context is missing", () => {
    mockUseFmOrgGuard.mockReturnValue({
      hasOrgContext: false,
      orgId: null,
      supportOrg: null,
      supportBanner: null,
      guard: <div data-testid="guard-ui">guard</div>,
    });

    render(
      <FmGuardedPage moduleId="dashboard">
        {() => <div data-testid="child">child</div>}
      </FmGuardedPage>,
    );

    expect(screen.getByTestId("guard-ui")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("renders children when org context is present and passes guard context through", () => {
    mockUseFmOrgGuard.mockReturnValue({
      hasOrgContext: true,
      orgId: "org-123",
      supportOrg: { name: "Support Org" },
      supportBanner: <div data-testid="banner">support banner</div>,
      guard: <div>guard</div>,
    });

    render(
      <FmGuardedPage moduleId="marketplace">
        {(ctx) => (
          <div>
            <div data-testid="child">child</div>
            <div data-testid="org-id">{ctx.orgId}</div>
            <div data-testid="banner-prop">{ctx.supportBanner}</div>
          </div>
        )}
      </FmGuardedPage>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByTestId("org-id")).toHaveTextContent("org-123");
    expect(screen.getByTestId("banner-prop")).toBeInTheDocument();
  });
});
