#!/usr/bin/env tsx
/**
 * Import BACKLOG_AUDIT.json directly to MongoDB (no API/auth required)
 *
 * Usage:
 *   pnpm tsx scripts/import-backlog.ts --confirm         # writes to DB
 *   pnpm tsx scripts/import-backlog.ts --confirm --allow-localhost
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import { Issue } from '../server/models/Issue';
import IssueEvent from '../server/models/IssueEvent';

// Load env the same way Next.js does (no fallback to localhost)
loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const isConfirmed = args.has('--confirm');
const allowLocalhost =
  process.env.ALLOW_LOCALHOST_IMPORT === 'true' || args.has('--allow-localhost');

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
  module?: string;
  action?: string;
  reportedBy?: string;
  definitionOfDone?: string;
  dependencies?: string[];
}

interface ImportReport {
  timestamp: string;
  dryRun: boolean;
  connectedHost: string;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  backlogCounts: Record<string, unknown>;
  issueIds: string[];
  errorMessages: string[];
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

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

function isLocalhostUri(uri: string): boolean {
  try {
    const host = new URL(uri).hostname.toLowerCase();
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  } catch {
    return false;
  }
}

function ensureMongoUri(): { mongoUri: string; parsed: URL } {
  if (!process.env.MONGODB_URI?.trim()) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.error('   Required: .env.local must contain MONGODB_URI');
    process.exit(1);
  }
  try {
    const parsed = new URL(process.env.MONGODB_URI);
    return { mongoUri: process.env.MONGODB_URI, parsed };
  } catch {
    console.error('❌ MONGODB_URI is not a valid URL');
    process.exit(1);
  }
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
  if (!isConfirmed) {
    console.log('🛑 Dry-run: no database changes executed. Add --confirm to proceed.');
    console.log('   Example: pnpm tsx scripts/import-backlog.ts --confirm');
  }

  const { mongoUri, parsed } = ensureMongoUri();
  if (isLocalhostUri(mongoUri) && !allowLocalhost) {
    console.error('❌ BLOCKED: MongoDB URI points to localhost.');
    console.error(`   URI: ${maskUri(mongoUri)}`);
    console.error('   If intentional, set ALLOW_LOCALHOST_IMPORT=true or pass --allow-localhost.');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB || 'fixzit';
  const hostLabel = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;

  console.log('🔌 Connecting to MongoDB...');
  console.log(`   Host: ${hostLabel}`);
  console.log(`   URI: ${maskUri(mongoUri)}`);
  console.log(`   Mode: ${isConfirmed ? 'CONFIRMED WRITE (--confirm)' : 'DRY-RUN (no writes)'}`);
  await mongoose.connect(mongoUri, { dbName });
  console.log('✅ Connected');
  console.log('');

  const summary = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
  const issueIds: string[] = [];
  const startTime = new Date().toISOString();

  for (const raw of backlogData.issues as IssueImport[]) {
    try {
      const key = slugify(raw.key || raw.externalId || raw.title);
      if (!key) {
        summary.errors.push(`Invalid key: ${raw.key || raw.title}`);
        summary.skipped++;
        continue;
      }

      const existing = await Issue.findOne({ orgId: SUPER_ADMIN_ORG, key });

      const locationObj =
        typeof raw.location === 'string' ? { filePath: raw.location } : raw.location;

      const resolutionStr =
        typeof raw.resolution === 'object' && raw.resolution !== null
          ? JSON.stringify(raw.resolution)
          : raw.resolution || undefined;

      const issueData = {
        orgId: SUPER_ADMIN_ORG,
        key,
        issueId: key,
        externalId: raw.externalId || raw.key,
        title: raw.title,
        description: raw.description || raw.evidenceSnippet || raw.title,
        category: (raw.category === 'missing_tests' ? 'missing_test' : raw.category) || 'bug',
        priority: raw.priority || 'P2',
        status: raw.status || 'open',
        effort: raw.effort || 'M',
        location: locationObj,
        sourcePath: raw.sourcePath,
        sourceRef: raw.sourceRef,
        evidenceSnippet: raw.evidenceSnippet,
        riskTags: Array.isArray(raw.riskTags)
          ? raw.riskTags.filter((tag: string) =>
              [
                'SECURITY',
                'MULTI_TENANT',
                'FINANCIAL',
                'PERFORMANCE',
                'TEST_GAP',
                'DATA_INTEGRITY',
                'INTEGRATION',
                'REGRESSION',
              ].includes(tag)
            )
          : [],
        resolution: resolutionStr,
        module: raw.module || 'general',
        action: raw.action || 'Review and fix',
        reportedBy: raw.reportedBy || 'system',
        definitionOfDone: raw.definitionOfDone || 'Fix implemented and tested',
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

      if (isConfirmed) {
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
              changes: { status: raw.status, updatedAt: new Date() },
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
              status: raw.status,
            },
          });

          summary.created++;
          console.log(`+ Created: ${key}`);
        }
      } else {
        if (existing) {
          summary.updated++;
          console.log(`[DRY-RUN] Would update: ${key}`);
        } else {
          summary.created++;
          console.log(`[DRY-RUN] Would create: ${key}`);
        }
      }

      issueIds.push(key);
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
    summary.errors.forEach((err) => console.log(`   - ${err}`));
  }

  const artifactsDir = path.join(process.cwd(), '.artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const reportPath = path.join(artifactsDir, 'import-report.json');
  const report: ImportReport = {
    timestamp: startTime,
    dryRun: !isConfirmed,
    connectedHost: hostLabel,
    summary: {
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      errors: summary.errors.length,
    },
    backlogCounts: backlogData.counts || {},
    issueIds,
    errorMessages: summary.errors,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('');
  console.log(`📝 Report written: ${reportPath}`);

  await mongoose.disconnect();
  console.log('');
  if (isConfirmed) {
    console.log('✅ Import complete');
  } else {
    console.log('⚠️  DRY-RUN COMPLETE (no changes written)');
    console.log('   Run with --confirm to write to database');
  }
}

importBacklog().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
