#!/usr/bin/env node
/**
 * Sync resolved issues from BACKLOG_AUDIT.json to MongoDB
 * Marks doc-101, doc-102, doc-103, perf-002 as resolved
 */

import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '../.env.local'), silent: true });

const MONGODB_URI = process.env.MONGODB_URI;
const TENANT_ID =
  process.env.PUBLIC_ORG_ID ||
  process.env.DEFAULT_ORG_ID ||
  process.env.TEST_ORG_ID;

if (!MONGODB_URI || !TENANT_ID || !ObjectId.isValid(TENANT_ID)) {
  console.error('ERROR: Invalid MongoDB URI or tenant ID');
  process.exit(1);
}

const ORG_ID = new ObjectId(TENANT_ID);

// Issues to mark as resolved (lowercase keys to match MongoDB)
const RESOLVED_KEYS = ['doc-101', 'doc-102', 'doc-103', 'perf-002'];

async function syncResolved() {
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log('[connect] MongoDB...');

    const db = client.db();
    const issuesCollection = db.collection('issues');

    let updated = 0;
    const now = new Date();

    for (const key of RESOLVED_KEYS) {
      const result = await issuesCollection.updateOne(
        {
          orgId: ORG_ID,
          key: key,
          status: 'open', // Only update if currently open
        },
        {
          $set: {
            status: 'resolved',
            resolvedAt: now,
            updatedAt: now,
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[updated] ${key} → resolved`);
        updated++;
      } else {
        console.log(`[skipped] ${key} (already resolved or not found)`);
      }
    }

    // Get updated stats
    const totalIssues = await issuesCollection.countDocuments({ orgId: ORG_ID });
    const openIssues = await issuesCollection.countDocuments({
      orgId: ORG_ID,
      status: { $in: ['open', 'in_progress', 'blocked'] },
    });
    const resolvedIssues = await issuesCollection.countDocuments({
      orgId: ORG_ID,
      status: 'resolved',
    });

    console.log('\n[summary]');
    console.log(`Updated: ${updated} issues`);
    console.log('\n[stats]');
    console.log(`Total: ${totalIssues}`);
    console.log(`Open: ${openIssues} (was 13)`);
    console.log(`Resolved: ${resolvedIssues} (was 9)`);
    console.log(`\n✅ MongoDB sync complete`);
  } catch (error) {
    console.error('[error]', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

syncResolved();
