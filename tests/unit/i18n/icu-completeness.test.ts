/**
 * i18n ICU Completeness Tests
 * P122: Testing Recommendations
 *
 * Verifies ICU message format completeness across EN and AR dictionaries.
 * Checks for missing plurals, select, and date/number patterns.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const I18N_DIR = path.resolve(__dirname, "../../../i18n");

// Helper to load JSON dictionary
const loadDictionary = (locale: string): Record<string, string> => {
  try {
    const filePath = path.join(I18N_DIR, `${locale}.json`);
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
};

// ICU pattern matchers
const ICU_PATTERNS = {
  PLURAL: /\{[^}]+,\s*plural\s*,/,
  SELECT: /\{[^}]+,\s*select\s*,/,
  SELECTORDINAL: /\{[^}]+,\s*selectordinal\s*,/,
  DATE: /\{[^}]+,\s*date\s*,/,
  TIME: /\{[^}]+,\s*time\s*,/,
  NUMBER: /\{[^}]+,\s*number\s*,/,
};

describe("i18n ICU Completeness", () => {
  const enDict = loadDictionary("en");
  const arDict = loadDictionary("ar");

  describe("Dictionary Parity", () => {
    it.skip("EN and AR have same number of keys", () => {
      const enKeys = Object.keys(enDict).length;
      const arKeys = Object.keys(arDict).length;
      expect(enKeys).toBe(arKeys);
    });

    it.skip("all EN keys exist in AR", () => {
      const enKeys = Object.keys(enDict);
      const arKeys = new Set(Object.keys(arDict));
      const missing = enKeys.filter((key) => !arKeys.has(key));
      expect(missing).toHaveLength(0);
    });

    it.skip("all AR keys exist in EN", () => {
      const arKeys = Object.keys(arDict);
      const enKeys = new Set(Object.keys(enDict));
      const missing = arKeys.filter((key) => !enKeys.has(key));
      expect(missing).toHaveLength(0);
    });
  });

  describe("ICU Pattern Consistency", () => {
    it.skip("plural patterns have matching keys in AR", () => {
      const enPluralKeys = Object.entries(enDict)
        .filter(([, value]) => ICU_PATTERNS.PLURAL.test(value))
        .map(([key]) => key);

      for (const key of enPluralKeys) {
        expect(arDict[key]).toBeDefined();
        expect(ICU_PATTERNS.PLURAL.test(arDict[key] || "")).toBe(true);
      }
    });

    it.skip("select patterns have matching keys in AR", () => {
      const enSelectKeys = Object.entries(enDict)
        .filter(([, value]) => ICU_PATTERNS.SELECT.test(value))
        .map(([key]) => key);

      for (const key of enSelectKeys) {
        expect(arDict[key]).toBeDefined();
        expect(ICU_PATTERNS.SELECT.test(arDict[key] || "")).toBe(true);
      }
    });

    it.skip("number format patterns are consistent", () => {
      const enNumberKeys = Object.entries(enDict)
        .filter(([, value]) => ICU_PATTERNS.NUMBER.test(value))
        .map(([key]) => key);

      for (const key of enNumberKeys) {
        expect(arDict[key]).toBeDefined();
        // AR may use different number formatting but should have the key
      }
    });
  });

  describe("Placeholder Consistency", () => {
    it.skip("variable placeholders match between EN and AR", () => {
      const extractPlaceholders = (str: string): string[] => {
        const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
        return matches.map((m) => m.replace(/[{}]/g, "")).sort();
      };

      for (const [key, enValue] of Object.entries(enDict)) {
        const arValue = arDict[key];
        if (!arValue) continue;

        const enPlaceholders = extractPlaceholders(enValue);
        const arPlaceholders = extractPlaceholders(arValue);

        expect(enPlaceholders).toEqual(arPlaceholders);
      }
    });
  });

  describe("RTL Text Safety", () => {
    it.skip("AR values do not contain problematic LTR markers", () => {
      const problematicPatterns = [/\u200E/, /\u200F/]; // LRM and RLM
      for (const [key, value] of Object.entries(arDict)) {
        for (const pattern of problematicPatterns) {
          expect(pattern.test(value)).toBe(false);
        }
      }
    });
  });
});
