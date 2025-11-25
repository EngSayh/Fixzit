import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import WorkOrdersPage from "@/app/fm/work-orders/page";

const mockUseSupportOrg = vi.fn();
const workOrdersViewSpy = vi.fn();

vi.mock("@/components/fm/ModuleViewTabs", () => ({
  __esModule: true,
  default: ({ moduleId }: { moduleId: string }) => (
    <div data-testid="module-tabs">{moduleId}</div>
  ),
}));

vi.mock("@/components/fm/WorkOrdersView", () => ({
  __esModule: true,
  WorkOrdersView: (props: { orgId?: string }) => {
    workOrdersViewSpy(props);
    return <div data-testid="work-orders-view">org:{props.orgId}</div>;
  },
}));

vi.mock("@/contexts/SupportOrgContext", () => ({
  useSupportOrg: () => mockUseSupportOrg(),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, vars?: Record<string, unknown>) => {
      if (vars?.name) {
        return (fallback ?? key).replace("{{name}}", String(vars.name));
      }
      return fallback ?? key;
    },
  }),
}));

describe("app/fm/work-orders/page", () => {
  beforeEach(() => {
    mockUseSupportOrg.mockReset();
    workOrdersViewSpy.mockReset();
  });

  it("renders org guard prompt when no organization selected", () => {
    mockUseSupportOrg.mockReturnValue({
      effectiveOrgId: null,
      canImpersonate: true,
      supportOrg: null,
    });

    render(<WorkOrdersPage />);

    expect(screen.getByText("Organization Required")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Please select an organization from the top bar to continue.",
      ),
    ).toBeInTheDocument();
    expect(workOrdersViewSpy).not.toHaveBeenCalled();
  });

  it("passes org context to WorkOrdersView and shows support banner", () => {
    mockUseSupportOrg.mockReturnValue({
      effectiveOrgId: "org-abc",
      canImpersonate: true,
      supportOrg: { name: "Acme Corp" },
    });

    render(<WorkOrdersPage />);

    expect(screen.getByTestId("module-tabs")).toHaveTextContent("work_orders");
    expect(screen.getByText("Support context: Acme Corp")).toBeInTheDocument();
    expect(screen.getByTestId("work-orders-view")).toHaveTextContent(
      "org:org-abc",
    );
    expect(workOrdersViewSpy).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-abc" }),
    );
  });
});
