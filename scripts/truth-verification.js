const axios = require("axios");
const BASE_URL = "http://localhost:5000";

async function exposeTheTruth() {
  console.log('🔍 EXPOSING THE TRUTH ABOUT YOUR "100% COMPLETE" CLAIM...\n');

  let realEndpoints = 0;
  let placeholderEndpoints = 0;
  let missingEndpoints = 0;

  const criticalTests = [
    // Work Orders (Must have SLA, photos, costs)
    {
      name: "Work Order Creation",
      method: "POST",
      url: "/api/workorders",
      data: {
        title: "Test",
        priority: "urgent",
        category: "HVAC",
        propertyId: "test",
      },
      validate: (res) =>
        res.data._id && res.data.slaBreachTime && res.data.workOrderNumber,
    },

    // Properties (Must have units, owner, deputy)
    {
      name: "Property with Units",
      method: "POST",
      url: "/api/properties",
      data: {
        name: "Building A",
        type: "residential",
        ownerId: "test",
        units: [],
      },
      validate: (res) =>
        res.data._id &&
        res.data.units !== undefined &&
        res.data.deputyId !== undefined,
    },

    // Property Owner Dashboard (CRITICAL - THEY PAY!)
    {
      name: "Owner Dashboard",
      method: "GET",
      url: "/api/owner/dashboard",
      validate: (res) =>
        res.data.revenue && res.data.expenses && res.data.fmPerformance,
    },

    // Deputy Assignment
    {
      name: "Deputy System",
      method: "POST",
      url: "/api/owner/properties/test/deputy",
      data: { deputyUserId: "test", permissions: ["approve"] },
      validate: (res) => res.data.deputyId && res.data.permissions,
    },

    // Subscription (How you make MONEY!)
    {
      name: "Subscription Plans",
      method: "GET",
      url: "/api/subscriptions/plans",
      validate: (res) => res.data.plans && res.data.plans.length >= 4,
    },

    // DoA Approval System
    {
      name: "DoA Check",
      method: "POST",
      url: "/api/doa/check",
      data: { workOrderId: "test", amount: 10000 },
      validate: (res) =>
        res.data.requiresApproval !== undefined && res.data.approvers,
    },

    // ZATCA (LEGALLY REQUIRED!)
    {
      name: "ZATCA Invoice",
      method: "POST",
      url: "/api/finance/invoices",
      data: {
        customer: { name: "Test", vatNumber: "300000000000003" },
        items: [{ description: "Service", quantity: 1, unitPrice: 100 }],
      },
      validate: (res) =>
        res.data.qrCode && res.data.qrCode.length > 100 && res.data.zatca,
    },

    // RFQ System
    {
      name: "RFQ Creation",
      method: "POST",
      url: "/api/marketplace/rfq",
      data: {
        title: "Test RFQ",
        items: [{ description: "Service", quantity: 1 }],
      },
      validate: (res) =>
        res.data._id &&
        res.data.status === "open" &&
        res.data.bids !== undefined,
    },
  ];

  for (const test of criticalTests) {
    try {
      const response = await axios({
        method: test.method,
        url: BASE_URL + test.url,
        data: test.data,
      });

      if (test.validate(response)) {
        console.log(`✅ ${test.name}: REAL IMPLEMENTATION`);
        realEndpoints++;
      } else if (response.data.message) {
        console.log(
          `❌ ${test.name}: PLACEHOLDER - Returns "${response.data.message}"`,
        );
        placeholderEndpoints++;
      } else {
        console.log(`⚠️ ${test.name}: SUSPICIOUS - Incomplete implementation`);
        placeholderEndpoints++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: MISSING - ${error.message}`);
      missingEndpoints++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 THE TRUTH:");
  console.log("=".repeat(60));
  console.log(
    `Real Endpoints: ${realEndpoints}/8 (${Math.round((realEndpoints / 8) * 100)}%)`,
  );
  console.log(`Placeholders: ${placeholderEndpoints}/8`);
  console.log(`Missing: ${missingEndpoints}/8`);

  if (realEndpoints < 8) {
    console.log("\n🔴 YOU ARE LYING ABOUT COMPLETION!");
    console.log("The system is NOT complete. Stop claiming 100%.");
    console.log("\n📋 MISSING CRITICAL FEATURES:");
    if (!realEndpoints)
      console.log("- Property Owner Dashboard (THE PAYING CUSTOMERS!)");
    console.log("- Deputy System (delegation)");
    console.log("- Subscription Management (how platform makes MONEY)");
    console.log("- DoA Approvals (prevent unauthorized spending)");
    console.log("- ZATCA Compliance (LEGALLY REQUIRED)");
  }

  return realEndpoints === 8;
}

exposeTheTruth();
