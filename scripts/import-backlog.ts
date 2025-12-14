#!/usr/bin/env tsx
/**
 * Import BACKLOG_AUDIT.json to MongoDB Issue Tracker
 * Usage: pnpm tsx scripts/import-backlog.ts
 */

import fs from 'fs';
import path from 'path';

async function importBacklog() {
  const backlogPath = path.join(process.cwd(), 'docs/BACKLOG_AUDIT.json');
  
  if (!fs.existsSync(backlogPath)) {
    console.error('❌ docs/BACKLOG_AUDIT.json not found');
    process.exit(1);
  }

  const backlogData = JSON.parse(fs.readFileSync(backlogPath, 'utf-8'));
  
  console.log('📦 Importing BACKLOG_AUDIT.json to MongoDB...');
  console.log(`   Total issues: ${backlogData.counts.total}`);
  console.log(`   Pending: ${backlogData.counts.pending}`);
  console.log(`   Resolved: ${backlogData.counts.resolved || 0}`);
  console.log('');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/issues/import`;

  // For SuperAdmin authentication, we need to use the NextAuth session
  // This script should be run after logging in via the UI
  console.log('⚠️  This script requires authentication.');
  console.log('   Option 1: Run from browser console (has session cookies)');
  console.log('   Option 2: Use curl with --cookie-jar after logging in');
  console.log('');
  console.log('Recommended curl command:');
  console.log('');
  console.log('  # First login and save cookies:');
  console.log('  curl -c cookies.txt -X POST http://localhost:3000/api/auth/signin/credentials \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"email":"sultan.a.hassni@gmail.com","password":"YOUR_PASSWORD"}\'');
  console.log('');
  console.log('  # Then import with cookies:');
  console.log('  curl -b cookies.txt --fail-with-body -X POST http://localhost:3000/api/issues/import \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    --data-binary "@docs/BACKLOG_AUDIT.json"');
  console.log('');
  console.log('Or from browser console (after logging in):');
  console.log('');
  console.log(`  fetch('http://localhost:3000/api/issues/import', {`);
  console.log(`    method: 'POST',`);
  console.log(`    headers: { 'Content-Type': 'application/json' },`);
  console.log(`    credentials: 'include',`);
  console.log(`    body: JSON.stringify(${JSON.stringify(backlogData, null, 2).split('\n').slice(0, 5).join('\n')}...)`);
  console.log(`  }).then(r => r.json()).then(console.log);`);
  console.log('');
}

importBacklog().catch(console.error);
