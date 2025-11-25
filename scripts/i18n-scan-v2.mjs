#!/usr/bin/env node
/**
 * i18n parity & usage scan — merges locales + TranslationContext
 *
 * Enhanced to extract keys from:
 * - locales/en/*.json and locales/ar/*.json
 * - contexts/TranslationContext.tsx (en and ar objects)
 *
 * This provides accurate count matching the inline dictionary approach.
 */
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { globby } from "globby";

const ROOT = process.cwd();
const REPORT = path.join(ROOT, "reports", "i18n-missing-v2.json");
const IGNORE_KEYS = new Set([
  "a",
  "bool",
  "hello",
  "missing.key",
  "msg",
  "nested.deep.value",
  "num",
  "obj",
  "watch-all",
  "welcome",
]);

// Load waivers if present
let WAIVE = {};
try {
  WAIVE = JSON.parse(
    fs.readFileSync(path.join(ROOT, ".fixzit-waivers.json"), "utf8"),
  );
} catch {}

function ensureDir(p) {
  fs.existsSync(p) || fs.mkdirSync(p, { recursive: true });
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

async function readLocaleDir(dir) {
  if (!fs.existsSync(dir)) return {};
  const files = await globby(["*.json"], { cwd: dir });
  const out = {};
  for (const f of files) {
    try {
      const json = JSON.parse(await fsp.readFile(path.join(dir, f), "utf8"));
      Object.assign(out, flatten(json));
    } catch {}
  }
  return out;
}

function extractFromTranslationContext(filePath) {
  try {
    const txt = fs.readFileSync(filePath, "utf8");
    // Match `en: { ... }, ar: { ... }` blocks and extract 'key': or "key":
    const blocks = {};
    const enBlock = txt.match(/en\s*:\s*\{([\s\S]*?)\}\s*,/);
    const arBlock = txt.match(/ar\s*:\s*\{([\s\S]*?)\}\s*,/);

    for (const [lang, block] of [
      ["en", enBlock],
      ["ar", arBlock],
    ]) {
      const keys = new Set();
      if (block && block[1]) {
        const rx = /['"`]([A-Za-z0-9_.-]+)['"`]\s*:/g;
        let m;
        while ((m = rx.exec(block[1]))) {
          keys.add(m[1]);
        }
      }
      blocks[lang] = [...keys].reduce((acc, k) => {
        acc[k] = "";
        return acc;
      }, {});
    }
    return blocks;
  } catch {
    return { en: {}, ar: {} };
  }
}

function extractFromGeneratedTranslations(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const txt = fs.readFileSync(filePath, "utf8");
  const keyRegex = /'([^']+)'\s*:\s*'[^']*'/g;
  const keys = new Set();
  let match;
  while ((match = keyRegex.exec(txt))) {
    keys.add(match[1]);
  }
  return [...keys].reduce((acc, key) => {
    acc[key] = "";
    return acc;
  }, {});
}

async function extractUsedKeys() {
  const files = await globby(["**/*.{ts,tsx,js,jsx}"], {
    ignore: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.git/**",
      "**/.turbo/**",
      "**/.vercel/**",
      "**/*.test.*",
      "**/*.spec.*",
      "tests/**",
    ],
  });

  const keys = new Set();
  const rx =
    /(?:^|[^A-Za-z0-9_])(i18n\.)?t\(\s*['"`]([A-Za-z0-9_.-]+)['"`]\s*[),]/g;

  for (const f of files) {
    const text = await fsp.readFile(f, "utf8").catch(() => "");
    if (!text) continue;

    let m;
    while ((m = rx.exec(text))) {
      keys.add(m[2]);
    }
  }

  return [...keys].sort();
}

void (async function main() {
  ensureDir(path.dirname(REPORT));

  // Read locale JSON files
  const enLoc = await readLocaleDir(path.join(ROOT, "i18n"));
  const arLoc = await readLocaleDir(path.join(ROOT, "i18n"));

  // Merge TranslationContext (if configured)
  const ctxPath = WAIVE?.i18n?.merge_translation_context
    ? path.join(ROOT, WAIVE.i18n.merge_translation_context)
    : null;

  let ctxEn = {},
    ctxAr = {};
  if (ctxPath && fs.existsSync(ctxPath)) {
    const ctx = extractFromTranslationContext(ctxPath);
    ctxEn = ctx.en;
    ctxAr = ctx.ar;
    console.log(
      `✅ Extracted ${Object.keys(ctxEn).length} EN keys from TranslationContext`,
    );
    console.log(
      `✅ Extracted ${Object.keys(ctxAr).length} AR keys from TranslationContext`,
    );
  }

  // Merge locale files + TranslationContext
  const generated = extractFromGeneratedTranslations(
    path.join(ROOT, "i18n", "new-translations.ts"),
  );

  const en = { ...enLoc, ...ctxEn, ...generated };
  const ar = { ...arLoc, ...ctxAr, ...generated };

  const used = await extractUsedKeys();
  const enKeys = new Set(Object.keys(en));
  const arKeys = new Set(Object.keys(ar));

  const enOnly = [...enKeys].filter((k) => !arKeys.has(k)).sort();
  const arOnly = [...arKeys].filter((k) => !enKeys.has(k)).sort();
  const usedButMissing = used.filter(
    (k) => !IGNORE_KEYS.has(k) && (!enKeys.has(k) || !arKeys.has(k)),
  );

  const out = {
    timestamp: new Date().toISOString(),
    sources: {
      localeFiles: {
        en: Object.keys(enLoc).length,
        ar: Object.keys(arLoc).length,
      },
      translationContext: {
        en: Object.keys(ctxEn).length,
        ar: Object.keys(ctxAr).length,
      },
      merged: { en: enKeys.size, ar: arKeys.size },
    },
    parity: {
      enCount: enKeys.size,
      arCount: arKeys.size,
      gap: Math.abs(enKeys.size - arKeys.size),
      status: enKeys.size === arKeys.size ? "PERFECT" : "MISMATCH",
    },
    gaps: {
      enOnly: enOnly.length > 0 ? enOnly : [],
      arOnly: arOnly.length > 0 ? arOnly : [],
    },
    usage: {
      keysUsedInCode: used.length,
      usedButMissing: usedButMissing.length > 0 ? usedButMissing : [],
    },
  };

  await fsp.writeFile(REPORT, JSON.stringify(out, null, 2), "utf8");

  console.log(`\n📊 i18n Analysis:`);
  console.log(
    `   EN keys: ${enKeys.size} (${Object.keys(enLoc).length} locale + ${Object.keys(ctxEn).length} context)`,
  );
  console.log(
    `   AR keys: ${arKeys.size} (${Object.keys(arLoc).length} locale + ${Object.keys(ctxAr).length} context)`,
  );
  console.log(`   Parity: ${out.parity.status} (gap: ${out.parity.gap})`);
  console.log(`   Used in code: ${used.length}`);
  console.log(`   Missing: ${usedButMissing.length}`);
  console.log(`\n✅ Report → ${REPORT}`);
})();
