import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ARTIFACT_DIR = ".artifacts";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const BIN_DIR = path.join("node_modules", ".bin");
const PLATFORM_EXTS =
  process.platform === "win32" ? [".cmd", ".ps1", ".exe", ""] : ["", ".cmd"];
const hasBin = (bin) =>
  PLATFORM_EXTS.some((ext) =>
    fs.existsSync(path.join(BIN_DIR, `${bin}${ext}`)),
  );

const commands = [
  {
    id: "playwright",
    bin: "playwright",
    args: ["test", "--reporter=junit,line"],
    junitCandidates: [
      path.join("test-results", "results.xml"),
      path.join("playwright-report", "results.xml"),
    ],
  },
  {
    id: "vitest",
    bin: "vitest",
    args: ["run", "--passWithNoTests"],
    junitCandidates: [path.join(".artifacts", "vitest-junit.xml")],
  },
  {
    id: "jest",
    bin: "jest",
    args: ["--ci", "--passWithNoTests"],
    junitCandidates: ["junit.xml", path.join("reports", "junit.xml")],
  },
];

let exitCode = 0;

for (const command of commands) {
  if (!hasBin(command.bin)) {
    console.log(`[tests] Skipping ${command.id}; executable not found.`);
    continue;
  }

  console.log(`[tests] Running ${command.id}…`);
  const result = spawnSync(command.bin, command.args, { stdio: "inherit" });
  if ((result.status && result.status !== 0) || result.signal) {
    exitCode = result.status || 1;
    if (result.signal) {
      console.error(
        `[tests] ${command.id} failed with signal ${result.signal}.`,
      );
    } else {
      console.error(
        `[tests] ${command.id} failed with exit code ${result.status}.`,
      );
    }
  }

  const junitSource = command.junitCandidates.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (junitSource) {
    const target = path.join(ARTIFACT_DIR, `junit-${command.id}.xml`);
    fs.copyFileSync(junitSource, target);
    const primary = path.join(ARTIFACT_DIR, "junit.xml");
    if (!fs.existsSync(primary)) {
      fs.copyFileSync(junitSource, primary);
    }
  }
}

process.exit(exitCode);
