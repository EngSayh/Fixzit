#!/usr/bin/env node

/**
 * Grafana Alert/Dashboard Validation Script
 * 
 * Validates Grafana configuration files for:
 * - YAML syntax correctness
 * - Required fields presence
 * - Alert rule structure
 * - Dashboard JSON validity
 * 
 * @usage node scripts/validate-grafana.mjs
 * @returns Exit code 0 on success, 1 on failure
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, extname } from "path";
import { parse as parseYaml } from "yaml";

const MONITORING_DIR = join(process.cwd(), "monitoring/grafana");
const ALERTS_DIR = join(MONITORING_DIR, "alerts");
const DASHBOARDS_DIR = join(MONITORING_DIR, "dashboards");

let errors = [];
let warnings = [];

/**
 * Validate YAML alert rules
 */
function validateAlertRules(filePath) {
  const fileName = filePath.split("/").pop();
  console.log(`  Validating ${fileName}...`);

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = parseYaml(content);

    // Check required top-level fields
    if (!parsed.apiVersion) {
      warnings.push(`${fileName}: Missing apiVersion field`);
    }

    if (!parsed.groups || !Array.isArray(parsed.groups)) {
      errors.push(`${fileName}: Missing or invalid 'groups' array`);
      return;
    }

    // Validate each alert group
    for (const group of parsed.groups) {
      if (!group.name) {
        errors.push(`${fileName}: Alert group missing 'name' field`);
        continue;
      }

      if (!group.rules || !Array.isArray(group.rules)) {
        errors.push(`${fileName}: Group '${group.name}' missing 'rules' array`);
        continue;
      }

      // Validate each rule
      for (const rule of group.rules) {
        if (!rule.uid) {
          errors.push(`${fileName}: Rule in '${group.name}' missing 'uid' field`);
        }
        if (!rule.title) {
          errors.push(`${fileName}: Rule '${rule.uid || "unknown"}' missing 'title' field`);
        }
        if (!rule.condition) {
          errors.push(`${fileName}: Rule '${rule.uid || "unknown"}' missing 'condition' field`);
        }
        if (!rule.data || !Array.isArray(rule.data)) {
          errors.push(`${fileName}: Rule '${rule.uid || "unknown"}' missing 'data' array`);
        }

        // Check annotations
        if (!rule.annotations?.summary) {
          warnings.push(`${fileName}: Rule '${rule.uid}' missing 'summary' annotation`);
        }

        // Check labels
        if (!rule.labels?.severity) {
          warnings.push(`${fileName}: Rule '${rule.uid}' missing 'severity' label`);
        }
        if (!rule.labels?.team) {
          warnings.push(`${fileName}: Rule '${rule.uid}' missing 'team' label`);
        }
      }

      console.log(`    ✓ Group '${group.name}': ${group.rules.length} rules validated`);
    }
  } catch (error) {
    if (error.name === "YAMLParseError" || error.name === "YAMLSyntaxError") {
      errors.push(`${fileName}: YAML syntax error - ${error.message}`);
    } else {
      errors.push(`${fileName}: ${error.message}`);
    }
  }
}

/**
 * Validate JSON dashboard definitions
 */
function validateDashboards(filePath) {
  const fileName = filePath.split("/").pop();
  console.log(`  Validating ${fileName}...`);

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);

    // Check required dashboard fields
    if (!parsed.title) {
      errors.push(`${fileName}: Missing 'title' field`);
    }
    if (!parsed.uid) {
      warnings.push(`${fileName}: Missing 'uid' field (will be auto-generated)`);
    }
    if (!parsed.panels || !Array.isArray(parsed.panels)) {
      errors.push(`${fileName}: Missing or invalid 'panels' array`);
      return;
    }

    // Validate panels
    let panelCount = 0;
    for (const panel of parsed.panels) {
      panelCount++;
      if (!panel.title && panel.type !== "row") {
        warnings.push(`${fileName}: Panel #${panelCount} missing title`);
      }
      if (!panel.type) {
        errors.push(`${fileName}: Panel #${panelCount} missing 'type' field`);
      }
    }

    console.log(`    ✓ Dashboard '${parsed.title}': ${panelCount} panels validated`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push(`${fileName}: JSON syntax error - ${error.message}`);
    } else {
      errors.push(`${fileName}: ${error.message}`);
    }
  }
}

/**
 * Check for required alert categories
 */
function checkRequiredAlerts(alertsContent) {
  const required = [
    { pattern: /error.rate/i, name: "Error Rate" },
    { pattern: /latency|response.time/i, name: "Latency" },
    { pattern: /payment/i, name: "Payment" },
    { pattern: /database|mongodb/i, name: "Database" },
    { pattern: /memory|cpu/i, name: "Resource" },
    { pattern: /sms|taqnyat/i, name: "SMS" },
    { pattern: /webhook/i, name: "Webhook" },
    { pattern: /auth|security/i, name: "Security" },
  ];

  const missing = [];
  for (const req of required) {
    if (!req.pattern.test(alertsContent)) {
      missing.push(req.name);
    }
  }

  if (missing.length > 0) {
    warnings.push(`Missing recommended alert categories: ${missing.join(", ")}`);
  }
}

/**
 * Main validation runner
 */
async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║          FIXZIT – GRAFANA CONFIGURATION VALIDATOR              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // Check directories exist
  if (!existsSync(MONITORING_DIR)) {
    console.error("❌ Monitoring directory not found:", MONITORING_DIR);
    process.exit(1);
  }

  // Validate alerts
  console.log("📊 Validating Alert Rules...");
  if (existsSync(ALERTS_DIR)) {
    const alertFiles = readdirSync(ALERTS_DIR).filter(
      (f) => extname(f) === ".yaml" || extname(f) === ".yml"
    );
    
    let allAlertsContent = "";
    for (const file of alertFiles) {
      const filePath = join(ALERTS_DIR, file);
      allAlertsContent += readFileSync(filePath, "utf-8");
      validateAlertRules(filePath);
    }
    
    checkRequiredAlerts(allAlertsContent);
    console.log(`   Found ${alertFiles.length} alert file(s)\n`);
  } else {
    warnings.push("Alerts directory not found");
  }

  // Validate dashboards
  console.log("📈 Validating Dashboards...");
  if (existsSync(DASHBOARDS_DIR)) {
    const dashboardFiles = readdirSync(DASHBOARDS_DIR).filter(
      (f) => extname(f) === ".json"
    );
    
    for (const file of dashboardFiles) {
      validateDashboards(join(DASHBOARDS_DIR, file));
    }
    console.log(`   Found ${dashboardFiles.length} dashboard file(s)\n`);
  } else {
    warnings.push("Dashboards directory not found");
  }

  // Summary
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                        VALIDATION SUMMARY                       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`   - ${e}`));
    console.log("\n❌ Validation FAILED\n");
    process.exit(1);
  }

  console.log("\n✅ All validations passed!\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("Validation script error:", error);
  process.exit(1);
});
