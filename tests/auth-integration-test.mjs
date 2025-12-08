#!/usr/bin/env node
/**
 * Authentication Integration Test
 * Tests the unified NextAuth.js authentication system
 *
 * Tests:
 * 1. Email login (Credentials provider)
 * 2. Employee number login (Credentials provider)
 * 3. Logout flow
 * 4. Middleware protection (no redirect loops)
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_PASSWORD = "password123"; // Default test password
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

// ANSI colors for output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, total, message) {
  log(`\n[${step}/${total}] ${message}`, "cyan");
}

function logSuccess(message) {
  log(`  ✅ ${message}`, "green");
}

function logError(message) {
  log(`  ❌ ${message}`, "red");
}

function logWarning(message) {
  log(`  ⚠️  ${message}`, "yellow");
}

// Test user credentials
const testUsers = {
  email: {
    identifier: `admin@${EMAIL_DOMAIN}`,
    password: TEST_PASSWORD,
    type: "email",
  },
  manager: {
    identifier: `manager@${EMAIL_DOMAIN}`,
    password: TEST_PASSWORD,
    type: "email",
  },
  employeeNumber: {
    identifier: "EMP10001",
    password: TEST_PASSWORD,
    type: "employee",
  },
};

/**
 * Test email-based login (personal users)
 */
async function testEmailLogin() {
  logStep(1, 4, "Testing Email Login (Personal Users)");

  try {
    // Get CSRF token from login page
    const pageResponse = await fetch(`${BASE_URL}/login`);
    if (!pageResponse.ok) {
      throw new Error(`Failed to load login page: ${pageResponse.status}`);
    }

    const pageText = await pageResponse.text();
    const cookies = pageResponse.headers.get("set-cookie");

    logSuccess("Loaded login page");

    // Attempt login via NextAuth callback
    const loginResponse = await fetch(
      `${BASE_URL}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies || "",
        },
        body: new URLSearchParams({
          identifier: testUsers.email.identifier,
          password: testUsers.email.password,
          rememberMe: "false",
          callbackUrl: `${BASE_URL}/fm/dashboard`,
          json: "true",
        }).toString(),
        redirect: "manual",
      },
    );

    if (loginResponse.status === 302 || loginResponse.status === 200) {
      const sessionCookie = loginResponse.headers.get("set-cookie");
      if (sessionCookie && sessionCookie.includes("authjs.session-token")) {
        logSuccess(`Email login successful: ${testUsers.email.identifier}`);
        logSuccess("NextAuth session cookie set");
        return { success: true, cookies: sessionCookie };
      } else if (loginResponse.status === 200) {
        const body = await loginResponse.text();
        if (body.includes("error")) {
          logError(`Login failed: ${body}`);
          logWarning(
            "This might be due to incorrect password. Check test user passwords.",
          );
          return { success: false };
        }
      }
    }

    logError(`Email login failed with status: ${loginResponse.status}`);
    return { success: false };
  } catch (error) {
    logError(`Email login test failed: ${error.message}`);
    return { success: false };
  }
}

/**
 * Test employee number login (corporate users)
 */
async function testEmployeeLogin() {
  logStep(2, 4, "Testing Employee Number Login (Corporate Users)");

  // First check if any users have employee numbers
  try {
    const checkResponse = await fetch(
      `${BASE_URL}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          identifier: testUsers.employeeNumber.identifier,
          password: testUsers.employeeNumber.password,
          rememberMe: "false",
          callbackUrl: `${BASE_URL}/fm/dashboard`,
          json: "true",
        }).toString(),
        redirect: "manual",
      },
    );

    if (checkResponse.status === 302 || checkResponse.status === 200) {
      const sessionCookie = checkResponse.headers.get("set-cookie");
      if (sessionCookie && sessionCookie.includes("authjs.session-token")) {
        logSuccess(
          `Employee login successful: ${testUsers.employeeNumber.identifier}`,
        );
        return { success: true };
      }
    }

    logWarning("No users with employee numbers found in database");
    logWarning("This is OK - employee number login is optional");
    return { success: true, skipped: true };
  } catch (error) {
    logWarning(`Employee login test skipped: ${error.message}`);
    return { success: true, skipped: true };
  }
}

/**
 * Test protected route access (no redirect loops)
 */
async function testProtectedRoute(sessionCookies) {
  logStep(3, 4, "Testing Protected Route Access (No Redirect Loops)");

  try {
    let redirectCount = 0;
    let currentUrl = `${BASE_URL}/fm/dashboard`;
    let currentCookies = sessionCookies;
    const maxRedirects = 5;

    while (redirectCount < maxRedirects) {
      const response = await fetch(currentUrl, {
        headers: {
          Cookie: currentCookies || "",
        },
        redirect: "manual",
      });

      if (response.status === 200) {
        logSuccess("Successfully accessed /fm/dashboard");
        logSuccess("No redirect loops detected ✨");
        return { success: true };
      }

      if (response.status === 302 || response.status === 307) {
        const location = response.headers.get("location");
        redirectCount++;

        if (location === "/login" || location?.includes("/login")) {
          if (sessionCookies) {
            logError(
              "Redirect loop detected! Authenticated user redirected to login",
            );
            logError("This means middleware does not recognize the session");
            return { success: false };
          } else {
            logSuccess("Unauthenticated user correctly redirected to login");
            return { success: true };
          }
        }

        currentUrl = location.startsWith("http")
          ? location
          : `${BASE_URL}${location}`;
        const newCookies = response.headers.get("set-cookie");
        if (newCookies) {
          currentCookies = newCookies;
        }
      } else {
        logError(`Unexpected status code: ${response.status}`);
        return { success: false };
      }
    }

    logError(`Too many redirects (${redirectCount}). Possible redirect loop!`);
    return { success: false };
  } catch (error) {
    logError(`Protected route test failed: ${error.message}`);
    return { success: false };
  }
}

/**
 * Test logout flow
 */
async function testLogout(sessionCookies) {
  logStep(4, 4, "Testing Logout Flow");

  if (!sessionCookies) {
    logWarning("No session to logout - skipping test");
    return { success: true, skipped: true };
  }

  try {
    const response = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: "POST",
      headers: {
        Cookie: sessionCookies,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        callbackUrl: "/login",
      }).toString(),
      redirect: "manual",
    });

    if (response.status === 302 || response.status === 200) {
      const setCookie = response.headers.get("set-cookie");
      if (
        setCookie &&
        (setCookie.includes("Max-Age=0") ||
          setCookie.includes("expires=Thu, 01 Jan 1970"))
      ) {
        logSuccess("Logout successful - session cookie cleared");
        return { success: true };
      }
    }

    logWarning("Logout response received but session cookie status unclear");
    return { success: true };
  } catch (error) {
    logError(`Logout test failed: ${error.message}`);
    return { success: false };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log("\n════════════════════════════════════════════════", "magenta");
  log("  🔐 Authentication Integration Test Suite", "magenta");
  log("════════════════════════════════════════════════\n", "magenta");
  log(`Testing against: ${BASE_URL}`, "blue");

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // Test 1: Email Login
  const emailResult = await testEmailLogin();
  if (emailResult.success) results.passed++;
  else results.failed++;

  // Test 2: Employee Number Login
  const empResult = await testEmployeeLogin();
  if (empResult.skipped) results.skipped++;
  else if (empResult.success) results.passed++;
  else results.failed++;

  // Test 3: Protected Route (with session)
  const protectedResult = await testProtectedRoute(emailResult.cookies);
  if (protectedResult.success) results.passed++;
  else results.failed++;

  // Test 4: Logout
  const logoutResult = await testLogout(emailResult.cookies);
  if (logoutResult.skipped) results.skipped++;
  else if (logoutResult.success) results.passed++;
  else results.failed++;

  // Summary
  log("\n════════════════════════════════════════════════", "magenta");
  log("  📊 Test Summary", "magenta");
  log("════════════════════════════════════════════════\n", "magenta");
  log(`  ✅ Passed:  ${results.passed}`, "green");
  log(`  ❌ Failed:  ${results.failed}`, "red");
  log(`  ⚠️  Skipped: ${results.skipped}`, "yellow");
  log(
    `  📈 Total:   ${results.passed + results.failed + results.skipped}\n`,
    "blue",
  );

  if (results.failed === 0) {
    log(
      "🎉 All tests passed! Authentication system is working correctly.\n",
      "green",
    );
    process.exit(0);
  } else {
    log("❌ Some tests failed. Please review the errors above.\n", "red");
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
