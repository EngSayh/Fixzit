#!/usr/bin/env tsx
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { glob } from "glob";

const DRY = process.argv.includes("--dry");
const VERBOSE = process.argv.includes("--verbose");

interface FileInfo {
  path: string;
  hash: string;
  size: number;
}

interface DuplicateGroup {
  hash: string;
  files: string[];
  size: number;
  pattern?: string;
}

function normalizeContent(content: string): string {
  return content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function scanDuplicates(): Promise<Map<string, DuplicateGroup>> {
  const patterns = [
    "app/**/*.{tsx,ts,jsx,js}",
    "components/**/*.{tsx,ts,jsx,js}",
    "styles/**/*.{css,scss}"
  ];
  
  const files = await glob(patterns, { ignore: ["node_modules/**", ".next/**", "dist/**"] });
  const hashMap = new Map<string, string[]>();
  const sizeMap = new Map<string, number>();
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const normalized = normalizeContent(content);
      const hash = hashContent(normalized);
      
      if (!hashMap.has(hash)) {
        hashMap.set(hash, []);
        sizeMap.set(hash, content.length);
      }
      hashMap.get(hash)!.push(file);
    } catch (err) {
      if (VERBOSE) console.error(`Error: ${file}`, err);
    }
  }
  
  const duplicates = new Map<string, DuplicateGroup>();
  for (const [hash, filePaths] of hashMap.entries()) {
    if (filePaths.length > 1) {
      duplicates.set(hash, {
        hash,
        files: filePaths,
        size: sizeMap.get(hash)!
      });
    }
  }
  
  return duplicates;
}

async function main() {
  console.log(DRY ? "🔍 DRY RUN\\n" : "🔧 APPLYING\\n");
  
  const duplicates = await scanDuplicates();
  
  if (duplicates.size === 0) {
    console.log("✅ No duplicates found!");
    return;
  }
  
  console.log(`📊 Found ${duplicates.size} duplicate groups\\n`);
  
  let total = 0;
  let wasted = 0;
  
  for (const group of duplicates.values()) {
    total += group.files.length - 1;
    wasted += group.size * (group.files.length - 1);
    
    console.log(`Hash: ${group.hash.substring(0, 8)}...`);
    console.log(`Size: ${group.size} bytes`);
    console.log(`Files (${group.files.length}):`);
    for (const file of group.files) {
      console.log(`  - ${file}`);
    }
    console.log("");
  }
  
  console.log(`Summary:`);
  console.log(`  Duplicate groups: ${duplicates.size}`);
  console.log(`  Duplicate files: ${total}`);
  console.log(`  Wasted space: ${(wasted / 1024).toFixed(2)} KB`);
}

main().catch(console.error);