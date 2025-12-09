/**
 * tools/merge-memory.js
 *
 * Usage:
 *   node tools/merge-memory.js
 *
 * Merges all ai-memory/outputs/*.json into ai-memory/master-index.json
 * and deduplicates by (file, category).
 */

const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(process.cwd(), "ai-memory", "outputs");
const MASTER_PATH = path.join(process.cwd(), "ai-memory", "master-index.json");

if (!fs.existsSync(OUTPUT_DIR)) {
  console.log("📁 Creating ai-memory/outputs/ directory...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log("ℹ️  No JSON files to merge yet. Run smart-chunker + process batches first.");
  process.exit(0);
}

const files = fs
  .readdirSync(OUTPUT_DIR)
  .filter((f) => f.endsWith(".json"));

if (!files.length) {
  console.log("ℹ️  No JSON files found in ai-memory/outputs/");
  console.log("   Run smart-chunker, then process each batch with Copilot Inline Chat.");
  process.exit(0);
}

let master = [];

for (const f of files) {
  const full = path.join(OUTPUT_DIR, f);
  const raw = fs.readFileSync(full, "utf8").trim();

  if (!raw) continue;

  // Clean any markdown fences if Copilot added them
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const data = JSON.parse(cleaned);
    if (Array.isArray(data)) {
      master.push(...data);
      console.log(`✅ Loaded ${f} (${data.length} entries)`);
    } else {
      console.warn(`⚠️ ${f} did not contain a JSON array, skipping.`);
    }
  } catch (e) {
    console.error(`❌ Failed to parse ${f}:`, e.message);
  }
}

// Deduplicate by (file, category)
const seen = new Set();
master = master.filter((item) => {
  const key = `${item.file || ""}::${item.category || ""}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Sort by file path
master.sort((a, b) => (a.file || "").localeCompare(b.file || ""));

fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2), "utf8");
console.log(`\n🧠 Master index written to ${path.relative(process.cwd(), MASTER_PATH)} (${master.length} entries).`);
