import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSmartRateLimit = vi.fn();
const mockDbConnect = vi.fn();
const mockCreateSubscriptionCheckout = vi.fn();

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/db/mongoose", () => ({
  dbConnect: () => mockDbConnect(),
}));

vi.mock("@/lib/finance/checkout", () => ({
  createSubscriptionCheckout: (...args: unknown[]) => mockCreateSubscriptionCheckout(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
  }),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
  createSecureResponse: vi.fn((data, status) => {
    return new Response(JSON.stringify(data), { 
      status, 
      headers: { "Content-Type": "application/json" } 
    });
  }),
}));

import { POST } from "@/app/api/checkout/session/route";
import { NextRequest } from "next/server";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/checkout/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("checkout/session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 100 });
    mockDbConnect.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    
    const req = createRequest({});
    const res = await POST(req);
    
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid subscriber type", async () => {
    const req = createRequest({
      subscriberType: "INVALID",
      modules: ["FM"],
      seats: 5,
      customer: { email: "test@example.com" },
    });
    
    const res = await POST(req);
    const body = await res.json();
    
    expect(res.status).toBe(400);
    expect(body.error).toBe("INVALID_SUBSCRIBER_TYPE");
  });

  it("returns 400 when modules are missing", async () => {
    const req = createRequest({
      subscriberType: "CORPORATE",
      modules: [],
      seats: 5,
      customer: { email: "test@example.com" },
    });
    
    const res = await POST(req);
    const body = await res.json();
    
    expect(res.status).toBe(400);
    expect(body.error).toBe("MODULES_REQUIRED");
  });

  it("returns 400 when customer email is missing", async () => {
    const req = createRequest({
      subscriberType: "CORPORATE",
      modules: ["FM"],
      seats: 5,
      customer: {},
    });
    
    const res = await POST(req);
    const body = await res.json();
    
    expect(res.status).toBe(400);
    expect(body.error).toBe("CUSTOMER_EMAIL_REQUIRED");
  });

  it("returns 400 for invalid seat count", async () => {
    const req = createRequest({
      subscriberType: "CORPORATE",
      modules: ["FM"],
      seats: 0,
      customer: { email: "test@example.com" },
    });
    
    const res = await POST(req);
    const body = await res.json();
    
    expect(res.status).toBe(400);
    expect(body.error).toBe("INVALID_SEAT_COUNT");
  });

  it("creates checkout session with valid payload", async () => {
    const mockResult = {
      sessionId: "session-123",
      url: "https://checkout.stripe.com/session-123",
    };
    mockCreateSubscriptionCheckout.mockResolvedValueOnce(mockResult);
    
    const req = createRequest({
      subscriberType: "CORPORATE",
      tenantId: "tenant-123",
      modules: ["FM", "HR"],
      seats: 10,
      billingCycle: "MONTHLY",
      currency: "SAR",
      customer: { email: "admin@company.com", name: "Company Admin" },
    });
    
    const res = await POST(req);
    const body = await res.json();
    
    expect(res.status).toBe(200);
    expect(body.sessionId).toBe("session-123");
  });

  it("handles annual billing cycle", async () => {
    const mockResult = { sessionId: "session-annual" };
    mockCreateSubscriptionCheckout.mockResolvedValueOnce(mockResult);
    
    const req = createRequest({
      subscriberType: "OWNER",
      modules: ["PROPERTIES"],
      seats: 1,
      billingCycle: "ANNUAL",
      customer: { email: "owner@example.com" },
    });
    
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(mockCreateSubscriptionCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ billingCycle: "ANNUAL" })
    );
  });

  it("returns 500 on checkout service error", async () => {
    mockCreateSubscriptionCheckout.mockRejectedValueOnce(new Error("Stripe error"));
    
    const req = createRequest({
      subscriberType: "CORPORATE",
      modules: ["FM"],
      seats: 5,
      customer: { email: "test@example.com" },
    });
    
    const res = await POST(req);
    const body = await res.json();
    
    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create checkout session");
  });
});
