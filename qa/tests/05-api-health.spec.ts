import { test, expect } from "@playwright/test";

test("Health endpoint(s)", async ({ request }) => {
  for (const url of ["/api/health", "/api/status"]) {
    const r = await request.get(url);
    if (r.status() < 400) {
      const body = await r.text();
      expect(body.length).toBeGreaterThan(0);
      return; // success on first available
    }
  }
  throw new Error("No health endpoint responded <400");
});
