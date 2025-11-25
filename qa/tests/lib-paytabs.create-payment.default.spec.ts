// Framework: Playwright Test (@playwright/test)
import { test, expect } from "@playwright/test";
import { createPaymentPage } from "../../lib/paytabs.js";

test.describe("lib/paytabs - createPaymentPage (default base URL)", () => {
  test("creates payment page successfully and posts correct payload", async () => {
    delete process.env.PAYTABS_BASE_URL; // force default to GLOBAL
    process.env.PAYTABS_PROFILE_ID = "test-profile-id";
    process.env.PAYTABS_SERVER_KEY = "test-server-key";

    const validRequest = {
      amount: 150.5,
      currency: "SAR",
      customerDetails: {
        name: "John Doe",
        email: "john@example.com",
        phone: "+966501234567",
        address: "123 Main St",
        city: "Riyadh",
        state: "Riyadh",
        country: "SA",
        zip: "12345",
      },
      description: "Test payment",
      invoiceId: "INV-001",
      returnUrl: "https://example.com/return",
      callbackUrl: "https://example.com/callback",
    };

    const mockResponse = {
      redirect_url: "https://payment.paytabs.com/pay/12345",
      tran_ref: "TST-12345-67890",
    };

    const originalFetch = globalThis.fetch;
    const calls: FetchArgs[] = [];
    globalThis.fetch = ((...args: FetchArgs) => {
      calls.push(args);
      return Promise.resolve({ json: async () => mockResponse } as unknown as Response);
    }) as typeof fetch;

    try {
      const result = await createPaymentPage(validRequest);

      // Result mapping
      expect(result).toEqual({
        success: true,
        paymentUrl: "https://payment.paytabs.com/pay/12345",
        transactionId: "TST-12345-67890",
      });

      // Endpoint and headers
      expect(calls[0][0]).toBe(
        "https://secure-global.paytabs.com/payment/request",
      );
      expect(calls[0][1].headers).toEqual({
        Authorization: "test-server-key",
        "Content-Type": "application/json",
      });

      // Body fields
      const body = JSON.parse(calls[0][1].body);
      expect(body.profile_id).toBe("test-profile-id");
      expect(body.tran_type).toBe("sale");
      expect(body.tran_class).toBe("ecom");
      expect(body.cart_id).toBe("INV-001");
      expect(body.cart_currency).toBe("SAR");
      expect(body.cart_amount).toBe("150.50");
      expect(body.cart_description).toBe("Test payment");

      // URLs
      expect(body.return).toBe("https://example.com/return");
      expect(body.callback).toBe("https://example.com/callback");

      // Customer details
      expect(body.customer_details).toEqual({
        name: "John Doe",
        email: "john@example.com",
        phone: "+966501234567",
        street1: "123 Main St",
        city: "Riyadh",
        state: "Riyadh",
        country: "SA",
        zip: "12345",
      });

      // Options
      expect(body.hide_shipping).toBe(true);
      expect(body.paypage_lang).toBe("ar");
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }
  });

  test("formats amount to 2 decimal places and handles various amounts", async () => {
    delete process.env.PAYTABS_BASE_URL;
    process.env.PAYTABS_PROFILE_ID = "id";
    process.env.PAYTABS_SERVER_KEY = "key";

    const originalFetch = globalThis.fetch;
    const captured: string[] = [];
    globalThis.fetch = ((...args: FetchArgs) => {
      const body = args[1]?.body as string;
      captured.push(body);
      return Promise.resolve({
        json: async () => ({ redirect_url: "url", tran_ref: "ref" }),
      } as any);
    }) as any;

    try {
      await createPaymentPage({
        amount: 100.999,
        currency: "SAR",
        customerDetails: {
          name: "n",
          email: "e",
          phone: "p",
          address: "a",
          city: "c",
          state: "s",
          country: "SA",
          zip: "z",
        },
        description: "d",
        returnUrl: "u1",
        callbackUrl: "u2",
      } as any);
      expect(captured[captured.length - 1]).toContain('"cart_amount":"101.00"');

      await createPaymentPage({
        amount: 0,
        currency: "SAR",
        customerDetails: {
          name: "n",
          email: "e",
          phone: "p",
          address: "a",
          city: "c",
          state: "s",
          country: "SA",
          zip: "z",
        },
        description: "d",
        returnUrl: "u1",
        callbackUrl: "u2",
      } as any);
      expect(captured[captured.length - 1]).toContain('"cart_amount":"0.00"');

      await createPaymentPage({
        amount: -50.25,
        currency: "SAR",
        customerDetails: {
          name: "n",
          email: "e",
          phone: "p",
          address: "a",
          city: "c",
          state: "s",
          country: "SA",
          zip: "z",
        },
        description: "d",
        returnUrl: "u1",
        callbackUrl: "u2",
      } as any);
      expect(captured[captured.length - 1]).toContain('"cart_amount":"-50.25"');

      await createPaymentPage({
        amount: 999999999.99,
        currency: "SAR",
        customerDetails: {
          name: "n",
          email: "e",
          phone: "p",
          address: "a",
          city: "c",
          state: "s",
          country: "SA",
          zip: "z",
        },
        description: "d",
        returnUrl: "u1",
        callbackUrl: "u2",
      } as any);
      expect(captured[captured.length - 1]).toContain(
        '"cart_amount":"999999999.99"',
      );
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }
  });

  test("generates cart_id when invoiceId is not provided", async () => {
    delete process.env.PAYTABS_BASE_URL;
    process.env.PAYTABS_PROFILE_ID = "id";
    process.env.PAYTABS_SERVER_KEY = "key";

    const originalFetch = globalThis.fetch;
    let lastBody: any;
    globalThis.fetch = ((...args: any[]) => {
      lastBody = JSON.parse(args[1]?.body);
      return Promise.resolve({
        json: async () => ({ redirect_url: "url", tran_ref: "ref" }),
      } as any);
    }) as any;

    try {
      await createPaymentPage({
        amount: 10,
        currency: "SAR",
        customerDetails: {
          name: "n",
          email: "e",
          phone: "p",
          address: "a",
          city: "c",
          state: "s",
          country: "SA",
          zip: "z",
        },
        description: "d",
        returnUrl: "u1",
        callbackUrl: "u2",
      } as any);

      expect(typeof lastBody.cart_id).toBe("string");
      expect(lastBody.cart_id.startsWith("CART-")).toBe(true);
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }
  });

  test("handles gateway error JSON (message) and missing fields", async () => {
    delete process.env.PAYTABS_BASE_URL;
    process.env.PAYTABS_PROFILE_ID = "id";
    process.env.PAYTABS_SERVER_KEY = "key";

    const originalFetch = globalThis.fetch;

    // Case: { message: 'Invalid payment details' }
    globalThis.fetch = ((..._args: any[]) => {
      return Promise.resolve({
        json: async () => ({ message: "Invalid payment details" }),
      } as any);
    }) as any;

    try {
      const err1 = await createPaymentPage({
        amount: 10,
        currency: "SAR",
        customerDetails: {
          name: "n",
          email: "e",
          phone: "p",
          address: "a",
          city: "c",
          state: "s",
          country: "SA",
          zip: "z",
        },
        description: "d",
        returnUrl: "u1",
        callbackUrl: "u2",
      } as any);
      expect(err1).toEqual({
        success: false,
        error: "Invalid payment details",
      });

      // Case: {}
      globalThis.fetch = ((..._args: FetchArgs) => {
        return Promise.resolve({ json: async () => ({}) } as unknown as Response);
      }) as typeof fetch;

      const err2 = await createPaymentPage({
        amount: 10,
        currency: "SAR",
        customerDetails: {
          name: "n",
          email: "e",
          phone: "p",
          address: "a",
          city: "c",
          state: "s",
          country: "SA",
          zip: "z",
        },
        description: "d",
        returnUrl: "u1",
        callbackUrl: "u2",
      } as any);
      expect(err2).toEqual({
        success: false,
        error: "Payment initialization failed",
      });
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }
  });

  test("handles non-Error exception rejections gracefully", async () => {
    delete process.env.PAYTABS_BASE_URL;
    process.env.PAYTABS_PROFILE_ID = "id";
    process.env.PAYTABS_SERVER_KEY = "key";

    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((..._args: any[]) =>
      Promise.reject("string error")) as any;

    try {
      const res = await createPaymentPage({
        amount: 10,
        currency: "SAR",
        customerDetails: {
          name: "n",
          email: "e",
          phone: "p",
          address: "a",
          city: "c",
          state: "s",
          country: "SA",
          zip: "z",
        },
        description: "d",
        returnUrl: "u1",
        callbackUrl: "u2",
      } as any);
      expect(res).toEqual({ success: false, error: "Payment gateway error" });
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }
  });

  test("preserves special and Unicode characters in payload fields", async () => {
    delete process.env.PAYTABS_BASE_URL;
    process.env.PAYTABS_PROFILE_ID = "id";
    process.env.PAYTABS_SERVER_KEY = "key";

    const originalFetch = globalThis.fetch;
    let bodyObj: any;
    globalThis.fetch = ((...args: any[]) => {
      bodyObj = JSON.parse(args[1]?.body);
      return Promise.resolve({
        json: async () => ({ redirect_url: "url", tran_ref: "ref" }),
      } as any);
    }) as any;

    try {
      await createPaymentPage({
        amount: 100,
        currency: "SAR",
        customerDetails: {
          name: "محمد الأحمد",
          email: "محمد@example.com",
          phone: "+966501234567",
          address: "شارع الملك فهد ١٢٣",
          city: "الرياض",
          state: "الرياض",
          country: "SA",
          zip: "12345",
        },
        description: 'Test "الدفع" with <خاص> & رموز',
        returnUrl: "https://r",
        callbackUrl: "https://c",
      } as any);

      expect(bodyObj.customer_details.name).toBe("محمد الأحمد");
      expect(bodyObj.customer_details.city).toBe("الرياض");
      expect(bodyObj.cart_description).toBe('Test "الدفع" with <خاص> & رموز');
    } finally {
      globalThis.fetch = originalFetch as any;
    }
  });
});
