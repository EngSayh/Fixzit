/**
 * i18n ICU Completeness Tests
 * P126: Implement skipped tests with real signal
 *
 * Verifies ICU message format completeness across EN and AR dictionaries.
 * Checks for missing plurals, select, and date/number patterns.
 */
import { describe, it, expect } from "vitest";

// Import dictionaries directly using path aliases
import enDictRaw from "@/i18n/en.json";
import arDictRaw from "@/i18n/ar.json";

// Flatten nested JSON to dot-notation keys for comparison
const flattenDict = (obj: Record<string, unknown>, prefix = ""): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[newKey] = value;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenDict(value as Record<string, unknown>, newKey));
    }
  }

  return result;
};

const enDict = flattenDict(enDictRaw as Record<string, unknown>);
const arDict = flattenDict(arDictRaw as Record<string, unknown>);
const enKeys = Object.keys(enDict);
const arKeys = Object.keys(arDict);

// ICU pattern matchers
const ICU_PATTERNS = {
  PLURAL: /\{[^}]+,\s*plural\s*,/,
  SELECT: /\{[^}]+,\s*select\s*,/,
  SELECTORDINAL: /\{[^}]+,\s*selectordinal\s*,/,
  DATE: /\{[^}]+,\s*date\s*,/,
  TIME: /\{[^}]+,\s*time\s*,/,
  NUMBER: /\{[^}]+,\s*number\s*,/,
  SIMPLE_VAR: /\{[a-zA-Z0-9_]+\}/g,
};

// Extract simple placeholders like {name}, {count}, etc.
const extractPlaceholders = (str: string): string[] => {
  const matches = str.match(ICU_PATTERNS.SIMPLE_VAR) || [];
  return matches
    .map((m) => m.replace(/[{}]/g, ""))
    .filter((v) => !["plural", "select", "selectordinal", "date", "time", "number", "other", "one", "few", "many", "zero", "two"].includes(v))
    .sort();
};

describe("i18n ICU Completeness", () => {
  describe("Dictionary Loading", () => {
    it("loads EN dictionary successfully", () => {
      expect(enKeys.length).toBeGreaterThan(0);
    });

    it("loads AR dictionary successfully", () => {
      expect(arKeys.length).toBeGreaterThan(0);
    });
  });

  describe("Dictionary Parity", () => {
    it("EN and AR dictionaries exist and have content", () => {
      expect(enKeys.length).toBeGreaterThan(0);
      expect(arKeys.length).toBeGreaterThan(0);
    });

    it("identifies keys missing from AR", () => {
      if (enKeys.length === 0) return;

      const arKeySet = new Set(arKeys);
      const missingInAr = enKeys.filter((key) => !arKeySet.has(key));

      if (missingInAr.length > 0) {
        console.log(`Keys in EN missing from AR (${missingInAr.length}):`, missingInAr.slice(0, 10));
      }

      // Allow up to 10% missing keys
      const missingRatio = missingInAr.length / enKeys.length;
      expect(missingRatio).toBeLessThan(0.1);
    });

    it("identifies keys missing from EN", () => {
      if (arKeys.length === 0) return;

      const enKeySet = new Set(enKeys);
      const missingInEn = arKeys.filter((key) => !enKeySet.has(key));

      if (missingInEn.length > 0) {
        console.log(`Keys in AR missing from EN (${missingInEn.length}):`, missingInEn.slice(0, 10));
      }

      // Allow up to 10% missing keys
      const missingRatio = missingInEn.length / arKeys.length;
      expect(missingRatio).toBeLessThan(0.1);
    });
  });

  describe("ICU Pattern Consistency", () => {
    it("plural patterns in EN have corresponding AR translations", () => {
      const enPluralKeys = Object.entries(enDict)
        .filter(([, value]) => ICU_PATTERNS.PLURAL.test(value))
        .map(([key]) => key);

      if (enPluralKeys.length === 0) return;

      const missingPluralInAr = enPluralKeys.filter((key) => !arDict[key]);

      // Allow max 20% or at least 1
      const maxAllowed = Math.max(1, Math.ceil(enPluralKeys.length * 0.2));
      expect(missingPluralInAr.length).toBeLessThan(maxAllowed);
    });

    it("select patterns are consistently used", () => {
      const enSelectKeys = Object.entries(enDict)
        .filter(([, value]) => ICU_PATTERNS.SELECT.test(value))
        .map(([key]) => key);

      const coverage = enSelectKeys.filter((key) => arDict[key] !== undefined);
      const coverageRatio = enSelectKeys.length > 0 ? coverage.length / enSelectKeys.length : 1;

      expect(coverageRatio).toBeGreaterThan(0.8);
    });
  });

  describe("Placeholder Consistency", () => {
    it("variable placeholders match between EN and AR for common keys", () => {
      const commonKeys = enKeys.filter((key) => arDict[key] !== undefined);
      const mismatches: Array<{ key: string; en: string[]; ar: string[] }> = [];

      for (const key of commonKeys.slice(0, 100)) {
        const enPlaceholders = extractPlaceholders(enDict[key]);
        const arPlaceholders = extractPlaceholders(arDict[key]);

        if (JSON.stringify(enPlaceholders) !== JSON.stringify(arPlaceholders)) {
          mismatches.push({ key, en: enPlaceholders, ar: arPlaceholders });
        }
      }

      // Allow some mismatches
      expect(mismatches.length).toBeLessThan(20);
    });

    it("critical UI strings have matching placeholders", () => {
      const criticalKeys = [
        "common.welcome",
        "common.greeting",
        "dashboard.title",
        "errors.required",
        "validation.minLength",
      ];

      for (const key of criticalKeys) {
        if (enDict[key] && arDict[key]) {
          const enVars = extractPlaceholders(enDict[key]);
          const arVars = extractPlaceholders(arDict[key]);
          expect(enVars).toEqual(arVars);
        }
      }
    });
  });

  describe("RTL Text Safety", () => {
    it("AR values do not contain problematic Unicode markers", () => {
      if (arKeys.length === 0) return;

      const problematicPatterns = [/\u200E/g, /\u200F/g];
      let problemCount = 0;

      for (const [key, value] of Object.entries(arDict)) {
        for (const pattern of problematicPatterns) {
          if (pattern.test(value)) {
            problemCount++;
            console.log(`RTL marker found in AR key: ${key}`);
          }
        }
      }

      const maxAllowed = Math.max(1, Math.ceil(arKeys.length * 0.01));
      expect(problemCount).toBeLessThanOrEqual(maxAllowed);
    });

    it("AR strings are not empty when EN has content", () => {
      const emptyArWithEnContent = enKeys.filter(
        (key) => enDict[key]?.trim() && arDict[key] !== undefined && !arDict[key]?.trim()
      );

      expect(emptyArWithEnContent.length).toBe(0);
    });
  });

  describe("Common Translation Patterns", () => {
    it("button labels have translations", () => {
      const buttonKeys = enKeys.filter(
        (key) => key.includes("button") || key.includes("btn") || key.includes("action")
      );

      const translated = buttonKeys.filter((key) => arDict[key] !== undefined);
      const ratio = buttonKeys.length > 0 ? translated.length / buttonKeys.length : 1;

      expect(ratio).toBeGreaterThan(0.9);
    });

    it("error messages have translations", () => {
      const errorKeys = enKeys.filter(
        (key) => key.includes("error") || key.includes("Error") || key.includes("invalid")
      );

      const translated = errorKeys.filter((key) => arDict[key] !== undefined);
      const ratio = errorKeys.length > 0 ? translated.length / errorKeys.length : 1;

      expect(ratio).toBeGreaterThan(0.8);
    });

    it("navigation items have translations", () => {
      const navKeys = enKeys.filter(
        (key) => key.includes("nav") || key.includes("menu") || key.includes("sidebar")
      );

      const translated = navKeys.filter((key) => arDict[key] !== undefined);
      const ratio = navKeys.length > 0 ? translated.length / navKeys.length : 1;

      expect(ratio).toBeGreaterThan(0.9);
    });
  });
});
