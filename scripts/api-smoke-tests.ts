#!/usr/bin/env node
/**
 * API Smoke Tests - Verify critical endpoints after TypeScript cleanup
 * Tests all major API routes to ensure no runtime errors from type casts
 * Accepts 200-299 (success) and 401 (auth required) as passing
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

interface TestResult {
  endpoint: string;
  status: number;
  success: boolean;
  error?: string;
  responseTime: number;
}

const results: TestResult[] = [];

async function testEndpoint(endpoint: string): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseTime = Date.now() - startTime;
    // Accept 200-299 success codes OR 401 (auth required, which is expected)
    const success =
      (response.status >= 200 && response.status < 300) ||
      response.status === 401;

    return {
      endpoint,
      status: response.status,
      success,
      responseTime,
    };
  } catch (error) {
    return {
      endpoint,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
    };
  }
}

async function runSmokeTests() {
  console.log("🔍 Starting API Smoke Tests...\n");
  console.log(`Base URL: ${BASE_URL}\n`);

  // Critical endpoints to test (all major modules from TypeScript cleanup)
  const endpoints = [
    "/api/properties",
    "/api/work-orders",
    "/api/finance/invoices",
    "/api/finance/expenses",
    "/api/souq/products",
    "/api/souq/listings",
    "/api/crm/contacts",
    "/api/hr/employees",
    "/api/rfqs",
    "/api/projects",
    "/api/vendors",
  ];

  // Run tests
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    const statusEmoji = result.success
      ? result.status === 401
        ? "🔐"
        : "✅"
      : "❌";
    const statusText =
      result.status === 401 ? "AUTH" : result.success ? "OK" : "FAIL";

    console.log(
      `${statusEmoji} ${endpoint.padEnd(35)} ${statusText.padEnd(8)} ${result.status} (${result.responseTime}ms)`,
    );

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 Test Summary");
  console.log("=".repeat(80));

  const successful = results.filter(
    (r) => r.success && r.status !== 401,
  ).length;
  const authRequired = results.filter((r) => r.status === 401).length;
  const failed = results.filter((r) => !r.success).length;
  const total = results.length;

  console.log(`\nTotal Endpoints: ${total}`);
  console.log(
    `✅ Success: ${successful} (${Math.round((successful / total) * 100)}%)`,
  );
  console.log(
    `🔐 Auth Required: ${authRequired} (${Math.round((authRequired / total) * 100)}%)`,
  );
  console.log(`❌ Failed: ${failed} (${Math.round((failed / total) * 100)}%)`);

  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
  );
  console.log(`\n⏱️  Average Response Time: ${avgResponseTime}ms`);

  // Show actual failures (excluding 401 auth)
  if (failed > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("❌ Failed Endpoints:");
    console.log("=".repeat(80));
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`\n${r.endpoint} (${r.status})`);
        if (r.error) {
          console.log(`Error: ${r.error}`);
        }
      });
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    failed === 0
      ? "✅ All API smoke tests passed!"
      : `❌ ${failed} endpoint(s) failed`,
  );
  console.log("=".repeat(80) + "\n");

  // Exit with success if no actual failures (401 is acceptable)
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runSmokeTests().catch((error) => {
  console.error("❌ Smoke tests crashed:", error);
  process.exit(1);
});
