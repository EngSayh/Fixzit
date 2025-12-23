#!/usr/bin/env node
/**
 * @fileoverview Cross-platform security scan for hardcoded secrets/URIs
 * @description Replaces bash script with Node.js for Windows compatibility
 * Falls back to this script when ripgrep is not available
 * 
 * Usage: node scripts/security/check-hardcoded-uris.mjs
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = resolve(__dirname, '../..');

// Patterns to detect (converted from bash PCRE to JS RegExp)
const PATTERNS = [
  // Database URIs with credentials
  { regex: /mongodb\+srv:\/\/[^:]+:[^@]+@/gi, name: 'MongoDB URI with credentials' },
  { regex: /mongodb:\/\/[^:]+:[^@]+@/gi, name: 'MongoDB URI with credentials' },
  { regex: /postgres:\/\/[^:]+:[^@]+@/gi, name: 'PostgreSQL URI with credentials' },
  { regex: /mysql:\/\/[^:]+:[^@]+@/gi, name: 'MySQL URI with credentials' },
  { regex: /amqp:\/\/[^:]+:[^@]+@/gi, name: 'AMQP URI with credentials' },
  { regex: /redis:\/\/[^:]+:[^@]+@/gi, name: 'Redis URI with credentials' },
  { regex: /smtps?:\/\/[^:]+:[^@]+@/gi, name: 'SMTP URI with credentials' },
  
  // AWS keys
  { regex: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID' },
  { regex: /ASIA[0-9A-Z]{16}/g, name: 'AWS Temporary Access Key ID' },
  { regex: /aws_secret_access_key\s*[:=]\s*['"][A-Za-z0-9/+=]{35,}['"]/gi, name: 'AWS Secret Key' },
  
  // Stripe keys
  { regex: /stripe_(live|test)_[A-Za-z0-9]{10,}/gi, name: 'Stripe API Key' },
  { regex: /sk_(live|test)_[A-Za-z0-9]{20,}/gi, name: 'Stripe Secret Key' },
  { regex: /pk_(live|test)_[A-Za-z0-9]{10,}/gi, name: 'Stripe Publishable Key' },
  { regex: /whsec_[A-Za-z0-9]{12,}/gi, name: 'Stripe Webhook Secret' },
  
  // JWT/Bearer tokens
  { regex: /Authorization:\s*['"]Bearer\s+[A-Za-z0-9\-_\.]{20,}['"]/gi, name: 'Bearer Token' },
  { regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}/g, name: 'JWT Token' },
  
  // Email/SMS provider keys
  { regex: /SENDGRID_API_KEY\s*[:=]\s*['"][A-Za-z0-9\-_]{16,}['"]/gi, name: 'SendGrid API Key' },
  { regex: /MAILGUN_API_KEY\s*[:=]\s*['"][A-Za-z0-9\-_]{16,}['"]/gi, name: 'Mailgun API Key' },
  { regex: /TWILIO_AUTH_TOKEN\s*[:=]\s*['"][A-Za-z0-9]{16,}['"]/gi, name: 'Twilio Auth Token' },
  { regex: /TWILIO_ACCOUNT_SID\s*[:=]\s*['"]AC[A-Za-z0-9]{32}['"]/gi, name: 'Twilio Account SID' },
  
  // Google/GCP
  { regex: /GOOGLE_API_KEY\s*[:=]\s*['"][A-Za-z0-9\-_]{16,}['"]/gi, name: 'Google API Key' },
  { regex: /AIza[0-9A-Za-z\-_]{35}/g, name: 'Google API Key (AIza...)' },
  
  // Other providers
  { regex: /SMTP_PASSWORD\s*[:=]\s*['"][^'"]{8,}['"]/gi, name: 'SMTP Password' },
  { regex: /AWS_SESSION_TOKEN\s*[:=]\s*['"][A-Za-z0-9/+=]{16,}['"]/gi, name: 'AWS Session Token' },
  
  // Slack tokens
  { regex: /xox[baprs]-[A-Za-z0-9\-]{10,}/g, name: 'Slack Token' },
  { regex: /xoxc-[A-Za-z0-9\-]{10,}/g, name: 'Slack Config Token' },
  { regex: /xapp-[A-Za-z0-9\-]{10,}/g, name: 'Slack App Token' },
  { regex: /xoxa-[A-Za-z0-9\-]{10,}/g, name: 'Slack Admin Token' },
  
  // GitHub/GitLab
  { regex: /gh[pousr]_[A-Za-z0-9]{20,}/g, name: 'GitHub Token' },
  { regex: /glpat-[A-Za-z0-9_\-]{20,}/g, name: 'GitLab Token' },
  
  // Heroku/DigitalOcean/Azure
  { regex: /HEROKU_API_KEY\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, name: 'Heroku API Key' },
  { regex: /DO_TOKEN\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, name: 'DigitalOcean Token' },
  { regex: /AZURE_(CLIENT_SECRET|PASSWORD)\s*[:=]\s*['"][^'"]{12,}['"]/gi, name: 'Azure Secret' },
];

// Directories to scan
const SCAN_PATHS = [
  'app',
  'components',
  'lib',
  'services',
  'scripts',
  'tools',
  'server',
  'config',
  'types',
];

// Paths to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /_artifacts/,
  /tests\//,
  /qa\//,
  /fixtures/,
  /check-hardcoded-uris/,
  /test-mongodb-security/,
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

/**
 * Recursively get all files in a directory
 */
async function getFiles(dir, files = []) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(ROOT_DIR, fullPath);
      
      // Skip excluded paths
      if (EXCLUDE_PATTERNS.some(p => p.test(relativePath))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await getFiles(fullPath, files);
      } else if (entry.isFile()) {
        const ext = entry.name.slice(entry.name.lastIndexOf('.'));
        if (SCAN_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  
  return files;
}

/**
 * Scan a file for hardcoded secrets
 */
async function scanFile(filePath) {
  const findings = [];
  
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = relative(ROOT_DIR, filePath);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of PATTERNS) {
        if (pattern.regex.test(line)) {
          findings.push({
            file: relativePath,
            line: i + 1,
            pattern: pattern.name,
            content: line.trim().substring(0, 100),
          });
        }
        // Reset regex lastIndex for global regexes
        pattern.regex.lastIndex = 0;
      }
    }
  } catch {
    // File can't be read
  }
  
  return findings;
}

async function main() {
  console.log('🔍 Scanning for hard-coded secrets/URIs...');
  
  let allFiles = [];
  
  // Collect files from all scan paths
  for (const scanPath of SCAN_PATHS) {
    const fullPath = join(ROOT_DIR, scanPath);
    try {
      await stat(fullPath);
      const files = await getFiles(fullPath);
      allFiles = allFiles.concat(files);
    } catch {
      // Path doesn't exist, skip
    }
  }
  
  console.log(`📁 Scanning ${allFiles.length} files...`);
  
  // Scan all files
  const allFindings = [];
  for (const file of allFiles) {
    const findings = await scanFile(file);
    allFindings.push(...findings);
  }
  
  // Report findings
  if (allFindings.length > 0) {
    console.log('');
    console.log('❌ Hard-coded secrets detected:');
    console.log('');
    
    for (const finding of allFindings) {
      console.log(`  ${finding.file}:${finding.line}`);
      console.log(`    Pattern: ${finding.pattern}`);
      console.log(`    Content: ${finding.content}...`);
      console.log('');
    }
    
    console.log('❌ Security scan failed: remove hard-coded credentials/secrets and use environment variables.');
    process.exit(1);
  } else {
    console.log('✅ No hard-coded secrets/URIs detected.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('❌ Error running security scan:', err);
  process.exit(1);
});
