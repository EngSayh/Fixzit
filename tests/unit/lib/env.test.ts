import { describe, it, expect } from "vitest";
import { isTruthy } from "@/lib/utils/env";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("isTruthy", () => {
  it("returns true for string true/1", () => {
    expect(isTruthy("true")).toBe(true);
    expect(isTruthy("1")).toBe(true);
  });

  it("returns false for other values", () => {
    expect(isTruthy(undefined)).toBe(false);
    expect(isTruthy(null as unknown as string)).toBe(false);
    expect(isTruthy("false")).toBe(false);
    expect(isTruthy("0")).toBe(false);
    expect(isTruthy("yes")).toBe(false);
    expect(isTruthy("")).toBe(false);
  });
});
