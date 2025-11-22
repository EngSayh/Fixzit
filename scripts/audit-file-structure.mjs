#!/usr/bin/env node
/**
 * File Structure Audit Script - Governance V5 Compliance
 * Identifies files violating domain-based organization and suggests moves
 * 
 * Usage: node scripts/audit-file-structure.mjs [--apply]
 * 
 * Checks:
 * - Duplicate files across directories
 * - Misplaced domain files (e.g., finance code outside /finance)
 * - Orphaned utilities that should be in domain modules
 * - Components that should be colocated with features
 * 
 * Output: _artifacts/file-structure-audit.json
 */

import { readFileSync, writeFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { glob } from 'glob';
import crypto from 'crypto';

const ROOT = process.cwd();
const _APPLY = process.argv.includes('--apply');
const OUTPUT_FILE = '_artifacts/file-structure-audit.json';

// Domain module mapping per Governance V5
const DOMAINS = {
  finance: ['invoice', 'payment', 'budget', 'expense', 'account', 'transaction', 'gl', 'ledger'],
  aqar: ['property', 'unit', 'building', 'tenant', 'lease', 'owner', 'portfolio'],
  hr: ['employee', 'payroll', 'attendance', 'leave', 'recruitment', 'performance'],
  fm: ['maintenance', 'asset', 'facility', 'work-order', 'preventive', 'corrective'],
  crm: ['contact', 'lead', 'opportunity', 'customer', 'pipeline', 'sales'],
  vendor: ['vendor', 'supplier', 'procurement', 'purchase', 'rfq', 'po'],
  souq: ['marketplace', 'listing', 'catalog', 'storefront', 'product'],
  compliance: ['audit', 'regulation', 'policy', 'risk', 'control'],
  system: ['auth', 'user', 'role', 'permission', 'session', 'security'],
};

const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/tmp/**',
  '**/_artifacts/**',
  '**/coverage/**',
  '**/*test*/**',
  '**/playwright-report/**',
  '**/e2e-test-results/**',
];

console.log('🔍 Auditing file structure for Governance V5 compliance...\n');

// Step 1: Find all TypeScript/JavaScript files
const files = await glob('**/*.{ts,tsx,js,jsx}', {
  cwd: ROOT,
  ignore: EXCLUDE_PATTERNS,
  absolute: false,
});

console.log(`📁 Found ${files.length} files to audit\n`);

// Step 2: Compute file hashes to detect duplicates
const fileHashes = new Map();
const duplicates = [];

for (const file of files) {
  const fullPath = join(ROOT, file);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    if (fileHashes.has(hash)) {
      duplicates.push({
        file1: fileHashes.get(hash),
        file2: file,
        hash,
        size: statSync(fullPath).size,
      });
    } else {
      fileHashes.set(hash, file);
    }
  } catch (error) {
    console.warn(`⚠️  Could not read ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`🔄 Found ${duplicates.length} duplicate files\n`);

// Step 3: Detect domain mismatches
const misplacedFiles = [];

for (const file of files) {
  const content = readFileSync(join(ROOT, file), 'utf-8');
  const detectedDomains = [];
  
  // Scan for domain keywords in imports and content
  for (const [domain, keywords] of Object.entries(DOMAINS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(content)) {
        detectedDomains.push(domain);
        break;
      }
    }
  }
  
  if (detectedDomains.length === 0) continue;
  
  // Check if file is in correct domain directory
  const primaryDomain = detectedDomains[0];
  const isInCorrectDomain = file.includes(`/${primaryDomain}/`) || file.startsWith(`${primaryDomain}/`);
  
  if (!isInCorrectDomain && !file.includes('/shared/') && !file.includes('/common/')) {
    const suggestedPath = suggestDomainPath(file, primaryDomain);
    misplacedFiles.push({
      currentPath: file,
      suggestedPath,
      detectedDomains,
      reason: `File contains ${primaryDomain} keywords but not in ${primaryDomain}/ directory`,
    });
  }
}

console.log(`📍 Found ${misplacedFiles.length} potentially misplaced files\n`);

// Step 4: Identify orphaned utilities
const orphanedUtils = [];
const utilDirs = ['lib/', 'utils/', 'helpers/'];

for (const file of files) {
  const isUtil = utilDirs.some(dir => file.startsWith(dir));
  if (!isUtil) continue;
  
  const content = readFileSync(join(ROOT, file), 'utf-8');
  
  // Check if utility is domain-specific
  for (const [domain, keywords] of Object.entries(DOMAINS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(content)) {
        orphanedUtils.push({
          currentPath: file,
          suggestedPath: suggestDomainPath(file, domain),
          domain,
          reason: `Utility contains ${domain}-specific logic`,
        });
        break;
      }
    }
  }
}

console.log(`🔧 Found ${orphanedUtils.length} orphaned utilities\n`);

// Step 5: Generate report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles: files.length,
    duplicates: duplicates.length,
    misplacedFiles: misplacedFiles.length,
    orphanedUtils: orphanedUtils.length,
  },
  duplicates: duplicates.slice(0, 50), // Limit to top 50
  misplacedFiles: misplacedFiles.slice(0, 100), // Limit to top 100
  orphanedUtils: orphanedUtils.slice(0, 50), // Limit to top 50
  recommendations: generateRecommendations(duplicates, misplacedFiles, orphanedUtils),
};

// Write report
writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

console.log('✅ Audit complete!\n');
console.log('📊 Summary:');
console.log(`   - Total files: ${report.summary.totalFiles}`);
console.log(`   - Duplicates: ${report.summary.duplicates}`);
console.log(`   - Misplaced files: ${report.summary.misplacedFiles}`);
console.log(`   - Orphaned utilities: ${report.summary.orphanedUtils}`);
console.log(`\n📄 Full report: ${OUTPUT_FILE}\n`);

// Display top issues
if (duplicates.length > 0) {
  console.log('🔴 Top 10 Duplicate Files:');
  duplicates.slice(0, 10).forEach((dup, i) => {
    console.log(`   ${i + 1}. ${basename(dup.file1)} (${formatBytes(dup.size)})`);
    console.log(`      - ${dup.file1}`);
    console.log(`      - ${dup.file2}`);
  });
  console.log();
}

if (misplacedFiles.length > 0) {
  console.log('🟡 Top 10 Misplaced Files:');
  misplacedFiles.slice(0, 10).forEach((file, i) => {
    console.log(`   ${i + 1}. ${file.currentPath}`);
    console.log(`      → ${file.suggestedPath}`);
    console.log(`      Reason: ${file.reason}`);
  });
  console.log();
}

if (orphanedUtils.length > 0) {
  console.log('🟠 Top 10 Orphaned Utilities:');
  orphanedUtils.slice(0, 10).forEach((util, i) => {
    console.log(`   ${i + 1}. ${util.currentPath}`);
    console.log(`      → ${util.suggestedPath}`);
    console.log(`      Reason: ${util.reason}`);
  });
  console.log();
}

// Helper functions
function suggestDomainPath(currentPath, domain) {
  const filename = basename(currentPath);
  const _ext = extname(currentPath);
  
  // Determine if it's a component, lib, or model
  if (currentPath.includes('components/')) {
    return `components/${domain}/${filename}`;
  } else if (currentPath.includes('lib/') || currentPath.includes('utils/')) {
    return `lib/${domain}/${filename}`;
  } else if (currentPath.includes('models/') || currentPath.includes('server/')) {
    return `server/${domain}/${filename}`;
  } else if (currentPath.includes('app/')) {
    return `app/${domain}/${filename}`;
  } else {
    return `modules/${domain}/${filename}`;
  }
}

function generateRecommendations(duplicates, misplacedFiles, orphanedUtils) {
  const recommendations = [];
  
  if (duplicates.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Duplicates',
      action: 'Consolidate duplicate files',
      details: `Found ${duplicates.length} duplicate files. Review and keep only one version, update imports.`,
      estimatedEffort: '2-4 hours',
    });
  }
  
  if (misplacedFiles.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Domain Organization',
      action: 'Move misplaced files to correct domain directories',
      details: `Found ${misplacedFiles.length} files in wrong directories. Follow Governance V5 structure.`,
      estimatedEffort: '4-8 hours',
    });
  }
  
  if (orphanedUtils.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Utility Organization',
      action: 'Colocate domain-specific utilities with their modules',
      details: `Found ${orphanedUtils.length} utilities that should be moved to domain modules.`,
      estimatedEffort: '2-4 hours',
    });
  }
  
  return recommendations;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}
