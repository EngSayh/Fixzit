import fs from "fs";
import path from "path";

const ROOT = "./docs/requirements";
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p);
    } else if (p.endsWith(".md")) {
      files.push(p);
    }
  }
}

if (!fs.existsSync(ROOT)) {
  console.error(`Requirements directory not found at ${ROOT}`);
  process.exit(1);
}

walk(ROOT);

const index = files.map((p) => {
  const text = fs.readFileSync(p, "utf8");
  const body = text.replace(/^---[\s\S]*?---\n/g, "");
  return {
    path: p,
    size: text.length,
    headings: (body.match(/^#{1,6}\s.+$/gm) || []).slice(0, 50),
    preview: body.slice(0, 1000),
  };
});

fs.mkdirSync("./.index", { recursive: true });
fs.writeFileSync("./.index/requirements.index.json", JSON.stringify(index, null, 2));
console.log(`Indexed ${index.length} files`);
