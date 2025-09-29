/**
 * Testing library/framework: Playwright Test (@playwright/test)
 * This suite validates generateSlug from src/lib/utils (primary) or src/lib/utils.test (fallback),
 * covering happy paths, edge cases, and failure-like conditions based on the PR diff focus.
 */
import { test, expect } from "@playwright/test";

// Dynamically load from canonical source if present, else fallback to the PR snippet file.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod: { generateSlug: (input: string) => string } = (() => {
  try {
    // Prefer canonical source location
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("../../src/lib/utils");
  } catch {
    // Fallback to file mentioned in PR snippet
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("../../src/lib/utils.test");
  }
})();

const { generateSlug } = mod;

test.describe("generateSlug", () => {
  test("lowercases and hyphenates a basic phrase", () => {
    expect(generateSlug("HELLO WORLD")).toBe("hello-world");
  });

  test("trims leading and trailing whitespace", () => {
    expect(generateSlug("   hello   world   ")).toBe("hello-world");
  });

  test("removes characters outside [a-z0-9\\s-]", () => {
    expect(generateSlug("Hello, World\! #$%&*()[]{}")).toBe("hello-world");
  });

  test("replaces consecutive whitespace with a single hyphen", () => {
    expect(generateSlug("hello    world\tfrom\nslug")).toBe("hello-world-from-slug");
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
    expect(generateSlug("Hello, World\!\!\! Are—you ok?")).toBe("hello-world-areyou-ok");
  });

  test("drops non-ASCII letters (accents) and normalizes spaces", () => {
    expect(generateSlug("Café à la crème")).toBe("caf-la-crme");
  });

  test("returns empty string for empty input", () => {
    expect(generateSlug("")).toBe("");
  });

  test("handles undefined/null at runtime defensively", () => {
    // @ts-expect-error: intentionally testing runtime behavior with invalid inputs
    expect(generateSlug(undefined)).toBe("");
    // @ts-expect-error: intentionally testing runtime behavior with invalid inputs
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

  test("non-Latin characters are removed", () => {
    expect(generateSlug("你好，世界")).toBe("");
  });
});