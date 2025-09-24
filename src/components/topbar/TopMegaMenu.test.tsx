import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock useTopBar from TopBarContext. The component imports from '@/src/contexts/TopBarContext'
let mockTopBar:{ topMenuCollapsed:boolean; setTopMenuCollapsed: (v:boolean)=>void; isRTL:boolean };

(vitest === "vitest" ? vi : jest).mock?.("@/src/contexts/TopBarContext", () => ({
  useTopBar: () => mockTopBar
}));

// Mock next/link to a simple anchor so hrefs are testable
(vitest === "vitest" ? vi : jest).mock?.("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>
}));

// Mock lucide-react icons to simple spans to avoid SVG complexity in tests
(vitest === "vitest" ? vi : jest).mock?.("lucide-react", () => new Proxy({}, { get: () => (props:any) => <span data-testid="icon" {...props} /> }));

import { TopMegaMenu } from "./TopMegaMenu";

describe("TopMegaMenu", () => {
  beforeEach(() => {
    mockTopBar = {
      topMenuCollapsed: true,
      setTopMenuCollapsed: (vitest === "vitest" ? vi.fn() : jest.fn()),
      isRTL: false
    } as any;
  });

  it("renders the toggle button with correct initial aria-expanded when collapsed", () => {
    render(<TopMegaMenu />);
    const btn = screen.getByRole("button", { name: /modules/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-expanded", "false");
    // icon rendered
    const icons = screen.getAllByTestId("icon");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("toggles expansion state on click and calls setTopMenuCollapsed with inverted value", () => {
    render(<TopMegaMenu />);
    const btn = screen.getByRole("button", { name: /modules/i });
    fireEvent.click(btn);
    expect(mockTopBar.setTopMenuCollapsed).toHaveBeenCalledWith(false);
  });

  it("shows module links when expanded and hides when collapsed", () => {
    render(<TopMegaMenu />);
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();

    mockTopBar.topMenuCollapsed = false;
    render(<TopMegaMenu />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /work orders/i })).toHaveAttribute("href", "/work-orders");
    expect(screen.getByRole("link", { name: /properties/i })).toHaveAttribute("href", "/properties");
    expect(screen.getByRole("link", { name: /reports/i })).toHaveAttribute("href", "/reports");
  });

  it("updates aria-expanded to true when expanded", () => {
    mockTopBar.topMenuCollapsed = false;
    render(<TopMegaMenu />);
    const btn = screen.getByRole("button", { name: /modules/i });
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("renders the expected number of module links when expanded", () => {
    mockTopBar.topMenuCollapsed = false;
    render(<TopMegaMenu />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(12);
  });

  it("handles rapid multiple toggles without throwing", () => {
    render(<TopMegaMenu />);
    const btn = screen.getByRole("button", { name: /modules/i });
    for (let i = 0; i < 5; i++) {
      fireEvent.click(btn);
    }
    expect(mockTopBar.setTopMenuCollapsed).toHaveBeenCalledTimes(5);
  });

  it("respects RTL flag (present for future styling logic) without affecting functionality", () => {
    mockTopBar.isRTL = true;
    render(<TopMegaMenu />);
    const btn = screen.getByRole("button", { name: /modules/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(mockTopBar.setTopMenuCollapsed).toHaveBeenCalledWith(true);
  });
});