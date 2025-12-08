import puppeteer from "puppeteer";

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

const users = [
  { email: `admin@${EMAIL_DOMAIN}`, password: "Admin@123", role: "SUPER_ADMIN" },
  { email: `tenant@${EMAIL_DOMAIN}`, password: "Tenant@123", role: "TENANT" },
  { email: `vendor@${EMAIL_DOMAIN}`, password: "Vendor@123", role: "VENDOR" },
];

const pages = [
  // FM Module Pages
  { path: "/fm/dashboard", name: "Dashboard" },
  { path: "/fm/work-orders", name: "Work Orders" },
  { path: "/fm/properties", name: "Properties" },
  { path: "/fm/assets", name: "Assets" },
  { path: "/fm/tenants", name: "Tenants" },
  { path: "/fm/vendors", name: "Vendors" },
  { path: "/fm/projects", name: "Projects" },
  { path: "/fm/rfqs", name: "RFQs" },
  { path: "/fm/invoices", name: "Invoices" },
  { path: "/fm/finance", name: "Finance" },
  { path: "/fm/hr", name: "HR" },
  { path: "/fm/crm", name: "CRM" },
  { path: "/fm/support", name: "Support" },
  { path: "/fm/compliance", name: "Compliance" },
  { path: "/fm/reports", name: "Reports" },
  { path: "/fm/system", name: "System" },

  // Marketplace
  { path: "/marketplace", name: "Marketplace" },

  // Other Pages
  { path: "/notifications", name: "Notifications" },
  { path: "/profile", name: "Profile" },
  { path: "/settings", name: "Settings" },
];

async function testUserAccess() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];

  for (const user of users) {
    console.log(`\n🧪 Testing user: ${user.email} (${user.role})`);
    const page = await browser.newPage();

    try {
      // Login
      await page.goto("http://localhost:3000/login");
      await page.waitForSelector('input[type="email"]');

      await page.type('input[type="email"]', user.email);
      await page.type('input[type="password"]', user.password);

      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle2" });

      console.log(`✅ Login successful for ${user.email}`);

      // Test each page
      for (const pageInfo of pages) {
        try {
          await page.goto(`http://localhost:3000${pageInfo.path}`, {
            waitUntil: "networkidle2",
            timeout: 10000,
          });

          // Check for errors
          const hasError = await page.evaluate(() => {
            const body = document.body.innerText;
            return (
              body.includes("404") ||
              body.includes("500") ||
              body.includes("Error") ||
              body.includes("not found")
            );
          });

          const status = hasError ? "❌ ERROR" : "✅ OK";
          console.log(`  ${status} ${pageInfo.path} - ${pageInfo.name}`);

          results.push({
            user: user.email,
            role: user.role,
            page: pageInfo.path,
            status: hasError ? "ERROR" : "OK",
          });
        } catch (error) {
          console.log(`  ❌ FAILED ${pageInfo.path} - ${error.message}`);
          results.push({
            user: user.email,
            role: user.role,
            page: pageInfo.path,
            status: "FAILED",
            error: error.message,
          });
        }
      }
    } catch (error) {
      console.error(`❌ Failed to test ${user.email}:`, error);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Summary
  console.log("\n📊 TEST SUMMARY:");
  const errors = results.filter((r) => r.status !== "OK");
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter((r) => r.status === "OK").length}`);
  console.log(`Failed: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n❌ FAILED TESTS:");
    errors.forEach((e) => {
      console.log(`- ${e.user} (${e.role}) on ${e.page}: ${e.status}`);
    });
  }

  return results;
}

testUserAccess().catch(console.error);
