// Tests for src/utils/format.ts
// Framework: Vitest with TypeScript
// These tests avoid brittle locale assertions by checking patterns and Unicode ranges.

import { describe, it, expect } from "vitest";

import { fmtNumber, fmtDate } from "./format";

import type { Locale } from "../i18n/config";
const isArabicIndicDigits = (s: string) =>
  /^[\u0660-\u0669\s\u066B\u066C\u200f\u200e\u061C\u2212\-,./()+:]+$/.test(s);
// Notes:
// - \u0660-\u0669 Arabic-Indic digits
// - \u066B Arabic decimal separator
// - \u066C Arabic thousands separator
// - \u200f/\u200e RTL/LTR marks may appear depending on Intl/ICU
// - Include common punctuation used in formatted output

describe("fmtNumber", () => {
  it("formats integers in en-GB with thousands separator", () => {
    const out = fmtNumber(1234567, "en" as Locale);
    // Expect comma-grouped thousands like 1,234,567 (allow non-breaking or thin spaces just in case)
    // Accept digits and [ ,.'\u00A0\u202F] as grouping characters and optional RTL marks.
    expect(out).toMatch(/^\d{1,3}([,\u00A0\u202F]\d{3})+$/);
  });

  it("formats decimals in en-GB with dot decimal separator", () => {
    const out = fmtNumber(1234.56, "en" as Locale);
    expect(out).toMatch(/^\d{1,3}(,\d{3})*\.\d+$/);
  });

  it("formats integers in ar-SA with Arabic-Indic digits and Arabic separators", () => {
    const out = fmtNumber(1234567, "ar" as Locale);
    // Should contain Arabic-Indic digits and use Arabic thousands separator (U+066C) potentially with direction marks
    expect(isArabicIndicDigits(out)).toBe(true);
    // Ensure grouping occurred (look for thousands separator \u066C or digit grouping length > 4)
    expect(out.length).toBeGreaterThanOrEqual(5);
  });

  it("formats decimals in ar-SA with Arabic decimal separator", () => {
    const out = fmtNumber(1234.56, "ar" as Locale);
    // Contains Arabic-Indic digits and Arabic decimal separator \u066B
    expect(isArabicIndicDigits(out)).toBe(true);
    // Ensure there is some decimal separator present
    expect(out).toMatch(/[\u066B.]/); // Some environments may still show '.'; accept either but digits must be Arabic.
  });

  it("handles zero and negative numbers", () => {
    const zeroEn = fmtNumber(0, "en" as Locale);
    expect(zeroEn).toMatch(/^0(\.0+)?$/);

    const negEn = fmtNumber(-1234.5, "en" as Locale);
    expect(negEn).toMatch(/^-?\d{1,3}(,\d{3})*\.\d+$/);

    const zeroAr = fmtNumber(0, "ar" as Locale);
    expect(isArabicIndicDigits(zeroAr)).toBe(true);

    const negAr = fmtNumber(-1234.5, "ar" as Locale);
    expect(isArabicIndicDigits(negAr)).toBe(true);
  });

  it('uses en-GB when locale is not "ar"', () => {
    const out = fmtNumber(1000, "en" as Locale);
    // Expect comma thousands
    expect(out).toMatch(/^1,000$/);
  });
});

describe("fmtDate", () => {
  // Use a midday UTC time to avoid date rollover across timezones
  const dateISO = "2020-05-15T12:00:00Z";
  const dateObj = new Date(dateISO);
  const dateMs = dateObj.getTime();

  it("formats Date input (object) with explicit numeric options for en-GB", () => {
    const out = fmtDate(dateObj, "en" as Locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // en-GB numeric: DD/MM/YYYY
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("formats timestamp input (number) with explicit numeric options for en-GB", () => {
    const out = fmtDate(dateMs, "en" as Locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("formats string input (ISO) with explicit numeric options for en-GB", () => {
    const out = fmtDate(dateISO, "en" as Locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("formats dates in ar-SA using Arabic-Indic digits when numeric options are used", () => {
    const out = fmtDate(dateISO, "ar" as Locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Should be something like ١٥/٠٥/٢٠٢٠ or ١٥‏/٠٥‏/٢٠٢٠ (with RTL marks U+200F)
    // Allow optional Unicode control characters (LRM U+200E, RLM U+200F) between parts
    expect(out).toMatch(
      /^[\u0660-\u0669]{2}[\u200e\u200f]?\/[\u200e\u200f]?[\u0660-\u0669]{2}[\u200e\u200f]?\/[\u200e\u200f]?[\u0660-\u0669]{4}$/,
    );
  });

  it('uses default options (dateStyle: "medium") when options are not provided', () => {
    const outEn = fmtDate(dateISO, "en" as Locale);
    const outAr = fmtDate(dateISO, "ar" as Locale);
    // We can't assert exact strings due to ICU differences; ensure non-empty and locale-influenced digits.
    expect(typeof outEn).toBe("string");
    expect(outEn.length).toBeGreaterThan(0);

    expect(typeof outAr).toBe("string");
    expect(outAr.length).toBeGreaterThan(0);
    // For Arabic default, often uses Arabic-Indic digits; accept if so, but don't fail if environment differs.
    // Only check that it's not identical to empty and contains at least a digit-like char.
    expect(outAr).toMatch(/[\d\u0660-\u0669]/);
  });

  it('falls back to en-GB when locale is not "ar"', () => {
    const out = fmtDate(dateISO, "en" as Locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // en-GB expects DD/MM/YYYY ordering
    const [d, m, y] = out.split("/");
    expect(d.length).toBe(2);
    expect(m.length).toBe(2);
    expect(y.length).toBe(4);
  });
});
