#!/usr/bin/env node
/**
 * Authentication Test Script
 * Tests the NextAuth authentication flow end-to-end
 */

const https = require("http"); // Use http for localhost
const { URL } = require("url");

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";
// 🔐 Use configurable password for tests (env var with local dev fallback)
const TEST_PASSWORD = process.env.DEMO_DEFAULT_PASSWORD || "password123";

if (!process.env.DEMO_DEFAULT_PASSWORD) {
  console.warn("⚠️  DEMO_DEFAULT_PASSWORD not set - using local dev default. Set this env var in production.");
}

// Test configuration
const BASE_URL = "http://localhost:3000";
const TEST_USERS = [
  { email: `admin@${EMAIL_DOMAIN}`, password: TEST_PASSWORD, name: "Admin User" },
  {
    email: `property@${EMAIL_DOMAIN}`,
    password: TEST_PASSWORD,
    name: "Property Manager",
  },
  { email: `tech@${EMAIL_DOMAIN}`, password: TEST_PASSWORD, name: "Technician" },
];

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, type = "info") {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const typeColors = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.cyan,
    test: colors.blue,
  };
  console.log(`${typeColors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
          });
        } catch (_e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testHealth() {
  log("Testing health endpoint...", "test");
  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    if (response.status === 200) {
      log("✓ Health check passed", "success");
      return true;
    } else {
      log(`✗ Health check failed: ${response.status}`, "error");
      return false;
    }
  } catch (error) {
    log(`✗ Health check error: ${error.message}`, "error");
    return false;
  }
}

async function testSessionEndpoint() {
  log("Testing session endpoint...", "test");
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/test-session`);
    if (response.status === 401) {
      log(
        "✓ Session endpoint correctly returns 401 when not authenticated",
        "success",
      );
      return true;
    } else {
      log(
        `Session endpoint returned unexpected status: ${response.status}`,
        "warning",
      );
      console.log("Response:", response.data);
      return false;
    }
  } catch (error) {
    log(`✗ Session endpoint error: ${error.message}`, "error");
    return false;
  }
}

async function testNextAuthEndpoint() {
  log("Testing NextAuth endpoint...", "test");
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/providers`);
    log(`NextAuth providers endpoint status: ${response.status}`, "info");
    if (response.data) {
      console.log("Available providers:", response.data);
    }
    return true;
  } catch (error) {
    log(`NextAuth endpoint error: ${error.message}`, "warning");
    return false;
  }
}

async function testLogin(user) {
  log(`Testing login for ${user.email}...`, "test");

  try {
    // Test NextAuth CSRF token endpoint
    const csrfResponse = await makeRequest(`${BASE_URL}/api/auth/csrf`);
    const csrfToken = csrfResponse.data?.csrfToken;

    if (csrfToken) {
      log("✓ Got CSRF token", "success");
    } else {
      log("✗ No CSRF token received", "warning");
    }

    // Test direct API login endpoint (if it exists)
    log("Testing direct login API...", "info");
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      body: {
        email: user.email,
        password: user.password,
      },
    });

    if (loginResponse.status === 200 && loginResponse.data.success) {
      log(`✓ Direct login successful for ${user.email}`, "success");
      return true;
    } else {
      log(`Direct login status: ${loginResponse.status}`, "info");
      console.log("Response:", loginResponse.data);
    }

    // Test NextAuth callback endpoint
    log("Testing NextAuth callback...", "info");
    const callbackResponse = await makeRequest(
      `${BASE_URL}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: {
          Cookie: csrfResponse.headers["set-cookie"]?.join("; ") || "",
        },
        body: {
          email: user.email,
          password: user.password,
          csrfToken: csrfToken,
        },
      },
    );

    log(`NextAuth callback status: ${callbackResponse.status}`, "info");

    return false;
  } catch (error) {
    log(`✗ Login error for ${user.email}: ${error.message}`, "error");
    return false;
  }
}

async function runTests() {
  console.log(colors.bright + "\n" + "=".repeat(60));
  console.log("   FIXZIT SOUQ - Authentication Test Suite");
  console.log("=".repeat(60) + colors.reset + "\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  if (await testHealth()) passed++;
  else failed++;

  // Test 2: Session Endpoint
  if (await testSessionEndpoint()) passed++;
  else failed++;

  // Test 3: NextAuth Endpoint
  if (await testNextAuthEndpoint()) passed++;
  else failed++;

  // Test 4: Login Tests
  console.log(colors.bright + "\n--- Login Tests ---" + colors.reset);
  for (const user of TEST_USERS) {
    if (await testLogin(user)) passed++;
    else failed++;
  }

  // Summary
  console.log(colors.bright + "\n" + "=".repeat(60));
  console.log("   TEST SUMMARY");
  console.log("=".repeat(60) + colors.reset);
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${passed + failed}\n`);

  if (failed === 0) {
    log("All tests passed! Authentication is working.", "success");
  } else {
    log(
      `Some tests failed. Please review the authentication setup.`,
      "warning",
    );
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  log(`Test suite error: ${error.message}`, "error");
  process.exit(1);
});
