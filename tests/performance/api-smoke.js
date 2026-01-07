/**
 * @fileoverview k6 Smoke Test - Basic API Functionality
 * @module tests/performance/api-smoke
 *
 * TEST-PERF: Quick smoke test to verify API is functioning
 * Run with: k6 run tests/performance/api-smoke.js
 *
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { BASE_URL, THRESHOLDS, STAGES, ENDPOINTS, getHeaders } from "./config.js";

// Custom metrics
const errorRate = new Rate("errors");
const apiDuration = new Trend("api_duration");

// Test configuration
export const options = {
  stages: STAGES.smoke,
  thresholds: THRESHOLDS.smoke,
  insecureSkipTLSVerify: true,
};

// Setup: Run once before tests
export function setup() {
  console.log(`Starting smoke test against: ${BASE_URL}`);
  
  // Verify API is reachable
  const res = http.get(`${BASE_URL}/api/health`, { timeout: "10s" });
  if (res.status !== 200) {
    console.error(`Health check failed: ${res.status}`);
  }
  
  return { startTime: new Date().toISOString() };
}

// Main test function
export default function () {
  const headers = getHeaders();

  // Test 1: Health endpoint
  {
    const res = http.get(`${BASE_URL}/api/health`, { headers });
    check(res, {
      "health: status 200": (r) => r.status === 200,
      "health: response time < 200ms": (r) => r.timings.duration < 200,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  }

  sleep(1);

  // Test 2: Session endpoint (unauthenticated)
  {
    const res = http.get(`${BASE_URL}${ENDPOINTS.session}`, { headers });
    check(res, {
      "session: status 200 or 401": (r) => r.status === 200 || r.status === 401,
      "session: response time < 500ms": (r) => r.timings.duration < 500,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status >= 500);
  }

  sleep(1);

  // Test 3: Assets list (public or auth required)
  {
    const res = http.get(`${BASE_URL}${ENDPOINTS.assets}?limit=10`, { headers });
    check(res, {
      "assets: status not 5xx": (r) => r.status < 500,
      "assets: response time < 1000ms": (r) => r.timings.duration < 1000,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status >= 500);
  }

  sleep(1);

  // Test 4: Products list (marketplace)
  {
    const res = http.get(`${BASE_URL}${ENDPOINTS.products}?limit=10`, { headers });
    check(res, {
      "products: status not 5xx": (r) => r.status < 500,
      "products: response time < 1000ms": (r) => r.timings.duration < 1000,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status >= 500);
  }

  sleep(1);

  // Test 5: Work orders (likely requires auth)
  {
    const res = http.get(`${BASE_URL}${ENDPOINTS.workOrders}?limit=10`, { headers });
    check(res, {
      "workOrders: status 200 or 401/403": (r) =>
        r.status === 200 || r.status === 401 || r.status === 403,
      "workOrders: response time < 1000ms": (r) => r.timings.duration < 1000,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status >= 500);
  }

  sleep(2);
}

// Teardown: Run once after tests
export function teardown(data) {
  console.log(`Smoke test completed. Started at: ${data.startTime}`);
}

// Summary handler
export function handleSummary(data) {
  return {
    "tests/performance/results/smoke-summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
  };
}

function textSummary(data, options) {
  const lines = [];
  lines.push("=".repeat(60));
  lines.push("  SMOKE TEST SUMMARY");
  lines.push("=".repeat(60));
  
  if (data.metrics) {
    lines.push(`\n  HTTP Requests: ${data.metrics.http_reqs?.values?.count || 0}`);
    lines.push(`  Failed Requests: ${(data.metrics.http_req_failed?.values?.rate * 100 || 0).toFixed(2)}%`);
    lines.push(`  Avg Duration: ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`);
    lines.push(`  P95 Duration: ${(data.metrics.http_req_duration?.values?.["p(95)"] || 0).toFixed(2)}ms`);
  }
  
  lines.push("\n" + "=".repeat(60));
  return lines.join("\n");
}
