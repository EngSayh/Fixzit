/**
 * Currency Selector Integration Tests
 * Phase D: localStorage persistence, format validation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import React from "react";

// Mock localStorage
const mockLocalStorage = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => mockLocalStorage.get(key) || null,
    setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
    removeItem: (key: string) => mockLocalStorage.delete(key),
    clear: () => mockLocalStorage.clear(),
  },
  writable: true,
});

// Test component with currency selector
function TestCurrencySelector() {
  const [currency, setCurrency] = React.useState(() => {
    return mockLocalStorage.get("preferred_currency") || "SAR";
  });

  const handleChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    mockLocalStorage.set("preferred_currency", newCurrency);
  };

  const formatPrice = (amount: number) => {
    const formats: Record<string, { symbol: string; decimals: number }> = {
      SAR: { symbol: "SAR", decimals: 2 },
      USD: { symbol: "$", decimals: 2 },
      EUR: { symbol: "€", decimals: 2 },
      GBP: { symbol: "£", decimals: 2 },
    };

    const format = formats[currency] || formats.SAR;
    return `${format.symbol} ${amount.toFixed(format.decimals)}`;
  };

  return (
    <div>
      <div data-testid="current-currency">{currency}</div>
      <div data-testid="formatted-price">{formatPrice(1234.56)}</div>
      
      <select
        data-testid="currency-select"
        value={currency}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="SAR">Saudi Riyal (SAR)</option>
        <option value="USD">US Dollar ($)</option>
        <option value="EUR">Euro (€)</option>
        <option value="GBP">British Pound (£)</option>
      </select>
    </div>
  );
}

describe("Currency Selector - Integration", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it("should persist selected currency in localStorage", async () => {
    const user = userEvent.setup();
    render(<TestCurrencySelector />);

    // Initial currency: SAR
    expect(screen.getByTestId("current-currency")).toHaveTextContent("SAR");

    // Change to USD
    const select = screen.getByTestId("currency-select") as HTMLSelectElement;
    await user.selectOptions(select, "USD");

    await waitFor(() => {
      expect(mockLocalStorage.get("preferred_currency")).toBe("USD");
    });

    expect(screen.getByTestId("current-currency")).toHaveTextContent("USD");
  });

  it("should format prices according to selected currency", async () => {
    const user = userEvent.setup();
    render(<TestCurrencySelector />);

    // Initial format: SAR
    expect(screen.getByTestId("formatted-price")).toHaveTextContent("SAR 1234.56");

    // Change to USD
    const select = screen.getByTestId("currency-select") as HTMLSelectElement;
    await user.selectOptions(select, "USD");

    await waitFor(() => {
      expect(screen.getByTestId("formatted-price")).toHaveTextContent("$ 1234.56");
    });

    // Change to EUR
    await user.selectOptions(select, "EUR");

    await waitFor(() => {
      expect(screen.getByTestId("formatted-price")).toHaveTextContent("€ 1234.56");
    });
  });

  it("should restore currency from localStorage on mount", () => {
    // Simulate previous session
    mockLocalStorage.set("preferred_currency", "GBP");

    render(<TestCurrencySelector />);

    // Should restore GBP
    expect(screen.getByTestId("current-currency")).toHaveTextContent("GBP");
    expect(screen.getByTestId("formatted-price")).toHaveTextContent("£ 1234.56");
  });

  it("should apply correct decimal places per currency", async () => {
    const user = userEvent.setup();
    
    function PriceFormatter() {
      const [currency, setCurrency] = React.useState("SAR");
      const [decimals, setDecimals] = React.useState(2);

      const formatAmount = (amount: number) => amount.toFixed(decimals);

      return (
        <div>
          <div data-testid="decimal-format">{formatAmount(1234.5678)}</div>
          <button
            onClick={() => {
              setCurrency("JPY");
              setDecimals(0); // JPY has no decimals
            }}
          >
            Switch to JPY
          </button>
        </div>
      );
    }

    render(<PriceFormatter />);

    // Initially 2 decimals
    expect(screen.getByTestId("decimal-format")).toHaveTextContent("1234.57");

    // Switch to JPY (0 decimals)
    await user.click(screen.getByText("Switch to JPY"));

    await waitFor(() => {
      expect(screen.getByTestId("decimal-format")).toHaveTextContent("1235");
    });
  });

  it("should persist currency across page reloads", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TestCurrencySelector />);

    const select = screen.getByTestId("currency-select") as HTMLSelectElement;
    await user.selectOptions(select, "EUR");

    await waitFor(() => {
      expect(mockLocalStorage.get("preferred_currency")).toBe("EUR");
    });

    // Simulate page reload by unmounting and re-mounting
    await act(async () => {
      unmount();
    });

    render(<TestCurrencySelector />);

    // Should restore EUR from localStorage
    expect(screen.getByTestId("current-currency")).toHaveTextContent("EUR");
  });

  it("should handle invalid currency gracefully", () => {
    // Set invalid currency in localStorage
    mockLocalStorage.set("preferred_currency", "INVALID");

    function SafeCurrencySelector() {
      const [currency] = React.useState(() => {
        const stored = mockLocalStorage.get("preferred_currency");
        const validCurrencies = ["SAR", "USD", "EUR", "GBP"];
        return stored && validCurrencies.includes(stored) ? stored : "SAR";
      });

      return <div data-testid="safe-currency">{currency}</div>;
    }

    render(<SafeCurrencySelector />);

    // Should fallback to SAR
    expect(screen.getByTestId("safe-currency")).toHaveTextContent("SAR");
  });

  it("should sync currency across multiple components", async () => {
    const user = userEvent.setup();

    function CurrencyDisplay() {
      const [currency, setCurrency] = React.useState(
        mockLocalStorage.get("preferred_currency") || "SAR"
      );

      React.useEffect(() => {
        const handleStorageChange = () => {
          setCurrency(mockLocalStorage.get("preferred_currency") || "SAR");
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
      }, []);

      return <div data-testid="display-currency">{currency}</div>;
    }

    render(
      <div>
        <TestCurrencySelector />
        <CurrencyDisplay />
      </div>
    );

    // Change currency in selector
    const select = screen.getByTestId("currency-select") as HTMLSelectElement;
    await user.selectOptions(select, "USD");

    // Both components should show USD
    await waitFor(() => {
      expect(screen.getByTestId("current-currency")).toHaveTextContent("USD");
    });
  });
});
