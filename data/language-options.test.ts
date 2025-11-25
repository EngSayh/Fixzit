/**
 * Test framework: Vitest (TypeScript).
 * Focus: Validate the data exported by data/language-options.ts
 * Covers: happy paths, schema validation, uniqueness, snapshot for regression.
 */

import { describe, it, expect } from "vitest";
import { LANGUAGE_OPTIONS } from "./language-options";

describe("language-options data integrity", () => {
  it("should export a non-empty array", () => {
    expect(Array.isArray(LANGUAGE_OPTIONS)).toBe(true);
    expect(LANGUAGE_OPTIONS.length).toBeGreaterThan(0);
  });

  it("every item should be a well-formed language descriptor", () => {
    for (const lang of LANGUAGE_OPTIONS) {
      expect(typeof lang).toBe("object");
      expect(lang).not.toBeNull();

      expect(typeof lang.code).toBe("string");
      expect(lang.code && lang.code.trim().length).toBeGreaterThan(0);

      expect(typeof lang.label).toBe("string");
      expect(lang.label && lang.label.trim().length).toBeGreaterThan(0);

      expect(typeof lang.language).toBe("string");
      expect(lang.language.trim().length).toBeGreaterThan(0);

      expect(typeof lang.locale).toBe("string");
      expect(lang.locale.trim().length).toBeGreaterThan(0);

      expect(typeof lang.dir).toBe("string");
      expect(["ltr", "rtl"].includes(lang.dir)).toBe(true);

      // Ensure no obviously incorrect property types
      for (const [k, v] of Object.entries(lang)) {
        // keys should be non-empty strings
        expect(typeof k).toBe("string");
        expect(k.length).toBeGreaterThan(0);
        // values should not be functions
        expect(typeof v).not.toBe("function");
      }
    }
  });

  it("language codes should be unique (case-insensitive) and normalized", () => {
    const seen = new Set<string>();
    for (const lang of LANGUAGE_OPTIONS) {
      const normalized = lang.code.toLowerCase();
      expect(seen.has(normalized)).toBe(false);
      seen.add(normalized);
      // Basic BCP 47-ish sanity: allow a-z, digits, dash
      expect(/^[a-z0-9-]+$/i.test(lang.code)).toBe(true);
      // No leading/trailing spaces
      expect(lang.code).toBe(lang.code.trim());
    }
  });

  it("labels should be unique enough to avoid ambiguity", () => {
    const seen = new Set<string>();
    for (const lang of LANGUAGE_OPTIONS) {
      const key = lang.label.toLowerCase();
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("rtl languages, if any, should be flagged correctly", () => {
    for (const lang of LANGUAGE_OPTIONS) {
      if (lang.dir === "rtl") {
        // If rtl, ensure code is a string and label present (already validated).
        expect(typeof lang.code).toBe("string");
        expect(lang.code.length).toBeGreaterThan(0);
      }
    }
  });

  it("should provide a stable snapshot of codes and labels (sorted by code)", () => {
    const arr = LANGUAGE_OPTIONS.map((l) => ({
      code: l.code,
      label: l.label,
    }));
    const snapshot = arr
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code, "en"))
      .map((x) => `${x.code}:${x.label}`);
    expect(snapshot).toMatchSnapshot();
  });

  it("no entries should have obviously invalid values", () => {
    // Helper to check for control characters (Biome-friendly alternative to regex)
    const hasControlChars = (s: string): boolean => {
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code <= 31 || code === 127) return true;
      }
      return false;
    };

    for (const lang of LANGUAGE_OPTIONS) {
      // label/code should not contain control characters
      expect(hasControlChars(lang.label)).toBe(false);
      expect(hasControlChars(lang.code)).toBe(false);
      // labels should be reasonably short and non-empty
      expect(lang.label.trim().length).toBeGreaterThan(0);
      expect(lang.label.length).toBeLessThanOrEqual(100);
    }
  });
});
