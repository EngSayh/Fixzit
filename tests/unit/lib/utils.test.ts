import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/utils";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

// Note: @ts-expect-error annotations later deliberately pass invalid types to test runtime robustness.

describe("generateSlug", () => {
  // Happy paths
  it("converts simple words to lowercase and joins with hyphens", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
    expect(generateSlug("Multiple   Spaces  Here")).toBe(
      "multiple-spaces-here",
    );
    expect(generateSlug("A--B   C")).toBe("a-b-c");
  });

  it("retains numbers and letters", () => {
    expect(generateSlug("123 Testing 456")).toBe("123-testing-456");
    expect(generateSlug("Version 2.0 Release")).toBe("version-20-release"); // dot removed
  });

  it("removes unsupported punctuation and symbols", () => {
    expect(generateSlug("Hello, World!")).toBe("hello-world");
    expect(generateSlug("Keep_this? Nope.")).toBe("keepthis-nope"); // underscore removed
    expect(generateSlug("Price $100 #Deal")).toBe("price-100-deal");
  });

  it("collapses multiple spaces and hyphens into single hyphen", () => {
    expect(generateSlug("foo   bar")).toBe("foo-bar");
    expect(generateSlug("foo - bar")).toBe("foo-bar");
    expect(generateSlug("foo---bar")).toBe("foo-bar");
    expect(generateSlug("foo  ---   bar")).toBe("foo-bar");
  });

  // Edge cases
  it("trims leading and trailing whitespace", () => {
    expect(generateSlug("   Hello  ")).toBe("hello");
    expect(generateSlug("\n\t spaced\t\n")).toBe("spaced");
  });

  it("preserves existing hyphens but collapses duplicates", () => {
    expect(generateSlug("-Hello-World-")).toBe("-hello-world-"); // note: leading/trailing hyphens are preserved by current implementation
    expect(generateSlug("--a--b--")).toBe("-a-b-");
  });

  it("handles empty or whitespace-only inputs", () => {
    expect(generateSlug("")).toBe("");
    expect(generateSlug("     ")).toBe("");
  });

  it("lowercases uppercase characters", () => {
    expect(generateSlug("HELLO WORLD")).toBe("hello-world");
  });

  it("preserves Unicode letters for i18n support (Arabic, Chinese, accents)", () => {
    // FIX: We now preserve accented letters for international support
    expect(generateSlug("café crème")).toBe("café-crème"); // accented letters preserved
    expect(generateSlug("naïve façade")).toBe("naïve-façade");
    expect(generateSlug("hello 世界")).toBe("hello-世界"); // Chinese preserved
    expect(generateSlug("你好")).toBe("你好"); // all preserved
    expect(generateSlug("مرحبا بك")).toBe("مرحبا-بك"); // Arabic preserved
  });

  it("returns a single hyphen if input consists only of hyphens or hyphens and spaces", () => {
    expect(generateSlug("---")).toBe("-");
    expect(generateSlug(" - ")).toBe("-");
  });

  // Failure/robustness scenarios at runtime
  it("handles undefined or null safely by treating as empty string", () => {
    expect(generateSlug(undefined)).toBe("");
    expect(generateSlug(null)).toBe("");
    // FIX: generateSlug now strictly requires string type - non-strings return empty
    // @ts-expect-error Testing runtime robustness against number
    expect(generateSlug(123)).toBe("");
    // @ts-expect-error Testing runtime robustness against object
    expect(generateSlug({ toString: () => "Obj Name" })).toBe("");
  });

  // Idempotency
  it("is idempotent when provided with an already slugged string", () => {
    const slug = "already-slugged-string";
    expect(generateSlug(slug)).toBe(slug);
  });
});
