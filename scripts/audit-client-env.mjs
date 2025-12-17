#!/usr/bin/env node
/**
 * @fileoverview Audit client components for unsafe process.env usage
 * 
 * Identifies client components ('use client') that access process.env without
 * the NEXT_PUBLIC_ prefix, which could lead to:
 * - Undefined values at runtime (secret env vars not exposed to browser)
 * - SSR/hydration mismatches
 * - Potential security issues if secrets are accidentally exposed
 * 
 * @usage node scripts/audit-client-env.mjs
 * @output JSON report with problematic env var accesses
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SEARCH_DIRS = ['app', 'components'];
const SAFE_ENV_VARS = new Set(['NODE_ENV']);
const SAFE_ENV_PREFIXES = ['NEXT_PUBLIC_'];

function getAllFiles(dir, fileList = []) {
  try {
    const files = readdirSync(dir);
    files.forEach(file => {
      const filePath = join(dir, file);
      if (statSync(filePath).isDirectory()) {
        getAllFiles(filePath, fileList);
      } else if (/\.(tsx|ts|jsx|js)$/.test(file) && !file.includes('.test.')) {
        fileList.push(filePath);
      }
    });
  } catch (_error) {
    // Skip if directory doesn't exist
  }
  return fileList;
}

function isClientComponent(content) {
  // Check for 'use client' directive (must be at the top, before imports)
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line === "'use client';" || line === '"use client";') {
      return true;
    }
    // Stop if we hit an import (directive must come before imports)
    if (line.startsWith('import ') || line.startsWith('export ')) {
      break;
    }
  }
  return false;
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const isClient = isClientComponent(content);
  const lines = content.split('\n');
  const issues = [];

  // Only analyze client components or files in components/ directory
  const isInComponentsDir = filePath.includes('/components/');
  if (!isClient && !isInComponentsDir) {
    return issues; // Skip server components
  }

  lines.forEach((line, index) => {
    // Match process.env.VARIABLE_NAME
    const matches = line.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
    for (const match of matches) {
      const varName = match[1];
      
      // Skip safe vars
      const isSafeExact = SAFE_ENV_VARS.has(varName);
      const isSafePrefix = SAFE_ENV_PREFIXES.some(prefix => varName.startsWith(prefix));
      if (isSafeExact || isSafePrefix) {
        continue;
      }

      issues.push({
        file: relative(process.cwd(), filePath),
        line: index + 1,
        varName,
        code: line.trim(),
        isClientComponent: isClient,
        severity: isClient ? 'HIGH' : 'MEDIUM',
      });
    }
  });

  return issues;
}

function main() {
  console.log('[audit] Scanning for unsafe process.env usage in client code...\n');
  
  const allFiles = [];
  SEARCH_DIRS.forEach(dir => {
    getAllFiles(dir, allFiles);
  });

  const allIssues = [];
  allFiles.forEach(file => {
    const issues = analyzeFile(file);
    if (issues.length > 0) {
      allIssues.push(...issues);
    }
  });

  // Group by severity
  const high = allIssues.filter(i => i.severity === 'HIGH');
  const medium = allIssues.filter(i => i.severity === 'MEDIUM');

  console.log('[summary]');
  console.log(`Total unsafe process.env accesses: ${allIssues.length}`);
  console.log(`  HIGH: ${high.length} (client components with 'use client')`);
  console.log(`  MEDIUM: ${medium.length} (components/ directory, may be imported into client)`);
  console.log('');

  if (allIssues.length > 0) {
    console.log('[unsafe env var accesses]');
    
    if (high.length > 0) {
      console.log('\n=== HIGH (client components) ===');
      high.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.file}:${issue.line}`);
        console.log(`   process.env.${issue.varName}`);
        console.log(`   ${issue.code}`);
      });
    }

    if (medium.length > 0) {
      console.log('\n=== MEDIUM (components/ directory) - May be used in client ===');
      medium.slice(0, 10).forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.file}:${issue.line}`);
        console.log(`   process.env.${issue.varName}`);
        console.log(`   ${issue.code}`);
      });
      if (medium.length > 10) {
        console.log(`\n   ... and ${medium.length - 10} more`);
      }
    }

    console.log('\n[recommendation]');
    console.log('Fix unsafe process.env accesses:');
    console.log('  1. If the value is NOT a secret: Rename to NEXT_PUBLIC_* in .env files');
    console.log('  2. If the value IS a secret: Move logic to server component or API route');
    console.log('  3. If conditional (NODE_ENV): Already safe, no action needed');
    console.log('');
    console.log('Example fix:');
    console.log('  // Before (unsafe in client)');
    console.log('  const apiKey = process.env.API_KEY;');
    console.log('');
    console.log('  // After (option 1: public config)');
    console.log('  const apiUrl = process.env.NEXT_PUBLIC_API_URL;');
    console.log('');
    console.log('  // After (option 2: server-only)');
    console.log('  // Move to Server Component or API route');
  } else {
    console.log('✅ No unsafe process.env usage found in client code.');
  }

  process.exit(allIssues.length > 0 ? 1 : 0);
}

main();
