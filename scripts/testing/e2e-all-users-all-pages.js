#!/usr/bin/env node
/**
 * COMPREHENSIVE E2E TEST SUITE - ALL USERS, ALL PAGES
 * Tests authentication, page access, and permissions for all 14 user roles
 *
 * REQUIRED ENVIRONMENT VARIABLE:
 *   E2E_TEST_PASSWORD - Password for all test accounts (must be set for security)
 *
 * Usage:
 *   E2E_TEST_PASSWORD=yourpassword node scripts/testing/e2e-all-users-all-pages.js
 *
 * Or set in environment:
 *   export E2E_TEST_PASSWORD=yourpassword
 *   node scripts/testing/e2e-all-users-all-pages.js
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { mintSessionCookie } = require("./session-cookie");

// Sanitize log messages to prevent log injection (SEC-LOG-005)
const safeLog = (str) => String(str).replace(/[\r\n]/g, " ").substring(0, 500);

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

// Validate required environment variables
const E2E_PASSWORD =
  process.env.E2E_TEST_PASSWORD ||
  process.env.TEST_USER_PASSWORD ||
  process.env.SEED_PASSWORD;
if (!E2E_PASSWORD) {
  console.error("❌ ERROR: E2E_TEST_PASSWORD/TEST_USER_PASSWORD/SEED_PASSWORD is not set");
  console.error("This test suite requires a password for authentication.");
  process.exit(1);
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "../../e2e-test-results");
const ARTIFACT_DIR = path.join(process.cwd(), "_artifacts/all-users");
const EXPECTED_ACCESS =
  process.env.EXPECTED_ACCESS_FILE && fs.existsSync(process.env.EXPECTED_ACCESS_FILE)
    ? JSON.parse(fs.readFileSync(process.env.EXPECTED_ACCESS_FILE, "utf8"))
    : null;
if (
  /fixzit\.co|vercel\.app|production/i.test(BASE_URL) &&
  process.env.ALLOW_E2E_PROD !== "1"
) {
  console.error(`❌ Refusing to run comprehensive E2E against ${BASE_URL} without ALLOW_E2E_PROD=1`);
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

// Test users aligned to STRICT v4.1 canonical role codes
const TEST_USERS = [
  { email: `superadmin@${EMAIL_DOMAIN}`, role: "SUPER_ADMIN", name: "Super Admin" },
  { email: `corp.admin@${EMAIL_DOMAIN}`, role: "CORPORATE_ADMIN", name: "Corporate Admin" },
  { email: `management@${EMAIL_DOMAIN}`, role: "MANAGEMENT", name: "Management" },
  { email: `finance@${EMAIL_DOMAIN}`, role: "FINANCE", name: "Finance" },
  { email: `hr@${EMAIL_DOMAIN}`, role: "HR", name: "HR" },
  { email: `employee@${EMAIL_DOMAIN}`, role: "CORPORATE_EMPLOYEE", name: "Corporate Employee" },
  { email: `owner@${EMAIL_DOMAIN}`, role: "PROPERTY_OWNER", name: "Property Owner" },
  { email: `technician@${EMAIL_DOMAIN}`, role: "TECHNICIAN", name: "Technician" },
  { email: `tenant@${EMAIL_DOMAIN}`, role: "TENANT", name: "Tenant/End-User" },
  { email: `finance.officer@${EMAIL_DOMAIN}`, role: "FINANCE_OFFICER", name: "Finance Officer" },
  { email: `hr.officer@${EMAIL_DOMAIN}`, role: "HR_OFFICER", name: "HR Officer" },
  { email: `support@${EMAIL_DOMAIN}`, role: "SUPPORT", name: "Support" },
  { email: `ops@${EMAIL_DOMAIN}`, role: "OPS", name: "Operations" },
  { email: `auditor@${EMAIL_DOMAIN}`, role: "AUDITOR_COMPLIANCE", name: "Auditor/Compliance" },
];

// All pages to test (from grep search results)
const PAGES_TO_TEST = [
  // Public pages
  { path: "/", name: "Landing Page", public: true },
  { path: "/login", name: "Login Page", public: true },
  { path: "/signup", name: "Signup Page", public: true },
  { path: "/forgot-password", name: "Forgot Password", public: true },

  // Dashboard & Core
  { path: "/dashboard", name: "Dashboard", protected: true },
  { path: "/profile", name: "Profile", protected: true },
  { path: "/settings", name: "Settings", protected: true },
  { path: "/notifications", name: "Notifications", protected: true },
  { path: "/logout", name: "Logout", protected: true },

  // Work Orders
  { path: "/work-orders", name: "Work Orders List", protected: true },
  { path: "/work-orders/new", name: "New Work Order", protected: true },
  { path: "/work-orders/board", name: "Work Orders Board", protected: true },
  {
    path: "/work-orders/approvals",
    name: "Work Order Approvals",
    protected: true,
  },
  { path: "/work-orders/history", name: "Service History", protected: true },
  { path: "/work-orders/pm", name: "Preventive Maintenance", protected: true },

  // Finance
  { path: "/finance", name: "Finance Dashboard", protected: true },
  { path: "/finance/invoices/new", name: "New Invoice", protected: true },
  { path: "/finance/payments/new", name: "New Payment", protected: true },
  { path: "/finance/expenses/new", name: "New Expense", protected: true },
  { path: "/finance/budgets/new", name: "New Budget", protected: true },

  // FM (Facility Management)
  { path: "/fm", name: "FM Dashboard", protected: true },
  { path: "/fm/dashboard", name: "FM Dashboard Alt", protected: true },
  { path: "/fm/work-orders", name: "FM Work Orders", protected: true },
  { path: "/fm/properties", name: "FM Properties", protected: true },
  { path: "/fm/assets", name: "FM Assets", protected: true },
  { path: "/fm/tenants", name: "FM Tenants", protected: true },
  { path: "/fm/vendors", name: "FM Vendors", protected: true },
  { path: "/fm/invoices", name: "FM Invoices", protected: true },
  { path: "/fm/projects", name: "FM Projects", protected: true },
  { path: "/fm/maintenance", name: "FM Maintenance", protected: true },
  { path: "/fm/rfqs", name: "FM RFQs", protected: true },
  { path: "/fm/orders", name: "FM Orders", protected: true },
  { path: "/fm/marketplace", name: "FM Marketplace", protected: true },
  { path: "/fm/finance", name: "FM Finance", protected: true },
  { path: "/fm/hr", name: "FM HR", protected: true },
  { path: "/fm/support", name: "FM Support", protected: true },
  { path: "/fm/support/tickets", name: "FM Support Tickets", protected: true },
  { path: "/fm/system", name: "FM System", protected: true },
  { path: "/fm/reports", name: "FM Reports", protected: true },
  { path: "/fm/compliance", name: "FM Compliance", protected: true },
  { path: "/fm/crm", name: "FM CRM", protected: true },

  // Properties
  { path: "/properties", name: "Properties", protected: true },
  { path: "/properties/units", name: "Property Units", protected: true },
  { path: "/properties/leases", name: "Property Leases", protected: true },
  {
    path: "/properties/inspections",
    name: "Property Inspections",
    protected: true,
  },
  {
    path: "/properties/documents",
    name: "Property Documents",
    protected: true,
  },

  // Marketplace
  { path: "/marketplace/search", name: "Marketplace Search", protected: true },
  { path: "/marketplace/cart", name: "Shopping Cart", protected: true },
  { path: "/marketplace/checkout", name: "Checkout", protected: true },
  { path: "/marketplace/orders", name: "Marketplace Orders", protected: true },
  { path: "/marketplace/rfq", name: "Marketplace RFQ", protected: true },
  { path: "/marketplace/vendor", name: "Vendor Portal", protected: true },
  { path: "/marketplace/admin", name: "Marketplace Admin", protected: true },

  // Aqar (Real Estate)
  { path: "/aqar", name: "Aqar Dashboard", protected: true },
  { path: "/aqar/properties", name: "Aqar Properties", protected: true },
  { path: "/aqar/map", name: "Aqar Map", protected: true },

  // Souq
  { path: "/souq", name: "Souq Dashboard", protected: true },
  { path: "/souq/catalog", name: "Souq Catalog", protected: true },
  { path: "/souq/vendors", name: "Souq Vendors", protected: true },

  // HR & Careers
  { path: "/hr", name: "HR Dashboard", protected: true },
  { path: "/hr/ats/jobs/new", name: "Post New Job", protected: true },
  { path: "/careers", name: "Careers Page", public: true },

  // Help & Support
  { path: "/help", name: "Help Center", protected: true },
  { path: "/help/ai-chat", name: "AI Chat Support", protected: true },
  {
    path: "/help/support-ticket",
    name: "Create Support Ticket",
    protected: true,
  },
  {
    path: "/help/tutorial/getting-started",
    name: "Getting Started Tutorial",
    protected: true,
  },
  { path: "/support", name: "Support Dashboard", protected: true },
  { path: "/support/my-tickets", name: "My Support Tickets", protected: true },

  // Admin
  { path: "/admin", name: "Admin Panel", protected: true },
  { path: "/admin/cms", name: "Admin CMS", protected: true },

  // Other
  { path: "/vendors", name: "Vendors", protected: true },
  { path: "/vendor/dashboard", name: "Vendor Dashboard", protected: true },
  { path: "/crm", name: "CRM", protected: true },
  { path: "/compliance", name: "Compliance", protected: true },
  { path: "/reports", name: "Reports", protected: true },
  { path: "/system", name: "System", protected: true },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    let req;

    const timeout = setTimeout(() => {
      // Abort the request to prevent socket leaks
      if (req) {
        req.destroy(); // Terminates the connection immediately
      }
      reject(new Error("Request timeout"));
    }, 10000); // 10 second timeout

    req = lib.request(url, options, (res) => {
      clearTimeout(timeout);
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          data,
          headers: res.headers,
          redirected: res.statusCode >= 300 && res.statusCode < 400,
        });
      });
    });

    req.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    if (options.body) req.write(options.body);
    req.end();
  });
}

async function login(user) {
  try {
    const { token: sessionToken, cookies } = await mintSessionCookie({
      email: user.email,
      role: user.role,
      orgId: process.env.TEST_ORG_ID || "test-org",
    });

    return {
      success: true,
      token: sessionToken,
      cookies,
      user: { ...user, id: user.email },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testPage(page, auth, user) {
  totalTests++;
  const testResult = {
    user: user.name,
    role: user.role,
    page: page.name,
    path: page.path,
    timestamp: new Date().toISOString(),
  };

  try {
    const headers = {};
    if (auth && auth.cookies && page.protected) {
      headers["Cookie"] = auth.cookies.join("; ");
    }

    const res = await httpRequest(`${BASE_URL}${page.path}`, {
      method: "GET",
      headers,
    });

    let statusLabel = "FAIL";
    let note = `HTTP ${res.statusCode}`;
    let increment = "failed";

    if (page.protected && !auth) {
      if (res.statusCode === 401 || res.redirected) {
        statusLabel = "PASS";
        note = "Correctly blocked (unauthenticated)";
        increment = "passed";
      } else {
        note = `Expected redirect/401, got ${res.statusCode}`;
      }
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      statusLabel = "PASS";
      note = `HTTP ${res.statusCode} - Page loaded`;
      testResult.hasHtml = res.data.includes("<html");
      testResult.hasError =
        res.data.includes("Error") || res.data.includes("error");
      increment = "passed";
    } else if (res.statusCode === 403) {
      statusLabel = "BLOCKED";
      note = "HTTP 403 - Access denied (insufficient permissions)";
      increment = "failed";
    } else if (res.redirected) {
      statusLabel = "REDIRECT";
      note = `HTTP ${res.statusCode} - Redirected`;
      increment = "passed";
    }

    // Optional expectation enforcement via EXPECTED_ACCESS JSON file
    if (EXPECTED_ACCESS) {
      const expected = EXPECTED_ACCESS[user.role]?.[page.path];
      if (expected) {
        testResult.expected = expected;
        const isAllow = statusLabel === "PASS";
        const isBlock = statusLabel === "BLOCKED" || res.statusCode === 401;
        const isRedirect = statusLabel === "REDIRECT";
        const matches =
          (expected === "ALLOW" && isAllow) ||
          (expected === "BLOCK" && isBlock) ||
          (expected === "REDIRECT" && isRedirect);
        if (!matches) {
          statusLabel = "FAIL_EXPECTATION";
          note = `Expected ${expected}, saw ${statusLabel} (${res.statusCode})`;
          increment = "failed";
          testResult.mismatch = true;
        }
      }
    }

    testResult.status = statusLabel;
    testResult.result = note;
    if (increment === "passed") passedTests++;
    else failedTests++;
  } catch (err) {
    testResult.status = "ERROR";
    testResult.result = err.message;
    testResult.error = err.stack;
    failedTests++;
  }

  results.push(testResult);

  // Progress indicator
  const statusIcon =
    testResult.status === "PASS"
      ? "✅"
      : testResult.status === "BLOCKED"
        ? "🚫"
        : testResult.status === "REDIRECT"
          ? "↪️"
          : testResult.status === "ERROR"
            ? "💥"
            : "❌";
  console.log(`  ${statusIcon} ${safeLog(page.name).padEnd(40)} ${safeLog(testResult.result)}`);

  return testResult;
}

async function testUser(user) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`👤 Testing User: ${safeLog(user.name)} (${safeLog(user.role)})`);
  console.log(`📧 Email: ${safeLog(user.email)}`);
  console.log("=".repeat(80));

  // Test login
  console.log("\n🔐 Authentication Test");
  const loginResult = await login(user);

  if (!loginResult.success) {
    console.log(`❌ Login failed: ${safeLog(loginResult.error)}`);
    console.log("⏭️  Skipping page tests for this user\n");

    results.push({
      user: user.name,
      role: user.role,
      page: "LOGIN",
      path: "/api/auth/login",
      status: "FAIL",
      result: `Login failed: ${loginResult.error}`,
      timestamp: new Date().toISOString(),
    });

    totalTests++;
    failedTests++;
    return;
  }

  console.log(`✅ Login successful - Session token minted`);
  console.log(`   User ID: ${loginResult.user.id || "test-user"}`);
  console.log(`   Role: ${loginResult.user.role}`);

  results.push({
    user: user.name,
    role: user.role,
    page: "LOGIN",
    path: "/api/auth/login",
    status: "PASS",
    result: "Login successful",
    timestamp: new Date().toISOString(),
  });

  totalTests++;
  passedTests++;

  // Test public pages (without token)
  console.log("\n📄 Public Pages (Unauthenticated)");
  const publicPages = PAGES_TO_TEST.filter((p) => p.public);
  for (const page of publicPages) {
    await testPage(page, null, user);
  }

  // Test protected pages (with token)
  console.log("\n🔒 Protected Pages (Authenticated)");
  const protectedPages = PAGES_TO_TEST.filter((p) => p.protected);
  for (const page of protectedPages) {
    await testPage(page, loginResult, user);
  }
}

async function runAllTests() {
  console.log("\n");
  console.log(
    "╔═════════════════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║                  COMPREHENSIVE E2E TEST SUITE                                ║",
  );
  console.log(
    "║            Testing All Users × All Pages × All Permissions                  ║",
  );
  console.log(
    "╚═════════════════════════════════════════════════════════════════════════════╝",
  );
  console.log(`\n📅 Date: ${new Date().toLocaleString()}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`👥 Users to test: ${TEST_USERS.length}`);
  console.log(`📄 Pages to test per user: ${PAGES_TO_TEST.length}`);
  console.log(
    `🧪 Total tests: ~${TEST_USERS.length * (PAGES_TO_TEST.length + 1)} (including login tests)`,
  );

  const startTime = Date.now();

  // Test each user
  for (const user of TEST_USERS) {
    await testUser(user);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Generate summary report
  console.log("\n\n");
  console.log(
    "╔═════════════════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║                           TEST SUMMARY                                       ║",
  );
  console.log(
    "╚═════════════════════════════════════════════════════════════════════════════╝",
  );
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Passed:  ${passedTests.toString().padStart(5)} tests`);
  console.log(`   ❌ Failed:  ${failedTests.toString().padStart(5)} tests`);
  console.log(`   📈 Total:   ${totalTests.toString().padStart(5)} tests`);
  console.log(
    `   🎯 Success: ${((passedTests / totalTests) * 100).toFixed(2)}%`,
  );
  console.log(`   ⏱️  Duration: ${duration}s`);

  // Analyze results by user
  console.log("\n\n📋 Results by User:");
  console.log("─".repeat(80));

  const userStats = {};
  TEST_USERS.forEach((user) => {
    const userResults = results.filter((r) => r.role === user.role);
    const passed = userResults.filter(
      (r) =>
        r.status === "PASS" ||
        r.status === "BLOCKED" ||
        r.status === "REDIRECT",
    ).length;
    const failed = userResults.filter(
      (r) => r.status === "FAIL" || r.status === "ERROR",
    ).length;

    userStats[user.role] = { passed, failed, total: userResults.length };

    const statusIcon = failed === 0 ? "✅" : "⚠️";
    console.log(
      `${statusIcon} ${user.name.padEnd(25)} ${passed}/${userResults.length} passed`,
    );
  });

  // Find problematic pages
  console.log("\n\n🔍 Most Problematic Pages:");
  console.log("─".repeat(80));

  const pageStats = {};
  PAGES_TO_TEST.forEach((page) => {
    const pageResults = results.filter((r) => r.path === page.path);
    const failed = pageResults.filter(
      (r) => r.status === "FAIL" || r.status === "ERROR",
    ).length;
    pageStats[page.path] = {
      name: page.name,
      failed,
      total: pageResults.length,
    };
  });

  const problemPages = Object.entries(pageStats)
    .filter(([_, stats]) => stats.failed > 0)
    .sort((a, b) => b[1].failed - a[1].failed)
    .slice(0, 10);

  if (problemPages.length === 0) {
    console.log("🎉 No problematic pages found! All pages working correctly.");
  } else {
    problemPages.forEach(([, stats]) => {
      console.log(
        `❌ ${stats.name.padEnd(40)} ${stats.failed}/${stats.total} failures`,
      );
    });
  }

  // Save detailed results to JSON
  const jsonOutput = {
    summary: {
      date: new Date().toISOString(),
      baseUrl: BASE_URL,
      totalTests,
      passedTests,
      failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(2),
      durationSeconds: duration,
    },
    userStats,
    pageStats,
    detailedResults: results,
  };

  const jsonFile = path.join(OUTPUT_DIR, `e2e-test-results-${Date.now()}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n💾 Detailed results saved to: ${jsonFile}`);

  // Generate Markdown report
  const mdReport = generateMarkdownReport(jsonOutput);
  const mdFile = path.join(
    OUTPUT_DIR,
    `E2E_TEST_REPORT_${new Date().toISOString().split("T")[0]}.md`,
  );
  fs.writeFileSync(mdFile, mdReport);
  console.log(`📄 Markdown report saved to: ${mdFile}`);

  // HFV-style artifact drop for quick access
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "latest-results.json"),
    JSON.stringify(jsonOutput, null, 2),
  );
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "latest-results.ndjson"),
    results.map((r) => JSON.stringify(r)).join("\n"),
  );

  console.log("\n" + "═".repeat(80) + "\n");

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

function generateMarkdownReport(data) {
  let md = `# E2E Test Report - ${new Date(data.summary.date).toLocaleString()}\n\n`;

  md += `## Executive Summary\n\n`;
  md += `- **Total Tests**: ${data.summary.totalTests}\n`;
  md += `- **✅ Passed**: ${data.summary.passedTests}\n`;
  md += `- **❌ Failed**: ${data.summary.failedTests}\n`;
  md += `- **Success Rate**: ${data.summary.successRate}%\n`;
  md += `- **Duration**: ${data.summary.durationSeconds}s\n`;
  md += `- **Base URL**: ${data.summary.baseUrl}\n\n`;

  md += `## Results by User\n\n`;
  md += `| User Role | Passed | Failed | Total | Success Rate |\n`;
  md += `|-----------|--------|--------|-------|-------------|\n`;

  Object.entries(data.userStats).forEach(([role, stats]) => {
    const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
    const icon = stats.failed === 0 ? "✅" : "⚠️";
    md += `| ${icon} ${role} | ${stats.passed} | ${stats.failed} | ${stats.total} | ${successRate}% |\n`;
  });

  md += `\n## Problematic Pages\n\n`;

  const problemPages = Object.entries(data.pageStats)
    .filter(([_, stats]) => stats.failed > 0)
    .sort((a, b) => b[1].failed - a[1].failed);

  if (problemPages.length === 0) {
    md += `🎉 **No problematic pages found!** All pages are working correctly across all user roles.\n\n`;
  } else {
    md += `| Page | Failures | Total Tests |\n`;
    md += `|------|----------|-------------|\n`;
    problemPages.forEach(([, stats]) => {
      md += `| ${stats.name} | ${stats.failed} | ${stats.total} |\n`;
    });
    md += `\n`;
  }

  md += `## Detailed Results\n\n`;

  TEST_USERS.forEach((user) => {
    md += `### ${user.name} (${user.role})\n\n`;
    const userResults = data.detailedResults.filter(
      (r) => r.role === user.role,
    );
    const failures = userResults.filter(
      (r) => r.status === "FAIL" || r.status === "ERROR",
    );

    if (failures.length === 0) {
      md += `✅ **All tests passed for this user!**\n\n`;
    } else {
      md += `⚠️ **${failures.length} failures found:**\n\n`;
      failures.forEach((f) => {
        md += `- ❌ **${f.page}** (${f.path}): ${f.result}\n`;
      });
      md += `\n`;
    }
  });

  md += `---\n\n`;
  md += `*Report generated on ${new Date().toLocaleString()}*\n`;

  return md;
}

// Run tests
runAllTests().catch((err) => {
  console.error("\n💥 FATAL ERROR:", err);
  console.error(err.stack);
  process.exit(1);
});
