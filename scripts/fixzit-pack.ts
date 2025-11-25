import fg from "fast-glob";
import fs from "fs";
import path from "path";
// @ts-ignore - No type declarations available
import yaml from "js-yaml";
import pc from "picocolors";

type Cfg = {
  version: number;
  defaultMaxChars: number;
  collapseLargeFilesOver: number;
  stripComments: boolean;
  tasks: Record<
    string,
    {
      description: string;
      files: string[];
      includeReadme?: string[];
      acceptance?: string[];
    }
  >;
};

const args = process.argv.slice(2);
const taskName = args[1] && args[0] === "--task" ? args[1] : null;
const cfg = yaml.load(fs.readFileSync("fixzit.pack.yaml", "utf8")) as Cfg;
const outRoot = path.join(".fixzit", "packs");
fs.mkdirSync(outRoot, { recursive: true });

function stripComments(code: string, ext: string) {
  if (!cfg.stripComments) return code;
  if (/\.(ts|tsx|js|jsx)$/.test(ext)) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s+)\/\/.*$/gm, "");
  }
  if (/\.css$/.test(ext)) {
    return code.replace(/\/\*[\s\S]*?\*\//g, "");
  }
  return code;
}

function collapse(code: string, limit: number) {
  if (code.length <= limit) return code;
  const head = code.slice(0, limit / 2);
  const tail = code.slice(-limit / 2);
  return `${head}\n\n/* --- SNIPPED FOR CONTEXT BUDGET --- */\n\n${tail}`;
}

function approxTokenCount(chars: number) {
  return Math.round(chars / 4);
}

async function build(task: string) {
  const t = cfg.tasks[task];
  if (!t) throw new Error(`Task not found: ${task}`);
  const outDir = path.join(outRoot, task);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const patterns = t.files;
  const files = await fg(patterns, { dot: true });
  let totalChars = 0;

  const manifest: string[] = [];
  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    const ext = path.extname(f);
    const clean = collapse(stripComments(raw, ext), cfg.collapseLargeFilesOver);
    totalChars += clean.length;
    const target = path.join(outDir, "files", f);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, clean, "utf8");
    manifest.push(f);
  }

  const ACCEPT =
    (t.acceptance ?? []).map((s) => `- ${s}`).join("\n") || "- (none)";
  const readmes =
    (t.includeReadme ?? []).map((p) => `- ${p}`).join("\n") || "- (none)";
  const summary = `# Review Pack: ${task}
Description: ${t.description}

## Files (${manifest.length})
${manifest.map((m) => `- ${m}`).join("\n")}

## Acceptance
${ACCEPT}

## Included Readme
${readmes}

Approx Tokens: ~${approxTokenCount(totalChars)}
`;
  fs.writeFileSync(path.join(outDir, "MANIFEST.md"), summary, "utf8");
  console.log(
    pc.green(
      `Built pack "${task}": ~${approxTokenCount(totalChars)} tokens, ${manifest.length} files.`,
    ),
  );
}

(async () => {
  if (taskName) await build(taskName);
  else {
    for (const name of Object.keys(cfg.tasks)) await build(name);
  }
})();
