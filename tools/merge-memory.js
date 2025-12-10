#!/usr/bin/env node
/**
 * tools/merge-memory.js
 *
 * Usage:
 *   node tools/merge-memory.js [--outputs <dir>] [--master <file>] [--dry-run] [--allow-empty]
 *
 * Merges all ai-memory/outputs/*.json into ai-memory/master-index.json:
 * - Extracts the JSON array between first '[' and last ']'
 * - Skips invalid/garbage outputs
 * - Deduplicates by (file, category)
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "ai-memory", "outputs");
const DEFAULT_MASTER_PATH = path.join(process.cwd(), "ai-memory", "master-index.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    outputs: DEFAULT_OUTPUT_DIR,
    master: DEFAULT_MASTER_PATH,
    dryRun: false,
    allowEmpty: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--outputs":
        options.outputs = path.resolve(args[++i]);
        break;
      case "--master":
        options.master = path.resolve(args[++i]);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--allow-empty":
        options.allowEmpty = true;
        break;
      default:
        break;
    }
  }
  return options;
}

function validateItem(item) {
  if (!item || typeof item !== "object") return false;
  if (!item.file || typeof item.file !== "string") return false;
  if (!item.category || typeof item.category !== "string") return false;
  if (item.summary !== undefined && typeof item.summary !== "string") return false;
  if (!Array.isArray(item.exports)) return false;
  if (!Array.isArray(item.dependencies)) return false;
  return true;
}

function cleanAndExtract(raw) {
  const stripped = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start === -1 || end === -1) return null;
  return stripped.substring(start, end + 1);
}

function loadFiles(outputDir) {
  if (!fs.existsSync(outputDir)) {
    throw new Error(`${outputDir} does not exist. Run the Inline Chat loop first.`);
  }
  return fs.readdirSync(outputDir).filter((f) => f.endsWith(".json"));
}

function merge() {
  const options = parseArgs();
  const files = loadFiles(options.outputs);

  if (!files.length) {
    const msg = "No JSON files found in ai-memory/outputs/";
    if (options.allowEmpty) {
      console.warn(msg);
      if (!options.dryRun) {
        fs.writeFileSync(options.master, JSON.stringify([], null, 2), "utf8");
        console.log(`Master index written (empty) to ${path.relative(process.cwd(), options.master)}`);
      } else {
        console.log("Dry run: would write empty master index.");
      }
      return;
    }
    throw new Error(msg);
  }

  let master = [];
  const seen = new Set();

  let totalItems = 0;
  let validItems = 0;
  let skippedFiles = 0;
  let erroredFiles = 0;

  for (const f of files) {
    const full = path.join(options.outputs, f);
    const raw = fs.readFileSync(full, "utf8").trim();

    if (!raw) {
      skippedFiles++;
      continue;
    }

    const cleaned = cleanAndExtract(raw);
    if (!cleaned) {
      console.warn(`No JSON array found in ${f}, skipping.`);
      skippedFiles++;
      continue;
    }

    try {
      const data = JSON.parse(cleaned);
      if (!Array.isArray(data)) {
        console.warn(`${f} did not contain a JSON array, skipping.`);
        skippedFiles++;
        continue;
      }

      let fileValidCount = 0;

      for (const item of data) {
        totalItems++;
        if (!validateItem(item)) {
          continue;
        }
        const key = `${item.file}::${item.category}`;
        if (seen.has(key)) continue;
        seen.add(key);
        master.push(item);
        validItems++;
        fileValidCount++;
      }

      console.log(`Loaded ${f}: ${fileValidCount} valid entries.`);
    } catch (e) {
      console.error(`Failed to parse ${f}: ${e.message}`);
      erroredFiles++;
    }
  }

  master.sort((a, b) => (a.file || "").localeCompare(b.file || ""));

  if (options.dryRun) {
    console.log("\nDry run summary (no file written):");
    console.log(`- Files processed: ${files.length}`);
    console.log(`- Valid entries: ${validItems}`);
    console.log(`- Total items seen: ${totalItems}`);
    console.log(`- Skipped files: ${skippedFiles}`);
    console.log(`- Error files: ${erroredFiles}`);
    return;
  }

  fs.mkdirSync(path.dirname(options.master), { recursive: true });
  fs.writeFileSync(options.master, JSON.stringify(master, null, 2), "utf8");
  console.log("\nSummary:");
  console.log(`- Files processed: ${files.length}`);
  console.log(`- Valid entries: ${validItems}`);
  console.log(`- Total items seen: ${totalItems}`);
  console.log(`- Skipped files: ${skippedFiles}`);
  console.log(`- Error files: ${erroredFiles}`);
  console.log(`\nMaster index written to ${path.relative(process.cwd(), options.master)} (${master.length} entries).`);
}

try {
  merge();
} catch (err) {
  console.error(`merge-memory failed: ${err.message}`);
  process.exit(1);
}
