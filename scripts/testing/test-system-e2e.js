#!/usr/bin/env node

const http = require("http");

// Sanitize log messages to prevent log injection (SEC-LOG-004)
const safeLog = (str) => String(str).replace(/[\r\n]/g, " ").substring(0, 500);

async function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      console.log(`✅ ${safeLog(description)}: ${res.statusCode} ${safeLog(res.statusMessage)}`);
      resolve({ success: true, status: res.statusCode, path });
    });

    req.on("error", (err) => {
      console.log(`❌ ${safeLog(description)}: ${safeLog(err.message)}`);
      resolve({ success: false, error: err.message, path });
    });

    req.on("timeout", () => {
      console.log(`⏱️  ${safeLog(description)}: Timeout after 5s`);
      req.destroy();
      resolve({ success: false, error: "Timeout", path });
    });

    req.end();
  });
}

async function runE2ETests() {
  console.log("🚀 Starting E2E System Tests...\n");

  const testRoutes = [
    ["/", "Homepage"],
    ["/login", "Login Page"],
    ["/dashboard", "Dashboard"],
    ["/marketplace", "Marketplace"],
    ["/aqar", "Aqar (Real Estate)"],
    ["/fm", "Facility Management"],
    ["/finance", "Finance Module"],
    ["/hr", "HR Module"],
    ["/crm", "CRM Module"],
    ["/admin", "Admin (should redirect to /system)"],
    ["/system", "System Admin"],
    ["/compliance", "Compliance Module"],
    ["/careers", "Careers Page"],
    ["/help", "Help Center"],
    ["/notifications", "Notifications"],
    ["/api/health", "Health Check API"],
    ["/api/auth/me", "Auth API"],
  ];

  const results = [];

  for (const [path, description] of testRoutes) {
    const result = await testEndpoint(path, description);
    results.push(result);
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n📊 Test Summary:");
  const successful = results.filter((r) => r.success && r.status < 500).length;
  const total = results.length;

  console.log(
    `✅ Successful: ${successful}/${total} (${Math.round((successful / total) * 100)}%)`,
  );

  if (successful < total) {
    console.log("\n❌ Failed Routes:");
    results
      .filter((r) => !r.success || r.status >= 500)
      .forEach((r) => {
        console.log(`   ${r.path} - ${r.error || r.status}`);
      });
  }

  console.log(
    `\n🎯 Target: 100% completions - Current: ${Math.round((successful / total) * 100)}%`,
  );

  return successful / total;
}

runE2ETests().catch((err) => {
  console.error('E2E tests failed:', err);
  process.exit(1);
});
