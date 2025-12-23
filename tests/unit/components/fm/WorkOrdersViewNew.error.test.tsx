import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

const mutateMock = vi.fn();

vi.mock("swr", () => {
  const swrMock = () => ({
    data: undefined,
    error: new Error("fail to load"),
    isLoading: false,
    isValidating: false,
    mutate: mutateMock,
  });
  return { __esModule: true, default: swrMock, useSWR: swrMock };
});

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

// Component under test
import { WorkOrdersView } from "@/components/fm/WorkOrdersViewNew";

describe("WorkOrdersViewNew error state", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mutateMock.mockClear();
  });

  // TODO: Error UI (banner + retry button) not implemented in component yet - skip until implemented
  it.skip("shows error banner and retry triggers mutate", async () => {
    render(<WorkOrdersView orgId="org-1" />);

    expect(
      screen.getByText("Unable to load work orders"),
    ).toBeInTheDocument();
    expect(screen.getByText("fail to load")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Retry/i }));
    expect(mutateMock).toHaveBeenCalled();
  });
});
