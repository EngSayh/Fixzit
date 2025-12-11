import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const ARTIFACT_PATH = path.join(ROOT, "_artifacts", "ts-prune.txt");
const BASELINE_PATH = path.join(ROOT, "reports", "deadcode-baseline.txt");

const IGNORE_PATTERNS = [
  /^app\//,
  /^pages\//,
  /^middleware\.ts/,
  /^next\.config\.js/,
  /^auth\.config\.ts/,
  /^instrumentation/,
  /^playwright\.config/,
  /^vitest\.config/,
  /^tests\//,
  /^docs\//,
];

const IGNORE_CONTAINS = ["(used in module)"];

function runTsPrune() {
  const result = spawnSync(
    "pnpm",
    ["exec", "ts-prune", "--project", "tsconfig.json", "--skipIndexFiles"],
    { cwd: ROOT, encoding: "utf8" },
  );

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.error) {
    throw result.error;
  }

  return output;
}

function filterFindings(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !IGNORE_CONTAINS.some((fragment) => line.includes(fragment)))
    .filter((line) => !IGNORE_PATTERNS.some((pattern) => pattern.test(line)))
    .sort();
}

function readBaseline(): Set<string> {
  if (!fs.existsSync(BASELINE_PATH)) {
    return new Set<string>();
  }

  const content = fs.readFileSync(BASELINE_PATH, "utf8");
  return new Set(
    content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

function writeBaseline(lines: string[]) {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, `${lines.join("\n")}\n`, "utf8");
}

function writeArtifact(summary: string[], findings: string[]) {
  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${summary.join("\n")}\n${findings.join("\n")}\n`, "utf8");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const writeBaselineRequested = args.has("--write-baseline");

  const rawOutput = runTsPrune();
  const filteredFindings = filterFindings(rawOutput);

  let baseline = readBaseline();

  if (writeBaselineRequested || baseline.size === 0) {
    writeBaseline(filteredFindings);
    baseline = readBaseline();
    // eslint-disable-next-line no-console
    console.log(
      `[deadcode] Baseline ${baseline.size === 0 ? "initialized" : "updated"} at ${BASELINE_PATH}`,
    );
  }

  const findingsSet = new Set(filteredFindings);
  const newFindings = filteredFindings.filter((line) => !baseline.has(line));
  const resolvedFindings = [...baseline].filter((line) => !findingsSet.has(line));

  const summary = [
    `Dead code findings (filtered): ${filteredFindings.length}`,
    `New findings vs baseline: ${newFindings.length}`,
    `Resolved since baseline: ${resolvedFindings.length}`,
    "",
  ];

  writeArtifact(summary, filteredFindings);

  if (newFindings.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[deadcode] New unused exports detected (${newFindings.length}). See _artifacts/ts-prune.txt`,
    );
    newFindings.slice(0, 10).forEach((line) => {
      // eslint-disable-next-line no-console
      console.error(` - ${line}`);
    });
    process.exitCode = 1;
    return;
  }

  // eslint-disable-next-line no-console
  console.log("[deadcode] No new dead code beyond baseline.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[deadcode] Failed to run ts-prune:", error);
  process.exitCode = 1;
});
