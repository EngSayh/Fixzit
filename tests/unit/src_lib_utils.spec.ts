/**
 * Testing library/framework: Vitest
 * This suite validates generateSlug from lib/utils,
 * covering happy paths, edge cases, and failure-like conditions.
 */
import { describe, test, expect } from "vitest";
import { generateSlug } from "@/lib/utils";

describe("generateSlug", () => {
  test("lowercases and hyphenates a basic phrase", () => {
    expect(generateSlug("HELLO WORLD")).toBe("hello-world");
  });

  test("trims leading and trailing whitespace", () => {
    expect(generateSlug("   hello   world   ")).toBe("hello-world");
  });

  test("removes characters outside [a-z0-9\\s-]", () => {
    expect(generateSlug("Hello, World! #$%&*()[]{}")).toBe("hello-world");
  });

  test("replaces consecutive whitespace with a single hyphen", () => {
    expect(generateSlug("hello    world\tfrom\nslug")).toBe(
      "hello-world-from-slug",
    );
  });

  test("collapses multiple hyphens into a single hyphen", () => {
    expect(generateSlug("hello---world--slug")).toBe("hello-world-slug");
  });

  test("preserves numbers", () => {
    expect(generateSlug("Product 123 Version 4")).toBe("product-123-version-4");
  });

  test("removes underscores (not treated as whitespace)", () => {
    expect(generateSlug("hello_world_test")).toBe("helloworldtest");
  });

  test("handles punctuation and em dashes by removing them", () => {
    expect(generateSlug("Hello, World!!! Are—you ok?")).toBe(
      "hello-world-areyou-ok",
    );
  });

  test("preserves accented characters (Unicode support)", () => {
    // Implementation uses Unicode property escapes to preserve all letters
    expect(generateSlug("Café à la crème")).toBe("café-à-la-crème");
  });

  test("returns empty string for empty input", () => {
    expect(generateSlug("")).toBe("");
  });

  test("handles undefined/null at runtime defensively", () => {
    // Function now properly accepts undefined/null
    expect(generateSlug(undefined)).toBe("");
    expect(generateSlug(null)).toBe("");
  });

  test("collapses hyphen runs including leading/trailing ones created by normalization", () => {
    expect(generateSlug("  --hello   ---   world--  ")).toBe("-hello-world-");
  });

  test("limits slug to 100 characters", () => {
    const long = "a".repeat(150);
    const out = generateSlug(long);
    expect(out.length).toBe(100);
    expect(out).toBe("a".repeat(100));
  });

  test("only hyphens collapse to a single hyphen", () => {
    expect(generateSlug("-----")).toBe("-");
  });

  test("preserves non-Latin characters (Arabic, Chinese, etc.)", () => {
    // Implementation preserves all Unicode letters for i18n support
    expect(generateSlug("你好，世界")).toBe("你好世界");
    expect(generateSlug("منتج")).toBe("منتج");
  });
});
