// Framework: Playwright Test (@playwright/test)
import { test, expect } from "@playwright/test";
import {
  validateCallback,
  PAYMENT_METHODS,
  CURRENCIES,
  getAvailablePaymentMethods,
} from "../../lib/paytabs.js";

test.describe("lib/paytabs - validateCallback, constants, and helpers", () => {
  test("validateCallback: signature equals generated value (placeholder empty string)", async () => {
    // Placeholder generateSignature returns ''
    expect(validateCallback({}, "")).toBe(true);
    expect(validateCallback({ any: "thing" }, "")).toBe(true);

    expect(validateCallback({}, "x")).toBe(false);
    expect(validateCallback(null as any, "x")).toBe(false);
    expect(validateCallback({ a: 1 }, undefined as any)).toBe(false);
  });

  test("PAYMENT_METHODS and CURRENCIES have expected mappings", async () => {
    expect(PAYMENT_METHODS).toMatchObject({
      MADA: "mada",
      VISA: "visa",
      MASTERCARD: "mastercard",
      APPLE_PAY: "applepay",
      STC_PAY: "stcpay",
      TAMARA: "tamara",
      TABBY: "tabby",
    });

    expect(CURRENCIES).toMatchObject({
      SAR: "SAR",
      USD: "USD",
      EUR: "EUR",
      AED: "AED",
    });
  });

  test("getAvailablePaymentMethods returns 6 enabled methods with correct shapes and excludes Tabby", async () => {
    const methods = getAvailablePaymentMethods();
    expect(Array.isArray(methods)).toBe(true);
    expect(methods).toHaveLength(6);

    for (const m of methods) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.name).toBe("string");
      expect(typeof m.icon).toBe("string");
      expect(typeof m.enabled).toBe("boolean");
      expect(m.enabled).toBe(true);
      expect(m.icon).toMatch(/^\/icons\/.+\.svg$/);
    }

    // Contains expected
    const ids = methods.map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        PAYMENT_METHODS.MADA,
        PAYMENT_METHODS.VISA,
        PAYMENT_METHODS.MASTERCARD,
        PAYMENT_METHODS.APPLE_PAY,
        PAYMENT_METHODS.STC_PAY,
        PAYMENT_METHODS.TAMARA,
      ]),
    );

    // Excludes TABBY
    expect(ids).not.toContain(PAYMENT_METHODS.TABBY);
  });
});
