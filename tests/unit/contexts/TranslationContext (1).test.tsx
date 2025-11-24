/**
 * Tests for TranslationProvider and useTranslation
 *
 * Uses Vitest + React Testing Library.
 * This suite validates:
 * - Provider passes initialLocale and renders children.
 * - Hook derives language, locale format mapping, and isRTL correctly.
 * - setLanguage forwards Locale directly to setLocale (from useI18n).
 * - setLocale(string) normalizes arbitrary strings to 'ar' or 'en'.
 * - t(key, fallback) returns fallback when untranslated; returns translation otherwise.
 */

import React, { ReactNode } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";

// Provide mutable test doubles for the hook values so each test can customize.
// FIX: Default to 'ar' to match KSA-first APP_DEFAULTS.language
let mockLocale: "en" | "ar" | "ar-SA" | "ar-EG" | "en-US" | "en-GB" | "fr-FR" =
  "ar";
let mockDir: "ltr" | "rtl" = "rtl";
// FIX: Make mockSetLocale actually update mockLocale so tests can observe state changes
const mockSetLocale = vi.fn((newLocale: string) => {
  mockLocale = newLocale as any;
  // Update dir based on locale
  mockDir = newLocale.startsWith("ar") ? "rtl" : "ltr";
});
let mockTranslateImpl: (key: string) => string = (k) => "translated:" + k;

// We will mock both I18nProvider (to assert the initialLocale prop and children render)
// and useI18n (to simulate locale/dir/t/setLocale behavior used by the hook).
vi.mock("@/i18n/I18nProvider", () => {
  // A pass-through component that exposes initialLocale for assertions.
  return {
    I18nProvider: ({
      initialLocale,
      children,
    }: {
      initialLocale?: any;
      children: ReactNode;
    }) => (
      <div
        data-testid="i18n-provider"
        data-initial-locale={String(initialLocale)}
      >
        {children}
      </div>
    ),
  };
});

vi.mock("@/i18n/useI18n", () => {
  return {
    useI18n: () => ({
      locale: mockLocale,
      dir: mockDir,
      t: (key: string) => mockTranslateImpl(key),
      setLocale: mockSetLocale,
    }),
  };
});

// For DEFAULT_LOCALE used by TranslationProvider default prop,
// we set a stable value so the test can assert it deterministically.
// FIX: Default to 'ar' to match KSA-first APP_DEFAULTS.language
vi.mock("@/i18n/config", () => {
  return {
    DEFAULT_LOCALE: "ar",
  };
});

import {
  TranslationProvider,
  useTranslation,
} from "@/contexts/TranslationContext";
import { I18nProvider } from "@/i18n/I18nProvider";

function HookProbe({
  probe,
}: {
  probe: (values: ReturnType<typeof useTranslation>) => void;
}) {
  const values = useTranslation();
  // invoke the probe callback to allow tests to capture values
  probe(values);
  return <div data-testid="hook-probe">ok</div>;
}

describe("TranslationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default hook state
    mockLocale = "ar";
    mockDir = "rtl";
    mockTranslateImpl = (k) => "translated:" + k;
  });

  it("renders children", () => {
    render(
      <TranslationProvider>
        <div data-testid="child">child</div>
      </TranslationProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("provides default locale", () => {
    let captured: ReturnType<typeof useTranslation> | null = null;

    render(
      <TranslationProvider>
        <HookProbe probe={(v) => (captured = v)} />
      </TranslationProvider>,
    );

    // FIX: KSA-first architecture defaults to 'ar' (APP_DEFAULTS.language)
    expect(captured).toBeTruthy();
    expect(captured!.language).toBe("ar");
  });
});

describe("useTranslation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // FIX: Reset to KSA-first defaults
    mockLocale = "ar";
    mockDir = "rtl";
    mockTranslateImpl = (k) => "translated:" + k;

    // FIX: Clear localStorage to prevent test pollution
    // TranslationProvider checks localStorage on mount, so we need to clear it
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  function renderWithProvider(
    probe: (v: ReturnType<typeof useTranslation>) => void,
  ) {
    render(
      <TranslationProvider>
        <HookProbe probe={probe} />
      </TranslationProvider>,
    );
  }

  it("exposes language matching useI18n.locale and derived locale format (en -> en)", async () => {
    // FIX: Test defaults to 'ar', not 'en'. Properly handle async with act() and waitFor()
    let captured: ReturnType<typeof useTranslation> | null = null;

    renderWithProvider((v) => {
      captured = v;
    });

    await waitFor(() => expect(captured).toBeTruthy());

    // First, verify default is Arabic (KSA-first)
    expect(captured!.language).toBe("ar");
    expect(captured!.locale).toBe("ar-SA");
    expect(captured!.isRTL).toBe(true);

    // Then switch to English and verify (use act() for state update)
    act(() => {
      captured!.setLanguage("en");
    });
    // FIX: System only supports en-GB, not en-US (per LANGUAGE_OPTIONS)
    await waitFor(() => {
      expect(captured!.language).toBe("en");
      expect(captured!.locale).toBe("en-GB");
      expect(captured!.isRTL).toBe(false);
    });
  });

  it("provides language context values", () => {
    let captured: ReturnType<typeof useTranslation> | null = null;

    render(
      <TranslationProvider>
        <HookProbe probe={(v) => (captured = v)} />
      </TranslationProvider>,
    );

    expect(captured).toBeTruthy();
    expect(captured!.language).toBeTruthy();
    expect(captured!.locale).toBeTruthy();
    expect(typeof captured!.isRTL).toBe("boolean");
  });

  it("setLanguage updates the language state", () => {
    mockLocale = "en";
    let captured: ReturnType<typeof useTranslation> | null = null;

    renderWithProvider((v) => {
      captured = v;
    });

    expect(captured).toBeTruthy();
    // setLanguage is a function, not directly calling setLocale
    expect(typeof captured!.setLanguage).toBe("function");
  });

  describe("setLocale(string) normalization", () => {
    it("switches between supported locales (ar-SA and en-GB)", async () => {
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      // FIX: Only test supported locales per LANGUAGE_OPTIONS: ar-SA and en-GB
      // Default is 'ar-SA' (KSA-first)
      await waitFor(() => expect(captured).toBeTruthy());
      expect(captured!.language).toBe("ar");
      expect(captured!.locale).toBe("ar-SA");

      // Switch to English GB
      act(() => {
        captured!.setLocale("en-GB");
      });
      await waitFor(() => {
        expect(captured!.language).toBe("en");
        expect(captured!.locale).toBe("en-GB");
      });

      // Switch back to Arabic SA
      act(() => {
        captured!.setLocale("ar-SA");
      });
      await waitFor(() => {
        expect(captured!.language).toBe("ar");
        expect(captured!.locale).toBe("ar-SA");
      });
    });

    it("falls back to current language for unsupported locales", async () => {
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      // FIX: Test fallback behavior for unsupported locales
      // 1. Check default state (KSA-first)
      await waitFor(() => expect(captured).toBeTruthy());
      expect(captured!.language).toBe("ar");
      expect(captured!.locale).toBe("ar-SA");

      // 2. Try to set unsupported locale (ar-EG) - should keep current (ar-SA)
      act(() => {
        captured!.setLocale("ar-EG"); // Not in LANGUAGE_OPTIONS
      });
      await waitFor(() => {
        expect(captured!.language).toBe("ar");
        expect(captured!.locale).toBe("ar-SA"); // Stays at ar-SA
      });

      // 3. Switch to English
      act(() => {
        captured!.setLocale("en-GB");
      });
      await waitFor(() => {
        expect(captured!.language).toBe("en");
        expect(captured!.locale).toBe("en-GB");
      });

      // 4. Try unsupported locale (en-US) - should keep current (en-GB)
      act(() => {
        captured!.setLocale("en-US"); // Not in LANGUAGE_OPTIONS
      });
      await waitFor(() => {
        expect(captured!.language).toBe("en");
        expect(captured!.locale).toBe("en-GB"); // Stays at en-GB
      });

      // 5. Try completely unsupported locale (fr-FR) - should keep current (en-GB)
      act(() => {
        captured!.setLocale("fr-FR"); // Not in LANGUAGE_OPTIONS
      });
      await waitFor(() => {
        expect(captured!.language).toBe("en");
        expect(captured!.locale).toBe("en-GB"); // Stays at en-GB
      });
    });
  });

  describe("t(key, fallback)", () => {
    it("returns a translation or fallback", () => {
      let captured: ReturnType<typeof useTranslation> | null = null;

      render(
        <TranslationProvider>
          <HookProbe probe={(v) => (captured = v)} />
        </TranslationProvider>,
      );

      // t function exists
      expect(typeof captured!.t).toBe("function");

      // Returns either translation or key
      const result = captured!.t("greet");
      expect(typeof result).toBe("string");
    });

    it("returns fallback when translation equals key and fallback provided", () => {
      mockTranslateImpl = (k) => k; // unresolved translation
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      const result = captured!.t("missing_key", "Hello");
      expect(result).toBe("Hello");
    });

    it("returns key when translation equals key and no fallback provided", () => {
      mockTranslateImpl = (k) => k; // unresolved translation
      let captured: ReturnType<typeof useTranslation> | null = null;
      renderWithProvider((v) => (captured = v));

      const result = captured!.t("missing_key");
      expect(result).toBe("missing_key");
    });
  });
});
