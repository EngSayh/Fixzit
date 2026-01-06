/**
 * Fixzit API Smoke Test
 * Quick validation that critical endpoints are responding
 * Created by [AGENT-0039]
 *
 * Run: k6 run tests/performance/api-smoke.js
 *
 * Environment variables:
 *   K6_BASE_URL - Base URL (default: http://localhost:3000)
 *   K6_API_TOKEN - Bearer token for auth
 *   K6_ORG_ID - Organization ID
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config, getHeaders, endpoints, checkResponse } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');
const apiDuration = new Trend('api_duration');

// Smoke test options (light load, fast feedback)
export const options = {
  stages: config.stages.smoke,
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% errors
    errors: ['rate<0.01'],
  },
  // Smoke test should be quick
  noConnectionReuse: false,
  userAgent: 'Fixzit-K6-SmokeTest/1.0',
};

// Setup function - runs once before test
export function setup() {
  console.log(`🔥 Starting Smoke Test against ${config.baseUrl}`);
  console.log(`📋 Org ID: ${config.orgId}`);
  console.log(`🔐 Auth: ${config.apiToken ? 'Configured' : 'Not configured'}`);

  // Verify base URL is accessible
  const healthRes = http.get(`${config.baseUrl}${endpoints.health}`, {
    headers: getHeaders(),
    timeout: '10s',
  });

  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status} - ${healthRes.body}`);
  }

  console.log('✅ Health check passed, starting test...');
  return { startTime: Date.now() };
}

// Main test function - runs for each VU iteration
export default function () {
  const headers = getHeaders();

  // 1. Health Check
  {
    const res = http.get(`${config.baseUrl}${endpoints.health}`, { headers });
    healthCheckDuration.add(res.timings.duration);
    const passed = check(res, checkResponse(res, 200));
    errorRate.add(!passed);
  }

  sleep(0.5);

  // 2. Session Check (if auth configured)
  if (config.apiToken) {
    const res = http.get(`${config.baseUrl}${endpoints.auth.session}`, { headers });
    apiDuration.add(res.timings.duration);
    const passed = check(res, checkResponse(res, 200));
    errorRate.add(!passed);
    sleep(0.5);
  }

  // 3. Work Orders List
  {
    const res = http.get(`${config.baseUrl}${endpoints.workOrders.list}`, { headers });
    apiDuration.add(res.timings.duration);
    const passed = check(res, {
      'work orders status 200 or 401': res.status === 200 || res.status === 401,
      'response time OK': res.timings.duration < 500,
    });
    errorRate.add(!passed);
  }

  sleep(0.5);

  // 4. Properties List
  {
    const res = http.get(`${config.baseUrl}${endpoints.properties.list}`, { headers });
    apiDuration.add(res.timings.duration);
    const passed = check(res, {
      'properties status 200 or 401': res.status === 200 || res.status === 401,
      'response time OK': res.timings.duration < 500,
    });
    errorRate.add(!passed);
  }

  sleep(0.5);

  // 5. Products List (public endpoint)
  {
    const res = http.get(`${config.baseUrl}${endpoints.products.list}`, { headers });
    apiDuration.add(res.timings.duration);
    const passed = check(res, checkResponse(res, 200));
    errorRate.add(!passed);
  }

  sleep(1);
}

// Teardown function - runs once after test
export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(2);
  console.log(`\n✅ Smoke test completed in ${duration}s`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'tests/performance/results/smoke-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { metrics } = data;
  const lines = [
    '\n📊 Smoke Test Summary',
    '═══════════════════════════════════════',
    `Requests:       ${metrics.http_reqs?.values?.count || 0}`,
    `Failed:         ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`,
    `Avg Duration:   ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`,
    `P95 Duration:   ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms`,
    `P99 Duration:   ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms`,
    '═══════════════════════════════════════\n',
  ];
  return lines.join('\n');
}
