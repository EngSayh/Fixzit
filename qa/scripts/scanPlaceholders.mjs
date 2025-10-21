#!/usr/bin/env node
/**
 * Placeholder scan - detects CHANGEME, TODO, FIXME, XXX, and similar markers
 * 
 * Usage: node qa/scripts/scanPlaceholders.mjs
 * Exit codes: 0 = clean, 1 = placeholders found
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const PLACEHOLDER_PATTERNS = [
  /CHANGEME/gi,
  /TODO:/gi,
  /FIXME:/gi,
  /XXX:/gi,
  /HACK:/gi,
  /\[PLACEHOLDER\]/gi,
];

const IGNORED_DIRS = ['node_modules', '.next', 'dist', 'build', '.git', 'coverage'];
const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.env.example'];

let totalIssues = 0;

function scanDirectory(dir) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(entry)) {
        scanDirectory(fullPath);
      }
    } else if (stat.isFile()) {
      const ext = extname(entry);
      if (SCANNED_EXTENSIONS.includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    PLACEHOLDER_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        console.log(`${filePath}:${index + 1} - ${line.trim()}`);
        totalIssues++;
      }
    });
  });
}

// Start scan from workspace root
scanDirectory(process.cwd());

if (totalIssues > 0) {
  console.error(`\n❌ Found ${totalIssues} placeholder(s). Please address before deployment.`);
  process.exit(1);
} else {
  console.log('✔ Placeholder scan complete - no issues detected');
  process.exit(0);
}
