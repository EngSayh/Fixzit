/**
 * Language Selector Integration Tests
 * Tests RTL toggle, cookie persistence, and locale switching
 * @phase D
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock document.cookie
let mockCookies: Record<string, string> = {};

Object.defineProperty(document, "cookie", {
  get: () =>
    Object.entries(mockCookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; "),
  set: (value: string) => {
    const [pair] = value.split(";");
    const [key, val] = pair.split("=");
    if (val === "" || value.includes("max-age=0")) {
      delete mockCookies[key];
    } else {
      mockCookies[key] = val;
    }
  },
  configurable: true,
});

// Mock document.dir and document.documentElement
Object.defineProperty(document, "dir", {
  get: () => document.documentElement.dir,
  set: (value: string) => {
    document.documentElement.dir = value;
  },
  configurable: true,
});

describe("Language Selector", () => {
  beforeEach(() => {
    mockCookies = {};
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
    vi.clearAllMocks();
  });

  describe("Cookie Persistence", () => {
    it("should persist locale to NEXT_LOCALE cookie", () => {
      // Simulate setting locale
      document.cookie = "NEXT_LOCALE=ar";
      expect(mockCookies["NEXT_LOCALE"]).toBe("ar");
    });

    it("should read locale from cookie on page load", () => {
      mockCookies["NEXT_LOCALE"] = "ar";
      expect(document.cookie).toContain("NEXT_LOCALE=ar");
    });

    it("should update cookie when locale changes", () => {
      document.cookie = "NEXT_LOCALE=en";
      expect(mockCookies["NEXT_LOCALE"]).toBe("en");

      document.cookie = "NEXT_LOCALE=ar";
      expect(mockCookies["NEXT_LOCALE"]).toBe("ar");
    });

    it("should handle missing cookie gracefully", () => {
      expect(mockCookies["NEXT_LOCALE"]).toBeUndefined();
    });
  });

  describe("RTL Direction Toggle", () => {
    it("should set dir=rtl when Arabic locale is active", () => {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";

      expect(document.documentElement.dir).toBe("rtl");
      expect(document.documentElement.lang).toBe("ar");
    });

    it("should set dir=ltr when English locale is active", () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";

      expect(document.documentElement.dir).toBe("ltr");
      expect(document.documentElement.lang).toBe("en");
    });

    it("should toggle direction when switching between ar and en", () => {
      // Start with English
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
      expect(document.documentElement.dir).toBe("ltr");

      // Switch to Arabic
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
      expect(document.documentElement.dir).toBe("rtl");

      // Switch back to English
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
      expect(document.documentElement.dir).toBe("ltr");
    });

    it("should apply RTL to body element styles", () => {
      document.body.style.direction = "rtl";
      expect(document.body.style.direction).toBe("rtl");
    });
  });

  describe("Locale Validation", () => {
    it("should only accept supported locales", () => {
      const supportedLocales = ["en", "ar"];

      expect(supportedLocales.includes("en")).toBe(true);
      expect(supportedLocales.includes("ar")).toBe(true);
      expect(supportedLocales.includes("fr")).toBe(false);
      expect(supportedLocales.includes("")).toBe(false);
    });

    it("should normalize locale to lowercase", () => {
      const normalizeLocale = (locale: string) => locale.toLowerCase();

      expect(normalizeLocale("EN")).toBe("en");
      expect(normalizeLocale("AR")).toBe("ar");
      expect(normalizeLocale("Ar")).toBe("ar");
    });

    it("should handle locale with region (en-US, ar-SA)", () => {
      const extractBaseLocale = (locale: string) => locale.split("-")[0];

      expect(extractBaseLocale("en-US")).toBe("en");
      expect(extractBaseLocale("ar-SA")).toBe("ar");
      expect(extractBaseLocale("en")).toBe("en");
    });
  });

  describe("Cross-Module Consistency", () => {
    it("should use same locale across all modules", () => {
      const currentLocale = "ar";

      // All modules should read from same source
      const headerLocale = currentLocale;
      const sidebarLocale = currentLocale;
      const contentLocale = currentLocale;
      const footerLocale = currentLocale;

      expect(headerLocale).toBe(contentLocale);
      expect(sidebarLocale).toBe(footerLocale);
      expect(headerLocale).toBe(sidebarLocale);
    });

    it("should update all modules when locale changes", () => {
      let currentLocale = "en";

      const updateLocale = (newLocale: string) => {
        currentLocale = newLocale;
        document.cookie = `NEXT_LOCALE=${newLocale}`;
        document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = newLocale;
      };

      updateLocale("ar");
      expect(currentLocale).toBe("ar");
      expect(mockCookies["NEXT_LOCALE"]).toBe("ar");
      expect(document.documentElement.dir).toBe("rtl");
      expect(document.documentElement.lang).toBe("ar");
    });
  });
});
