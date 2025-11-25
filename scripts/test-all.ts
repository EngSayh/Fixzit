#!/usr/bin/env tsx

/**
 * Comprehensive test script that verifies all key functionality
 */

import { execSync } from "child_process";
import { verifyCore } from "./verify-core";

async function testAll() {
  console.log("🚀 Running comprehensive tests...\n");

  const results: { name: string; success: boolean; error?: unknown }[] = [];

  // Test 1: Core functionality
  console.log("1️⃣ Testing core functionality...");
  try {
    const success = await verifyCore();
    results.push({ name: "Core Functionality", success });
    console.log(success ? "✅ Core tests passed\n" : "❌ Core tests failed\n");
  } catch (error) {
    results.push({ name: "Core Functionality", success: false, error });
    console.log("❌ Core tests failed with error:", error, "\n");
  }

  // Test 2: Build verification
  console.log("2️⃣ Testing build process...");
  try {
    execSync("npm run build", { stdio: "pipe" });
    results.push({ name: "Build Process", success: true });
    console.log("✅ Build test passed\n");
  } catch (error) {
    results.push({ name: "Build Process", success: false, error });
    console.log("❌ Build test failed:", error, "\n");
  }

  // Test 3: TypeScript validation
  console.log("3️⃣ Testing TypeScript validation...");
  try {
    execSync("npm run typecheck", { stdio: "pipe" });
    results.push({ name: "TypeScript Validation", success: true });
    console.log("✅ TypeScript test passed\n");
  } catch (error) {
    results.push({ name: "TypeScript Validation", success: false, error });
    console.log("❌ TypeScript test failed:", error, "\n");
  }

  // Test 4: Model loading verification
  console.log("4️⃣ Testing model loading...");
  try {
    // Test all the models we fixed
    const models = [
      "HelpArticle",
      "CmsPage",
      "SupportTicket",
      "Asset",
      "Property",
      "User",
      "Vendor",
      "Application",
      "AtsSettings",
      "Candidate",
      "Employee",
      "Job",
    ];

    for (const modelName of models) {
      const model = await import(`../src/server/models/${modelName}`);
      if (!model[modelName]) {
        throw new Error(`Model ${modelName} not exported correctly`);
      }
    }

    results.push({ name: "Model Loading", success: true });
    console.log("✅ Model loading test passed\n");
  } catch (error) {
    results.push({ name: "Model Loading", success: false, error });
    console.log("❌ Model loading test failed:", error, "\n");
  }

  // Summary
  console.log("📊 Test Summary:");
  console.log("================");

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.success).length;
  const failedTests = totalTests - passedTests;

  results.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error.message || result.error}`);
    }
  });

  console.log(`\n📈 Results: ${passedTests}/${totalTests} tests passed`);

  if (failedTests === 0) {
    console.log("🎉 All tests passed! Ready to push PR updates.");
    return true;
  } else {
    console.log(`⚠️  ${failedTests} tests failed. Please review and fix.`);
    return false;
  }
}

if (require.main === module) {
  testAll()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Fatal error during test execution:", error);
      process.exit(1);
    });
}

export { testAll };
