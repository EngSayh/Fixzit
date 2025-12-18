import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, beforeEach, vi, expect, afterEach } from "vitest";
import { SWRConfig, mutate as globalMutate } from "swr";
import { WorkOrdersView } from "@/components/fm/WorkOrdersViewNew";

// Mock navigation to avoid router push side effects
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/fm/work-orders",
}));

// Provide a no-op translation hook
vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || "",
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("WorkOrdersViewNew filters", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    globalMutate(() => true, undefined, { revalidate: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], page: 1, limit: 20, total: 0 }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends overdue filter when quick chip is clicked", async () => {
    render(<WorkOrdersView orgId="org-123" />, { wrapper: TestWrapper });

    const overdueChip = screen.getByText("Overdue");
    await user.click(overdueChip);

    // expect last fetch to include overdue=true
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("overdue=true");
    expect(lastUrl).toContain("org=org-123");
  });
});
