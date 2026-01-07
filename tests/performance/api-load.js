/**
 * @fileoverview k6 Load Test - Normal Expected Traffic
 * @module tests/performance/api-load
 *
 * TEST-PERF: Load test simulating normal user traffic patterns
 * Run with: k6 run tests/performance/api-load.js
 *
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";
import { BASE_URL, THRESHOLDS, STAGES, ENDPOINTS, getHeaders, TEST_ORG_ID } from "./config.js";

// Custom metrics
const errorRate = new Rate("errors");
const apiDuration = new Trend("api_duration");
const businessTransactions = new Counter("business_transactions");

// Test configuration
export const options = {
  stages: STAGES.load,
  thresholds: {
    ...THRESHOLDS.load,
    "http_req_duration{name:workOrders}": ["p(95)<800"],
    "http_req_duration{name:assets}": ["p(95)<800"],
    "http_req_duration{name:dashboard}": ["p(95)<1500"],
  },
  insecureSkipTLSVerify: true,
};

// Simulated user scenarios with weights
const SCENARIOS = {
  browseAssets: 0.30,      // 30% of users browse assets
  viewWorkOrders: 0.25,    // 25% view work orders
  checkDashboard: 0.20,    // 20% check dashboard
  browseProducts: 0.15,    // 15% browse marketplace
  manageInvoices: 0.10,    // 10% manage invoices
};

// Setup function
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log(`Target org: ${TEST_ORG_ID}`);

  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    throw new Error(`API not healthy: ${healthRes.status}`);
  }

  return { startTime: Date.now() };
}

// Main test function - simulates realistic user behavior
export default function () {
  const headers = getHeaders();
  const scenario = selectScenario();

  switch (scenario) {
    case "browseAssets":
      browseAssetsScenario(headers);
      break;
    case "viewWorkOrders":
      viewWorkOrdersScenario(headers);
      break;
    case "checkDashboard":
      checkDashboardScenario(headers);
      break;
    case "browseProducts":
      browseProductsScenario(headers);
      break;
    case "manageInvoices":
      manageInvoicesScenario(headers);
      break;
  }
}

function selectScenario() {
  const rand = Math.random();
  let cumulative = 0;
  for (const [name, weight] of Object.entries(SCENARIOS)) {
    cumulative += weight;
    if (rand <= cumulative) return name;
  }
  return "browseAssets";
}

// Scenario: Browse Assets
function browseAssetsScenario(headers) {
  group("Browse Assets", function () {
    // List assets
    const listRes = http.get(
      `${BASE_URL}${ENDPOINTS.assets}?limit=20&page=1`,
      { headers, tags: { name: "assets" } }
    );

    check(listRes, {
      "assets list: status 200": (r) => r.status === 200,
      "assets list: has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data || body.assets || body);
        } catch {
          return false;
        }
      },
    });

    apiDuration.add(listRes.timings.duration);
    errorRate.add(listRes.status >= 400);
    businessTransactions.add(1);

    sleep(randomBetween(1, 3));

    // Filter by type
    const filterRes = http.get(
      `${BASE_URL}${ENDPOINTS.assets}?type=PROPERTY&status=ACTIVE&limit=10`,
      { headers, tags: { name: "assets" } }
    );

    check(filterRes, {
      "assets filter: status not 5xx": (r) => r.status < 500,
    });

    apiDuration.add(filterRes.timings.duration);

    sleep(randomBetween(2, 5));
  });
}

// Scenario: View Work Orders
function viewWorkOrdersScenario(headers) {
  group("View Work Orders", function () {
    // List work orders
    const listRes = http.get(
      `${BASE_URL}${ENDPOINTS.workOrders}?limit=20&status=OPEN`,
      { headers, tags: { name: "workOrders" } }
    );

    check(listRes, {
      "workOrders list: status 200 or auth": (r) =>
        r.status === 200 || r.status === 401 || r.status === 403,
    });

    apiDuration.add(listRes.timings.duration);
    errorRate.add(listRes.status >= 500);
    businessTransactions.add(1);

    sleep(randomBetween(2, 4));

    // Get high priority
    const priorityRes = http.get(
      `${BASE_URL}${ENDPOINTS.workOrders}?priority=HIGH&limit=10`,
      { headers, tags: { name: "workOrders" } }
    );

    apiDuration.add(priorityRes.timings.duration);

    sleep(randomBetween(1, 3));
  });
}

// Scenario: Check Dashboard
function checkDashboardScenario(headers) {
  group("Check Dashboard", function () {
    // Main dashboard
    const dashRes = http.get(
      `${BASE_URL}${ENDPOINTS.dashboard}`,
      { headers, tags: { name: "dashboard" } }
    );

    check(dashRes, {
      "dashboard: status 200 or auth": (r) =>
        r.status === 200 || r.status === 401 || r.status === 403,
      "dashboard: response time < 2s": (r) => r.timings.duration < 2000,
    });

    apiDuration.add(dashRes.timings.duration);
    errorRate.add(dashRes.status >= 500);
    businessTransactions.add(1);

    sleep(randomBetween(3, 6));

    // KPIs
    const kpiRes = http.get(
      `${BASE_URL}${ENDPOINTS.kpis}?period=month`,
      { headers, tags: { name: "dashboard" } }
    );

    apiDuration.add(kpiRes.timings.duration);

    sleep(randomBetween(2, 4));
  });
}

// Scenario: Browse Products (Souq)
function browseProductsScenario(headers) {
  group("Browse Products", function () {
    // List products
    const listRes = http.get(
      `${BASE_URL}${ENDPOINTS.products}?limit=24&page=1`,
      { headers, tags: { name: "products" } }
    );

    check(listRes, {
      "products list: status not 5xx": (r) => r.status < 500,
    });

    apiDuration.add(listRes.timings.duration);
    errorRate.add(listRes.status >= 500);
    businessTransactions.add(1);

    sleep(randomBetween(2, 5));

    // Search products
    const searchRes = http.get(
      `${BASE_URL}${ENDPOINTS.products}?search=maintenance&category=TOOLS`,
      { headers, tags: { name: "products" } }
    );

    apiDuration.add(searchRes.timings.duration);

    sleep(randomBetween(1, 3));
  });
}

// Scenario: Manage Invoices
function manageInvoicesScenario(headers) {
  group("Manage Invoices", function () {
    // List invoices
    const listRes = http.get(
      `${BASE_URL}${ENDPOINTS.invoices}?limit=20&status=PENDING`,
      { headers, tags: { name: "invoices" } }
    );

    check(listRes, {
      "invoices list: status 200 or auth": (r) =>
        r.status === 200 || r.status === 401 || r.status === 403,
    });

    apiDuration.add(listRes.timings.duration);
    errorRate.add(listRes.status >= 500);
    businessTransactions.add(1);

    sleep(randomBetween(2, 4));

    // Filter by date range
    const filterRes = http.get(
      `${BASE_URL}${ENDPOINTS.invoices}?startDate=${getDateDaysAgo(30)}&endDate=${getToday()}`,
      { headers, tags: { name: "invoices" } }
    );

    apiDuration.add(filterRes.timings.duration);

    sleep(randomBetween(2, 5));
  });
}

// Helper functions
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

// Teardown
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)}s`);
}

// Summary handler
export function handleSummary(data) {
  return {
    "tests/performance/results/load-summary.json": JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const lines = [];
  lines.push("=".repeat(70));
  lines.push("  LOAD TEST SUMMARY");
  lines.push("=".repeat(70));

  if (data.metrics) {
    const m = data.metrics;
    lines.push(`\n  Total Requests:     ${m.http_reqs?.values?.count || 0}`);
    lines.push(`  Failed Rate:        ${((m.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`);
    lines.push(`  Avg Response Time:  ${(m.http_req_duration?.values?.avg || 0).toFixed(2)}ms`);
    lines.push(`  P95 Response Time:  ${(m.http_req_duration?.values?.["p(95)"] || 0).toFixed(2)}ms`);
    lines.push(`  P99 Response Time:  ${(m.http_req_duration?.values?.["p(99)"] || 0).toFixed(2)}ms`);
    lines.push(`  Throughput:         ${(m.http_reqs?.values?.rate || 0).toFixed(2)} req/s`);
    lines.push(`  Business Txns:      ${m.business_transactions?.values?.count || 0}`);
  }

  lines.push("\n" + "=".repeat(70));
  return lines.join("\n");
}
