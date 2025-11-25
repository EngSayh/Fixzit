// node scripts/fix-model-exports.mjs
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["models", "server", "modules", "lib"];
const RXPS = [
  {
    re: /\(typeof models !== 'undefined' && models\.([A-Za-z0-9_]+)\)\s*\|\|\s*model<([^>]+)>\('([A-Za-z0-9_]+)'\s*,\s*([A-Za-z0-9_]+)\)/g,
    repl: (_, _x, T, Name, Schema) =>
      `getModel<${T}>('${Name}', ${Schema}) as MModel<${T}>`,
  },
  {
    re: /models\.([A-Za-z0-9_]+)\s*\|\|\s*model<([^>]+)>\('([A-Za-z0-9_]+)'\s*,\s*([A-Za-z0-9_]+)\)/g,
    repl: (_, _x, T, Name, Schema) =>
      `getModel<${T}>('${Name}', ${Schema}) as MModel<${T}>`,
  },
  {
    re: /models\.([A-Za-z0-9_]+)\s*\|\|\s*model\("([A-Za-z0-9_]+)"\s*,\s*([A-Za-z0-9_]+)\)/g,
    repl: (_, _x, Name, Schema) =>
      `getModel<any>("${Name}", ${Schema}) as MModel<any>`,
  },
  {
    re: /models\.([A-Za-z0-9_]+)\s*\|\|\s*model\('([A-Za-z0-9_]+)'\s*,\s*([A-Za-z0-9_]+)\)/g,
    repl: (_, _x, Name, Schema) =>
      `getModel<any>('${Name}', ${Schema}) as MModel<any>`,
  },
  {
    re: /\(mongoose\.models\.([A-Za-z0-9_]+)\s*\|\|\s*mongoose\.model<([^>]+)>\('([A-Za-z0-9_]+)'\s*,\s*([A-Za-z0-9_]+)\)\)/g,
    repl: (_, _x, T, Name, Schema) =>
      `getModel<${T}>('${Name}', ${Schema}) as MModel<${T}>`,
  },
];

function ensureImportTop(content) {
  if (!content.includes("getModel<")) return content;
  if (content.includes("@/src/types/mongoose-compat")) return content;
  return (
    `import { getModel, MModel, CommonModelStatics } from '@/src/types/mongoose-compat';\n` +
    content
  );
}

function fixFile(file) {
  let text = fs.readFileSync(file, "utf8");
  let changed = false;

  RXPS.forEach(({ re, repl }) => {
    const next = text.replace(re, repl);
    if (next !== text) {
      text = next;
      changed = true;
    }
  });

  if (changed) {
    // normalize old paths
    text = text.replace(
      /@\/types\/mongoose-compat/g,
      "@/src/types/mongoose-compat",
    );
    // prepend import cleanly
    text = ensureImportTop(text);
    fs.writeFileSync(file, text, "utf8");
    console.log("✓ Fixed", file);
  }
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      walk(fp);
      continue;
    }
    if (
      fp.endsWith(".ts") &&
      !fp.includes("/node_modules/") &&
      !fp.includes("/.next/") &&
      !fp.includes("/.archive/")
    ) {
      fixFile(fp);
    }
  }
}

for (const r of ROOTS) if (fs.existsSync(r)) walk(r);
