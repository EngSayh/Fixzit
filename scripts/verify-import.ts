#!/usr/bin/env tsx
/**
 * Verify BACKLOG_AUDIT.json import
 * Counts issues in MongoDB and lists them
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Issue } from '../server/models/Issue.js';

const SUPER_ADMIN_ORG = new mongoose.Types.ObjectId('000000000000000000000001');

async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!, { dbName: 'fixzit' });
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
