/**
 * Fixzit API Load Test
 * Sustained load testing for production capacity planning
 * Created by [AGENT-0039]
 *
 * Run: k6 run tests/performance/api-load.js
 *
 * This test simulates typical production load patterns
 * to validate system capacity and identify bottlenecks.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getHeaders, endpoints, testData, checkResponse } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const successfulRequests = new Counter('successful_requests');
const readDuration = new Trend('read_duration');
const writeDuration = new Trend('write_duration');

// Load test options (sustained load)
export const options = {
  stages: config.stages.load,
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
  // Connection settings for load test
  noConnectionReuse: false,
  userAgent: 'Fixzit-K6-LoadTest/1.0',
};

export function setup() {
  console.log(`📈 Starting Load Test against ${config.baseUrl}`);
  return { startTime: Date.now() };
}

export default function () {
  const headers = getHeaders();

  // Simulate realistic user behavior patterns
  const scenarios = [
    { name: 'Browse Products', weight: 40 },
    { name: 'View Work Orders', weight: 30 },
    { name: 'Check Properties', weight: 20 },
    { name: 'Search Products', weight: 10 },
  ];

  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  let selectedScenario = scenarios[0].name;

  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (random <= cumulative) {
      selectedScenario = scenario.name;
      break;
    }
  }

  switch (selectedScenario) {
    case 'Browse Products':
      browseProducts(headers);
      break;
    case 'View Work Orders':
      viewWorkOrders(headers);
      break;
    case 'Check Properties':
      checkProperties(headers);
      break;
    case 'Search Products':
      searchProducts(headers);
      break;
  }

  // Think time between user actions
  sleep(Math.random() * 2 + 1);
}

function browseProducts(headers) {
  group('Browse Products', () => {
    // List products
    const listRes = http.get(`${config.baseUrl}${endpoints.products.list}?page=1&limit=20`, { headers });
    readDuration.add(listRes.timings.duration);

    if (check(listRes, checkResponse(listRes, 200))) {
      successfulRequests.add(1);

      // Parse response and view a random product
      try {
        const data = JSON.parse(listRes.body);
        if (data.products && data.products.length > 0) {
          const randomProduct = data.products[Math.floor(Math.random() * data.products.length)];
          if (randomProduct._id) {
            sleep(0.5);
            const detailRes = http.get(
              `${config.baseUrl}${endpoints.products.get(randomProduct._id)}`,
              { headers }
            );
            readDuration.add(detailRes.timings.duration);
            if (check(detailRes, checkResponse(detailRes, 200))) {
              successfulRequests.add(1);
            } else {
              errorRate.add(1);
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    } else {
      errorRate.add(1);
    }
  });
}

function viewWorkOrders(headers) {
  group('View Work Orders', () => {
    const res = http.get(`${config.baseUrl}${endpoints.workOrders.list}?page=1&limit=20`, { headers });
    readDuration.add(res.timings.duration);

    const passed = check(res, {
      'work orders accessible': res.status === 200 || res.status === 401,
      'response time OK': res.timings.duration < 500,
    });

    if (passed) {
      successfulRequests.add(1);
    } else {
      errorRate.add(1);
    }
  });
}

function checkProperties(headers) {
  group('Check Properties', () => {
    const res = http.get(`${config.baseUrl}${endpoints.properties.list}?page=1&limit=20`, { headers });
    readDuration.add(res.timings.duration);

    const passed = check(res, {
      'properties accessible': res.status === 200 || res.status === 401,
      'response time OK': res.timings.duration < 500,
    });

    if (passed) {
      successfulRequests.add(1);
    } else {
      errorRate.add(1);
    }
  });
}

function searchProducts(headers) {
  group('Search Products', () => {
    const query = testData.searchQuery();
    const res = http.get(
      `${config.baseUrl}${endpoints.products.search}?q=${query.q}&page=${query.page}&limit=${query.limit}`,
      { headers }
    );
    readDuration.add(res.timings.duration);

    if (check(res, checkResponse(res, 200))) {
      successfulRequests.add(1);
    } else {
      errorRate.add(1);
    }
  });
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log(`\n📈 Load test completed in ${duration} minutes`);
}

export function handleSummary(data) {
  return {
    'tests/performance/results/load-summary.json': JSON.stringify(data, null, 2),
  };
}
