import { describe, it, expect } from "vitest";

import { ApiError, isForbidden } from "@/server/utils/errorResponses";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("isForbidden", () => {
  it("detects ApiError with 403 status", () => {
    expect(isForbidden(new ApiError("nope", 403))).toBe(true);
  });

  it("detects plain objects with status or code markers", () => {
    expect(isForbidden({ status: 403 })).toBe(true);
    expect(isForbidden({ code: "FORBIDDEN" })).toBe(true);
  });

  it("detects Error messages that imply forbidden access", () => {
    expect(isForbidden(new Error("Forbidden: access denied"))).toBe(true);
    expect(isForbidden(new Error("Permission denied"))).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isForbidden(new Error("Something else"))).toBe(false);
    expect(isForbidden(null)).toBe(false);
    expect(isForbidden(undefined)).toBe(false);
  });
});
