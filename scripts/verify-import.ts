#!/usr/bin/env tsx
/**
 * Verify BACKLOG_AUDIT.json import
 * Counts issues in MongoDB and lists them
 *
 * Usage: pnpm tsx scripts/verify-import.ts
 */

import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import { Issue } from '../server/models/Issue';

loadEnvConfig(process.cwd());

const SUPER_ADMIN_ORG = new mongoose.Types.ObjectId('000000000000000000000001');

function maskUri(uri: string): string {
  try {
    const url = new URL(uri);
    const username = url.username ? `${url.username.slice(0, 2)}***` : '';
    const auth = username ? `${username}${url.password ? ':*****' : ''}@` : '';
    return `${url.protocol}//${auth}${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
  } catch {
    return '<hidden>';
  }
}

function getHostFromUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return 'unknown';
  }
}

function isLocalhostUri(uri: string): boolean {
  try {
    const host = new URL(uri).hostname.toLowerCase();
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  } catch {
    return false;
  }
}

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri?.trim()) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.error('   Required: .env.local must contain MONGODB_URI');
      process.exit(1);
    }
    if (isLocalhostUri(mongoUri) && process.env.ALLOW_LOCALHOST_IMPORT !== 'true') {
      console.error('❌ Refusing to connect to localhost. Set ALLOW_LOCALHOST_IMPORT=true if intentional.');
      process.exit(1);
    }

    const dbName = process.env.MONGODB_DB || 'fixzit';
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Host: ${getHostFromUri(mongoUri)}`);
    console.log(`   URI: ${maskUri(mongoUri)}`);
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected\n');

    const count = await Issue.countDocuments({ orgId: SUPER_ADMIN_ORG });
    console.log(`📊 Total Issues: ${count}\n`);

    const issues = await Issue.find(
      { orgId: SUPER_ADMIN_ORG },
      'issueId title priority status category'
    )
      .limit(15)
      .sort({ priority: 1, issueId: 1 });

    console.log('📋 Imported Issues:');
    console.log('─'.repeat(100));
    issues.forEach((i) => {
      console.log(
        `  ${i.issueId?.padEnd(12) || 'N/A'.padEnd(12)} | ` +
          `${i.priority.padEnd(4)} | ` +
          `${i.status.padEnd(12)} | ` +
          `${i.category.padEnd(15)} | ` +
          `${i.title.substring(0, 45)}`
      );
    });
    console.log('─'.repeat(100));

    await mongoose.disconnect();
    console.log('\n✅ Verification complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
