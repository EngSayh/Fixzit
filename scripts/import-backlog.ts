#!/usr/bin/env tsx
/**
 * Import BACKLOG_AUDIT.json directly to MongoDB (no API/auth required)
 * Usage: pnpm tsx scripts/import-backlog.ts
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import mongoose from 'mongoose';
import { Issue } from '../server/models/Issue';
import IssueEvent from '../server/models/IssueEvent';

// Load .env.local (or .env if .env.local doesn't exist)
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
config({ path: envPath });

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error(`   Checked: ${envPath}`);
  process.exit(1);
}

const SUPER_ADMIN_ORG = new mongoose.Types.ObjectId('000000000000000000000001');

interface IssueImport {
  key: string;
  externalId?: string;
  title: string;
  category?: string;
  priority?: string;
  status?: string;
  effort?: string;
  location?: string;
  sourcePath: string;
  sourceRef: string;
  evidenceSnippet: string;
  description?: string;
  riskTags?: string[];
  resolution?: {
    resolvedAt: string;
    commit: string;
    description: string;
    files: string[];
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function importBacklog() {
  const backlogPath = path.join(process.cwd(), 'docs/BACKLOG_AUDIT.json');
  
  if (!fs.existsSync(backlogPath)) {
    console.error('❌ docs/BACKLOG_AUDIT.json not found');
    process.exit(1);
  }

  const backlogData = JSON.parse(fs.readFileSync(backlogPath, 'utf-8'));
  
  console.log('📦 Importing BACKLOG_AUDIT.json directly to MongoDB...');
  console.log(`   Total issues: ${backlogData.counts.total}`);
  console.log(`   Pending: ${backlogData.counts.pending}`);
  console.log(`   Resolved: ${backlogData.counts.resolved || 0}`);
  console.log('');

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'fixzit';
  
  console.log('🔌 Connecting to MongoDB...');
  console.log(`   URI: ${mongoUri.replace(/:([^:@]+)@/, ':*****@')}`);
  await mongoose.connect(mongoUri, { dbName });
  console.log('✅ Connected');
  console.log('');

  const summary = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (const raw of backlogData.issues as IssueImport[]) {
    try {
      const key = slugify(raw.key || raw.externalId || raw.title);
      if (!key) {
        summary.errors.push(`Invalid key: ${raw.key || raw.title}`);
        summary.skipped++;
        continue;
      }

      const existing = await Issue.findOne({ orgId: SUPER_ADMIN_ORG, key });
      
      // Convert location string to IFileLocation object
      const locationObj = typeof raw.location === 'string' 
        ? { filePath: raw.location }
        : raw.location;

      // Convert resolution object to string if needed
      const resolutionStr = typeof raw.resolution === 'object' && raw.resolution !== null
        ? JSON.stringify(raw.resolution)
        : (raw.resolution || undefined);

      const issueData = {
        orgId: SUPER_ADMIN_ORG,
        key,
        issueId: key,  // Required: use key as issueId
        externalId: raw.externalId || raw.key,
        title: raw.title,
        description: raw.description || raw.evidenceSnippet || raw.title,  // Required
        category: (raw.category === 'missing_tests' ? 'missing_test' : raw.category) || 'bug',
        priority: raw.priority || 'P2',
        status: raw.status || 'open',
        effort: raw.effort || 'M',
        location: locationObj,  // Required as object
        sourcePath: raw.sourcePath,
        sourceRef: raw.sourceRef,
        evidenceSnippet: raw.evidenceSnippet,
        riskTags: Array.isArray(raw.riskTags) ? raw.riskTags.filter((tag: string) => 
          ['SECURITY', 'MULTI_TENANT', 'FINANCIAL', 'PERFORMANCE', 'TEST_GAP', 'DATA_INTEGRITY', 'INTEGRATION', 'REGRESSION'].includes(tag)
        ) : [],
        resolution: resolutionStr,
        module: raw.module || 'general',  // Required
        action: raw.action || 'Review and fix',  // Required
        reportedBy: raw.reportedBy || 'system',  // Required
        definitionOfDone: raw.definitionOfDone || 'Fix implemented and tested',  // Required
        source: 'import' as const,
        sourceDetail: 'BACKLOG_AUDIT.json',
        mentionCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        sprintReady: false,
        comments: [],
        statusHistory: [],
        dependencies: raw.dependencies || [],
        relatedIssues: [],
        labels: [],
        auditEntries: [],
      };

      if (existing) {
        await Issue.updateOne({ _id: existing._id }, { $set: issueData });
        
        await IssueEvent.create({
          issueId: existing._id,
          key,
          type: 'UPDATED',
          orgId: SUPER_ADMIN_ORG,
          metadata: { 
            actor: 'system',
            actorRef: 'import-backlog-script',
            changes: { status: raw.status, updatedAt: new Date() }
          },
        });
        
        summary.updated++;
        console.log(`✓ Updated: ${key}`);
      } else {
        const newIssue = await Issue.create(issueData);
        
        await IssueEvent.create({
          issueId: newIssue._id,
          key,
          type: 'SYNCED',
          orgId: SUPER_ADMIN_ORG,
          metadata: {
            actor: 'system',
            actorRef: 'import-backlog-script',
            status: raw.status
          },
        });
        
        summary.created++;
        console.log(`+ Created: ${key}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      summary.errors.push(`${raw.key}: ${err}`);
      summary.skipped++;
      console.error(`✗ Error: ${raw.key} - ${err}`);
    }
  }

  console.log('');
  console.log('📊 Import Summary:');
  console.log(`   Created: ${summary.created}`);
  console.log(`   Updated: ${summary.updated}`);
  console.log(`   Skipped: ${summary.skipped}`);
  console.log(`   Errors: ${summary.errors.length}`);
  
  if (summary.errors.length > 0) {
    console.log('');
    console.log('❌ Errors:');
    summary.errors.forEach(err => console.log(`   - ${err}`));
  }

  await mongoose.disconnect();
  console.log('');
  console.log('✅ Import complete');
}

importBacklog().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
