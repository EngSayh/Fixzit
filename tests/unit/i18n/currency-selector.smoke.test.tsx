import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    currency: "SAR",
    setCurrency: vi.fn(),
    options: [
      { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦" },
      { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
    ],
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    isRTL: true,
  }),
}));

import CurrencySelector from "@/components/i18n/CurrencySelector";

describe("CurrencySelector smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders options and allows selection", () => {
    render(<CurrencySelector variant="compact" />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    const usdOptions = screen.getAllByText("USD");
    expect(usdOptions.length).toBeGreaterThan(0);
    fireEvent.click(usdOptions[usdOptions.length - 1]);
  });
});
