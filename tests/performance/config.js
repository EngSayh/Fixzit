/**
 * @fileoverview k6 Performance Test Configuration
 * @module tests/performance/config
 *
 * TEST-PERF: k6 load testing configuration for Fixzit API
 * Shared configuration for all performance test scripts
 *
 * @author [AGENT-0041]
 * @created 2026-01-07
 */

// Base URL for API testing (override with K6_BASE_URL env var)
export const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:3000";

// Test user credentials (override with env vars)
export const TEST_USER = {
  email: __ENV.K6_TEST_EMAIL || "perf-test@fixzit.test",
  password: __ENV.K6_TEST_PASSWORD || "TestPassword123!",
};

// Organization ID for multi-tenant testing
export const TEST_ORG_ID = __ENV.K6_ORG_ID || "test-org-perf-001";

// Thresholds for different test types
export const THRESHOLDS = {
  // Smoke test: basic functionality check
  smoke: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },

  // Load test: normal expected load
  load: {
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    http_req_failed: ["rate<0.05"],
    http_reqs: ["rate>50"],
  },

  // Stress test: find breaking point
  stress: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed: ["rate<0.15"],
  },

  // Spike test: sudden load surge
  spike: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.20"],
  },
};

// Stages for different test profiles
export const STAGES = {
  smoke: [
    { duration: "1m", target: 5 },
    { duration: "1m", target: 5 },
    { duration: "30s", target: 0 },
  ],

  load: [
    { duration: "2m", target: 50 },   // Ramp up
    { duration: "5m", target: 50 },   // Stay at 50 users
    { duration: "2m", target: 100 },  // Ramp up to 100
    { duration: "5m", target: 100 },  // Stay at 100 users
    { duration: "2m", target: 0 },    // Ramp down
  ],

  stress: [
    { duration: "2m", target: 50 },
    { duration: "3m", target: 100 },
    { duration: "3m", target: 200 },
    { duration: "3m", target: 300 },
    { duration: "3m", target: 400 },
    { duration: "2m", target: 0 },
  ],

  spike: [
    { duration: "1m", target: 10 },
    { duration: "30s", target: 500 },  // Sudden spike
    { duration: "1m", target: 500 },
    { duration: "30s", target: 10 },   // Back to normal
    { duration: "1m", target: 10 },
    { duration: "30s", target: 0 },
  ],
};

// API endpoints to test
export const ENDPOINTS = {
  // Auth
  login: "/api/auth/signin",
  session: "/api/auth/session",

  // Work Orders (FM module)
  workOrders: "/api/fm/work-orders",
  workOrderById: (id) => `/api/fm/work-orders/${id}`,

  // Assets
  assets: "/api/aqar/assets",
  assetById: (id) => `/api/aqar/assets/${id}`,

  // Finance
  invoices: "/api/finance/invoices",
  payments: "/api/payments",

  // Souq (Marketplace)
  products: "/api/souq/products",
  orders: "/api/souq/orders",

  // HR
  employees: "/api/hr/employees",
  attendance: "/api/hr/attendance",

  // Dashboard/Analytics
  dashboard: "/api/analytics/dashboard",
  kpis: "/api/analytics/kpis",
};

// Common headers
export const getHeaders = (token) => ({
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-Org-ID": TEST_ORG_ID,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// Helper to check response
export function checkResponse(res, checks) {
  const result = {};
  for (const [name, fn] of Object.entries(checks)) {
    result[name] = fn(res);
  }
  return result;
}
