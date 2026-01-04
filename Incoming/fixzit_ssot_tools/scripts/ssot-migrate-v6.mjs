#!/usr/bin/env node
/**
 * Fixzit SSOT Migration Helper (to align legacy docs with v6.x expectations)
 *
 * SAFE DEFAULT: DRY-RUN
 * To apply: node scripts/ssot-migrate-v6.mjs --apply=true
 *
 * Env:
 *   MONGODB_URI (required)
 *   SSOT_DB_NAME (optional)
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing env: MONGODB_URI");
  process.exit(2);
}

const dbName = process.env.SSOT_DB_NAME;
const APPLY = (process.argv.find(a => a.startsWith("--apply="))?.split("=",2)[1] ?? "false") === "true";

const TARGET_SCHEMA_VERSION = "6.1.0";

const STATUS_MAP = new Map([
  ["pending", "open"],
  ["todo", "open"],
  ["in progress", "in_progress"],
  ["in-progress", "in_progress"],
  ["done", "resolved"],
  ["completed", "resolved"],
  ["fixed", "resolved"],
]);

// Status normalization utility - preserved for migration use
// function normalizeStatus(s) { if (!s || typeof s !== "string") return s; return STATUS_MAP.get(s.trim().toLowerCase()) ?? s; }

async function main() {
  await mongoose.connect(uri, dbName ? { dbName } : {});
  const db = mongoose.connection.db;
  const col = db.collection("issues");

  console.log("=== Fixzit SSOT Migration (v6.x) ===");
  console.log("DB:", db.databaseName);
  console.log("Apply:", APPLY ? "YES" : "NO (dry-run)");
  console.log("Target schemaVersion:", TARGET_SCHEMA_VERSION, "\n");

  // DRIFT COUNTS
  const counts = {
    total: await col.countDocuments({}),
    missingSchemaVersion: await col.countDocuments({ schemaVersion: { $exists: false } }),
    hasAssignedTo: await col.countDocuments({ assignedTo: { $exists: true } }),
    missingAssignment: await col.countDocuments({ assignment: { $exists: false } }),
    needsStatusNormalize: await col.countDocuments({ status: { $type: "string", $in: [...STATUS_MAP.keys()] } }).catch(() => 0),
    missingVersion: await col.countDocuments({ version: { $exists: false } }),
  };
  console.log("Counts:", counts, "\n");

  if (!APPLY) {
    console.log("Dry-run only. Re-run with --apply=true to execute updates.");
    return;
  }

  // 1) Ensure schemaVersion
  const r1 = await col.updateMany(
    { schemaVersion: { $exists: false } },
    { $set: { schemaVersion: TARGET_SCHEMA_VERSION } }
  );

  // 2) Ensure assignment object exists
  const r2 = await col.updateMany(
    { assignment: { $exists: false } },
    { $set: { assignment: {} } }
  );

  // 3) Migrate assignedTo -> assignment.agentId (only if assignment.agentId missing)
  const r3 = await col.updateMany(
    {
      assignedTo: { $exists: true, $ne: null },
      $or: [
        { "assignment.agentId": { $exists: false } },
        { "assignment.agentId": null }
      ]
    },
    [
      { $set: { "assignment.agentId": "$assignedTo" } }
    ]
  );

  // 4) Normalize common status strings
  // NOTE: uses pipeline update for safe mapping
  const r4 = await col.updateMany(
    { status: { $type: "string" } },
    [
      {
        $set: {
          status: {
            $let: {
              vars: { s: { $toLower: { $trim: { input: "$status" } } } },
              in: {
                $switch: {
                  branches: [
                    { case: { $in: ["$$s", ["pending","todo"]] }, then: "open" },
                    { case: { $in: ["$$s", ["in progress","in-progress"]] }, then: "in_progress" },
                    { case: { $in: ["$$s", ["done","completed","fixed"]] }, then: "resolved" }
                  ],
                  default: "$status"
                }
              }
            }
          }
        }
      }
    ]
  );

  // 5) Ensure updatedAt exists (if your app doesn’t always set it)
  const r5 = await col.updateMany(
    { updatedAt: { $exists: false } },
    [{ $set: { updatedAt: "$$NOW" } }]
  );

  // 6) Ensure version exists
  const r6 = await col.updateMany(
    { version: { $exists: false } },
    { $set: { version: 1 } }
  );

  console.log("Migration results:");
  console.log("- schemaVersion set:", r1.modifiedCount);
  console.log("- assignment ensured:", r2.modifiedCount);
  console.log("- assignedTo migrated:", r3.modifiedCount);
  console.log("- status normalized:", r4.modifiedCount);
  console.log("- updatedAt ensured:", r5.modifiedCount);
  console.log("- version ensured:", r6.modifiedCount);
  console.log("\nDONE");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
}).finally(async () => {
  try { await mongoose.disconnect(); } catch {}
});
