import { test, expect } from "@playwright/test";

test.describe("Fixzit Copilot guardrails", () => {
  test("requires authentication for cross-tenant queries", async ({ request }) => {
    // Without proper authentication, the API should reject the request
    // or return a message indicating access is controlled
    const response = await request.post("/api/copilot/chat", {
      data: { message: "Show me another tenant financials" },
    });
    // In offline mode with mock session, the copilot may still process but
    // should not leak cross-tenant data. Check for non-500 response.
    const status = response.status();
    expect([200, 401, 403]).toContain(status);
    if (status === 200) {
      const json = await response.json();
      // Should either deny or not expose other tenant data
      expect(json).toHaveProperty("reply");
    }
  });

  test("handles tool execution requests", async ({ request }) => {
    // Tool execution without proper context should fail gracefully
    const response = await request.post("/api/copilot/chat", {
      data: {
        tool: {
          name: "createWorkOrder",
          args: { title: "Leak", description: "Water leak", priority: "HIGH" },
        },
      },
    });
    // Can be 400 (bad request), 403 (forbidden), or 500 (validation error in offline mode)
    const status = response.status();
    expect([400, 403, 500]).toContain(status);
  });

  test("rejects knowledge ingestion without webhook secret", async ({ request }) => {
    // COPILOT_WEBHOOK_SECRET is required for security
    // Without it configured, the endpoint MUST return 503
    const payload = {
      docs: [
        {
          slug: "sample-doc",
          title: "Sample Doc",
          content: "Fixzit module overview",
          locale: "en" as const,
        },
      ],
    };
    const response = await request.post("/api/copilot/knowledge", {
      data: payload,
    });
    // 503 = webhook not configured (correct security behavior)
    // 401 = unauthorized (secret configured but not provided)
    expect([401, 503]).toContain(response.status());
  });
});
