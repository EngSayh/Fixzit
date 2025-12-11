import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import fg from "fast-glob";
import mongoose, { Model } from "mongoose";

type SchemaIndex = { name: string; key: Record<string, number> };

interface AuditFlags {
  apply: boolean;
  failOnMissing: boolean;
  jsonPath: string;
  textPath: string;
}

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ARTIFACTS_DIR = path.join(ROOT_DIR, "_artifacts");
const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";

const IGNORED_PATTERNS = [
  "**/*.d.ts",
  "**/index.ts",
  "**/plugins/**",
  "**/qa/**",
  "**/__mocks__/**",
];

function parseFlags(): AuditFlags {
  const args = new Set(process.argv.slice(2));
  const argMap = process.argv.slice(2).reduce<Record<string, string | boolean>>((acc, arg) => {
    const [key, value] = arg.split("=");
    if (!key) return acc;
    acc[key.replace(/^--/, "")] = value ?? true;
    return acc;
  }, {});

  const apply = args.has("--apply") || process.env.INDEX_AUDIT_APPLY === "true";
  const failOnMissing =
    args.has("--fail-on-missing") || process.env.INDEX_AUDIT_FAIL_ON_MISSING === "true";

  const jsonPath =
    typeof argMap.json === "string"
      ? path.resolve(ROOT_DIR, argMap.json)
      : path.join(ARTIFACTS_DIR, "db-index-audit.json");

  const textPath =
    typeof argMap.text === "string"
      ? path.resolve(ROOT_DIR, argMap.text)
      : path.join(ARTIFACTS_DIR, "db-index-audit.txt");

  return { apply, failOnMissing, jsonPath, textPath };
}

async function importModelFiles() {
  const files = await fg(["server/models/**/*.ts", "server/models/**/*.js"], {
    cwd: ROOT_DIR,
    absolute: true,
    ignore: IGNORED_PATTERNS,
  });

  for (const file of files) {
    try {
      await import(pathToFileURL(file).href);
    } catch (error) {
      console.warn(
        `[index-audit] Failed to import ${file}:`,
        (error as Error)?.message || error,
      );
    }
  }
}

function serializeKey(key: Record<string, number>) {
  return Object.entries(key)
    .map(([k, v]) => `${k}:${v}`)
    .sort()
    .join("|");
}

function collectSchemaIndexes(model: Model<unknown>): SchemaIndex[] {
  return model.schema.indexes().map(([key, options]) => ({
    name: options?.name || serializeKey(key as Record<string, number>),
    key: key as Record<string, number>,
  }));
}

async function collectDbIndexes(model: Model<unknown>): Promise<SchemaIndex[]> {
  if (!MONGO_URI || mongoose.connection.readyState === 0) return [];
  const indexes = await model.collection.indexes();
  return indexes.map((idx) => ({ name: idx.name, key: idx.key as Record<string, number> }));
}

async function applyMissingIndexes(model: Model<unknown>, missing: SchemaIndex[]) {
  if (!missing.length) return;
  if (!MONGO_URI || mongoose.connection.readyState === 0) return;
  await model.createIndexes();
  const refreshed = await collectDbIndexes(model);
  const refreshedKeys = new Set(refreshed.map((idx) => serializeKey(idx.key)));
  const stillMissing = missing.filter((idx) => !refreshedKeys.has(serializeKey(idx.key)));
  if (stillMissing.length) {
    console.warn(
      `[index-audit] Attempted to create indexes for ${model.modelName}, but ${stillMissing.length} remain`,
    );
  }
}

async function main() {
  const flags = parseFlags();
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  console.log("[index-audit] Starting database index audit...");
  await importModelFiles();

  const modelEntries = Object.values(mongoose.models);
  console.log(`[index-audit] Loaded ${modelEntries.length} models`);

  let connectedToDb = false;
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      connectedToDb = true;
      console.log("[index-audit] Connected to MongoDB");
    } catch (error) {
      console.warn(
        "[index-audit] Unable to connect to MongoDB, skipping live index comparison:",
        (error as Error)?.message || error,
      );
    }
  } else {
    console.warn("[index-audit] MONGODB_URI/DATABASE_URL not set — running schema-only audit");
  }

  const report: Array<{
    model: string;
    schemaIndexes: SchemaIndex[];
    dbIndexes: SchemaIndex[];
    missing: SchemaIndex[];
  }> = [];

  for (const model of modelEntries) {
    const schemaIndexes = collectSchemaIndexes(model);
    let dbIndexes: SchemaIndex[] = [];
    try {
      dbIndexes = await collectDbIndexes(model);
    } catch (error) {
      console.warn(
        `[index-audit] Failed to fetch DB indexes for ${model.modelName}:`,
        (error as Error)?.message || error,
      );
    }

    const dbIndexKeys = new Set(dbIndexes.map((idx) => serializeKey(idx.key)));
    const missing = schemaIndexes.filter((idx) => !dbIndexKeys.has(serializeKey(idx.key)));

    if (flags.apply && missing.length && connectedToDb) {
      await applyMissingIndexes(model, missing);
    }

    report.push({ model: model.modelName, schemaIndexes, dbIndexes, missing });
  }

  const totalMissing = report.reduce((acc, entry) => acc + entry.missing.length, 0);
  const summary = {
    connectedToDb,
    totalModels: modelEntries.length,
    totalMissing,
    applyAttempted: flags.apply && connectedToDb,
  };

  console.log(`[index-audit] Completed. Missing indexes: ${totalMissing}`);

  const textLines = [
    `[index-audit] connectedToDb=${summary.connectedToDb}`,
    `[index-audit] totalModels=${summary.totalModels}`,
    `[index-audit] totalMissing=${summary.totalMissing}`,
    `[index-audit] applyAttempted=${summary.applyAttempted}`,
    "",
  ];

  for (const entry of report) {
    if (!entry.missing.length) continue;
    textLines.push(`[${entry.model}] Missing indexes (${entry.missing.length}):`);
    entry.missing.forEach((idx) =>
      textLines.push(`  - ${serializeKey(idx.key)} (name: ${idx.name})`),
    );
    textLines.push("");
  }

  fs.writeFileSync(flags.textPath, `${textLines.join("\n")}\n`, "utf8");
  fs.writeFileSync(
    flags.jsonPath,
    JSON.stringify(
      {
        summary,
        models: report.map((entry) => ({
          model: entry.model,
          schemaIndexes: entry.schemaIndexes,
          dbIndexes: entry.dbIndexes,
          missing: entry.missing,
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  if (flags.failOnMissing && totalMissing > 0) {
    console.error(
      `[index-audit] Missing indexes detected (${totalMissing}). See ${flags.textPath}`,
    );
    process.exitCode = 1;
  }

  await mongoose.connection.close().catch(() => {});
}

main().catch((error) => {
  console.error("[index-audit] Unexpected error:", error);
  process.exitCode = 1;
});
