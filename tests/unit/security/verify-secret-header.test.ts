import { describe, it, expect } from "vitest";
import { verifySecretHeader } from "@/lib/security/verify-secret-header";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("verifySecretHeader", () => {
  const secret = "super-secret";

  it("accepts matching secret for cron header", () => {
    const headers = new Headers({ "x-cron-secret": secret });
    expect(verifySecretHeader(headers, "x-cron-secret", secret)).toBe(true);
  });

  it("accepts matching secret for internal header", () => {
    const headers = new Headers({ "x-internal-secret": secret });
    expect(verifySecretHeader(headers, "x-internal-secret", secret)).toBe(true);
  });

  it("accepts matching secret for webhook header", () => {
    const headers = new Headers({ "x-webhook-secret": secret });
    expect(verifySecretHeader(headers, "x-webhook-secret", secret)).toBe(true);
  });

  it("rejects missing or mismatched secrets", () => {
    const headers = new Headers({ "x-cron-secret": "wrong" });
    expect(verifySecretHeader(headers, "x-cron-secret", secret)).toBe(false);
    expect(verifySecretHeader(headers, "x-missing", secret)).toBe(false);
    expect(verifySecretHeader(headers, "x-cron-secret", undefined)).toBe(false);
  });
});
