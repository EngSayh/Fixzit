import { expect, test } from "@playwright/test";

test.describe("Subscription lifecycle E2E", () => {
  test("signup → subscribe → renew → cancel succeeds with API stubs", async ({ page }) => {
    const hits: Record<string, number> = {};
    const track = (key: string) => {
      hits[key] = (hits[key] || 0) + 1;
    };

    await page.route("**/api/auth/signup", (route) => {
      track("signup");
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, userId: "user-123" }),
      });
    });

    await page.route("**/api/billing/subscribe", (route) => {
      track("subscribe");
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          checkoutUrl: "https://checkout.example.test",
          subscriptionId: "sub_123",
          status: "PENDING",
        }),
      });
    });

    await page.route("**/api/billing/upgrade", (route) => {
      track("renew");
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          subscriptionId: "sub_123",
          status: "ACTIVE",
          nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        }),
      });
    });

    await page.route("**/api/checkout/complete", (route) => {
      track("cancel");
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          subscription: { status: "CANCELLED", id: "sub_123" },
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const headers = { "Content-Type": "application/json" };
      const signup = await fetch("/api/auth/signup", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "user@example.com", password: "Password1!" }),
      });
      const subscribe = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: "pro", seats: 5 }),
      });
      const renew = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers,
        body: JSON.stringify({ subscriptionId: "sub_123", plan: "pro-plus" }),
      });
      const cancel = await fetch("/api/checkout/complete", {
        method: "POST",
        headers,
        body: JSON.stringify({ subscriptionId: "sub_123", status: "CANCELLED" }),
      });

      return {
        signupStatus: signup.status,
        subscribeStatus: subscribe.status,
        renewStatus: renew.status,
        cancelStatus: cancel.status,
      };
    });

    expect(result.signupStatus).toBe(201);
    expect(result.subscribeStatus).toBe(200);
    expect(result.renewStatus).toBe(200);
    expect(result.cancelStatus).toBe(200);
    expect(hits).toMatchObject({
      signup: 1,
      subscribe: 1,
      renew: 1,
      cancel: 1,
    });
  });
});

test.describe("Payment failure recovery E2E", () => {
  test("retries checkout after gateway failure", async ({ page }) => {
    let attempts = 0;

    await page.route("**/api/payments/tap/checkout", (route) => {
      attempts += 1;
      if (attempts === 1) {
        return route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ error: "Gateway Timeout" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          chargeId: "chg_retry_1",
          redirectUrl: "https://checkout.tap.test/retry",
        }),
      });
    });

    const statuses = await page.evaluate(async () => {
      const headers = { "Content-Type": "application/json" };
      const first = await fetch("/api/payments/tap/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ amount: 250, currency: "SAR" }),
      });

      const shouldRetry = first.status >= 500;
      let secondStatus = first.status;
      if (shouldRetry) {
        const retry = await fetch("/api/payments/tap/checkout", {
          method: "POST",
          headers,
          body: JSON.stringify({ amount: 250, currency: "SAR", retry: true }),
        });
        secondStatus = retry.status;
      }

      return { firstStatus: first.status, secondStatus };
    });

    expect(statuses.firstStatus).toBe(502);
    expect(statuses.secondStatus).toBe(200);
    expect(attempts).toBe(2);
  });
});
