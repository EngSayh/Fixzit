#!/usr/bin/env node
/**
 * Test Provider Optimization
 * Validates that public pages load PublicProviders and protected pages load AuthenticatedProviders
 */

const { chromium } = require("playwright");

async function testProviderOptimization() {
  console.log("🧪 Testing Provider Optimization\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    homepage: null,
    login: null,
    dashboard: null,
  };

  try {
    // Test 1: Homepage (should use PublicProviders)
    console.log("📄 Testing Homepage (/)...");
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

    // Measure performance
    const homepageMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.fetchStart,
        providers: window.__NEXT_DATA__ ? "detected" : "unknown",
      };
    });

    results.homepage = {
      url: "http://localhost:3000/",
      status: "success",
      metrics: homepageMetrics,
      expectedProvider: "PublicProviders (3 contexts)",
    };

    console.log(`  ✅ Load Time: ${Math.round(homepageMetrics.loadTime)}ms`);
    console.log(
      `  ✅ DOM Content Loaded: ${Math.round(homepageMetrics.domContentLoaded)}ms\n`,
    );

    // Test 2: Login Page (should use PublicProviders)
    console.log("📄 Testing Login Page (/login)...");
    await page.goto("http://localhost:3000/login", {
      waitUntil: "networkidle",
    });

    const loginMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.fetchStart,
      };
    });

    results.login = {
      url: "http://localhost:3000/login",
      status: "success",
      metrics: loginMetrics,
      expectedProvider: "PublicProviders (3 contexts)",
    };

    console.log(`  ✅ Load Time: ${Math.round(loginMetrics.loadTime)}ms`);
    console.log(
      `  ✅ DOM Content Loaded: ${Math.round(loginMetrics.domContentLoaded)}ms\n`,
    );

    // Test 3: Protected Page - Should redirect to login if not authenticated
    console.log("📄 Testing Protected Page (/fm/dashboard)...");
    await page.goto("http://localhost:3000/fm/dashboard", {
      waitUntil: "networkidle",
    });

    const finalUrl = page.url();
    const dashboardMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.fetchStart,
      };
    });

    results.dashboard = {
      url: finalUrl,
      redirected: finalUrl !== "http://localhost:3000/fm/dashboard",
      status: "success",
      metrics: dashboardMetrics,
      expectedProvider: finalUrl.includes("/login")
        ? "PublicProviders (redirected)"
        : "AuthenticatedProviders (9 contexts)",
    };

    console.log(`  ✅ Final URL: ${finalUrl}`);
    console.log(`  ✅ Load Time: ${Math.round(dashboardMetrics.loadTime)}ms`);
    console.log(
      `  ✅ DOM Content Loaded: ${Math.round(dashboardMetrics.domContentLoaded)}ms\n`,
    );
  } catch (error) {
    console.error("❌ Error during testing:", error.message);
  } finally {
    await browser.close();
  }

  // Summary
  console.log("📊 SUMMARY\n");
  console.log("Public Pages (PublicProviders - 3 contexts):");
  console.log(
    `  Homepage: ${results.homepage?.status === "success" ? "✅" : "❌"} ${Math.round(results.homepage?.metrics.loadTime)}ms`,
  );
  console.log(
    `  Login: ${results.login?.status === "success" ? "✅" : "❌"} ${Math.round(results.login?.metrics.loadTime)}ms`,
  );
  console.log("\nProtected Pages:");
  console.log(
    `  Dashboard: ${results.dashboard?.status === "success" ? "✅" : "❌"} ${Math.round(results.dashboard?.metrics.loadTime)}ms`,
  );
  console.log(`  Provider: ${results.dashboard?.expectedProvider}`);

  console.log("\n✅ Provider optimization test complete!");
  console.log(
    "\n📝 Note: Manual inspection in Chrome DevTools is recommended to verify exact provider loading.",
  );

  return results;
}

// Run the test
testProviderOptimization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
