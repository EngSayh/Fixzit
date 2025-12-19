import { describe, it, expect } from "vitest";
import { DOMAINS, isAllowedOrigin } from "@/lib/config/domains";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("isAllowedOrigin", () => {
  it("allows exact primary origin", () => {
    expect(isAllowedOrigin(DOMAINS.primary)).toBe(true);
  });

  it("allows subdomain origins", () => {
    const host = new URL(DOMAINS.primary).hostname;
    expect(isAllowedOrigin(`https://app.${host}`)).toBe(true);
  });

  it("rejects prefixed attacker domains", () => {
    expect(isAllowedOrigin(`${DOMAINS.primary}.evil.com`)).toBe(false);
    expect(isAllowedOrigin(`https://app.${new URL(DOMAINS.primary).hostname}.attacker.net`)).toBe(false);
  });

  it("rejects invalid origins", () => {
    expect(isAllowedOrigin("not-a-url")).toBe(false);
  });
});
