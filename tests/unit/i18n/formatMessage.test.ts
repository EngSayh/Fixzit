import { afterEach, describe, expect, it } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

import {
  clearMessageFormatCache,
  formatIcuMessage,
} from "@/i18n/formatMessage";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

describe("formatIcuMessage", () => {
  afterEach(() => {
    clearMessageFormatCache();
  });

  it("formats simple replacements", () => {
    const result = formatIcuMessage(
      "greeting",
      "Hello {name}",
      "en",
      { name: "Sara" },
    );
    expect(result).toBe("Hello Sara");
  });

  it("supports ICU plurals", () => {
    const raw = "You have {count, plural, one {# item} other {# items}}";
    expect(formatIcuMessage("items", raw, "en", { count: 1 })).toBe(
      "You have 1 item",
    );
    expect(formatIcuMessage("items", raw, "en", { count: 3 })).toBe(
      "You have 3 items",
    );
  });

  it("falls back gracefully on formatter errors", () => {
    const broken = "{value, select, foo {ok}";
    const result = formatIcuMessage("broken", broken, "en", { value: "bar" });
    expect(result).toContain("value");
  });
});
