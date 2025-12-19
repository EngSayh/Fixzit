import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock WorkOrdersView to avoid data fetching
vi.mock("@/components/fm/WorkOrdersViewNew", () => ({
  WorkOrdersView: () => <div data-testid="workorders-view">WorkOrders</div>,
}));

// Mock TopBar/Sidebar to expose language/currency selectors and shell regions
vi.mock("@/components/TopBar", () => ({
  __esModule: true,
  default: () => (
    <div data-testid="topbar">
      <div data-testid="language-select" />
      <div data-testid="currency-selector" />
    </div>
  ),
}));

vi.mock("@/components/Sidebar", () => ({
  __esModule: true,
  default: () => <nav data-testid="sidebar" />,
}));

// Mock ResponsiveLayout to render header/sidebar/content slots
vi.mock("@/components/ResponsiveLayout", () => ({
  __esModule: true,
  default: ({
    header,
    sidebar,
    children,
  }: {
    header: React.ReactNode;
    sidebar: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="responsive-layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <section data-testid="content">{children}</section>
    </div>
  ),
}));

import { AppShell } from "@/components/layout/AppShell";
import { WorkOrdersView } from "@/components/fm/WorkOrdersViewNew";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("AppShell + WorkOrders smoke", () => {
  it("renders shell with topbar/sidebar, language/currency selectors, and content", () => {
    render(
      <AppShell pageTitle="Work Orders">
        <WorkOrdersView orgId="org-1" heading="Work Orders" description="desc" />
      </AppShell>,
    );

    expect(screen.getByTestId("responsive-layout")).toBeInTheDocument();
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("language-select")).toBeInTheDocument();
    expect(screen.getByTestId("currency-selector")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toHaveTextContent("WorkOrders");
  });
});
