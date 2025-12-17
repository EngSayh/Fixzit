#!/usr/bin/env node
/**
 * @fileoverview Audit API routes for missing tenant scope in database queries
 * 
 * Identifies MongoDB queries (find, findOne, findById, updateOne, deleteOne, etc.)
 * that may be missing org_id or property_owner_id filters, which could lead to
 * cross-tenant data leaks (IDOR vulnerabilities).
 * 
 * @usage node scripts/audit-tenant-scope.mjs
 * @output JSON report with suspected vulnerable queries
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const API_DIR = 'app/api';
const QUERY_PATTERNS = [
  /\.find\(/g,
  /\.findOne\(/g,
  /\.findById\(/g,
  /\.findOneAndUpdate\(/g,
  /\.findOneAndDelete\(/g,
  /\.updateOne\(/g,
  /\.updateMany\(/g,
  /\.deleteOne\(/g,
  /\.deleteMany\(/g,
  /\.aggregate\(/g,
  /\.countDocuments\(/g,
];

const TENANT_SCOPE_PATTERNS = [
  /orgId:/,
  /org_id:/,
  /property_owner_id:/,
  /tenant_id:/,
  /tenantId:/,
];

const SAFE_PATTERNS = [
  /canAccessResource\(/,
  /isSuperAdmin/,
  /\.orgId === user\.orgId/,
  /\.tenant_id === session\.orgId/,
  /authResult/,
  /orgFilter/,
];

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    // Check if line contains a database query
    const hasQuery = QUERY_PATTERNS.some(pattern => pattern.test(line));
    if (!hasQuery) return;

    const lineNum = index + 1;
    
    // Extract context (5 lines before and after)
    const contextStart = Math.max(0, index - 5);
    const contextEnd = Math.min(lines.length, index + 6);
    const context = lines.slice(contextStart, contextEnd).join('\n');

    // Check if tenant scope is present in context
    const hasTenantScope = TENANT_SCOPE_PATTERNS.some(pattern => pattern.test(context));
    const hasSafePattern = SAFE_PATTERNS.some(pattern => pattern.test(context));

    // Flag as suspicious if no tenant scope and no safe patterns
    if (!hasTenantScope && !hasSafePattern) {
      // Extract query method and model
      const queryMatch = line.match(/([\w]+)\.(find\w*|update\w*|delete\w*|aggregate|countDocuments)\(/);
      if (queryMatch) {
        const [, model, method] = queryMatch;
        issues.push({
          file: relative(process.cwd(), filePath),
          line: lineNum,
          model,
          method,
          code: line.trim(),
          context: context.substring(0, 200),
          severity: method.includes('findById') ? 'HIGH' : method.includes('delete') || method.includes('update') ? 'CRITICAL' : 'MEDIUM',
        });
      }
    }
  });

  return issues;
}

function main() {
  console.log('[audit] Scanning API routes for missing tenant scope...\n');
  
  const files = getAllFiles(API_DIR);
  const allIssues = [];

  files.forEach(file => {
    const issues = analyzeFile(file);
    if (issues.length > 0) {
      allIssues.push(...issues);
    }
  });

  // Group by severity
  const critical = allIssues.filter(i => i.severity === 'CRITICAL');
  const high = allIssues.filter(i => i.severity === 'HIGH');
  const medium = allIssues.filter(i => i.severity === 'MEDIUM');

  console.log('[summary]');
  console.log(`Total suspicious queries: ${allIssues.length}`);
  console.log(`  CRITICAL: ${critical.length} (delete/update without scope)`);
  console.log(`  HIGH: ${high.length} (findById without scope)`);
  console.log(`  MEDIUM: ${medium.length} (find/findOne without scope)`);
  console.log('');

  if (allIssues.length > 0) {
    console.log('[suspicious queries]');
    
    // Show CRITICAL first
    if (critical.length > 0) {
      console.log('\n=== CRITICAL (delete/update without scope) ===');
      critical.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.file}:${issue.line}`);
        console.log(`   ${issue.model}.${issue.method}(...)`);
        console.log(`   ${issue.code}`);
      });
    }

    // Show HIGH
    if (high.length > 0) {
      console.log('\n=== HIGH (findById without scope) ===');
      high.slice(0, 10).forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.file}:${issue.line}`);
        console.log(`   ${issue.model}.${issue.method}(...)`);
        console.log(`   ${issue.code}`);
      });
      if (high.length > 10) {
        console.log(`\n   ... and ${high.length - 10} more`);
      }
    }

    // Show sample of MEDIUM
    if (medium.length > 0) {
      console.log('\n=== MEDIUM (find/findOne without scope) - Sample ===');
      medium.slice(0, 5).forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.file}:${issue.line}`);
        console.log(`   ${issue.model}.${issue.method}(...)`);
        console.log(`   ${issue.code}`);
      });
      if (medium.length > 5) {
        console.log(`\n   ... and ${medium.length - 5} more`);
      }
    }

    console.log('\n[recommendation]');
    console.log('Review each query and add tenant scope filter:');
    console.log('  - Corporate: { orgId: session.user.orgId }');
    console.log('  - Owner: { property_owner_id: session.user.id }');
    console.log('  - Post-query: if (!canAccessResource(orgId, doc.orgId, isSuperAdmin)) return 404;');
    console.log('');
    console.log('Note: Some queries may be false positives (e.g., public endpoints, superadmin-only routes).');
    console.log('Manual review required for each case.');
  } else {
    console.log('✅ No suspicious queries found.');
  }

  process.exit(allIssues.length > 0 ? 1 : 0);
}

main();
