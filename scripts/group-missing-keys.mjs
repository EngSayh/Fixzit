#!/usr/bin/env node
import fs from "fs";

const data = JSON.parse(fs.readFileSync("translation-audit.json", "utf8"));

// Group missing keys by module/prefix
const groups = {};
data.missing.used.forEach((item) => {
  const key = item.key;
  const prefix = key.includes(".") ? key.split(".")[0] : "misc";
  if (!groups[prefix]) {
    groups[prefix] = [];
  }
  groups[prefix].push(key);
});

// Sort and display
console.log("=== MISSING KEYS BY MODULE ===\n");
Object.keys(groups)
  .sort()
  .forEach((module) => {
    console.log(`${module}: ${groups[module].length} keys`);
    console.log(groups[module].map((k) => `  ${k}`).join("\n"));
    console.log();
  });

console.log(`\nTOTAL: ${data.missing.used.length} keys`);
