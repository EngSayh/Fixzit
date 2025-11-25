// PROPERTY OWNER, DEPUTY, SUBSCRIPTION & DoA VERIFICATION
const axios = require("axios");
const BASE_URL = "http://localhost:5000";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

async function getAuthToken() {
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "admin@fixzit.com",
      password: "Admin@1234",
    });
    return res.data.token;
  } catch (_e) {
    console.log("❌ AUTH FAILED - Backend not running?");
    return null;
  }
}

async function verifyPropertyOwnerFeatures() {
  console.log("\n" + colors.blue + "=".repeat(80) + colors.reset);
  console.log(
    colors.blue +
      "🏢 PROPERTY OWNER & SUBSCRIPTION SYSTEM VERIFICATION" +
      colors.reset,
  );
  console.log(colors.blue + "=".repeat(80) + colors.reset + "\n");

  const token = await getAuthToken();
  if (!token) {
    console.log("❌ Cannot proceed without authentication");
    return 0;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  const results = {
    propertyOwner: [],
    deputy: [],
    subscription: [],
    doa: [],
    revenue: [],
  };

  // ==========================
  // 1. PROPERTY OWNER FEATURES
  // ==========================
  console.log(
    colors.yellow + "\n1️⃣ PROPERTY OWNER ROLE FEATURES" + colors.reset,
  );
  console.log("-".repeat(60));

  const ownerTests = [
    {
      name: "Owner Portfolio Dashboard",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/owner/dashboard`, {
          headers: authHeaders,
        });
        return res.data.properties && res.data.revenue && res.data.expenses;
      },
    },
    {
      name: "Property Performance Metrics",
      test: async () => {
        const res = await axios.get(
          `${BASE_URL}/api/owner/properties/performance`,
          { headers: authHeaders },
        );
        return (
          res.data.occupancyRate && res.data.maintenanceCosts && res.data.roi
        );
      },
    },
    {
      name: "FM Corporate Performance Tracking",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/owner/fm-performance`, {
          headers: authHeaders,
        });
        return (
          res.data.slaCompliance &&
          res.data.responseTime &&
          res.data.costSavings
        );
      },
    },
    {
      name: "Owner Approval Queue",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/owner/approvals/pending`, {
          headers: authHeaders,
        });
        return Array.isArray(res.data) && res.data.length >= 0;
      },
    },
    {
      name: "Property Financial Statements",
      test: async () => {
        const res = await axios.get(
          `${BASE_URL}/api/owner/properties/123/financials`,
          { headers: authHeaders },
        );
        return res.data.income && res.data.expenses && res.data.netIncome;
      },
    },
  ];

  for (const test of ownerTests) {
    try {
      const passed = await test.test();
      const status = passed
        ? `${colors.green}✅ WORKING${colors.reset}`
        : `${colors.red}❌ MISSING${colors.reset}`;
      console.log(`  ${status} ${test.name}`);
      results.propertyOwner.push({ name: test.name, passed });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `  ${colors.red}❌ ERROR${colors.reset} ${test.name}: ${message}`,
      );
      results.propertyOwner.push({ name: test.name, passed: false });
    }
  }

  // ==========================
  // 2. DEPUTY MANAGEMENT
  // ==========================
  console.log(colors.yellow + "\n2️⃣ DEPUTY SYSTEM" + colors.reset);
  console.log("-".repeat(60));

  const deputyTests = [
    {
      name: "Assign Deputy to Property",
      test: async () => {
        const res = await axios.post(
          `${BASE_URL}/api/owner/properties/123/deputy`,
          {
            deputyUserId: "user456",
            permissions: ["approve_maintenance", "view_financials"],
          },
          { headers: authHeaders },
        );
        return res.data.deputyId && res.data.permissions;
      },
    },
    {
      name: "List Property Deputies",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/owner/deputies`, {
          headers: authHeaders,
        });
        return Array.isArray(res.data);
      },
    },
    {
      name: "Deputy Permission Management",
      test: async () => {
        const res = await axios.put(
          `${BASE_URL}/api/owner/deputies/456/permissions`,
          {
            permissions: ["approve_up_to_5000"],
          },
          { headers: authHeaders },
        );
        return res.data.updated;
      },
    },
  ];

  for (const test of deputyTests) {
    try {
      const passed = await test.test();
      const status = passed
        ? `${colors.green}✅ WORKING${colors.reset}`
        : `${colors.red}❌ MISSING${colors.reset}`;
      console.log(`  ${status} ${test.name}`);
      results.deputy.push({ name: test.name, passed });
    } catch (_e) {
      console.log(`  ${colors.red}❌ ERROR${colors.reset} ${test.name}`);
      results.deputy.push({ name: test.name, passed: false });
    }
  }

  // ==========================
  // 3. SUBSCRIPTION MANAGEMENT
  // ==========================
  console.log(
    colors.yellow + "\n3️⃣ CORPORATE SUBSCRIPTION SYSTEM" + colors.reset,
  );
  console.log("-".repeat(60));

  const subscriptionTests = [
    {
      name: "Subscription Plans (Basic/Pro/Enterprise)",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/subscriptions/plans`, {
          headers: authHeaders,
        });
        return res.data.plans && res.data.plans.length >= 3;
      },
    },
    {
      name: "Organization Subscription Status",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/org/subscription`, {
          headers: authHeaders,
        });
        return res.data.plan && res.data.status && res.data.expiryDate;
      },
    },
    {
      name: "Usage Tracking vs Limits",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/org/usage`, {
          headers: authHeaders,
        });
        return res.data.properties && res.data.users && res.data.limits;
      },
    },
    {
      name: "Billing & Payment Management",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/org/billing`, {
          headers: authHeaders,
        });
        return res.data.invoices && res.data.paymentMethod;
      },
    },
    {
      name: "Module Access Based on Plan",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/org/enabled-modules`, {
          headers: authHeaders,
        });
        return res.data.modules && res.data.restrictions;
      },
    },
    {
      name: "Super Admin Subscription Management",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/admin/subscriptions`, {
          headers: authHeaders,
        });
        return res.data.organizations && res.data.revenue;
      },
    },
  ];

  for (const test of subscriptionTests) {
    try {
      const passed = await test.test();
      const status = passed
        ? `${colors.green}✅ WORKING${colors.reset}`
        : `${colors.red}❌ MISSING${colors.reset}`;
      console.log(`  ${status} ${test.name}`);
      results.subscription.push({ name: test.name, passed });
    } catch (_e) {
      console.log(`  ${colors.red}❌ ERROR${colors.reset} ${test.name}`);
      results.subscription.push({ name: test.name, passed: false });
    }
  }

  // ==========================
  // 4. DoA (DELEGATION OF AUTHORITY)
  // ==========================
  console.log(
    colors.yellow + "\n4️⃣ DELEGATION OF AUTHORITY (DoA) SYSTEM" + colors.reset,
  );
  console.log("-".repeat(60));

  const doaTests = [
    {
      name: "DoA Rules Configuration",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/admin/doa/rules`, {
          headers: authHeaders,
        });
        return res.data.rules && res.data.thresholds;
      },
    },
    {
      name: "Cost Threshold Triggers",
      test: async () => {
        const res = await axios.post(
          `${BASE_URL}/api/doa/check`,
          {
            workOrderId: "wo123",
            amount: 10000,
          },
          { headers: authHeaders },
        );
        return res.data.requiresApproval && res.data.approvers;
      },
    },
    {
      name: "Sequential Approval Workflow",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/doa/workflow/wo123`, {
          headers: authHeaders,
        });
        return res.data.steps && res.data.currentStep;
      },
    },
    {
      name: "Parallel Approval Support",
      test: async () => {
        const res = await axios.post(
          `${BASE_URL}/api/doa/parallel-approval`,
          {
            workOrderId: "wo123",
            approvers: ["owner", "finance"],
          },
          { headers: authHeaders },
        );
        return res.data.parallelApprovals;
      },
    },
    {
      name: "Approval SLA & Escalation",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/doa/sla/wo123`, {
          headers: authHeaders,
        });
        return res.data.slaTime && res.data.escalationPath;
      },
    },
  ];

  for (const test of doaTests) {
    try {
      const passed = await test.test();
      const status = passed
        ? `${colors.green}✅ WORKING${colors.reset}`
        : `${colors.red}❌ MISSING${colors.reset}`;
      console.log(`  ${status} ${test.name}`);
      results.doa.push({ name: test.name, passed });
    } catch (_e) {
      console.log(`  ${colors.red}❌ ERROR${colors.reset} ${test.name}`);
      results.doa.push({ name: test.name, passed: false });
    }
  }

  // ==========================
  // 5. REVENUE TRACKING
  // ==========================
  console.log(colors.yellow + "\n5️⃣ PROPERTY REVENUE TRACKING" + colors.reset);
  console.log("-".repeat(60));

  const revenueTests = [
    {
      name: "Rent Collection Tracking",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/owner/revenue/rent`, {
          headers: authHeaders,
        });
        return res.data.collected && res.data.pending && res.data.overdue;
      },
    },
    {
      name: "Maintenance Cost vs Revenue",
      test: async () => {
        const res = await axios.get(
          `${BASE_URL}/api/owner/analysis/cost-revenue`,
          { headers: authHeaders },
        );
        return res.data.maintenanceRatio && res.data.profitMargin;
      },
    },
    {
      name: "Property ROI Calculation",
      test: async () => {
        const res = await axios.get(
          `${BASE_URL}/api/owner/properties/123/roi`,
          { headers: authHeaders },
        );
        return res.data.roi && res.data.paybackPeriod;
      },
    },
    {
      name: "FM Performance vs Cost",
      test: async () => {
        const res = await axios.get(`${BASE_URL}/api/owner/fm-cost-analysis`, {
          headers: authHeaders,
        });
        return res.data.managementFees && res.data.valueDelivered;
      },
    },
  ];

  for (const test of revenueTests) {
    try {
      const passed = await test.test();
      const status = passed
        ? `${colors.green}✅ WORKING${colors.reset}`
        : `${colors.red}❌ MISSING${colors.reset}`;
      console.log(`  ${status} ${test.name}`);
      results.revenue.push({ name: test.name, passed });
    } catch (_e) {
      console.log(`  ${colors.red}❌ ERROR${colors.reset} ${test.name}`);
      results.revenue.push({ name: test.name, passed: false });
    }
  }

  // ==========================
  // SUMMARY
  // ==========================
  console.log("\n" + colors.blue + "=".repeat(80) + colors.reset);
  console.log(colors.blue + "📊 VERIFICATION SUMMARY" + colors.reset);
  console.log(colors.blue + "=".repeat(80) + colors.reset + "\n");

  let totalTests = 0;
  let totalPassed = 0;

  for (const [category, tests] of Object.entries(results)) {
    const passed = tests.filter((t) => t.passed).length;
    totalTests += tests.length;
    totalPassed += passed;

    const percentage = Math.round((passed / tests.length) * 100);
    const icon = percentage === 100 ? "✅" : percentage > 50 ? "⚠️" : "❌";

    console.log(
      `  ${icon} ${category.toUpperCase()}: ${passed}/${tests.length} (${percentage}%)`,
    );
  }

  const overallPercentage = Math.round((totalPassed / totalTests) * 100);

  console.log(
    "\n" + colors.yellow + "📈 OVERALL CRITICAL FEATURES:" + colors.reset,
  );
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${totalPassed} (${overallPercentage}%)`);
  console.log(`  Failed: ${totalTests - totalPassed}`);

  if (overallPercentage < 50) {
    console.log(
      "\n" + colors.red + "❌ CRITICAL SYSTEMS ARE MISSING!" + colors.reset,
    );
    console.log("The system is NOT ready without:");
    console.log("  - Property Owner dashboard and approval system");
    console.log("  - Deputy management for delegation");
    console.log("  - Corporate subscription/billing for SaaS model");
    console.log("  - DoA approval workflows");
    console.log("  - Revenue tracking for property owners");
    console.log("\n" + colors.yellow + "ACTION REQUIRED:" + colors.reset);
    console.log(
      'Search chat history for: "property owner", "deputy", "subscription", "DoA", "revenue"',
    );
  }

  console.log("\n" + colors.blue + "=".repeat(80) + colors.reset + "\n");

  return overallPercentage;
}

// Run verification
(async () => {
  const percentage = await verifyPropertyOwnerFeatures();
  process.exit(percentage >= 80 ? 0 : 1);
})();
