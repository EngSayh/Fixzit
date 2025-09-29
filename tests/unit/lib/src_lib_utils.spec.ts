/**
 * Unit tests for generateSlug (src/lib/utils.ts)
 * Testing library/framework: Playwright Test (@playwright/test)
 *
 * These are unit-style tests using Playwright's test runner to avoid adding new dev dependencies.
 * Run: npx playwright test qa/tests/unit/src_lib_utils.spec.ts
 */
import { test, expect } from "@playwright/test";
import { generateSlug } from "../../../src/lib/utils";

test.describe("generateSlug", () => {
  test("converts words to lowercase and hyphenates (happy paths)", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
    expect(generateSlug("Multiple   Spaces Here")).toBe("multiple-spaces-here");
  });

  test("trims leading and trailing whitespace", () => {
    expect(generateSlug("   Trim me please   ")).toBe("trim-me-please");
  });

  test("removes invalid characters, preserves digits and hyphens", () => {
    expect(generateSlug("Release 1.2.3")).toBe("release-123"); // dots removed
    expect(generateSlug("Café-au-lait\!")).toBe("caf-au-lait"); // diacritics/punctuation removed
    expect(generateSlug("Hello_-__World")).toBe("hello-world"); // underscores removed, hyphens collapsed
  });

  test("collapses multiple spaces and hyphens into single hyphens", () => {
    expect(generateSlug("Hello   -   World")).toBe("hello-world");
    expect(generateSlug("A----B")).toBe("a-b");
    expect(generateSlug("Spacing--Spacing")).toBe("spacing-spacing");
  });

  test("converts varied whitespace (tab/newline/carriage return) to hyphens", () => {
    expect(generateSlug("a\tb\nc\rd")).toBe("a-b-c-d");
  });

  test("handles empty, whitespace-only, and only-invalid input", () => {
    expect(generateSlug("")).toBe("");
    expect(generateSlug("    ")).toBe("");
    expect(generateSlug("\!\!\!")).toBe("");
    expect(generateSlug("中文測試")).toBe("");
  });

  test("preserves interior hyphens and does not strip leading/trailing hyphens", () => {
    expect(generateSlug("---Hello---")).toBe("-hello-");
    expect(generateSlug("-A- -B-")).toBe("-a-b-");
  });

  test("preserves numbers within text", () => {
    expect(generateSlug("Section 42 Title")).toBe("section-42-title");
  });

  test("limits slug length to 100 characters", () => {
    const long = "a".repeat(150);
    const result = generateSlug(long);
    expect(result.length).toBe(100);
    expect(result).toBe("a".repeat(100));
  });

  test("keeps exactly 100 characters when input results in exactly 100", () => {
    const exact = "a".repeat(100);
    expect(generateSlug(exact)).toBe(exact);
  });

  test("handles undefined/null at runtime by returning empty string", () => {
    // @ts-expect-error intentional invalid runtime input for robustness
    expect(generateSlug(undefined)).toBe("");
    // @ts-expect-error intentional invalid runtime input for robustness
    expect(generateSlug(null)).toBe("");
  });
});