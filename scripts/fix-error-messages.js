#!/usr/bin/env node
/**
 * Automated Error Message Sanitization Script
 * Fixes error.message exposure across all API routes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to process
const apiFiles = execSync('find app/api -name "*.ts" -type f -print0')
  .toString()
  .split('\0')
  .filter(f => f && f.endsWith('.ts'));

let fixed = 0;
let filesChanged = [];

for (const file of apiFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Apply replacements
  const newContent = content.replace(
    /const message = error instanceof Error \? error\.message : ['"]([^'"]+)['"];[\s\n\r\s]*return createSecureResponse\(\{ error: message \}, (\d+), req\);/g,
    (match, defaultMsg, status) => {
      changed = true;
      return `return createSecureResponse({ error: '${defaultMsg}' }, ${status}, req);`;
    }
  );

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    filesChanged.push(file);
    fixed++;

  }
}

if (filesChanged.length > 0) {

  filesChanged.forEach(f =>);
}
