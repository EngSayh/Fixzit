/**
 * Lightweight guard: flags `findById` usages in services/souq without an accompanying orgId check.
 * This is advisory and not wired into CI to avoid false positives; run manually when touching Souq services.
 */
import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), "services", "souq");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile() && full.endsWith(".ts")) {
      acc.push(full);
    }
  }
  return acc;
}

const files = fs.existsSync(root) ? walk(root) : [];
const offenders: Array<{ file: string; line: number; snippet: string }> = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8").split("\n");
  content.forEach((line, idx) => {
    if (line.includes("findById(") && !line.includes("orgId")) {
      offenders.push({
        file,
        line: idx + 1,
        snippet: line.trim(),
      });
    }
  });
}

if (offenders.length) {
  console.warn("Potential missing orgId scoping on findById in services/souq:");
  for (const off of offenders) {
    console.warn(` - ${off.file}:${off.line} :: ${off.snippet}`);
  }
  process.exitCode = 1;
} else {
  console.log("No findById usages without orgId hint found in services/souq.");
}
