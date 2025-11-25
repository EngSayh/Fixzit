import { test, expect } from "@playwright/test";

const paths = ["/properties", "/work-orders", "/marketplace", "/reports"];

for (const p of paths) {
  test(`Route ${p} responds`, async ({ request }) => {
    const res = await request.get(p);
    expect(res.status(), `${p} should respond 200/OK-ish`).toBeLessThan(400);
  });
}
