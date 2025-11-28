import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

/**
 * Lightweight tests for forgot-password API route.
 * 
 * Note: Full integration tests require database setup.
 * These tests verify basic request validation that doesn't require mocking.
 */
describe("POST /api/auth/forgot-password - Input Validation", () => {
  function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("returns 400 when email is missing", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const req = createRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Email is required");
  });

  it("returns 400 for invalid email format", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const req = createRequest({ email: "not-an-email" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid email format");
  });

  it("returns 400 for empty email string", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const req = createRequest({ email: "   " });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Email is required");
  });
});
