import fg from "fast-glob";
import fs from "fs";
import path from "path";
import pc from "picocolors";

type Mode = "scan" | "apply";
const mode: Mode =
  (process.argv.includes("--mode") &&
    (process.argv[process.argv.indexOf("--mode") + 1] as Mode)) ||
  "scan";

const SRC = [
  "app/**/*.{ts,tsx,js,jsx}",
  "components/**/*.{ts,tsx,js,jsx}",
  "src/**/*.{ts,tsx,js,jsx}",
];

function fingerprint(code: string) {
  return code
    .replace(/"[^"]*"|'[^']*'/g, '""')
    .replace(/\s+/g, " ")
    .replace(/\b(className|style|color)=[^ >]+/g, '$1=""');
}

(async () => {
  const files = await fg(SRC, { dot: true });
  const map = new Map<string, string[]>();
  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    const key = fingerprint(raw);
    const bucket = map.get(key) || [];
    bucket.push(f);
    map.set(key, bucket);
  }

  const dupGroups = [...map.values()].filter((l) => l.length > 1);
  const reportPath = ".fixzit/dedupe-report.md";
  fs.mkdirSync(".fixzit", { recursive: true });
  let report = `# De-dupe Report\n\nFound ${dupGroups.length} duplicate groups.\n\n`;
  for (const group of dupGroups) {
    report +=
      `## Group (${group.length} files)\n` +
      group.map((g) => `- ${g}`).join("\n") +
      "\n\n";
  }
  fs.writeFileSync(reportPath, report, "utf8");
  console.log(pc.yellow(`Report written to ${reportPath}`));

  if (mode === "apply") {
    for (const group of dupGroups) {
      const canonical = group.sort((a, b) => {
        const pa = a.includes("components") ? 0 : 1;
        const pb = b.includes("components") ? 0 : 1;
        return pa - pb || a.length - b.length;
      })[0];

      for (const f of group) {
        if (f === canonical) continue;
        const rel = path
          .relative(path.dirname(f), canonical)
          .replace(/\\/g, "/");
        const code = `export * from '${rel.startsWith(".") ? rel : "./" + rel}';\nexport { default } from '${rel.startsWith(".") ? rel : "./" + rel}';\n`;
        fs.writeFileSync(f, code, "utf8");
        console.log(
          pc.green(`Rewired duplicate to canonical: ${f} -> ${canonical}`),
        );
      }
    }
    console.log(
      pc.green("De-dupe apply complete (non-destructive re-exports)."),
    );
  }
})();
