/**
 * @fileoverview k6 Stress Test - Find Breaking Point
 * @module tests/performance/api-stress
 *
 * TEST-PERF: Stress test to find system limits and breaking points
 * Run with: k6 run tests/performance/api-stress.js
 *
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter, Gauge } from "k6/metrics";
import { BASE_URL, THRESHOLDS, STAGES, ENDPOINTS, getHeaders, TEST_ORG_ID } from "./config.js";

// Custom metrics for stress analysis
const errorRate = new Rate("errors");
const apiDuration = new Trend("api_duration");
const requestsTotal = new Counter("requests_total");
const concurrentUsers = new Gauge("concurrent_users");
const breakingPointHit = new Rate("breaking_point_hit");

// Test configuration - stress profile
export const options = {
  stages: STAGES.stress,
  thresholds: {
    ...THRESHOLDS.stress,
    errors: ["rate<0.30"], // Allow up to 30% errors in stress test
    "http_req_duration{scenario:critical}": ["p(95)<3000"],
  },
  insecureSkipTLSVerify: true,
  noConnectionReuse: false, // Reuse connections for realistic load
  userAgent: "k6-stress-test/1.0",
};

// Critical API endpoints to stress test
const CRITICAL_ENDPOINTS = [
  { name: "health", url: "/api/health", weight: 0.05 },
  { name: "assets", url: `${ENDPOINTS.assets}?limit=50`, weight: 0.20 },
  { name: "workOrders", url: `${ENDPOINTS.workOrders}?limit=50`, weight: 0.25 },
  { name: "products", url: `${ENDPOINTS.products}?limit=50`, weight: 0.15 },
  { name: "invoices", url: `${ENDPOINTS.invoices}?limit=50`, weight: 0.15 },
  { name: "dashboard", url: ENDPOINTS.dashboard, weight: 0.10 },
  { name: "employees", url: `${ENDPOINTS.employees}?limit=50`, weight: 0.10 },
];

// Setup
export function setup() {
  console.log("=".repeat(60));
  console.log("  STRESS TEST - Finding System Breaking Point");
  console.log("=".repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Org ID: ${TEST_ORG_ID}`);
  console.log(`Max VUs: 400`);
  console.log("");

  // Initial health check
  const healthRes = http.get(`${BASE_URL}/api/health`, { timeout: "10s" });
  if (healthRes.status !== 200) {
    console.warn(`⚠️  Health check returned: ${healthRes.status}`);
  } else {
    console.log("✓ API is healthy, starting stress test...");
  }

  return {
    startTime: Date.now(),
    baselineLatency: healthRes.timings.duration,
  };
}

// Main stress test function
export default function (data) {
  const headers = getHeaders();
  const vu = __VU;
  const iter = __ITER;

  concurrentUsers.add(vu);

  // Select endpoint based on weight
  const endpoint = selectEndpoint();

  group(`Stress: ${endpoint.name}`, function () {
    const startTime = Date.now();

    const res = http.get(`${BASE_URL}${endpoint.url}`, {
      headers,
      timeout: "30s",
      tags: { name: endpoint.name, scenario: "critical" },
    });

    const duration = Date.now() - startTime;

    // Track metrics
    requestsTotal.add(1);
    apiDuration.add(res.timings.duration);

    // Check for errors
    const isError = res.status >= 400;
    errorRate.add(isError);

    // Check for breaking point indicators
    const isBreaking =
      res.status >= 500 ||
      res.timings.duration > 5000 ||
      res.error !== undefined;

    breakingPointHit.add(isBreaking);

    // Detailed checks
    check(res, {
      [`${endpoint.name}: status < 500`]: (r) => r.status < 500,
      [`${endpoint.name}: response < 5s`]: (r) => r.timings.duration < 5000,
      [`${endpoint.name}: no timeout`]: (r) => !r.error,
    });

    // Log breaking points
    if (isBreaking && iter % 100 === 0) {
      console.log(
        `⚠️  Breaking point indicator: VU=${vu}, endpoint=${endpoint.name}, ` +
          `status=${res.status}, duration=${res.timings.duration.toFixed(0)}ms`
      );
    }
  });

  // Variable sleep to simulate realistic traffic bursts
  sleep(randomBetween(0.1, 1.0));
}

// Select endpoint based on weight
function selectEndpoint() {
  const rand = Math.random();
  let cumulative = 0;

  for (const ep of CRITICAL_ENDPOINTS) {
    cumulative += ep.weight;
    if (rand <= cumulative) return ep;
  }

  return CRITICAL_ENDPOINTS[0];
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// Teardown with analysis
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log("");
  console.log("=".repeat(60));
  console.log("  STRESS TEST COMPLETE");
  console.log("=".repeat(60));
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Baseline Latency: ${data.baselineLatency.toFixed(2)}ms`);
}

// Detailed summary
export function handleSummary(data) {
  const analysis = analyzeResults(data);

  return {
    "tests/performance/results/stress-summary.json": JSON.stringify(
      { ...data, analysis },
      null,
      2
    ),
    stdout: generateStressReport(data, analysis),
  };
}

function analyzeResults(data) {
  const m = data.metrics;

  const analysis = {
    totalRequests: m.http_reqs?.values?.count || 0,
    errorRate: ((m.http_req_failed?.values?.rate || 0) * 100).toFixed(2),
    avgLatency: (m.http_req_duration?.values?.avg || 0).toFixed(2),
    p95Latency: (m.http_req_duration?.values?.["p(95)"] || 0).toFixed(2),
    p99Latency: (m.http_req_duration?.values?.["p(99)"] || 0).toFixed(2),
    maxLatency: (m.http_req_duration?.values?.max || 0).toFixed(2),
    throughput: (m.http_reqs?.values?.rate || 0).toFixed(2),
    breakingPointRate: ((m.breaking_point_hit?.values?.rate || 0) * 100).toFixed(2),
  };

  // Determine system capacity estimate
  if (parseFloat(analysis.errorRate) < 5) {
    analysis.capacityEstimate = "System handled stress well - capacity not reached";
  } else if (parseFloat(analysis.errorRate) < 15) {
    analysis.capacityEstimate = "System showed strain - approaching capacity";
  } else {
    analysis.capacityEstimate = "System reached breaking point - capacity exceeded";
  }

  return analysis;
}

function generateStressReport(data, analysis) {
  const lines = [];
  
  lines.push("");
  lines.push("╔" + "═".repeat(68) + "╗");
  lines.push("║" + "  STRESS TEST ANALYSIS REPORT".padEnd(68) + "║");
  lines.push("╠" + "═".repeat(68) + "╣");
  lines.push("║" + "".padEnd(68) + "║");
  lines.push("║" + `  Total Requests:        ${analysis.totalRequests}`.padEnd(68) + "║");
  lines.push("║" + `  Error Rate:            ${analysis.errorRate}%`.padEnd(68) + "║");
  lines.push("║" + `  Breaking Point Rate:   ${analysis.breakingPointRate}%`.padEnd(68) + "║");
  lines.push("║" + "".padEnd(68) + "║");
  lines.push("║" + "  Response Times:".padEnd(68) + "║");
  lines.push("║" + `    Average:             ${analysis.avgLatency}ms`.padEnd(68) + "║");
  lines.push("║" + `    P95:                 ${analysis.p95Latency}ms`.padEnd(68) + "║");
  lines.push("║" + `    P99:                 ${analysis.p99Latency}ms`.padEnd(68) + "║");
  lines.push("║" + `    Max:                 ${analysis.maxLatency}ms`.padEnd(68) + "║");
  lines.push("║" + "".padEnd(68) + "║");
  lines.push("║" + `  Throughput:            ${analysis.throughput} req/s`.padEnd(68) + "║");
  lines.push("║" + "".padEnd(68) + "║");
  lines.push("║" + "  Assessment:".padEnd(68) + "║");
  lines.push("║" + `    ${analysis.capacityEstimate}`.padEnd(68) + "║");
  lines.push("║" + "".padEnd(68) + "║");
  lines.push("╚" + "═".repeat(68) + "╝");
  lines.push("");

  return lines.join("\n");
}
