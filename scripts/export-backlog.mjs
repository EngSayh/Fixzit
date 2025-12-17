#!/usr/bin/env node
/**
 * Export MongoDB Issue Tracker issues to JSON for triage
 * Filters: open issues only, sorted by priority
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

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in environment');
  process.exit(1);
}

if (!TENANT_ID || !ObjectId.isValid(TENANT_ID)) {
  console.error('ERROR: Invalid tenant org id');
  process.exit(1);
}

const ORG_ID = new ObjectId(TENANT_ID);

async function exportIssues() {
  const client = new MongoClient(MONGODB_URI, { 
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    await client.connect();

    const db = client.db();
    const issuesCollection = db.collection('issues');

    // Fetch ALL issues for tenant
    const allIssues = await issuesCollection
      .find({
        orgId: ORG_ID,
      })
      .toArray();

    // Filter non-resolved issues (open, in_progress, blocked)
    const issues = allIssues.filter(issue => 
      ['open', 'in_progress', 'blocked'].includes(issue.status)
    ).sort((a, b) => {
      // Sort by priority (P0 > P1 > P2 > P3)
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
    });

    // Output ONLY JSON (no stderr noise)
    console.log(JSON.stringify(issues, null, 2));
  } catch (error) {
    console.error('[error]', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

exportIssues();
