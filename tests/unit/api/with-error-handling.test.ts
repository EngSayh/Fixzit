/**
 * Tests for API route error handling middleware
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  withErrorHandling,
  createErrorResponse,
  parseRequestBody,
  validateParams,
} from "@/lib/api/with-error-handling";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock NextRequest
function createMockRequest(
  method: string,
  body?: string,
  url = "http://localhost:3000/api/test"
): NextRequest {
  return new NextRequest(url, {
    method,
    body,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
}

describe("withErrorHandling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through successful handler response", async () => {
    const handler = withErrorHandling(async () => {
      return NextResponse.json({ data: { success: true } });
    });

    const request = createMockRequest("GET");
    const result = await handler(request, {});
    const json = await result.json();

    expect(json.data.success).toBe(true);
  });

  it("parses JSON body for POST requests", async () => {
    const handler = withErrorHandling<{ name: string }>(async ({ body }) => {
      return NextResponse.json({ data: { received: body?.name } });
    });

    const request = createMockRequest("POST", '{"name": "John"}');
    const result = await handler(request, {});
    const json = await result.json();

    expect(json.data.received).toBe("John");
  });

  it("returns 400 for invalid JSON body", async () => {
    const handler = withErrorHandling(async () => {
      return NextResponse.json({ data: {} });
    });

    const request = createMockRequest("POST", "not valid json");
    const result = await handler(request, {});
    const json = await result.json();

    expect(result.status).toBe(400);
    expect(json.error).toBe("Invalid JSON body");
    expect(json.code).toBe("INVALID_JSON");
  });

  it("handles handler exceptions", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("Something went wrong");
    });

    const request = createMockRequest("GET");
    const result = await handler(request, {});
    const json = await result.json();

    expect(result.status).toBe(500);
    expect(json.error).toBe("Something went wrong");
    expect(json.requestId).toBeDefined();
  });

  it("maps 'not found' errors to 404", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("User not found");
    });

    const request = createMockRequest("GET");
    const result = await handler(request, {});

    expect(result.status).toBe(404);
  });

  it("maps 'unauthorized' errors to 401", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("unauthorized access denied");
    });

    const request = createMockRequest("GET");
    const result = await handler(request, {});

    expect(result.status).toBe(401);
  });

  it("maps 'forbidden' errors to 403", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("Permission denied - forbidden");
    });

    const request = createMockRequest("GET");
    const result = await handler(request, {});

    expect(result.status).toBe(403);
  });

  it("maps 'validation' errors to 400", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("validation failed for field email");
    });

    const request = createMockRequest("POST", "{}");
    const result = await handler(request, {});

    expect(result.status).toBe(400);
  });

  it("includes requestId in context", async () => {
    let capturedRequestId = "";

    const handler = withErrorHandling(async ({ requestId }) => {
      capturedRequestId = requestId;
      return NextResponse.json({ data: { requestId } });
    });

    const request = createMockRequest("GET");
    await handler(request, {});

    expect(capturedRequestId).toMatch(/^req_\d+_[a-z0-9]+$/);
  });

  it("respects parseBody: false option", async () => {
    const handler = withErrorHandling(
      async ({ body }) => {
        return NextResponse.json({ data: { body } });
      },
      { parseBody: false }
    );

    const request = createMockRequest("POST", '{"name": "John"}');
    const result = await handler(request, {});
    const json = await result.json();

    expect(json.data.body).toBeUndefined();
  });

  it("uses custom error messages", async () => {
    const handler = withErrorHandling(
      async () => {
        throw new Error("Database connection failed");
      },
      { errorMessages: { 500: "Service temporarily unavailable" } }
    );

    const request = createMockRequest("GET");
    const result = await handler(request, {});
    const json = await result.json();

    expect(json.error).toBe("Service temporarily unavailable");
  });
});

describe("createErrorResponse", () => {
  it("creates error response with message and status", async () => {
    const response = createErrorResponse("Not found", 404);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("includes optional code and details", async () => {
    const response = createErrorResponse("Validation failed", 400, {
      code: "VALIDATION_ERROR",
      details: { field: "email", message: "Invalid format" },
      requestId: "req_123",
    });
    const json = await response.json();

    expect(json.code).toBe("VALIDATION_ERROR");
    expect(json.details.field).toBe("email");
    expect(json.requestId).toBe("req_123");
  });
});

describe("parseRequestBody", () => {
  it("parses valid JSON body", async () => {
    const request = createMockRequest("POST", '{"name": "John", "age": 30}');
    const result = await parseRequestBody<{ name: string; age: number }>(request);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John");
      expect(result.data.age).toBe(30);
    }
  });

  it("validates required fields", async () => {
    const request = createMockRequest("POST", '{"name": "John"}');
    const result = await parseRequestBody<{ name: string; email: string }>(
      request,
      { required: ["name", "email"] }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("email");
    }
  });

  it("handles empty body", async () => {
    const request = createMockRequest("POST", "");
    const result = await parseRequestBody(request);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Request body is empty");
    }
  });

  it("handles invalid JSON", async () => {
    const request = createMockRequest("POST", "invalid json");
    const result = await parseRequestBody(request);

    expect(result.success).toBe(false);
  });
});

describe("validateParams", () => {
  it("validates required params", () => {
    const params = { id: "123", slug: "test-post" };
    const result = validateParams<{ id: string; slug: string }>(params, ["id", "slug"]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("123");
      expect(result.data.slug).toBe("test-post");
    }
  });

  it("fails for missing params", () => {
    const params = { id: "123" };
    const result = validateParams<{ id: string; slug: string }>(params, ["id", "slug"]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("slug");
    }
  });

  it("fails for array params when string expected", () => {
    const params = { id: ["123", "456"] };
    const result = validateParams<{ id: string }>(params, ["id"]);

    expect(result.success).toBe(false);
  });
});
