/**
 * tools/merge-memory.js
 *
 * Usage:
 *   node tools/merge-memory.js
 *
 * Merges all ai-memory/outputs/*.json into ai-memory/master-index.json:
 * - Extracts the JSON array between first '[' and last ']'
 * - Skips invalid/garbage outputs
 * - Deduplicates by (file, category)
 */

const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(process.cwd(), "ai-memory", "outputs");
const MASTER_PATH = path.join(process.cwd(), "ai-memory", "master-index.json");

if (!fs.existsSync(OUTPUT_DIR)) {
  console.error("❌ ai-memory/outputs/ does not exist. Run the Inline Chat loop first.");
  process.exit(1);
}

const files = fs
  .readdirSync(OUTPUT_DIR)
  .filter((f) => f.endsWith(".json"));

if (!files.length) {
  console.error("❌ No JSON files found in ai-memory/outputs/");
  process.exit(1);
}

let master = [];
const seen = new Set();

function validateItem(item) {
  if (!item || typeof item !== "object") return false;
  if (!item.file || typeof item.file !== "string") return false;
  if (!item.category || typeof item.category !== "string") return false;
  if (!Array.isArray(item.exports)) return false;
  if (!Array.isArray(item.dependencies)) return false;
  return true;
}

for (const f of files) {
  const full = path.join(OUTPUT_DIR, f);
  const raw = fs.readFileSync(full, "utf8").trim();

  if (!raw) continue;

  // Strip markdown fences if Copilot added them
  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Extract array between first '[' and last ']'
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  if (start === -1 || end === -1) {
    console.warn(`⚠️ No JSON array found in ${f}, skipping.`);
    continue;
  }

  cleaned = cleaned.substring(start, end + 1);

  try {
    const data = JSON.parse(cleaned);
    if (!Array.isArray(data)) {
      console.warn(`⚠️ ${f} did not contain a JSON array, skipping.`);
      continue;
    }

    let validCount = 0;

    for (const item of data) {
      if (!validateItem(item)) {
        continue;
      }
      const key = `${item.file}::${item.category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      master.push(item);
      validCount++;
    }

    console.log(`✅ Loaded ${f}: ${validCount} valid entries.`);
  } catch (e) {
    console.error(`❌ Failed to parse ${f}: ${e.message}`);
  }
}

// Sort by file path
master.sort((a, b) => (a.file || "").localeCompare(b.file || ""));

fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2), "utf8");
console.log(`\n🧠 Master index written to ${path.relative(process.cwd(), MASTER_PATH)} (${master.length} entries).`);
