import fs from "fs";
import path from "path";

const ROOT = "./docs/requirements";
const OUTPUT_DIR = "./.index";
const OUTPUT_FILE = `${OUTPUT_DIR}/requirements.index.json`;
const FRONT_MATTER_REGEX = /^---[\s\S]*?---\r?\n/;
const HEADING_REGEX = /^#{1,6}\s+.+$/gm;
const MAX_HEADINGS = 50;
const PREVIEW_LENGTH = 1_000;

const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(entryPath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isFile() && entryPath.endsWith(".md")) {
      files.push(entryPath);
    }
  }
}

if (!fs.existsSync(ROOT)) {
  console.error(`Requirements directory not found at ${ROOT}`);
  process.exit(1);
}

walk(ROOT);

files.sort((a, b) => a.localeCompare(b));

const index = files
  .map((p) => {
    try {
      const text = fs.readFileSync(p, "utf8");
      const body = text.replace(FRONT_MATTER_REGEX, "");
      return {
        path: p,
        size: text.length,
        headings: (body.match(HEADING_REGEX) || []).slice(0, MAX_HEADINGS),
        preview: body.slice(0, PREVIEW_LENGTH),
      };
    } catch (error) {
      console.error(`Error reading file ${p}: ${error.message}`);
      console.error(`Skipping file due to: ${error.code || "unknown error"}`);
      return null;
    }
  })
  .filter(Boolean);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
console.log(`Indexed ${index.length} files`);
