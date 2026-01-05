/**
 * TranslationProvider + useTranslation tests (Vitest + RTL)
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
const hoistedMocks = vi.hoisted(() => {
  const state = { locale: "ar" as "en" | "ar", dir: "rtl" as "ltr" | "rtl" };
  const setLocale = vi.fn<(locale: "en" | "ar") => void>().mockImplementation((locale) => {
    // Simulate actual i18n behavior - update state when locale is set
    state.locale = locale;
    state.dir = locale === "ar" ? "rtl" : "ltr";
  });
  const t = vi.fn<(key: string) => string>();
  return {
    state,
    setLocale,
    t,
  };
});

const mockI18nState = hoistedMocks.state;
const mockSetLocale = hoistedMocks.setLocale;
const mockTranslate = hoistedMocks.t;

vi.mock("@/i18n/useI18n", () => ({
  useI18n: () => ({
    locale: mockI18nState.locale,
    dir: mockI18nState.dir,
    t: mockTranslate,
    setLocale: mockSetLocale,
  }),
}));

vi.mock("@/i18n/config", () => ({
  DEFAULT_LOCALE: "ar",
}));

// Dynamic import used in beforeAll - static import removed to avoid unused variable warning
type TranslationModule = typeof import("@/contexts/TranslationContext");
type TranslationContextValue = ReturnType<TranslationModule["useTranslation"]>;

let TranslationProvider: TranslationModule["TranslationProvider"];
let useTranslationHook: TranslationModule["useTranslation"];

beforeAll(async () => {
  vi.resetModules();
  const translationModule = await import("@/contexts/TranslationContext");
  TranslationProvider = translationModule.TranslationProvider;
  useTranslationHook = translationModule.useTranslation;
});

const Capture = ({
  report,
}: {
  report: (value: TranslationContextValue) => void;
}) => {
  const ctx = useTranslationHook();
  report(ctx);
  return <div data-testid="capture" />;
};

function renderWithCapture(report: (value: TranslationContextValue) => void) {
  return render(
    <TranslationProvider>
      <Capture report={report} />
    </TranslationProvider>,
  );
}

describe("TranslationProvider / useTranslation", () => {
  beforeEach(() => {
    mockI18nState.locale = "ar";
    mockI18nState.dir = "rtl";
    mockSetLocale.mockClear();
    mockTranslate.mockImplementation((key: string) => `i18n:${key}`);
  });

  it("renders children", () => {
    render(
      <TranslationProvider>
        <div data-testid="child">child</div>
      </TranslationProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("derives language metadata from useI18n locale", async () => {
    mockI18nState.locale = "en";
    mockI18nState.dir = "ltr";

    let captured: TranslationContextValue | null = null;
    renderWithCapture((value) => {
      captured = value;
    });

    expect(captured).not.toBeNull();
    expect(captured!.language).toBe("en");
    expect(captured!.locale).toBe("en-GB");
    expect(captured!.isRTL).toBe(false);
  });

  it("setLanguage forwards to useI18n.setLocale", async () => {
    let captured: TranslationContextValue | null = null;
    renderWithCapture((value) => {
      captured = value;
    });

    expect(captured).not.toBeNull();
    await act(async () => {
      captured!.setLanguage("en");
    });
    expect(mockSetLocale).toHaveBeenCalledWith("en");
  });

  it("setLocale normalizes friendly locale strings", async () => {
    let captured: TranslationContextValue | null = null;
    renderWithCapture((value) => {
      captured = value;
    });

    expect(captured).not.toBeNull();
    await act(async () => {
      captured!.setLocale("en-GB");
    });
    expect(mockSetLocale).toHaveBeenCalledWith("en");

    mockSetLocale.mockClear();
    await act(async () => {
      captured!.setLocale("ar-SA");
    });
    expect(mockSetLocale).toHaveBeenCalledWith("ar");
  });

  it("setLocale normalizes supported locale variants", async () => {
    let captured: TranslationContextValue | null = null;
    renderWithCapture((value) => {
      captured = value;
    });

    expect(captured).not.toBeNull();
    expect(captured!.language).toBe("ar");
    
    await act(async () => {
      captured!.setLocale("fr-FR");
    });
    expect(mockSetLocale).toHaveBeenCalled();
    const calledWith = mockSetLocale.mock.calls[0][0];
    expect(calledWith).toBe("fr");
  });

  it("t(key, fallback) returns fallback when translator returns key", async () => {
    mockTranslate.mockImplementation((key: string) => key);
    let captured: TranslationContextValue | null = null;
    renderWithCapture((value) => {
      captured = value;
    });

    expect(captured).not.toBeNull();
    const result = captured!.t("missing.key", "Fallback value");
    expect(result).toBe("Fallback value");
  });
});
