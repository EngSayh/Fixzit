/**
 * Fixzit API Stress Test
 * Push system beyond normal capacity to find breaking points
 * Created by [AGENT-0039]
 *
 * Run: k6 run tests/performance/api-stress.js
 *
 * WARNING: Only run against staging/test environments!
 * This test intentionally pushes the system to its limits.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { config, getHeaders, endpoints, testData, checkResponse } from './config.js';

// Custom metrics for stress test
const errorRate = new Rate('errors');
const breakingPointVUs = new Gauge('breaking_point_vus');
const responseDegradation = new Trend('response_degradation');
const timeouts = new Counter('timeouts');

// Stress test options (push beyond limits)
export const options = {
  stages: config.stages.stress,
  thresholds: {
    // Stress test has relaxed thresholds to find breaking point
    http_req_duration: ['p(95)<2000'], // 2s under stress
    http_req_failed: ['rate<0.10'], // Up to 10% errors acceptable in stress
  },
  noConnectionReuse: false,
  userAgent: 'Fixzit-K6-StressTest/1.0',
  // Abort on extreme degradation
  abortOnFail: true,
};

// Track baseline for degradation detection
let baselineP95 = null;

export function setup() {
  console.log(`🔥 Starting STRESS Test against ${config.baseUrl}`);
  console.log('⚠️  WARNING: This test will push the system to its limits!');

  // Establish baseline with a few requests
  const headers = getHeaders();
  const durations = [];

  for (let i = 0; i < 10; i++) {
    const res = http.get(`${config.baseUrl}${endpoints.health}`, { headers, timeout: '5s' });
    if (res.status === 200) {
      durations.push(res.timings.duration);
    }
    sleep(0.1);
  }

  durations.sort((a, b) => a - b);
  baselineP95 = durations[Math.floor(durations.length * 0.95)] || 100;

  console.log(`📊 Baseline P95: ${baselineP95.toFixed(2)}ms`);
  return { startTime: Date.now(), baselineP95 };
}

export default function (data) {
  const headers = getHeaders();
  const currentVUs = __VU;

  // Mix of read and write operations under stress
  const operations = [
    { fn: stressHealthCheck, weight: 20 },
    { fn: stressProductList, weight: 30 },
    { fn: stressWorkOrderList, weight: 25 },
    { fn: stressSearch, weight: 15 },
    { fn: stressPropertyList, weight: 10 },
  ];

  const totalWeight = operations.reduce((sum, op) => sum + op.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const op of operations) {
    cumulative += op.weight;
    if (random <= cumulative) {
      op.fn(headers, data.baselineP95, currentVUs);
      break;
    }
  }

  // Minimal sleep under stress
  sleep(Math.random() * 0.5);
}

function stressHealthCheck(headers, baseline, vus) {
  group('Stress Health', () => {
    const res = http.get(`${config.baseUrl}${endpoints.health}`, {
      headers,
      timeout: '10s',
    });

    if (res.timings.duration === 0 || res.error) {
      timeouts.add(1);
      errorRate.add(1);
    } else {
      const degradation = res.timings.duration / baseline;
      responseDegradation.add(degradation);

      if (degradation > 10) {
        // 10x baseline = breaking point
        breakingPointVUs.add(vus);
      }

      const passed = check(res, {
        'health responds': res.status === 200 || res.status === 503,
        'not severely degraded': res.timings.duration < 5000,
      });
      errorRate.add(!passed);
    }
  });
}

function stressProductList(headers, baseline, vus) {
  group('Stress Products', () => {
    const res = http.get(`${config.baseUrl}${endpoints.products.list}`, {
      headers,
      timeout: '15s',
    });

    if (res.timings.duration === 0 || res.error) {
      timeouts.add(1);
      errorRate.add(1);
    } else {
      const degradation = res.timings.duration / baseline;
      responseDegradation.add(degradation);

      if (degradation > 10) {
        breakingPointVUs.add(vus);
      }

      check(res, {
        'products respond': res.status === 200 || res.status === 503 || res.status === 429,
      });
    }
  });
}

function stressWorkOrderList(headers, baseline, vus) {
  group('Stress Work Orders', () => {
    const res = http.get(`${config.baseUrl}${endpoints.workOrders.list}`, {
      headers,
      timeout: '15s',
    });

    if (res.timings.duration === 0 || res.error) {
      timeouts.add(1);
      errorRate.add(1);
    } else {
      const degradation = res.timings.duration / baseline;
      responseDegradation.add(degradation);

      check(res, {
        'work orders respond': res.status !== 0,
      });
    }
  });
}

function stressSearch(headers, baseline, vus) {
  group('Stress Search', () => {
    const query = testData.searchQuery();
    const res = http.get(
      `${config.baseUrl}${endpoints.products.search}?q=${query.q}`,
      { headers, timeout: '15s' }
    );

    if (res.timings.duration === 0 || res.error) {
      timeouts.add(1);
    }

    check(res, {
      'search responds': res.status !== 0,
    });
  });
}

function stressPropertyList(headers, baseline, vus) {
  group('Stress Properties', () => {
    const res = http.get(`${config.baseUrl}${endpoints.properties.list}`, {
      headers,
      timeout: '15s',
    });

    check(res, {
      'properties respond': res.status !== 0,
    });
  });
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log(`\n🔥 Stress test completed in ${duration} minutes`);
}

export function handleSummary(data) {
  const breakingPoint = data.metrics.breaking_point_vus?.values?.value || 'Not reached';
  const timeoutCount = data.metrics.timeouts?.values?.count || 0;
  const maxDegradation = data.metrics.response_degradation?.values?.max || 1;

  console.log('\n📊 Stress Test Analysis');
  console.log('═══════════════════════════════════════');
  console.log(`Breaking Point VUs:  ${breakingPoint}`);
  console.log(`Total Timeouts:      ${timeoutCount}`);
  console.log(`Max Degradation:     ${maxDegradation.toFixed(2)}x baseline`);
  console.log('═══════════════════════════════════════\n');

  return {
    'tests/performance/results/stress-summary.json': JSON.stringify(data, null, 2),
  };
}
