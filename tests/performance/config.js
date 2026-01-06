/**
 * Fixzit Performance Testing Suite - k6 Configuration
 * Created by [AGENT-0039]
 *
 * This file contains shared configuration and utilities for k6 performance tests.
 *
 * Usage:
 *   k6 run tests/performance/api-smoke.js
 *   k6 run tests/performance/api-load.js
 *   k6 run tests/performance/api-stress.js
 *
 * Prerequisites:
 *   1. Install k6: https://k6.io/docs/get-started/installation/
 *   2. Set environment variables:
 *      - K6_BASE_URL: API base URL (default: http://localhost:3000)
 *      - K6_API_TOKEN: Bearer token for authenticated endpoints
 *      - K6_ORG_ID: Organization ID for multi-tenant testing
 */

// Shared configuration
export const config = {
  // Base URL (override with K6_BASE_URL env var)
  baseUrl: __ENV.K6_BASE_URL || 'http://localhost:3000',

  // Authentication
  apiToken: __ENV.K6_API_TOKEN || '',
  orgId: __ENV.K6_ORG_ID || 'test-org-id',

  // Thresholds (SLA targets)
  thresholds: {
    // 95th percentile response time < 500ms
    http_req_duration: ['p(95)<500'],
    // 99th percentile response time < 1000ms
    http_req_duration_p99: ['p(99)<1000'],
    // Error rate < 1%
    http_req_failed: ['rate<0.01'],
    // Requests per second > 100
    http_reqs: ['rate>100'],
  },

  // Test stages (configurable per test file)
  stages: {
    smoke: [
      { duration: '30s', target: 5 }, // Ramp up to 5 users
      { duration: '1m', target: 5 }, // Hold at 5 users
      { duration: '30s', target: 0 }, // Ramp down
    ],
    load: [
      { duration: '2m', target: 50 }, // Ramp up to 50 users
      { duration: '5m', target: 50 }, // Hold at 50 users
      { duration: '2m', target: 100 }, // Ramp up to 100 users
      { duration: '5m', target: 100 }, // Hold at 100 users
      { duration: '2m', target: 0 }, // Ramp down
    ],
    stress: [
      { duration: '2m', target: 100 }, // Ramp up to 100 users
      { duration: '5m', target: 100 }, // Hold
      { duration: '2m', target: 200 }, // Ramp up to 200 users
      { duration: '5m', target: 200 }, // Hold
      { duration: '2m', target: 300 }, // Ramp up to 300 users (stress)
      { duration: '5m', target: 300 }, // Hold at stress level
      { duration: '5m', target: 0 }, // Ramp down
    ],
    spike: [
      { duration: '10s', target: 100 }, // Instant spike
      { duration: '1m', target: 100 }, // Hold
      { duration: '10s', target: 500 }, // Mega spike
      { duration: '3m', target: 500 }, // Hold at spike
      { duration: '10s', target: 100 }, // Scale down
      { duration: '3m', target: 100 }, // Recovery
      { duration: '5m', target: 0 }, // Ramp down
    ],
  },
};

// Standard HTTP headers
export function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Org-Id': config.orgId,
  };

  if (config.apiToken) {
    headers['Authorization'] = `Bearer ${config.apiToken}`;
  }

  return headers;
}

// API endpoints for testing
export const endpoints = {
  // Health checks
  health: '/api/health',

  // Authentication
  auth: {
    session: '/api/auth/session',
  },

  // Work Orders (FM domain)
  workOrders: {
    list: '/api/fm/work-orders',
    create: '/api/fm/work-orders',
    get: (id) => `/api/fm/work-orders/${id}`,
    update: (id) => `/api/fm/work-orders/${id}`,
  },

  // Properties (Aqar domain)
  properties: {
    list: '/api/aqar/properties',
    get: (id) => `/api/aqar/properties/${id}`,
  },

  // Invoices (Finance domain)
  invoices: {
    list: '/api/finance/invoices',
    create: '/api/finance/invoices',
    get: (id) => `/api/finance/invoices/${id}`,
  },

  // Marketplace (Souq domain)
  products: {
    list: '/api/souq/products',
    search: '/api/souq/products/search',
    get: (id) => `/api/souq/products/${id}`,
  },

  // HR domain
  employees: {
    list: '/api/hr/employees',
    get: (id) => `/api/hr/employees/${id}`,
  },
};

// Test data generators
export const testData = {
  // Generate random work order
  workOrder: () => ({
    title: `Test Work Order ${Date.now()}`,
    description: 'Performance test work order',
    priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
    category: 'maintenance',
    property_id: 'test-property-id',
  }),

  // Generate random invoice
  invoice: () => ({
    customer_id: 'test-customer-id',
    items: [
      {
        description: 'Test Service',
        quantity: Math.floor(Math.random() * 10) + 1,
        unit_price: Math.floor(Math.random() * 1000) + 100,
      },
    ],
    currency: 'SAR',
  }),

  // Generate random product search query
  searchQuery: () => ({
    q: ['plumbing', 'electrical', 'hvac', 'painting', 'flooring'][Math.floor(Math.random() * 5)],
    page: 1,
    limit: 20,
  }),
};

// Result validation helpers
export function checkResponse(response, expectedStatus = 200) {
  const checks = {};
  checks[`status is ${expectedStatus}`] = response.status === expectedStatus;
  checks['response time < 500ms'] = response.timings.duration < 500;

  if (expectedStatus === 200 || expectedStatus === 201) {
    try {
      const body = JSON.parse(response.body);
      checks['has valid JSON body'] = body !== null;
    } catch {
      checks['has valid JSON body'] = false;
    }
  }

  return checks;
}
