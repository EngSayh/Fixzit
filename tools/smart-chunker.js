/**
 * tools/smart-chunker.js
 *
 * Usage:
 *   node tools/smart-chunker.js
 *
 * What it does:
 * 1. Scans the repo from CWD.
 * 2. Categorizes files (routes, models, components, utils, core).
 * 3. Chunks them into batches of ~150k characters (safe for Copilot context).
 * 4. For each batch, writes ai-memory/batches/<category>-batch-XXX.xml
 *    with an embedded prompt that tells Claude/Copilot what JSON to produce.
 */

const fs = require("fs");
const path = require("path");

// Approximate safe limit for one batch.
// ~150k chars ≈ ~35–45k tokens for code (depends on density).
// Leaves room for instructions + model's reply inside Copilot's context.
const BATCH_CHAR_LIMIT = 150_000;

const OUTPUT_DIR = path.join(process.cwd(), "ai-memory", "batches");

// Directories/files to ignore
const IGNORE = [
  ".git",
  "node_modules",
  "dist",
  ".next",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
  ".vscode",
  "ai-memory",        // avoid re-ingesting memory files
  ".DS_Store",
  ".artifacts",
  "playwright-report",
  "test-results",
  "_artifacts",
];

// Extensions to include
const INCLUDE = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".prisma",
  ".sql",
  ".py",
];

// Embedded prompt used for ALL batches in a category.
// We use XML-style tags so the model can clearly see structure.
const PROMPT_HEADER = (category) => `
You are the "Fixzit Memory Builder" for category: ${category}.

You are given a batch of source files from the Fixzit codebase, wrapped in <file> tags.
Each <file> has a "path" attribute with the repository-relative file path.

YOUR TASK:
1. Read ALL files in <batch_content>.
2. For EACH file, extract architectural metadata using this schema:

[
  {
    "file": "repo-relative/path/to/file.ext",
    "category": "${category}",
    "summary": "One-sentence technical summary of what this file does.",
    "exports": ["ExportedFunctionOrClassName", "..."],
    "dependencies": ["ImportedModuleOrPath", "..."]
  }
]

RULES:
- Return ONLY a valid JSON array, with NO markdown, NO backticks, NO comments.
- Include an entry for every file in this batch.
- If a file has no exports, use "exports": [].
- If a file has no imports, use "dependencies": [].

<batch_content>
`;

/**
 * Recursively walk the repo and collect candidate files.
 */
function getFiles(dir, collected = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (IGNORE.some((pattern) => fullPath.includes(pattern))) {
      continue;
    }

    if (entry.isDirectory()) {
      getFiles(fullPath, collected);
      continue;
    }

    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (INCLUDE.includes(ext)) {
        const size = fs.statSync(fullPath).size;
        collected.push({ path: fullPath, size });
      }
    }
  }

  return collected;
}

/**
 * Classify files into coarse categories.
 */
function getCategory(absPath) {
  const rel = path.relative(process.cwd(), absPath).replace(/\\/g, "/").toLowerCase();

  if (rel.includes("/api/") || rel.includes("/routes/") || rel.endsWith("/route.ts")) {
    return "routes";
  }
  if (
    rel.includes("/models/") ||
    rel.includes("model.") ||
    rel.includes("schema.") ||
    rel.includes("/db/")
  ) {
    return "models";
  }
  if (
    rel.includes("/components/") ||
    (rel.includes("/app/") && (rel.endsWith(".tsx") || rel.endsWith(".jsx"))) ||
    rel.includes("/ui/")
  ) {
    return "components";
  }
  if (rel.includes("/lib/") || rel.includes("/utils/") || rel.includes("/helpers/")) {
    return "utils";
  }
  return "core";
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save one batch file with embedded prompt + content.
 */
function saveBatch(category, index, body) {
  ensureDir(OUTPUT_DIR);
  const fileName = `${category}-batch-${String(index).padStart(3, "0")}.xml`;
  const finalContent = PROMPT_HEADER(category) + body + "\n</batch_content>\n";

  const outPath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(outPath, finalContent, "utf8");
  console.log(`📦 Created ${path.relative(process.cwd(), outPath)} (${body.length} chars)`);
}

function run() {
  console.log("🔎 Scanning repository for source files...");

  const allFiles = getFiles(process.cwd());
  console.log(`Found ${allFiles.length} candidate files.`);

  // Group by category
  const categories = {
    routes: [],
    models: [],
    components: [],
    utils: [],
    core: [],
  };

  for (const f of allFiles) {
    const cat = getCategory(f.path);
    categories[cat].push(f);
  }

  // Process each category into batches
  Object.entries(categories).forEach(([category, files]) => {
    if (!files.length) return;

    console.log(`\n📚 Category "${category}": ${files.length} files`);

    let currentBatchBody = "";
    let currentBatchSize = 0;
    let batchIndex = 1;

    for (const file of files) {
      const rel = path.relative(process.cwd(), file.path).replace(/\\/g, "/");
      const content = fs.readFileSync(file.path, "utf8");

      const entry = `\n<file path="${rel}">\n${content}\n</file>\n`;
      const entrySize = entry.length;

      // If adding this file would exceed our limit, flush current batch.
      if (
        currentBatchSize > 0 &&
        currentBatchSize + entrySize > BATCH_CHAR_LIMIT
      ) {
        saveBatch(category, batchIndex, currentBatchBody);
        batchIndex++;
        currentBatchBody = "";
        currentBatchSize = 0;
      }

      currentBatchBody += entry;
      currentBatchSize += entrySize;
    }

    if (currentBatchSize > 0) {
      saveBatch(category, batchIndex, currentBatchBody);
    }
  });

  console.log("\n✅ Smart batches created in ai-memory/batches/");
}

run();
