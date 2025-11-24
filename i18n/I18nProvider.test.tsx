/**
 * Testing library and framework:
 * - This test suite uses React Testing Library with Vitest in a jsdom environment.
 */
import React, { useContext } from "react";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, test, expect } from "vitest";

/**
 * Mock config and dictionaries BEFORE importing the module under test
 * to ensure DICTIONARIES and meta are built from predictable values.
 */
vi.mock("./config", () => ({
  DEFAULT_LOCALE: "ar",
  SUPPORTED_LOCALES: ["en", "ar"],
  LOCALE_META: {
    en: { dir: "ltr" },
    ar: { dir: "rtl" },
  } as const,
}));

const DEFAULT_LOCALE = "ar";
const LOCALE_META = {
  en: { dir: "ltr" },
  ar: { dir: "rtl" },
} as const;

vi.mock("./dictionaries/en", () => ({
  default: { greeting: "Hello", code: "en" },
}));

vi.mock("./dictionaries/ar", () => ({
  default: { greeting: "مرحبا", code: "ar" },
}));

import { I18nProvider, I18nContext } from "./I18nProvider";

interface I18nContextValue {
  locale: string;
  dir: string;
  dict: Record<string, string>;
  setLocale: (locale: string, options?: { persist?: boolean }) => Promise<void>;
}

function resetCookies() {
  // Expire cookies we know I18nProvider writes
  const past = "Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "locale=;expires=" + past + ";path=/";
  document.cookie = "fxz.locale=;expires=" + past + ";path=/";
  document.cookie = "fxz.lang=;expires=" + past + ";path=/";
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  resetCookies();
  vi.clearAllMocks();
  // Provide a default fetch mock
  global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
});

afterEach(() => {
  cleanup();
});

interface I18nContextValue {
  locale: string;
  dir: string;
  dict: Record<string, string>;
  setLocale: (locale: string, options?: { persist?: boolean }) => Promise<void>;
}

function CaptureContext(props: {
  onValue?: (v: I18nContextValue | null) => void;
}) {
  const ctx = useContext(I18nContext);
  if (props.onValue) props.onValue(ctx);
  return (
    <div>
      <div data-testid="locale">{ctx?.locale}</div>
      <div data-testid="dir">{ctx?.dir}</div>
      <div data-testid="dict">{JSON.stringify(ctx?.dict)}</div>
    </div>
  );
}

describe("I18nProvider", () => {
  test("renders children and provides default context values from DEFAULT_LOCALE", async () => {
    render(
      <I18nProvider>
        <CaptureContext />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale").textContent).toBe(DEFAULT_LOCALE);
    expect(screen.getByTestId("dir").textContent).toBe(
      LOCALE_META[DEFAULT_LOCALE].dir,
    );

    // Wait for dictionary to load asynchronously
    await waitFor(() => {
      const dict = JSON.parse(screen.getByTestId("dict").textContent || "{}");
      const expectedDict =
        DEFAULT_LOCALE === "ar"
          ? { greeting: "مرحبا", code: "ar" }
          : { greeting: "Hello", code: "en" };
      expect(dict).toEqual(expectedDict);
    });

    // Document attributes should reflect initial locale
    const defaultDir = LOCALE_META[DEFAULT_LOCALE].dir;
    expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
    expect(document.documentElement.dir).toBe(defaultDir);
    expect(document.documentElement.classList.contains("rtl")).toBe(
      defaultDir === "rtl",
    );
    expect(document.documentElement.getAttribute("data-locale")).toBe(
      DEFAULT_LOCALE,
    );
    expect(document.body.style.direction).toBe(defaultDir);
  });

  test("respects initialLocale prop", async () => {
    render(
      <I18nProvider initialLocale="ar">
        <CaptureContext />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale").textContent).toBe("ar");
    expect(screen.getByTestId("dir").textContent).toBe("rtl");

    // Wait for dictionary to load asynchronously
    await waitFor(() => {
      const dict = JSON.parse(screen.getByTestId("dict").textContent || "{}");
      expect(dict).toEqual({ greeting: "مرحبا", code: "ar" });
    });

    // Document attributes should reflect RTL
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.classList.contains("rtl")).toBe(true);
    expect(document.documentElement.getAttribute("data-locale")).toBe("ar");
    expect(document.body.style.direction).toBe("rtl");
  });

  test("setLocale updates state, persists to storage and cookies, and POSTs to /api/i18n", async () => {
    let ctxRef: I18nContextValue | null = null;
    render(
      <I18nProvider>
        <CaptureContext onValue={(v) => (ctxRef = v)} />
      </I18nProvider>,
    );

    await act(async () => {
      ctxRef.setLocale("ar");
    });

    // State updated
    expect(screen.getByTestId("locale").textContent).toBe("ar");
    expect(screen.getByTestId("dir").textContent).toBe("rtl");

    // Storage updated
    expect(localStorage.getItem("locale")).toBe("ar");
    expect(localStorage.getItem("fxz.locale")).toBe("ar-SA");
    expect(localStorage.getItem("fxz.lang")).toBe("ar");

    // Cookies updated
    expect(document.cookie).toContain("locale=ar");
    expect(document.cookie).toContain("fxz.locale=ar-SA");
    expect(document.cookie).toContain("fxz.lang=ar");

    // Fetch called
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/i18n", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "ar" }),
    });

    // Document updates + event dispatch
    const handler = vi.fn();
    window.addEventListener("fixzit:language-change", handler);
    await act(async () => {
      ctxRef?.setLocale("en");
    });

    // Check document updates for LTR
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.classList.contains("rtl")).toBe(false);
    expect(document.body.style.direction).toBe("ltr");

    // Event emitted with correct detail
    await waitFor(() => {
      expect(handler).toHaveBeenCalled();
    });

    const evt = handler.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toMatchObject({
      locale: "en",
      language: "en",
      dir: "ltr",
    });

    window.removeEventListener("fixzit:language-change", handler);
  });

  test("setLocale with { persist: false } updates context and DOM but does not touch storage/cookies/fetch", async () => {
    let ctxRef: I18nContextValue | null = null;
    render(
      <I18nProvider>
        <CaptureContext onValue={(v) => (ctxRef = v)} />
      </I18nProvider>,
    );

    // Ensure clean baseline for cookies and storage
    localStorage.clear();
    resetCookies();
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    await act(async () => {
      ctxRef?.setLocale("ar", { persist: false });
    });

    // State updated
    expect(screen.getByTestId("locale").textContent).toBe("ar");
    expect(screen.getByTestId("dir").textContent).toBe("rtl");

    // No storage writes
    expect(localStorage.getItem("locale")).toBeNull();
    expect(localStorage.getItem("fxz.locale")).toBeNull();
    expect(localStorage.getItem("fxz.lang")).toBeNull();

    // No cookies
    expect(document.cookie).not.toContain("locale=");
    expect(document.cookie).not.toContain("fxz.locale=");
    expect(document.cookie).not.toContain("fxz.lang=");

    // No fetch call
    expect(global.fetch).not.toHaveBeenCalled();

    // DOM reflects RTL
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.classList.contains("rtl")).toBe(true);
    expect(document.body.style.direction).toBe("rtl");
  });

  test("gracefully ignores storage errors while keeping state changes", async () => {
    // Make localStorage.setItem throw
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage-fail");
      });

    let ctxRef: I18nContextValue | null = null;
    render(
      <I18nProvider>
        <CaptureContext onValue={(v) => (ctxRef = v)} />
      </I18nProvider>,
    );

    await act(async () => {
      ctxRef?.setLocale("ar");
    });

    // State still updates
    expect(screen.getByTestId("locale").textContent).toBe("ar");
    expect(screen.getByTestId("dir").textContent).toBe("rtl");

    // No storage persisted due to error
    expect(localStorage.getItem("locale")).toBeNull();

    // Cookies not set, fetch not called because error occurs before those lines
    expect(document.cookie).not.toContain("locale=");
    expect(global.fetch).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  test('on mount: applies stored locale from "locale" key if valid and different', async () => {
    localStorage.setItem("locale", "ar");
    // Start provider at en; effect should switch to ar
    render(
      <I18nProvider initialLocale="en">
        <CaptureContext />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("locale").textContent).toBe("ar");
    });

    expect(screen.getByTestId("dir").textContent).toBe("rtl");
  });

  test('on mount: falls back to "fxz.lang" when "locale" is missing', async () => {
    localStorage.removeItem("locale");
    localStorage.setItem("fxz.lang", "ar");

    render(
      <I18nProvider initialLocale="en">
        <CaptureContext />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("locale").textContent).toBe("ar");
    });
    expect(screen.getByTestId("dir").textContent).toBe("rtl");
  });

  test("on mount: ignores invalid stored locale", async () => {
    localStorage.setItem("locale", "fr"); // unsupported
    render(
      <I18nProvider initialLocale="en">
        <CaptureContext />
      </I18nProvider>,
    );

    // Should remain en
    await waitFor(() => {
      expect(screen.getByTestId("locale").textContent).toBe("en");
    });
    expect(screen.getByTestId("dir").textContent).toBe("ltr");
  });

  test("dict re-computes when locale changes", async () => {
    let ctxRef: I18nContextValue | null = null;
    render(
      <I18nProvider initialLocale="en">
        <CaptureContext onValue={(v) => (ctxRef = v)} />
      </I18nProvider>,
    );

    // Wait for initial dictionary to load
    await waitFor(() => {
      const dictEn = JSON.parse(screen.getByTestId("dict").textContent || "{}");
      expect(dictEn).toEqual({ greeting: "Hello", code: "en" });
    });

    await act(async () => {
      ctxRef?.setLocale("ar");
    });

    // Wait for Arabic dictionary to load
    await waitFor(() => {
      const dictAr = JSON.parse(screen.getByTestId("dict").textContent || "{}");
      expect(dictAr).toEqual({ greeting: "مرحبا", code: "ar" });
    });
  });
});
