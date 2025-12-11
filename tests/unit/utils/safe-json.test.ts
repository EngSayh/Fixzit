/**
 * Tests for safe-json utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  safeJsonParse,
  safeJsonParseWithFallback,
  parseLocalStorage,
  safeJsonStringify,
  hasRequiredFields,
} from "@/lib/utils/safe-json";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("safeJsonParse", () => {
  it("parses valid JSON successfully", () => {
    const result = safeJsonParse<{ name: string }>('{"name": "John"}');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John");
    }
  });

  it("handles invalid JSON gracefully", () => {
    const result = safeJsonParse("not valid json");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("handles empty string", () => {
    const result = safeJsonParse("");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Input is empty or not a string");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error - testing runtime behavior
    const result = safeJsonParse(null);
    expect(result.success).toBe(false);
  });

  it("parses arrays correctly", () => {
    const result = safeJsonParse<number[]>("[1, 2, 3]");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });

  it("parses nested objects", () => {
    const json = '{"user": {"name": "John", "settings": {"theme": "dark"}}}';
    const result = safeJsonParse<{
      user: { name: string; settings: { theme: string } };
    }>(json);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.settings.theme).toBe("dark");
    }
  });
});

describe("safeJsonParseWithFallback", () => {
  it("returns parsed data on success", () => {
    const result = safeJsonParseWithFallback('{"value": 42}', { value: 0 });
    expect(result.value).toBe(42);
  });

  it("returns fallback on parse failure", () => {
    const result = safeJsonParseWithFallback("invalid", { value: 99 });
    expect(result.value).toBe(99);
  });

  it("returns fallback on empty string", () => {
    const result = safeJsonParseWithFallback("", { defaultKey: "default" });
    expect(result.defaultKey).toBe("default");
  });
});

describe("parseLocalStorage", () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    vi.clearAllMocks();
  });

  it("returns fallback when item not found", () => {
    localStorageMock.getItem.mockReturnValue(null);
    const result = parseLocalStorage("missing-key", { default: true });
    expect(result).toEqual({ default: true });
  });

  it("returns parsed value when valid", () => {
    localStorageMock.getItem.mockReturnValue('{"saved": true}');
    const result = parseLocalStorage("valid-key", { saved: false });
    expect(result).toEqual({ saved: true });
  });

  it("removes corrupted data and returns fallback", () => {
    localStorageMock.getItem.mockReturnValue("corrupted{json");
    const result = parseLocalStorage("corrupt-key", { clean: true });
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("corrupt-key");
    expect(result).toEqual({ clean: true });
  });

  it("returns fallback in SSR (no window)", () => {
    vi.stubGlobal("window", undefined);
    const result = parseLocalStorage("any-key", { ssr: true });
    expect(result).toEqual({ ssr: true });
  });
});

describe("safeJsonStringify", () => {
  it("stringifies objects correctly", () => {
    const result = safeJsonStringify({ name: "test" });
    expect(result).toBe('{"name":"test"}');
  });

  it("handles BigInt values", () => {
    const obj = { bigNum: BigInt(9007199254740991) };
    const result = safeJsonStringify(obj);
    expect(result).toBe('{"bigNum":"9007199254740991"}');
  });

  it("returns fallback on circular reference", () => {
    const obj: Record<string, unknown> = { name: "test" };
    obj.self = obj; // circular reference
    const result = safeJsonStringify(obj, "{}");
    expect(result).toBe("{}");
  });

  it("formats with space option", () => {
    const result = safeJsonStringify({ a: 1 }, "{}", { space: 2 });
    expect(result).toBe('{\n  "a": 1\n}');
  });
});

describe("hasRequiredFields", () => {
  it("returns true when all fields present", () => {
    const obj = { name: "John", age: 30, email: "john@example.com" };
    expect(hasRequiredFields<{ name: string; age: number }>(obj, ["name", "age"])).toBe(true);
  });

  it("returns false when fields missing", () => {
    const obj = { name: "John" };
    expect(hasRequiredFields<{ name: string; age: number }>(obj, ["name", "age"])).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(hasRequiredFields<{ name: string }>("string", ["name"])).toBe(false);
    expect(hasRequiredFields<{ name: string }>(null, ["name"])).toBe(false);
    expect(hasRequiredFields<{ name: string }>(undefined, ["name"])).toBe(false);
  });

  it("works with empty required fields array", () => {
    const obj = { anything: true };
    expect(hasRequiredFields(obj, [])).toBe(true);
  });
});
