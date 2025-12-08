const axios = require("axios");
const BASE_URL = "http://localhost:5000";

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

async function getAuthToken() {
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: `admin@${EMAIL_DOMAIN}`,
      password: "Admin@1234",
    });
    return res.data.token;
  } catch (error) {
    console.log("❌ AUTH FAILED - Backend not running?", error?.message || "");
    return null;
  }
}

async function testAllEndpoints() {
  console.log("\n🔍 COMPLETE SCOPE VERIFICATION - ALL 80+ ENDPOINTS\n");
  console.log("=" * 60);

  const token = await getAuthToken();
  if (!token) {
    console.log("❌ Cannot proceed without authentication");
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Module 1: Dashboard & KPIs (5 endpoints)
  const dashboardTests = [
    {
      name: "GET /api/dashboard/kpis",
      method: "GET",
      url: "/api/dashboard/kpis",
    },
    {
      name: "GET /api/dashboard/overview",
      method: "GET",
      url: "/api/dashboard/overview",
    },
    {
      name: "GET /api/dashboard/analytics",
      method: "GET",
      url: "/api/dashboard/analytics",
    },
    {
      name: "GET /api/dashboard/alerts",
      method: "GET",
      url: "/api/dashboard/alerts",
    },
    {
      name: "GET /api/dashboard/notifications",
      method: "GET",
      url: "/api/dashboard/notifications",
    },
  ];

  // Module 2: Work Orders (7 endpoints)
  const workOrderTests = [
    { name: "GET /api/workorders", method: "GET", url: "/api/workorders" },
    {
      name: "POST /api/workorders",
      method: "POST",
      url: "/api/workorders",
      data: { title: "Test WO", priority: "urgent", category: "HVAC" },
    },
    {
      name: "GET /api/workorders/:id",
      method: "GET",
      url: "/api/workorders/123",
    },
    {
      name: "PUT /api/workorders/:id",
      method: "PUT",
      url: "/api/workorders/123",
      data: { status: "in_progress" },
    },
    {
      name: "PUT /api/workorders/:id/status",
      method: "PUT",
      url: "/api/workorders/123/status",
      data: { status: "completed" },
    },
    {
      name: "POST /api/workorders/:id/photos",
      method: "POST",
      url: "/api/workorders/123/photos",
      data: { photos: ["test.jpg"] },
    },
    {
      name: "DELETE /api/workorders/:id",
      method: "DELETE",
      url: "/api/workorders/123",
    },
  ];

  // Module 3: Properties Management (7 endpoints)
  const propertyTests = [
    { name: "GET /api/properties", method: "GET", url: "/api/properties" },
    {
      name: "POST /api/properties",
      method: "POST",
      url: "/api/properties",
      data: { name: "Test Property", address: "Test Address" },
    },
    {
      name: "GET /api/properties/:id",
      method: "GET",
      url: "/api/properties/123",
    },
    {
      name: "PUT /api/properties/:id",
      method: "PUT",
      url: "/api/properties/123",
      data: { name: "Updated Property" },
    },
    {
      name: "GET /api/properties/:id/units",
      method: "GET",
      url: "/api/properties/123/units",
    },
    {
      name: "POST /api/properties/:id/units",
      method: "POST",
      url: "/api/properties/123/units",
      data: { unitNumber: "101" },
    },
    {
      name: "DELETE /api/properties/:id",
      method: "DELETE",
      url: "/api/properties/123",
    },
  ];

  // Module 4: Finance & ZATCA (8 endpoints)
  const financeTests = [
    {
      name: "GET /api/finance/invoices",
      method: "GET",
      url: "/api/finance/invoices",
    },
    {
      name: "POST /api/finance/invoices",
      method: "POST",
      url: "/api/finance/invoices",
      data: { customer: "Test Customer", amount: 1000 },
    },
    {
      name: "POST /api/finance/invoices-simple",
      method: "POST",
      url: "/api/finance/invoices-simple",
      data: { amount: 1000 },
    },
    {
      name: "GET /api/finance/payments",
      method: "GET",
      url: "/api/finance/payments",
    },
    {
      name: "POST /api/finance/payments",
      method: "POST",
      url: "/api/finance/payments",
      data: { amount: 500, method: "card" },
    },
    { name: "GET /api/zatca/qr/:id", method: "GET", url: "/api/zatca/qr/123" },
    {
      name: "POST /api/zatca/validate",
      method: "POST",
      url: "/api/zatca/validate",
      data: { invoice: {} },
    },
    {
      name: "GET /api/finance/reports",
      method: "GET",
      url: "/api/finance/reports",
    },
  ];

  // Module 5: Marketplace & RFQ (6 endpoints)
  const marketplaceTests = [
    {
      name: "GET /api/marketplace/rfq",
      method: "GET",
      url: "/api/marketplace/rfq",
    },
    {
      name: "POST /api/marketplace/rfq",
      method: "POST",
      url: "/api/marketplace/rfq",
      data: { title: "Test RFQ" },
    },
    {
      name: "GET /api/marketplace/vendors",
      method: "GET",
      url: "/api/marketplace/vendors",
    },
    {
      name: "POST /api/marketplace/vendors",
      method: "POST",
      url: "/api/marketplace/vendors",
      data: { name: "Test Vendor" },
    },
    {
      name: "POST /api/marketplace/rfq/:id/bids",
      method: "POST",
      url: "/api/marketplace/rfq/123/bids",
      data: { amount: 1000 },
    },
    {
      name: "GET /api/marketplace/products",
      method: "GET",
      url: "/api/marketplace/products",
    },
  ];

  // Module 6: HR Management (5 endpoints)
  const hrTests = [
    { name: "GET /api/hr/employees", method: "GET", url: "/api/hr/employees" },
    {
      name: "POST /api/hr/employees",
      method: "POST",
      url: "/api/hr/employees",
      data: { name: "Test Employee", role: "technician" },
    },
    { name: "GET /api/hr/shifts", method: "GET", url: "/api/hr/shifts" },
    {
      name: "POST /api/hr/shifts",
      method: "POST",
      url: "/api/hr/shifts",
      data: { employee: "123", start: "09:00", end: "17:00" },
    },
    { name: "GET /api/hr/payroll", method: "GET", url: "/api/hr/payroll" },
  ];

  // Module 7: CRM (4 endpoints)
  const crmTests = [
    { name: "GET /api/crm/contacts", method: "GET", url: "/api/crm/contacts" },
    {
      name: "POST /api/crm/contacts",
      method: "POST",
      url: "/api/crm/contacts",
      data: { name: "Test Contact", email: "test@test.com" },
    },
    { name: "GET /api/crm/leads", method: "GET", url: "/api/crm/leads" },
    {
      name: "POST /api/crm/leads",
      method: "POST",
      url: "/api/crm/leads",
      data: { source: "website", status: "new" },
    },
  ];

  // Module 8: Support Tickets (5 endpoints)
  const ticketTests = [
    { name: "GET /api/tickets", method: "GET", url: "/api/tickets" },
    {
      name: "POST /api/tickets",
      method: "POST",
      url: "/api/tickets",
      data: { title: "Test Ticket", priority: "high" },
    },
    { name: "GET /api/tickets/:id", method: "GET", url: "/api/tickets/123" },
    {
      name: "PUT /api/tickets/:id/status",
      method: "PUT",
      url: "/api/tickets/123/status",
      data: { status: "resolved" },
    },
    {
      name: "POST /api/tickets/:id/comments",
      method: "POST",
      url: "/api/tickets/123/comments",
      data: { comment: "Test comment" },
    },
  ];

  // Module 9: Compliance & Legal (4 endpoints)
  const complianceTests = [
    {
      name: "GET /api/compliance/certificates",
      method: "GET",
      url: "/api/compliance/certificates",
    },
    {
      name: "POST /api/compliance/certificates",
      method: "POST",
      url: "/api/compliance/certificates",
      data: { type: "safety", expires: "2024-12-31" },
    },
    {
      name: "GET /api/compliance/audits",
      method: "GET",
      url: "/api/compliance/audits",
    },
    {
      name: "POST /api/compliance/audits",
      method: "POST",
      url: "/api/compliance/audits",
      data: { type: "internal", scheduled: "2024-01-15" },
    },
  ];

  // Module 10: Reports & Analytics (6 endpoints)
  const reportTests = [
    {
      name: "GET /api/reports/financial",
      method: "GET",
      url: "/api/reports/financial",
    },
    {
      name: "GET /api/reports/operational",
      method: "GET",
      url: "/api/reports/operational",
    },
    {
      name: "GET /api/reports/maintenance",
      method: "GET",
      url: "/api/reports/maintenance",
    },
    {
      name: "POST /api/reports/custom",
      method: "POST",
      url: "/api/reports/custom",
      data: { type: "custom", filters: {} },
    },
    {
      name: "GET /api/reports/export/:type",
      method: "GET",
      url: "/api/reports/export/pdf",
    },
    {
      name: "GET /api/analytics/trends",
      method: "GET",
      url: "/api/analytics/trends",
    },
  ];

  // Module 11: System Management (5 endpoints)
  const systemTests = [
    {
      name: "GET /api/system/settings",
      method: "GET",
      url: "/api/system/settings",
    },
    {
      name: "PUT /api/system/settings",
      method: "PUT",
      url: "/api/system/settings",
      data: { timezone: "Asia/Riyadh" },
    },
    {
      name: "GET /api/system/backup",
      method: "GET",
      url: "/api/system/backup",
    },
    {
      name: "POST /api/system/backup",
      method: "POST",
      url: "/api/system/backup",
      data: { type: "full" },
    },
    {
      name: "GET /api/system/health",
      method: "GET",
      url: "/api/system/health",
    },
  ];

  // Module 12: Notifications (4 endpoints)
  const notificationTests = [
    {
      name: "GET /api/notifications",
      method: "GET",
      url: "/api/notifications",
    },
    {
      name: "POST /api/notifications",
      method: "POST",
      url: "/api/notifications",
      data: { title: "Test", message: "Test message" },
    },
    {
      name: "PUT /api/notifications/:id/read",
      method: "PUT",
      url: "/api/notifications/123/read",
    },
    {
      name: "DELETE /api/notifications/:id",
      method: "DELETE",
      url: "/api/notifications/123",
    },
  ];

  // Module 13: Preventive Maintenance (6 endpoints)
  const maintenanceTests = [
    {
      name: "GET /api/maintenance/schedules",
      method: "GET",
      url: "/api/maintenance/schedules",
    },
    {
      name: "POST /api/maintenance/schedules",
      method: "POST",
      url: "/api/maintenance/schedules",
      data: { type: "hvac", frequency: "monthly" },
    },
    {
      name: "GET /api/maintenance/tasks",
      method: "GET",
      url: "/api/maintenance/tasks",
    },
    {
      name: "PUT /api/maintenance/tasks/:id/complete",
      method: "PUT",
      url: "/api/maintenance/tasks/123/complete",
    },
    {
      name: "GET /api/maintenance/calendar",
      method: "GET",
      url: "/api/maintenance/calendar",
    },
    {
      name: "POST /api/maintenance/emergency",
      method: "POST",
      url: "/api/maintenance/emergency",
      data: { type: "urgent", description: "Emergency repair" },
    },
  ];

  // Mobile APIs (Phase 2 - Current)
  const mobileTests = [
    {
      name: "POST /api/mobile/tenant/login",
      method: "POST",
      url: "/api/mobile/tenant/login",
      data: { phone: "+966500000000", otp: "123456" },
      skipAuth: true,
    },
    {
      name: "GET /api/mobile/technician/tasks",
      method: "GET",
      url: "/api/mobile/technician/tasks",
    },
    {
      name: "GET /api/mobile/owner/dashboard",
      method: "GET",
      url: "/api/mobile/owner/dashboard",
    },
  ];

  const allModules = [
    { name: "Dashboard & KPIs", tests: dashboardTests, target: 5 },
    { name: "Work Orders", tests: workOrderTests, target: 7 },
    { name: "Properties Management", tests: propertyTests, target: 7 },
    { name: "Finance & ZATCA", tests: financeTests, target: 8 },
    { name: "Marketplace & RFQ", tests: marketplaceTests, target: 6 },
    { name: "HR Management", tests: hrTests, target: 5 },
    { name: "CRM", tests: crmTests, target: 4 },
    { name: "Support Tickets", tests: ticketTests, target: 5 },
    { name: "Compliance & Legal", tests: complianceTests, target: 4 },
    { name: "Reports & Analytics", tests: reportTests, target: 6 },
    { name: "System Management", tests: systemTests, target: 5 },
    { name: "Notifications", tests: notificationTests, target: 4 },
    { name: "Preventive Maintenance", tests: maintenanceTests, target: 6 },
    { name: "Mobile APIs", tests: mobileTests, target: 3 },
  ];

  let totalWorking = 0;
  let totalEndpoints = 0;
  let moduleResults = [];

  for (const mod of allModules) {
    console.log(
      `\n📦 ${mod.name.toUpperCase()} MODULE (${mod.target} endpoints)`,
    );
    console.log("-".repeat(50));

    let moduleWorking = 0;

    for (const test of mod.tests) {
      try {
        const config = {
          method: test.method,
          url: `${BASE_URL}${test.url}`,
          headers: test.skipAuth ? {} : authHeaders,
        };

        if (test.data) {
          config.data = test.data;
        }

        const res = await axios(config);

        // Check for real data vs placeholder
        const hasRealData =
          res.data &&
          (res.data.success !== undefined ||
            res.data.data !== undefined ||
            res.data.length !== undefined) &&
          !res.data.message?.includes("placeholder") &&
          JSON.stringify(res.data) !== '{"message":"success"}';

        if (hasRealData) {
          console.log(`✅ ${test.name}`);
          moduleWorking++;
          totalWorking++;
        } else {
          console.log(`❌ ${test.name} - PLACEHOLDER/FAKE`);
        }
      } catch (error) {
        console.log(
          `❌ ${test.name} - ERROR/NOT IMPLEMENTED`,
          error?.message || "",
        );
      }
      totalEndpoints++;
    }

    const modulePercentage = Math.round((moduleWorking / mod.target) * 100);
    moduleResults.push({
      name: mod.name,
      working: moduleWorking,
      total: mod.target,
      percentage: modulePercentage,
    });

    console.log(
      `📊 ${mod.name}: ${moduleWorking}/${mod.target} = ${modulePercentage}%`,
    );
  }

  const overallPercentage = Math.round((totalWorking / totalEndpoints) * 100);

  console.log("\n" + "=".repeat(60));
  console.log("📊 COMPLETE SCOPE VERIFICATION RESULTS");
  console.log("=".repeat(60));

  moduleResults.forEach((result) => {
    const status =
      result.percentage >= 95 ? "✅" : result.percentage >= 50 ? "⚠️" : "❌";
    console.log(
      `${status} ${result.name}: ${result.working}/${result.total} (${result.percentage}%)`,
    );
  });

  console.log("\n" + "=".repeat(60));
  console.log(
    `🎯 OVERALL COMPLETION: ${totalWorking}/${totalEndpoints} = ${overallPercentage}%`,
  );
  console.log("=".repeat(60));

  if (overallPercentage >= 95) {
    console.log("✅ PHASE 1 TRULY COMPLETE - Can proceed to Phase 2");
  } else if (overallPercentage >= 50) {
    console.log("⚠️ SIGNIFICANT WORK NEEDED - Fix broken endpoints");
  } else {
    console.log(
      "❌ PHASE 1 LARGELY INCOMPLETE - Major implementation required",
    );
  }

  console.log(
    `\n🚨 RULE: Cannot claim completion or move to Phase 2 until ≥95% (${Math.ceil(totalEndpoints * 0.95)} endpoints working)`,
  );

  return overallPercentage;
}

testAllEndpoints().catch(console.error);
