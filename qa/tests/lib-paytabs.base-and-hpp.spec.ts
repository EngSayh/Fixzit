// Framework: Playwright Test (@playwright/test)
import { test, expect } from "@playwright/test";
import { paytabsBase, createHppRequest } from "../../lib/paytabs.js";

test.describe("lib/paytabs - paytabsBase & createHppRequest", () => {
  test("paytabsBase resolves region URLs and falls back to GLOBAL", async () => {
    expect(paytabsBase("KSA")).toBe("https://secure.paytabs.sa");
    expect(paytabsBase("UAE")).toBe("https://secure.paytabs.com");
    expect(paytabsBase("EGYPT")).toBe("https://secure-egypt.paytabs.com");
    expect(paytabsBase("OMAN")).toBe("https://secure-oman.paytabs.com");
    expect(paytabsBase("JORDAN")).toBe("https://secure-jordan.paytabs.com");
    expect(paytabsBase("KUWAIT")).toBe("https://secure-kuwait.paytabs.com");

    // Fallbacks
    expect(paytabsBase()).toBe("https://secure-global.paytabs.com");
    expect(paytabsBase("UNKNOWN" as any)).toBe(
      "https://secure-global.paytabs.com",
    );
    expect(paytabsBase("" as any)).toBe("https://secure-global.paytabs.com");
    expect(paytabsBase(null as any)).toBe("https://secure-global.paytabs.com");

    // Case sensitivity - unknown cases should fall back
    expect(paytabsBase("ksa" as any)).toBe("https://secure-global.paytabs.com");
  });

  test("createHppRequest posts to correct endpoint with authorization header", async () => {
    process.env.PAYTABS_SERVER_KEY = "test-server-key";

    const payload = { amount: 100, currency: "SAR" };
    const mockResponse = {
      redirect_url: "https://payment.url",
      tran_ref: "12345",
    };

    const originalFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = ((...args: any[]) => {
      calls.push(args);
      return Promise.resolve({ json: async () => mockResponse } as any);
    }) as any;

    try {
      const res = await createHppRequest("KSA", payload);
      expect(res).toEqual(mockResponse);

      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe("https://secure.paytabs.sa/payment/request");
      expect(calls[0][1]).toMatchObject({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "test-server-key",
        },
        body: JSON.stringify(payload),
      });
    } finally {
      globalThis.fetch = originalFetch as any;
    }
  });

  test("createHppRequest falls back to GLOBAL when region is undefined", async () => {
    process.env.PAYTABS_SERVER_KEY = "key";

    const originalFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = ((...args: any[]) => {
      calls.push(args);
      return Promise.resolve({ json: async () => ({ ok: true }) } as any);
    }) as any;

    try {
      await createHppRequest(undefined as any, { any: "thing" });

      expect(calls[0][0]).toBe(
        "https://secure-global.paytabs.com/payment/request",
      );
    } finally {
      globalThis.fetch = originalFetch as any;
    }
  });

  test("createHppRequest propagates fetch rejections", async () => {
    process.env.PAYTABS_SERVER_KEY = "key";

    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((..._args: any[]) => {
      return Promise.reject(new Error("Network error"));
    }) as any;

    try {
      await expect(createHppRequest("UAE", { amount: 1 })).rejects.toThrow(
        "Network error",
      );
    } finally {
      globalThis.fetch = originalFetch as any;
    }
  });

  test("createHppRequest uses undefined header when PAYTABS_SERVER_KEY is absent", async () => {
    delete process.env.PAYTABS_SERVER_KEY;

    const originalFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = ((...args: any[]) => {
      calls.push(args);
      return Promise.resolve({ json: async () => ({}) } as any);
    }) as any;

    try {
      await createHppRequest("KSA", { amount: 100 });

      expect(calls[0][1].headers.authorization).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch as any;
    }
  });
});
