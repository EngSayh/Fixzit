import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock contexts
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    currency: "USD",
    setCurrency: vi.fn(),
    options: [
      { code: "USD", name: "US Dollar", flag: "🇺🇸" },
      { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦" },
    ],
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (_k: string, fallback?: string) => fallback || "",
    isRTL: false,
  }),
}));

import CurrencySelector from "@/components/i18n/CurrencySelector";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("CurrencySelector smoke", () => {
  it("renders trigger and opens list with currency options", async () => {
    const user = userEvent.setup();
    render(<CurrencySelector variant="compact" />);

    const trigger = screen.getByRole("button", { name: /select currency/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /usd/i })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /sar/i })).toBeInTheDocument();
  });
});
