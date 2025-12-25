#!/usr/bin/env node
/**
 * Fixzit SSOT (MongoDB Atlas) Schema Verifier
 *
 * Requirements:
 *   - Node 18+
 *   - mongoose installed (already in most Next.js apps)
 *
 * Env:
 *   MONGODB_URI   (required)
 *   SSOT_DB_NAME  (optional) - overrides dbName
 *
 * Usage:
 *   node scripts/ssot-verify.mjs
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing env: MONGODB_URI");
  process.exit(2);
}

const dbName = process.env.SSOT_DB_NAME;

const REQUIRED_INDEXES = new Set([
  "idx_unique_issue_key",
  "idx_tenant_status_priority",
  "idx_agent_assignments",
  "idx_dedup_hash",
  "idx_file_paths",
  "idx_claim_expiry",
]);

const REQUIRED_SCHEMA_KEYS = [
  "tenantId",
  "issueKey",
  "title",
  "status",
  "domain",
  "filePaths",
  "assignment",
  "handoffHistory",
  "version",
];

// Unused but kept for potential future use; prefixed to silence lint
function _get(obj, path) {
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

async function main() {
  await mongoose.connect(uri, dbName ? { dbName } : {});
  const db = mongoose.connection.db;

  const infos = await db.listCollections({ name: "issues" }, { nameOnly: false }).toArray();
  if (!infos.length) {
    console.error('Collection "issues" does not exist.');
    process.exit(1);
  }

  const info = infos[0];
  const validator = info.options?.validator?.$jsonSchema;
  const hasValidator = Boolean(validator);

  console.log("=== Fixzit SSOT Schema Verify ===");
  console.log("DB:", db.databaseName);
  console.log("Collection:", info.name);
  console.log("Validator present:", hasValidator ? "YES" : "NO");

  const schemaProblems = [];
  if (hasValidator) {
    for (const key of REQUIRED_SCHEMA_KEYS) {
      if (!validator.properties?.[key] && !(validator.required || []).includes(key)) {
        schemaProblems.push(`Missing property definition for "${key}"`);
      }
    }

    // Check assignment fields exist (minimum)
    const assignmentProps = validator.properties?.assignment?.properties;
    const neededAssign = ["agentId", "agentType", "claimedAt", "claimExpiresAt", "claimToken"];
    if (!assignmentProps) {
      schemaProblems.push(`Missing "assignment.properties" block`);
    } else {
      for (const k of neededAssign) {
        if (!assignmentProps[k]) schemaProblems.push(`Missing assignment field "${k}"`);
      }
    }
  } else {
    schemaProblems.push("No collection validator found. (Allowed, but NOT aligned with AGENTS.md Appendix A.)");
  }

  // Index checks
  const indexes = await db.collection("issues").indexes();
  const idxNames = new Set(indexes.map(i => i.name));
  const missingIndexes = [...REQUIRED_INDEXES].filter(n => !idxNames.has(n));

  console.log("\nIndexes:");
  for (const i of indexes) console.log(`- ${i.name}`);

  // Field sanity checks (sample counts)
  const total = await db.collection("issues").countDocuments({});
  const missingAssignment = await db.collection("issues").countDocuments({ assignment: { $exists: false } });
  const missingTenantId = await db.collection("issues").countDocuments({ tenantId: { $exists: false } });
  const missingIssueKey = await db.collection("issues").countDocuments({ issueKey: { $exists: false } });

  console.log("\nDocument sanity:");
  console.log("- total:", total);
  console.log("- missing tenantId:", missingTenantId);
  console.log("- missing issueKey:", missingIssueKey);
  console.log("- missing assignment:", missingAssignment);

  // Common drift detection
  const hasAssignedTo = await db.collection("issues").countDocuments({ assignedTo: { $exists: true } });
  const hasPriorityLabel = await db.collection("issues").countDocuments({ priorityLabel: { $exists: true } });
  const hasPriority = await db.collection("issues").countDocuments({ priority: { $exists: true } });

  console.log("\nDrift signals:");
  console.log("- docs with legacy assignedTo:", hasAssignedTo);
  console.log("- docs with priorityLabel:", hasPriorityLabel);
  console.log("- docs with numeric priority:", hasPriority);

  const problems = [];

  if (schemaProblems.length) {
    problems.push("Schema issues:\n" + schemaProblems.map(s => `  - ${s}`).join("\n"));
  }
  if (missingIndexes.length) {
    problems.push("Missing required indexes:\n" + missingIndexes.map(s => `  - ${s}`).join("\n"));
  }

  console.log("\nResult:");
  if (problems.length) {
    console.log("FAIL\n" + problems.join("\n\n"));
    process.exit(1);
  }

  console.log("PASS");
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
}).finally(async () => {
  try { await mongoose.disconnect(); } catch {}
});
