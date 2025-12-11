import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const MAX_ENTRY_KB = Number(process.env.BUNDLE_MAX_ENTRY_KB ?? 180);
const MAX_CHUNK_KB = Number(process.env.BUNDLE_MAX_CHUNK_KB ?? 70);
const statsPath =
  process.env.BUNDLE_STATS_PATH ||
  path.join(process.cwd(), ".next", "analyze", "stats.client.json");
const distRoot = path.join(process.cwd(), ".next");

const formatKb = (value) => `${value.toFixed(1)} KB`;

async function loadStats() {
  const raw = await fs.readFile(statsPath, "utf8");
  return JSON.parse(raw);
}

async function gzipSizeKb(filePath) {
  const content = await fs.readFile(filePath);
  return zlib.gzipSync(content).length / 1024;
}

async function main() {
  const stats = await loadStats().catch((err) => {
    console.error(
      `❌ Bundle budget check failed: could not read stats file at ${statsPath}`,
    );
    console.error(err);
    process.exit(1);
  });

  const oversizedEntries = [];
  const oversizedChunks = [];

  for (const asset of stats.assets || []) {
    const name = Array.isArray(asset.name) ? asset.name[0] : asset.name;
    if (!name || !name.endsWith(".js")) continue;

    const filePath = path.join(distRoot, name);
    let gzipKb;

    try {
      gzipKb = await gzipSizeKb(filePath);
    } catch (err) {
      console.warn(`⚠️  Skipping missing asset: ${name} (${err.message})`);
      continue;
    }

    const isEntry =
      Boolean(asset.entry) ||
      Boolean(asset.initial) ||
      Boolean(asset.isInitial) ||
      Boolean(asset.chunkNames?.includes("app")) ||
      Boolean(asset.chunkNames?.includes("main"));

    if (isEntry && gzipKb > MAX_ENTRY_KB) {
      oversizedEntries.push({ name, gzipKb });
    }

    if (gzipKb > MAX_CHUNK_KB) {
      oversizedChunks.push({ name, gzipKb });
    }
  }

  if (oversizedEntries.length === 0 && oversizedChunks.length === 0) {
    console.log(
      `✅ Bundle budgets OK (entry ≤ ${MAX_ENTRY_KB} KB, chunk ≤ ${MAX_CHUNK_KB} KB)`,
    );
    return;
  }

  console.error("❌ Bundle budget exceeded:");
  if (oversizedEntries.length > 0) {
    console.error("Entry chunks:");
    for (const asset of oversizedEntries) {
      console.error(`- ${asset.name}: ${formatKb(asset.gzipKb)}`);
    }
  }
  if (oversizedChunks.length > 0) {
    console.error("Other chunks:");
    for (const asset of oversizedChunks) {
      console.error(`- ${asset.name}: ${formatKb(asset.gzipKb)}`);
    }
  }
  process.exit(1);
}

main();
