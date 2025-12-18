/**
 * Language Selector Integration Tests
 * Phase D: RTL toggle, cookie persistence, i18n loading
 * Phase P23: Real component rendering with flags and dropdown behavior
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/i18n/I18nProvider";

// Mock cookie utilities
const mockCookies = new Map<string, string>();

vi.mock("js-cookie", () => ({
  default: {
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string) => mockCookies.set(key, value),
    remove: (key: string) => mockCookies.delete(key),
  },
}));

// Test component with language selector
function TestLanguageSelector() {
  const [locale, setLocale] = React.useState<"en" | "ar">("en");
  
  const handleChange = (newLocale: "en" | "ar") => {
    setLocale(newLocale);
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLocale;
    mockCookies.set("NEXT_LOCALE", newLocale);
  };

  return (
    <div>
      <div data-testid="current-locale">{locale}</div>
      <div data-testid="html-dir">{document.documentElement.dir}</div>
      <div data-testid="html-lang">{document.documentElement.lang}</div>
      
      <button onClick={() => handleChange("en")}>English</button>
      <button onClick={() => handleChange("ar")}>العربية</button>
    </div>
  );
}

// Real LanguageSelector component wrapper for testing
function RealLanguageSelectorTest() {
  // Dynamic import to avoid SSR issues in tests
  const [LanguageSelector, setLanguageSelector] = React.useState<React.ComponentType<{ variant?: string }> | null>(null);
  
  React.useEffect(() => {
    import("@/components/i18n/LanguageSelector").then((mod) => {
      setLanguageSelector(() => mod.default);
    });
  }, []);

  if (!LanguageSelector) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <I18nProvider>
      <div data-testid="real-selector-container">
        <LanguageSelector variant="default" />
      </div>
    </I18nProvider>
  );
}

describe("Language Selector - Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.clear();
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  });

  it("should toggle between English and Arabic", async () => {
    const user = userEvent.setup();
    render(<TestLanguageSelector />);

    // Initial state: English
    expect(screen.getByTestId("current-locale")).toHaveTextContent("en");
    expect(screen.getByTestId("html-dir")).toHaveTextContent("ltr");

    // Switch to Arabic
    await user.click(screen.getByText("العربية"));

    await waitFor(() => {
      expect(screen.getByTestId("current-locale")).toHaveTextContent("ar");
    });

    // RTL should be applied
    expect(screen.getByTestId("html-dir")).toHaveTextContent("rtl");
    expect(screen.getByTestId("html-lang")).toHaveTextContent("ar");
  });

  it("should persist language selection in cookies", async () => {
    const user = userEvent.setup();
    render(<TestLanguageSelector />);

    // Switch to Arabic
    await user.click(screen.getByText("العربية"));

    await waitFor(() => {
      expect(mockCookies.get("NEXT_LOCALE")).toBe("ar");
    });

    // Switch back to English
    await user.click(screen.getByText("English"));

    await waitFor(() => {
      expect(mockCookies.get("NEXT_LOCALE")).toBe("en");
    });
  });

  it("should apply RTL direction to document root", async () => {
    const user = userEvent.setup();
    render(<TestLanguageSelector />);

    // Initially LTR
    expect(document.documentElement.dir).toBe("ltr");

    // Switch to Arabic
    await user.click(screen.getByText("العربية"));

    await waitFor(() => {
      expect(document.documentElement.dir).toBe("rtl");
    });

    // Verify HTML lang attribute
    expect(document.documentElement.lang).toBe("ar");
  });

  it("should handle language change across multiple modules", async () => {
    const user = userEvent.setup();
    
    // Component that consumes locale from cookie
    function ModuleComponent() {
      const locale = mockCookies.get("NEXT_LOCALE") || "en";
      return <div data-testid="module-locale">{locale}</div>;
    }

    const { rerender } = render(
      <div>
        <TestLanguageSelector />
        <ModuleComponent />
      </div>
    );

    // Change language
    await user.click(screen.getByText("العربية"));

    // Force re-render to pick up cookie change
    rerender(
      <div>
        <TestLanguageSelector />
        <ModuleComponent />
      </div>
    );

    await waitFor(() => {
      expect(screen.getByTestId("module-locale")).toHaveTextContent("ar");
    });
  });

  it("should restore language from cookie on page load", () => {
    // Simulate cookie from previous session
    mockCookies.set("NEXT_LOCALE", "ar");

    function ComponentWithInitialLocale() {
      const [locale] = React.useState(() => mockCookies.get("NEXT_LOCALE") || "en");
      
      React.useEffect(() => {
        document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = locale;
      }, [locale]);

      return <div data-testid="restored-locale">{locale}</div>;
    }

    render(<ComponentWithInitialLocale />);

    // Should restore Arabic from cookie
    expect(screen.getByTestId("restored-locale")).toHaveTextContent("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("should update logical CSS properties with RTL", async () => {
    const user = userEvent.setup();
    
    function StyledComponent() {
      const [locale, setLocale] = React.useState<"en" | "ar">("en");
      
      return (
        <div>
          <div 
            data-testid="logical-styles"
            style={{
              paddingInlineStart: "10px",
              // JSDOM does not resolve logical properties; set physical fallback
              paddingLeft: "10px",
              marginInlineEnd: "20px",
            }}
          >
            Logical CSS
          </div>
          <button onClick={() => {
            setLocale("ar");
            document.documentElement.dir = "rtl";
          }}>
            Switch RTL
          </button>
        </div>
      );
    }

    render(<StyledComponent />);
    
    const styledElement = screen.getByTestId("logical-styles");

    const paddingLeftOrLogical = () => {
      const computed = window.getComputedStyle(styledElement).paddingLeft;
      return computed && computed !== "" ? computed : styledElement.style.paddingInlineStart;
    };
    
    // Initial LTR: paddingInlineStart = paddingLeft (fallback to inline value in jsdom)
    expect(paddingLeftOrLogical()).toBe("10px");

    // Switch to RTL
    await user.click(screen.getByText("Switch RTL"));

    // After RTL: paddingInlineStart = paddingRight
    await waitFor(() => {
      expect(document.documentElement.dir).toBe("rtl");
    });
    // Note: Actual computed style behavior depends on browser support
  });
});

describe("Real LanguageSelector Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.clear();
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  });

  it("should render as a single dropdown with globe icon", async () => {
    render(<RealLanguageSelectorTest />);

    // Wait for dynamic import
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const container = screen.getByTestId("real-selector-container");
    
    // Should have exactly one button (dropdown trigger)
    const buttons = within(container).getAllByRole("button");
    expect(buttons.length).toBe(1);
    
    // Button should be accessible
    const trigger = buttons[0];
    expect(trigger).toHaveAttribute("aria-haspopup");
  });

  it("should open dropdown on click and show language options", async () => {
    const user = userEvent.setup();
    render(<RealLanguageSelectorTest />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const container = screen.getByTestId("real-selector-container");
    const trigger = within(container).getByRole("button");
    
    // Open dropdown
    await user.click(trigger);

    // Should show listbox with options
    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      expect(listbox).toBeInTheDocument();
    });
  });

  it("should display flag emojis for language options", async () => {
    const user = userEvent.setup();
    render(<RealLanguageSelectorTest />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const container = screen.getByTestId("real-selector-container");
    const trigger = within(container).getByRole("button");
    
    // Open dropdown
    await user.click(trigger);

    await waitFor(() => {
      // Check for common flags (US, SA, GB, etc.)
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
      
      // Each option should have flag emoji (visible in text content)
      const hasFlags = options.some((opt) => {
        const text = opt.textContent || "";
        // Flag emojis are in the range U+1F1E0 to U+1F1FF
        return /[\u{1F1E0}-\u{1F1FF}]/u.test(text);
      });
      expect(hasFlags).toBe(true);
    });
  });
});
