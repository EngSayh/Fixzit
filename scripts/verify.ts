import { execSync } from "node:child_process";
import fs from "fs";
import pc from "picocolors";

type Gate = { name: string; cmd: string; optional?: boolean };

const gates: Gate[] = [
  { name: "TypeScript", cmd: "npm run typecheck" },
  { name: "ESLint", cmd: "npm run lint" },
  { name: "Build", cmd: "npm run build" },
  {
    name: "SSR check",
    cmd: `grep -R "\\b(window|document|localStorage)\\b" -n app | true`,
  },
];

function run(g: Gate) {
  try {
    console.log(pc.cyan(`\n▶ ${g.name}`));
    const out = execSync(g.cmd, { stdio: "pipe", encoding: "utf8" });
    fs.mkdirSync(".fixzit/artifacts", { recursive: true });
    fs.writeFileSync(
      `.fixzit/artifacts/${g.name.replace(/\s+/g, "_")}.log`,
      out,
    );
    if (g.name === "SSR check" && /:\d+:/m.test(out)) {
      throw new Error(
        "Direct window/document usage detected in app/* (hydrate risk)",
      );
    }
    console.log(pc.green(`✓ ${g.name} passed`));
  } catch (e: unknown) {
    console.log(pc.red(`✗ ${g.name} failed`));
    const error = e as { stdout?: string; message?: string };
    console.log(pc.gray(error?.stdout || error?.message || String(e)));
    process.exit(1);
  }
}

console.log(pc.bold("Fixzit Halt–Fix–Verify"));
for (const g of gates) run(g);
console.log(pc.bold(pc.green("\nAll core gates passed.")));
