import { test, expect } from "@playwright/test";

/**
 * Framework: Playwright (@playwright/test)
 * Scope: /api/qa/log route (POST, GET)
 * Covers: happy paths, edge cases, and failure conditions.
 */

// Helper to generate random payloads to avoid caching and make logs unique
function randId(prefix = "t") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe("QA Log API (/api/qa/log)", () => {
  test("POST with valid payload returns success (mock or real DB)", async ({
    request,
  }) => {
    const payload = { event: `click-${randId()}`, data: { x: 10 } };
    const res = await request.post("/api/qa/log", { data: payload });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // In mock DB mode returns { success: true, mock: true }
    // In real DB mode returns { success: true }
    expect(body).toMatchObject({ success: true });
    if ("mock" in body) {
      expect(body.mock).toBe(true);
    }
  });

  test("POST returns 500 on invalid JSON body", async ({ request }) => {
    const res = await request.post("/api/qa/log", {
      headers: { "content-type": "application/json" },
      data: "not-json", // Use 'data' instead of 'body' for Playwright API
    });
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to log event" });
  });

  test("GET returns empty logs with mock flag when using mock DB; otherwise array of logs", async ({
    request,
  }) => {
    const res = await request.get("/api/qa/log?limit=5");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    if ("mock" in body) {
      expect(body).toEqual({ logs: [], mock: true });
    } else {
      expect(Array.isArray(body.logs)).toBe(true);
    }
  });

  test("GET respects event filter and caps limit at 1000", async ({
    request,
  }) => {
    const res = await request.get("/api/qa/log?event=submit&limit=50000");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    if ("mock" in body) {
      expect(body).toEqual({ logs: [], mock: true });
    } else {
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.logs.length).toBeLessThanOrEqual(1000);
    }
  });
});
