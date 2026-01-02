/**
 * SSOT Issue Import Script for TODO Scan Findings
 * Imports critical P0-P3 findings to MongoDB Issue Tracker
 * 
 * @author [AGENT-001-A]
 * @run node scripts/import-todo-scan.js
 */

const issues = [
  // P0 Critical
  {
    title: "PDPL data erasure implementation required",
    description: "pdpl-service.ts line 337 has TODO for actual deletion logic. Line 353 warns erasure not implemented. PDPL compliance requires functional erasure within 30 days.",
    category: "security",
    priority: "P0",
    effort: "L",
    location: { filePath: "services/compliance/pdpl-service.ts", lineStart: 337 },
    module: "compliance",
    action: "Implement cascade deletion logic for data subject erasure requests",
    definitionOfDone: "Erasure request triggers full data removal across all collections with audit trail",
    riskTags: ["SECURITY", "DATA_INTEGRITY"],
    labels: ["compliance", "pdpl", "gdpr", "erasure"],
    source: "automated_scan"
  },
  {
    title: "SADAD/SPAN live payout mode not implemented",
    description: "payout-processor.ts lines 599/611 log that live mode is requested but not implemented. Production payouts cannot be processed via Saudi payment rails.",
    category: "bug",
    priority: "P0",
    effort: "XL",
    location: { filePath: "services/finance/payout-processor.ts", lineStart: 599 },
    module: "finance",
    action: "Implement SADAD/SPAN live mode integration with Saudi payment rails",
    definitionOfDone: "Live payouts execute successfully with proper audit trail",
    riskTags: ["FINANCIAL", "INTEGRATION"],
    labels: ["payments", "sadad", "span", "saudi-integration"],
    source: "automated_scan"
  },
  // P1 High
  {
    title: "Vendor fraud detection stubs - 4 functions not implemented",
    description: "vendor-intelligence.ts has deprecated STUB methods: activity spike (818), duplicate listings (834), price manipulation (849), fake review detection (864).",
    category: "feature",
    priority: "P1",
    effort: "XL",
    location: { filePath: "services/souq/vendor-intelligence.ts", lineStart: 817 },
    module: "souq",
    action: "Implement ML-based fraud detection algorithms for marketplace integrity",
    definitionOfDone: "All 4 fraud detection methods return real analysis results",
    riskTags: ["SECURITY", "DATA_INTEGRITY"],
    labels: ["fraud-detection", "marketplace", "ml"],
    source: "automated_scan"
  },
  {
    title: "Ejar API integration not implemented",
    description: "lease-service.ts line 1028 has TODO to implement actual Ejar API integration for Saudi rental contracts.",
    category: "feature",
    priority: "P1",
    effort: "L",
    location: { filePath: "services/aqar/lease-service.ts", lineStart: 1028 },
    module: "aqar",
    action: "Implement Ejar API integration for contract registration",
    definitionOfDone: "Contracts successfully registered with Ejar platform",
    riskTags: ["INTEGRATION"],
    labels: ["ejar", "saudi-integration", "aqar"],
    source: "automated_scan"
  },
  {
    title: "OTP bypass blocking disabled - security feature off",
    description: "instrumentation-node.ts line 66 TODO to re-enable blocking once OTP bypass detection is fixed. Security feature is currently disabled.",
    category: "security",
    priority: "P1",
    effort: "M",
    location: { filePath: "instrumentation-node.ts", lineStart: 66 },
    module: "auth",
    action: "Fix OTP bypass detection and re-enable blocking",
    definitionOfDone: "OTP bypass attempts are blocked with proper logging",
    riskTags: ["SECURITY"],
    labels: ["security", "otp", "auth"],
    source: "automated_scan"
  },
  {
    title: "Runtime 501 stubs in API routes - 3 endpoints",
    description: "route.ts returns 501 Not Implemented at lines 78, 315, 379. Production users hitting these endpoints will see errors.",
    category: "bug",
    priority: "P1",
    effort: "M",
    location: { filePath: "app/api/route.ts", lineStart: 78 },
    module: "api",
    action: "Implement missing functionality or deprecate endpoints",
    definitionOfDone: "Endpoints return valid responses or are removed",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["runtime-stub", "501-error", "production-impact"],
    source: "automated_scan"
  },
  // P2 Medium
  {
    title: "BI Dashboard hardcoded KPIs - 4 placeholders",
    description: "bi-dashboard.ts has hardcoded KPI placeholders: cashFlow (535), expenseRatio (538), firstTimeFixRate (653), trainingHours (873).",
    category: "bug",
    priority: "P2",
    effort: "M",
    location: { filePath: "services/reports/bi-dashboard.ts", lineStart: 535 },
    module: "reports",
    action: "Replace hardcoded values with actual data queries",
    definitionOfDone: "All KPIs calculated from real data",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["bi", "dashboard", "kpi"],
    source: "automated_scan"
  },
  {
    title: "Subscription plan change flow not implemented (FIXZIT-SUB-001)",
    description: "page.tsx line 816 TODO for plan change flow in subscription management UI.",
    category: "feature",
    priority: "P2",
    effort: "L",
    location: { filePath: "app/page.tsx", lineStart: 816 },
    module: "billing",
    action: "Implement plan upgrade/downgrade UI flow with proration",
    definitionOfDone: "Users can change subscription plans with prorated billing",
    riskTags: ["FINANCIAL"],
    labels: ["subscriptions", "billing", "ui"],
    source: "automated_scan"
  },
  {
    title: "Subscription cancellation flow not implemented (FIXZIT-SUB-002)",
    description: "page.tsx line 820 TODO for cancellation flow in subscription management UI.",
    category: "feature",
    priority: "P2",
    effort: "M",
    location: { filePath: "app/page.tsx", lineStart: 820 },
    module: "billing",
    action: "Implement subscription cancellation with retention offers",
    definitionOfDone: "Users can cancel subscription with proper offboarding flow",
    riskTags: ["FINANCIAL"],
    labels: ["subscriptions", "billing", "ui"],
    source: "automated_scan"
  },
  {
    title: "Inspection tenant notification not implemented",
    description: "inspection-service.ts line 504 TODO to send notification to tenant if requested.",
    category: "feature",
    priority: "P2",
    effort: "S",
    location: { filePath: "services/fm/inspection-service.ts", lineStart: 504 },
    module: "fm",
    action: "Implement tenant notification via notification-engine service",
    definitionOfDone: "Tenant receives email/SMS when inspection is scheduled",
    riskTags: [],
    labels: ["notifications", "fm", "inspection"],
    source: "automated_scan"
  },
  {
    title: "Session termination not implemented",
    description: "page.tsx line 891 indicates session termination feature is not implemented in admin UI.",
    category: "feature",
    priority: "P2",
    effort: "M",
    location: { filePath: "app/page.tsx", lineStart: 891 },
    module: "auth",
    action: "Implement session termination with token invalidation",
    definitionOfDone: "Admin can terminate user sessions remotely",
    riskTags: ["SECURITY"],
    labels: ["auth", "sessions", "security"],
    source: "automated_scan"
  },
  {
    title: "MFA approval system integration TODO",
    description: "mfaService.ts line 399 TODO for centralized approval system integration.",
    category: "feature",
    priority: "P2",
    effort: "M",
    location: { filePath: "lib/mfaService.ts", lineStart: 399 },
    module: "auth",
    action: "Integrate MFA with centralized approval workflow",
    definitionOfDone: "MFA approval requests routed to approval system",
    riskTags: ["SECURITY"],
    labels: ["mfa", "auth", "approval"],
    source: "automated_scan"
  },
  {
    title: "Test mock setup incomplete - TG-005 batch",
    description: "Multiple test files have TODO(TG-005): orders.route.test.ts (149,177,193,209), send.test.ts (163), issues-import.route.test.ts (195,227,238,250).",
    category: "missing_test",
    priority: "P2",
    effort: "L",
    location: { filePath: "tests/api/souq/orders.route.test.ts", lineStart: 149 },
    module: "tests",
    action: "Complete mock setup for all TG-005 marked tests",
    definitionOfDone: "All TG-005 tests pass with proper mocks",
    riskTags: ["TEST_GAP"],
    labels: ["tests", "mocks", "tg-005"],
    source: "automated_scan"
  },
  // P3 Low
  {
    title: "Redis pub/sub scaling not implemented",
    description: "route.ts line 133 TODO to publish events to Redis for horizontal scaling.",
    category: "feature",
    priority: "P3",
    effort: "M",
    location: { filePath: "app/api/route.ts", lineStart: 133 },
    module: "infrastructure",
    action: "Implement Redis pub/sub for event distribution",
    definitionOfDone: "Events distributed across instances via Redis",
    riskTags: ["PERFORMANCE"],
    labels: ["redis", "scaling", "infrastructure"],
    source: "automated_scan"
  },
  {
    title: "Health monitoring integration not implemented",
    description: "route.ts line 221 TODO to integrate Datadog/Prometheus/NewRelic health data.",
    category: "feature",
    priority: "P3",
    effort: "M",
    location: { filePath: "app/api/route.ts", lineStart: 221 },
    module: "monitoring",
    action: "Integrate with observability platform for real health metrics",
    definitionOfDone: "Health endpoint returns actual monitoring data",
    riskTags: [],
    labels: ["monitoring", "observability"],
    source: "automated_scan"
  },
  {
    title: "AI building model generation TODO",
    description: "buildingModel.ts line 471 TODO for AI-powered building model generation using LLM.",
    category: "feature",
    priority: "P3",
    effort: "XL",
    location: { filePath: "lib/buildingModel.ts", lineStart: 471 },
    module: "aqar",
    action: "Implement LLM-based building model generation",
    definitionOfDone: "LLM generates building models from descriptions",
    riskTags: [],
    labels: ["ai", "llm", "aqar"],
    source: "automated_scan"
  },
  {
    title: "DEFERRED: FM Properties schema mismatch (TODO-002)",
    description: "Property.ts line 8 schema mismatch between FM and Aqar Property models.",
    category: "refactor",
    priority: "P3",
    effort: "L",
    location: { filePath: "server/models/Property.ts", lineStart: 8 },
    module: "fm",
    action: "Align Property schemas between FM and Aqar domains",
    definitionOfDone: "Single unified Property schema or clear mapping",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["schema", "deferred", "refactor"],
    source: "automated_scan"
  }
];

async function importIssues() {
  const token = process.env.ISSUE_API_TOKEN || 'rGYPSsd5m6h7VLXqEJ9akZApWOTFzlIK';
  const baseUrl = 'http://localhost:3000/api/issues';
  
  console.log(`\n[AGENT-001-A] SSOT TODO Scan Import`);
  console.log(`Issues to import: ${issues.length}`);
  console.log('─'.repeat(60));
  
  let created = 0;
  let updated = 0;
  let errors = [];
  
  for (const issue of issues) {
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issue)
      });
      
      const data = await res.json();
      
      if (res.status === 201) {
        created++;
        console.log(`✅ Created: ${data.data.issue.issueId} - ${issue.title.substring(0, 50)}`);
      } else if (res.status === 200 && data.data?.duplicate) {
        updated++;
        console.log(`🔄 Updated: ${data.data.issue.issueId} - ${issue.title.substring(0, 50)}`);
      } else if (res.status === 409) {
        updated++;
        console.log(`📝 Exists: ${issue.title.substring(0, 50)}`);
      } else {
        errors.push({ title: issue.title, error: data.error || res.status });
        console.log(`❌ Error: ${issue.title.substring(0, 50)} - ${data.error || res.status}`);
      }
    } catch (err) {
      errors.push({ title: issue.title, error: err.message });
      console.log(`❌ Error: ${issue.title.substring(0, 50)} - ${err.message}`);
    }
  }
  
  console.log('─'.repeat(60));
  console.log(`Summary: ${created} created, ${updated} updated/exists, ${errors.length} errors`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e.title}: ${e.error}`));
  }
}

importIssues().catch(console.error);
