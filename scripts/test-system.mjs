// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

const testPages = [
  "/",
  "/login",
  "/fm/dashboard",
  "/fm/work-orders",
  "/fm/properties",
  "/fm/assets",
  "/fm/tenants",
  "/fm/vendors",
  "/fm/projects",
  "/fm/rfqs",
  "/fm/invoices",
  "/fm/finance",
  "/fm/hr",
  "/fm/crm",
  "/fm/support",
  "/fm/compliance",
  "/fm/reports",
  "/fm/system",
  "/marketplace",
  "/notifications",
  "/profile",
  "/settings",
];

const testApis = [
  "/api/auth/login",
  "/api/work-orders",
  "/api/properties",
  "/api/assets",
  "/api/tenants",
  "/api/vendors",
  "/api/projects",
  "/api/rfqs",
  "/api/invoices",
];

async function testSystem() {
  console.log("🧪 Starting comprehensive system test...\n");

  let results = {
    pages: [],
    apis: [],
    errors: [],
  };

  // Test pages
  console.log("📄 Testing Pages:");
  for (const page of testPages) {
    try {
      const response = await fetch(`http://localhost:3000${page}`, {
        headers: { "User-Agent": "Test-Script" },
        timeout: 10000,
      });

      if (response.ok) {
        console.log(`✅ ${page}`);
        results.pages.push({ page, status: "OK" });
      } else {
        console.log(`❌ ${page} - ${response.status}`);
        results.errors.push({ page, error: response.status });
      }
    } catch (error) {
      console.log(`❌ ${page} - ${error.message}`);
      results.errors.push({ page, error: error.message });
    }
  }

  // Test APIs
  console.log("\n🔌 Testing APIs:");
  for (const api of testApis) {
    try {
      const response = await fetch(`http://localhost:3000${api}`, {
        method: api.includes("login") ? "POST" : "GET",
        headers: api.includes("login")
          ? {
              "Content-Type": "application/json",
              "User-Agent": "Test-Script",
            }
          : { "User-Agent": "Test-Script" },
        body: api.includes("login")
          ? JSON.stringify({
              email: `admin@${EMAIL_DOMAIN}`,
              password: "Admin@123",
            })
          : undefined,
        timeout: 10000,
      });

      if (response.ok) {
        console.log(`✅ ${api}`);
        results.apis.push({ api, status: "OK" });
      } else {
        console.log(`❌ ${api} - ${response.status}`);
        results.errors.push({ api, error: response.status });
      }
    } catch (error) {
      console.log(`❌ ${api} - ${error.message}`);
      results.errors.push({ api, error: error.message });
    }
  }

  // Test authentication flow
  console.log("\n🔐 Testing Authentication:");
  try {
    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `admin@${EMAIL_DOMAIN}`,
        password: "Admin@123",
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log("✅ Admin login successful");

      // Test authenticated API calls
      const authResponse = await fetch("http://localhost:3000/api/auth/me", {
        headers: {
          Cookie: `fixzit_auth=${loginData.token}`,
          "User-Agent": "Test-Script",
        },
      });

      if (authResponse.ok) {
        console.log("✅ Authenticated API call successful");
        results.apis.push({ api: "/api/auth/me", status: "OK" });
      } else {
        console.log("❌ Authenticated API call failed");
        results.errors.push({
          api: "/api/auth/me",
          error: authResponse.status,
        });
      }
    } else {
      console.log("❌ Admin login failed");
      results.errors.push({
        api: "/api/auth/login",
        error: loginResponse.status,
      });
    }
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`);
    results.errors.push({ api: "/api/auth/login", error: error.message });
  }

  // Summary
  console.log("\n📊 Test Summary:");
  console.log(`Pages tested: ${results.pages.length}`);
  console.log(`APIs tested: ${results.apis.length}`);
  console.log(`Errors found: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log("\n❌ Errors found:");
    results.errors.forEach((error) => {
      console.log(`- ${error.page || error.api}: ${error.error}`);
    });
  } else {
    console.log("\n✅ All tests passed!");
  }

  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSystem().catch(console.error);
}

export default testSystem;
