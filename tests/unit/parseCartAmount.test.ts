import { describe, test, expect } from "vitest";
import { parseCartAmount } from "@/lib/payments/parseCartAmount";

test("accepts numeric input", () => {
  expect(parseCartAmount(249.99)).toBe(249.99);
  expect(parseCartAmount(0)).toBe(0);
});

test("parses decimal strings with dot separators", () => {
  expect(parseCartAmount(" 147.25 ")).toBe(147.25);
  expect(parseCartAmount("-42.5")).toBe(-42.5);
});

test("parses values with grouping commas", () => {
  expect(parseCartAmount("1,234.56")).toBe(1234.56);
  expect(parseCartAmount("12,345")).toBe(12345);
});

test("parses values with european decimal comma", () => {
  expect(parseCartAmount("1.234,56")).toBe(1234.56);
  expect(parseCartAmount("1234,5")).toBe(1234.5);
});

test("rejects malformed inputs", () => {
  expect(parseCartAmount("")).toBe(0);
  expect(parseCartAmount("  ")).toBe(0);
  expect(parseCartAmount("abc")).toBe(0);
  expect(parseCartAmount("12.34.56")).toBe(0);
  expect(parseCartAmount("1,2,3")).toBe(0);
  expect(parseCartAmount(null as any)).toBe(0);
  expect(parseCartAmount(undefined as any)).toBe(0);
});

test("rejects non-finite numbers", () => {
  expect(parseCartAmount(Infinity)).toBe(0);
  expect(parseCartAmount(NaN)).toBe(0);
  expect(parseCartAmount("NaN")).toBe(0);
});

test("parses values with currency markers", () => {
  expect(parseCartAmount("SAR\u00A01,234.50")).toBe(1234.5);
  expect(parseCartAmount("1\u00A0234,50\u00A0SAR")).toBe(1234.5);
  expect(parseCartAmount("د.إ.‏1,234.50")).toBe(1234.5);
});
