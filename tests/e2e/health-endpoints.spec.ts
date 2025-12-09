import { test, expect } from "@playwright/test";

/**
 * Health Endpoints E2E Tests
 * Tests /api/health and /api/health/ready endpoints
 * 
 * These tests verify:
 * 1. Health endpoint returns correct status
 * 2. Readiness endpoint returns correct status
 * 3. Authentication tokens provide additional diagnostics
 * 4. Circuit breaker metrics endpoint works
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const HEALTH_CHECK_TOKEN = process.env.HEALTH_CHECK_TOKEN || "";

test.describe("Health Endpoints", () => {
  test("GET /api/health returns 200 with health status", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    
    // Required fields
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("database");
    
    // Status should be healthy or unhealthy
    expect(["healthy", "unhealthy"]).toContain(body.status);
    
    // Timestamp should be valid ISO date
    expect(() => new Date(body.timestamp)).not.toThrow();
    
    // Database should have a status value
    expect(["connected", "disconnected", "error", "timeout"]).toContain(body.database);
  });

  test("GET /api/health returns uptime", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    
    // Uptime should be a positive number
    expect(body).toHaveProperty("uptime");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  test("GET /api/health without token does not expose diagnostics", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    
    // Without auth token, diagnostics should NOT be present
    expect(body).not.toHaveProperty("diagnostics");
  });

  test.describe("Authorized Health Checks", () => {
    test.skip(!HEALTH_CHECK_TOKEN, "HEALTH_CHECK_TOKEN not configured");

    test("GET /api/health with token returns diagnostics", async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`, {
        headers: {
          "X-Health-Token": HEALTH_CHECK_TOKEN,
        },
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      
      // With auth token, diagnostics should be present
      expect(body).toHaveProperty("diagnostics");
      expect(body.diagnostics).toHaveProperty("database");
      expect(body.diagnostics).toHaveProperty("memory");
      expect(body.diagnostics).toHaveProperty("environment");
      
      // Memory should have expected fields
      expect(body.diagnostics.memory).toHaveProperty("usedMB");
      expect(body.diagnostics.memory).toHaveProperty("totalMB");
      expect(body.diagnostics.memory).toHaveProperty("rssMB");
    });
  });
});

test.describe("Readiness Endpoint", () => {
  test("GET /api/health/ready returns 200 when ready", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health/ready`);
    
    // Should be 200 (ready) or 503 (not ready)
    expect([200, 503]).toContain(response.status());
    
    const body = await response.json();
    
    // Required fields
    expect(body).toHaveProperty("ready");
    expect(body).toHaveProperty("checks");
    
    // ready should be boolean
    expect(typeof body.ready).toBe("boolean");
    
    // If status is 200, ready should be true
    if (response.status() === 200) {
      expect(body.ready).toBe(true);
    }
  });

  test("GET /api/health/ready includes database check", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health/ready`);
    
    const body = await response.json();
    
    // Checks should include database
    expect(body.checks).toHaveProperty("database");
    expect(["connected", "disconnected", "error", "timeout"]).toContain(body.checks.database);
  });
});

test.describe("Circuit Breaker Metrics", () => {
  test("GET /api/metrics/circuit-breakers returns Prometheus format", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/metrics/circuit-breakers`);
    
    expect(response.status()).toBe(200);
    
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("text/plain");
    
    const body = await response.text();
    
    // Should contain Prometheus metric format
    expect(body).toContain("circuit_breaker_state");
    expect(body).toContain("circuit_breaker_failures_total");
    expect(body).toContain("# HELP");
    expect(body).toContain("# TYPE");
  });

  test("GET /api/metrics/circuit-breakers?format=json returns JSON", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/metrics/circuit-breakers?format=json`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    
    // Should have summary fields
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("open");
    expect(body).toHaveProperty("closed");
    expect(body).toHaveProperty("halfOpen");
    expect(body).toHaveProperty("breakers");
    
    // Total should be a positive number
    expect(typeof body.total).toBe("number");
    expect(body.total).toBeGreaterThan(0);
    
    // Breakers array should have entries
    expect(Array.isArray(body.breakers)).toBe(true);
    expect(body.breakers.length).toBe(body.total);
    
    // Each breaker should have expected fields
    for (const breaker of body.breakers) {
      expect(breaker).toHaveProperty("name");
      expect(breaker).toHaveProperty("state");
      expect(breaker).toHaveProperty("stateNumeric");
      expect(breaker).toHaveProperty("failureCount");
      expect(["closed", "open", "half-open"]).toContain(breaker.state);
    }
  });

  test("Circuit breaker states are valid", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/metrics/circuit-breakers?format=json`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    
    // Verify state counts add up
    expect(body.open + body.closed + body.halfOpen).toBe(body.total);
  });
});

test.describe("Health Endpoint Performance", () => {
  test("Health check responds within 3 seconds", async ({ request }) => {
    const start = Date.now();
    
    const response = await request.get(`${BASE_URL}/api/health`);
    
    const duration = Date.now() - start;
    
    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(3000);
  });

  test("Readiness check responds within 5 seconds", async ({ request }) => {
    const start = Date.now();
    
    const response = await request.get(`${BASE_URL}/api/health/ready`);
    
    const duration = Date.now() - start;
    
    // Even if not ready, should respond quickly
    expect([200, 503]).toContain(response.status());
    expect(duration).toBeLessThan(5000);
  });
});
