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
  },
  // ============== NEW FINDINGS FROM DEEP SCAN 2025-01-02 ==============
  // P0 Critical - Security/Compliance
  {
    title: "PII encryption not implemented in Employee model",
    description: "Employee.ts line 38 indicates PII encryption is not implemented. Critical compliance/security risk for employee personal data.",
    category: "security",
    priority: "P0",
    effort: "L",
    location: { filePath: "server/models/Employee.ts", lineStart: 38 },
    module: "hr",
    action: "Implement PII encryption at rest for sensitive employee fields (SSN, bank details, etc.)",
    definitionOfDone: "Employee PII fields encrypted at rest with key rotation support",
    riskTags: ["SECURITY", "DATA_INTEGRITY"],
    labels: ["pii", "encryption", "compliance", "hr"],
    source: "automated_scan"
  },
  // P1 High - Workflow/Business Logic
  {
    title: "Vendor analytics TODO - 5 functions incomplete",
    description: "vendor-intelligence.ts has TODO markers at lines 780, 818, 834, 849, 864 for analytics and fraud detection features.",
    category: "feature",
    priority: "P1",
    effort: "XL",
    location: { filePath: "services/souq/vendor-intelligence.ts", lineStart: 780 },
    module: "souq",
    action: "Implement vendor analytics: performance metrics, trust scores, risk indicators",
    definitionOfDone: "All 5 analytics methods return real calculated data",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["analytics", "vendor", "marketplace"],
    source: "automated_scan"
  },
  {
    title: "Customer insights trend calculation TODO",
    description: "customer-insights.ts line 1090 has TODO for real trend calculation instead of placeholder values.",
    category: "feature",
    priority: "P1",
    effort: "M",
    location: { filePath: "services/analytics/customer-insights.ts", lineStart: 1090 },
    module: "analytics",
    action: "Implement real trend calculation using historical data analysis",
    definitionOfDone: "Trend metrics based on actual time-series data",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["analytics", "trends", "customer-insights"],
    source: "automated_scan"
  },
  {
    title: "Mock provider data in production route",
    description: "route.ts line 60 uses mock data that needs replacement with real DB queries. Misleading data risk.",
    category: "bug",
    priority: "P1",
    effort: "M",
    location: { filePath: "app/api/providers/route.ts", lineStart: 60 },
    module: "api",
    action: "Replace mock provider data with actual database queries",
    definitionOfDone: "Provider endpoint returns real data from DB",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["mock-data", "production-risk", "api"],
    source: "automated_scan"
  },
  {
    title: "Vendor assignment persistence not implemented",
    description: "route.ts lines 115, 259 indicate data source/persistence not implemented for vendor assignments.",
    category: "bug",
    priority: "P1",
    effort: "L",
    location: { filePath: "app/api/vendors/route.ts", lineStart: 115 },
    module: "souq",
    action: "Implement vendor assignment persistence to MongoDB",
    definitionOfDone: "Vendor assignments persisted and queryable",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["vendor", "persistence", "workflow-break"],
    source: "automated_scan"
  },
  {
    title: "ClaimsOrder schema mismatch - deferred/blocked",
    description: "ClaimsOrder.ts lines 16, 33 have DEFERRED/BLOCKED markers for schema mismatches risking data integrity.",
    category: "bug",
    priority: "P1",
    effort: "L",
    location: { filePath: "server/models/ClaimsOrder.ts", lineStart: 16 },
    module: "souq",
    action: "Resolve schema mismatches in ClaimsOrder model",
    definitionOfDone: "Schema consistent with domain requirements",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["schema", "claims", "data-integrity"],
    source: "automated_scan"
  },
  // P2 Medium - Features/UI
  {
    title: "Support ticketing integration TODO",
    description: "route.ts line 32 has TODO for ticketing system integration to reduce manual support handling.",
    category: "feature",
    priority: "P2",
    effort: "XL",
    location: { filePath: "app/api/support/route.ts", lineStart: 32 },
    module: "support",
    action: "Integrate with ticketing system (Zendesk/Freshdesk/internal)",
    definitionOfDone: "Support tickets created/synced with ticketing platform",
    riskTags: [],
    labels: ["support", "ticketing", "integration"],
    source: "automated_scan"
  },
  {
    title: "Inspection report generation TODO",
    description: "inspection-service.ts line 754 has TODO for automated report generation pipeline.",
    category: "feature",
    priority: "P2",
    effort: "L",
    location: { filePath: "services/fm/inspection-service.ts", lineStart: 754 },
    module: "fm",
    action: "Implement automated inspection report generation (PDF/email)",
    definitionOfDone: "Inspection reports auto-generated and distributed",
    riskTags: [],
    labels: ["inspection", "reports", "automation"],
    source: "automated_scan"
  },
  {
    title: "FM issues comments API not implemented",
    description: "page.tsx line 313 indicates comments feature for FM issues is not implemented.",
    category: "feature",
    priority: "P2",
    effort: "M",
    location: { filePath: "app/fm/issues/page.tsx", lineStart: 313 },
    module: "fm",
    action: "Implement comments API for FM issue collaboration",
    definitionOfDone: "Users can add/view comments on FM issues",
    riskTags: [],
    labels: ["fm", "comments", "collaboration"],
    source: "automated_scan"
  },
  {
    title: "Notification count badge for superadmin header",
    description: "SuperadminHeader.tsx line 212 has TODO for notification count badge display.",
    category: "feature",
    priority: "P3",
    effort: "S",
    location: { filePath: "components/SuperadminHeader.tsx", lineStart: 212 },
    module: "ui",
    action: "Add notification count badge to superadmin header",
    definitionOfDone: "Badge shows unread notification count",
    riskTags: [],
    labels: ["ui", "notifications", "superadmin"],
    source: "automated_scan"
  },
  // P2 Medium - Placeholders
  {
    title: "TBD placeholders in production UI",
    description: "Multiple TBD fallback values in page.tsx at lines 113, 373, 266 and ics-generator.ts:151.",
    category: "bug",
    priority: "P2",
    effort: "S",
    location: { filePath: "app/page.tsx", lineStart: 113 },
    module: "ui",
    action: "Replace TBD placeholders with actual values or proper fallbacks",
    definitionOfDone: "No TBD strings visible to end users",
    riskTags: ["DATA_INTEGRITY"],
    labels: ["placeholders", "ui", "tbd"],
    source: "automated_scan"
  },
  {
    title: "Actor name TBD in FM approval engine undermines audit",
    description: "fm-approval-engine.ts line 757 uses 'TBD' as actorName, undermining audit trail integrity.",
    category: "security",
    priority: "P1",
    effort: "M",
    location: { filePath: "lib/fm/fm-approval-engine.ts", lineStart: 757 },
    module: "fm",
    action: "Replace TBD with actual actor resolution from session/context",
    definitionOfDone: "All approval actions have proper actor attribution",
    riskTags: ["SECURITY", "DATA_INTEGRITY"],
    labels: ["audit", "compliance", "approval"],
    source: "automated_scan"
  },
  {
    title: "CHANGEME placeholder in production route",
    description: "route.ts line 167 contains 'changeme' placeholder that needs actual configuration.",
    category: "bug",
    priority: "P2",
    effort: "XS",
    location: { filePath: "app/api/route.ts", lineStart: 167 },
    module: "api",
    action: "Replace changeme placeholder with proper value",
    definitionOfDone: "Placeholder removed, proper config in place",
    riskTags: [],
    labels: ["placeholder", "config"],
    source: "automated_scan"
  },
  {
    title: "TBD file path defaults in issue-log tooling",
    description: "issue-log.ts has TBD file path defaults at lines 225, 242, 272, 343, 518 and route.ts:433.",
    category: "refactor",
    priority: "P3",
    effort: "S",
    location: { filePath: "tools/issue-log.ts", lineStart: 225 },
    module: "tooling",
    action: "Replace TBD file paths with proper defaults or required validation",
    definitionOfDone: "Issue log tool uses proper file paths",
    riskTags: [],
    labels: ["tooling", "issue-log", "tbd"],
    source: "automated_scan"
  },
  // P3 Low - Tests/Tools
  {
    title: "Vitest config infrastructure TODOs",
    description: "vitest.config.ts lines 57, 140 have test infrastructure TODOs for improvements.",
    category: "missing_test",
    priority: "P3",
    effort: "S",
    location: { filePath: "vitest.config.ts", lineStart: 57 },
    module: "tests",
    action: "Complete vitest configuration improvements",
    definitionOfDone: "Vitest config optimized per TODOs",
    riskTags: ["TEST_GAP"],
    labels: ["vitest", "test-config"],
    source: "automated_scan"
  },
  {
    title: "S3 cleanup testability improvement needed",
    description: "patch.route.test.ts line 275 has TODO for S3 cleanup testability improvements.",
    category: "missing_test",
    priority: "P3",
    effort: "M",
    location: { filePath: "tests/api/patch.route.test.ts", lineStart: 275 },
    module: "tests",
    action: "Improve S3 cleanup testability with mock isolation",
    definitionOfDone: "S3 operations properly mocked in tests",
    riskTags: ["TEST_GAP"],
    labels: ["tests", "s3", "mocking"],
    source: "automated_scan"
  },
  {
    title: "FilterPresetsDropdown component tests not implemented",
    description: "ProductsList.query.test.tsx:90 and PropertiesList.query.test.tsx:94 indicate FilterPresetsDropdown not implemented in tests.",
    category: "missing_test",
    priority: "P3",
    effort: "S",
    location: { filePath: "tests/components/ProductsList.query.test.tsx", lineStart: 90 },
    module: "tests",
    action: "Implement FilterPresetsDropdown component tests",
    definitionOfDone: "FilterPresetsDropdown has test coverage",
    riskTags: ["TEST_GAP"],
    labels: ["tests", "components", "filter-presets"],
    source: "automated_scan"
  },
  {
    title: "API test generator has placeholder templates",
    description: "generate-api-test.js lines 127, 202, 212, 244 have generator placeholder code to complete.",
    category: "refactor",
    priority: "P3",
    effort: "M",
    location: { filePath: "scripts/generate-api-test.js", lineStart: 127 },
    module: "tooling",
    action: "Complete API test generator templates",
    definitionOfDone: "Generator produces complete test files",
    riskTags: [],
    labels: ["tooling", "code-gen", "tests"],
    source: "automated_scan"
  },
  {
    title: "Demo users check script type-safety TODOs",
    description: "check-demo-users.ts lines 28, 37 have schema type-safety improvements needed.",
    category: "refactor",
    priority: "P3",
    effort: "S",
    location: { filePath: "scripts/check-demo-users.ts", lineStart: 28 },
    module: "tooling",
    action: "Add proper type definitions for demo user schema",
    definitionOfDone: "Script has full TypeScript type coverage",
    riskTags: [],
    labels: ["tooling", "typescript", "demo-users"],
    source: "automated_scan"
  },
  {
    title: "Guard admin checks exit behavior TODO",
    description: "guard-admin-checks.js line 149 has TODO to tighten exit behavior.",
    category: "refactor",
    priority: "P3",
    effort: "XS",
    location: { filePath: "scripts/guard-admin-checks.js", lineStart: 149 },
    module: "tooling",
    action: "Improve exit behavior consistency",
    definitionOfDone: "Script exits with proper codes in all scenarios",
    riskTags: [],
    labels: ["tooling", "guards"],
    source: "automated_scan"
  },
  {
    title: "P2 fix automation script TODO templates",
    description: "fix-priority-2-automated.ts lines 108, 239 have TODO templates to complete.",
    category: "refactor",
    priority: "P3",
    effort: "S",
    location: { filePath: "scripts/fix-priority-2-automated.ts", lineStart: 108 },
    module: "tooling",
    action: "Complete P2 fix automation templates",
    definitionOfDone: "Automation script fully functional",
    riskTags: [],
    labels: ["tooling", "automation"],
    source: "automated_scan"
  },
  {
    title: "Smart merge conflicts manual review marker",
    description: "smart-merge-conflicts.ts line 134 has manual review TODO marker.",
    category: "refactor",
    priority: "P3",
    effort: "XS",
    location: { filePath: "scripts/smart-merge-conflicts.ts", lineStart: 134 },
    module: "tooling",
    action: "Improve merge conflict detection heuristics",
    definitionOfDone: "Fewer false positives requiring manual review",
    riskTags: [],
    labels: ["tooling", "merge-conflicts"],
    source: "automated_scan"
  },
  {
    title: "Souq service tests have deferred imports",
    description: "Multiple Souq service test files have deferred service imports at line 29: account-health, buybox, auto-repricer, seller-kyc, inventory.",
    category: "missing_test",
    priority: "P3",
    effort: "M",
    location: { filePath: "tests/services/souq/account-health-service.test.ts", lineStart: 29 },
    module: "tests",
    action: "Resolve deferred service imports in Souq tests",
    definitionOfDone: "All Souq service tests have proper imports and run",
    riskTags: ["TEST_GAP"],
    labels: ["tests", "souq", "imports"],
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
  
  // Helper to add delay between requests to avoid rate limiting
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
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
      } else if (res.status === 429) {
        // Rate limited - wait and retry
        console.log(`⏳ Rate limited, waiting 2s...`);
        await delay(2000);
        const retryRes = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(issue)
        });
        const retryData = await retryRes.json();
        if (retryRes.status === 201) {
          created++;
          console.log(`✅ Created (retry): ${retryData.data.issue.issueId} - ${issue.title.substring(0, 50)}`);
        } else if (retryRes.status === 409 || (retryRes.status === 200 && retryData.data?.duplicate)) {
          updated++;
          console.log(`📝 Exists (retry): ${issue.title.substring(0, 50)}`);
        } else {
          errors.push({ title: issue.title, error: retryData.error || retryRes.status });
        }
      } else {
        errors.push({ title: issue.title, error: data.error || res.status });
        console.log(`❌ Error: ${issue.title.substring(0, 50)} - ${data.error || res.status}`);
      }
      
      // Add small delay between requests to avoid rate limiting
      await delay(200);
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
