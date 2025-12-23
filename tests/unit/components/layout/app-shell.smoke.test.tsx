import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock nested components to avoid layout complexity and still assert presence
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

// Provide a simple responsive layout that renders header/sidebar/content slots
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

describe("AppShell smoke (non-superadmin)", () => {
  it("renders topbar, sidebar, and content with language/currency selectors", () => {
    render(
      <AppShell pageTitle="Dashboard">
        <div data-testid="child-content">Hello</div>
      </AppShell>,
    );

    expect(screen.getByTestId("responsive-layout")).toBeInTheDocument();
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
    expect(screen.getByTestId("language-select")).toBeInTheDocument();
    expect(screen.getByTestId("currency-selector")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toHaveTextContent("Hello");
  });
});
