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
const isVerbose = args.has('--verbose');
const allowLocalhost =
  process.env.ALLOW_LOCALHOST_IMPORT === 'true' || args.has('--allow-localhost');

const SUPER_ADMIN_ORG = new mongoose.Types.ObjectId('000000000000000000000001');
const AGENT_ID = 'AGENT-003-A';
const progressIntervalRaw = Number(process.env.IMPORT_LOG_EVERY || '250');
const logEvery = Number.isFinite(progressIntervalRaw) && progressIntervalRaw > 0 ? progressIntervalRaw : 250;

interface IssueImport {
  key: string;
  externalId?: string;
  title: string;
  category?: string;
  priority?: string;
  priorityLabel?: string;
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

const EXTERNAL_ID_PATTERN = /\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*-\d+\b/;

function stripDecorations(value: string): string {
  return value.replace(/[*_`]/g, '').replace(/[^\w\s:./-]+/g, '').trim();
}

function isPlaceholderTitle(value: string): boolean {
  const cleaned = stripDecorations(value).toUpperCase();
  if (!cleaned) return true;
  if (/^P[0-3]$/.test(cleaned)) return true;
  if (/^\d+$/.test(cleaned)) return true;
  return ['OPEN', 'PENDING', 'DONE', 'RESOLVED', 'CLOSED', 'DEFERRED'].includes(cleaned);
}

function parseSnippetColumns(snippet: string): string[] {
  if (!snippet.includes('|')) return [];
  return snippet
    .split('|')
    .map((col) => col.trim())
    .filter(Boolean);
}

function isHeaderRow(snippet: string): boolean {
  const normalized = snippet.toLowerCase();
  if (!normalized.includes('|')) return false;
  const hasId = normalized.includes('| id |');
  const hasPriority = normalized.includes('| priority |');
  const hasTitle = normalized.includes('| title |');
  const hasModule = normalized.includes('| module |');
  const hasComponent = normalized.includes('| component');
  return hasId && hasPriority && (hasTitle || hasModule || hasComponent);
}

function isStatusToken(value: string): boolean {
  const cleaned = stripDecorations(value).toLowerCase();
  return (
    cleaned.includes('open') ||
    cleaned.includes('pending') ||
    cleaned.includes('in_progress') ||
    cleaned.includes('in-progress') ||
    cleaned.includes('blocked') ||
    cleaned.includes('resolved') ||
    cleaned.includes('closed') ||
    cleaned.includes('deferred')
  );
}

function isEffortToken(value: string): boolean {
  const cleaned = stripDecorations(value).toLowerCase();
  if (/^\d+\s*(m|h|d)$/.test(cleaned)) return true;
  return ['xs', 's', 'm', 'l', 'xl'].includes(cleaned);
}

function extractExternalIdFromText(text: string): string | null {
  const match = text.match(EXTERNAL_ID_PATTERN);
  return match ? match[0] : null;
}

function resolveExternalId(raw: IssueImport): string | undefined {
  if (raw.externalId && EXTERNAL_ID_PATTERN.test(raw.externalId)) {
    return raw.externalId;
  }
  const fromSnippet = extractExternalIdFromText(raw.evidenceSnippet || '');
  return fromSnippet || undefined;
}

function extractTitleFromSnippet(snippet: string, externalId?: string): string | null {
  const columns = parseSnippetColumns(snippet);
  if (columns.length === 0) return null;

  const candidates = columns.filter((col) => {
    if (!col) return false;
    if (isPlaceholderTitle(col)) return false;
    if (isStatusToken(col)) return false;
    if (isEffortToken(col)) return false;
    return true;
  });

  if (externalId) {
    const withId = candidates.find((col) => col.includes(externalId) && stripDecorations(col).length > externalId.length);
    if (withId) return stripDecorations(withId);
  }

  const nonSummary = candidates.filter((col) => !/open prs/i.test(col));
  const pick = (nonSummary.length ? nonSummary : candidates).sort(
    (a, b) => stripDecorations(b).length - stripDecorations(a).length
  )[0];
  return pick ? stripDecorations(pick) : null;
}

function resolveTitle(raw: IssueImport, externalId?: string): string {
  const rawTitle = raw.title?.trim() || '';
  let result: string;
  
  if (rawTitle && !isPlaceholderTitle(rawTitle)) {
    result = rawTitle;
  } else {
    const action = raw.action?.trim() || '';
    if (action && !isPlaceholderTitle(action)) {
      result = action;
    } else {
      const fromSnippet = extractTitleFromSnippet(raw.evidenceSnippet || '', externalId);
      result = fromSnippet || externalId || rawTitle || 'Pending item';
    }
  }
  
  // Truncate to 200 chars to avoid validation errors
  if (result.length > 200) {
    result = result.slice(0, 197) + '...';
  }
  return result;
}

function shouldSkipImport(raw: IssueImport, externalId?: string): boolean {
  if (raw.evidenceSnippet && isHeaderRow(raw.evidenceSnippet)) return true;
  const title = raw.title?.trim() || '';
  if (!isPlaceholderTitle(title)) return false;
  if (externalId) return false;
  if (!raw.evidenceSnippet?.includes('|')) return false;
  const snippet = raw.evidenceSnippet.toLowerCase();
  if (snippet.includes('open prs') || snippet.includes('status summary') || snippet.includes('metrics overview')) {
    return true;
  }
  return true;
}

function normalizeCategory(category?: string, externalId?: string): string {
  const normalized = (category || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_');

  const externalPrefix = externalId ? externalId.split('-')[0] : '';
  const externalMap: Record<string, string> = {
    BUG: 'bug',
    LOGIC: 'logic_error',
    TEST: 'missing_test',
    PERF: 'efficiency',
    SEC: 'security',
    FEAT: 'feature',
    REFAC: 'refactor',
    DOC: 'documentation',
    TASK: 'next_step',
    OTP: 'bug',
  };
  const fromExternal = externalMap[externalPrefix];
  if (fromExternal) return fromExternal;

  switch (normalized) {
    case 'logic':
    case 'logic_error':
    case 'logic_errors':
      return 'logic_error';
    case 'missing_test':
    case 'missing_tests':
    case 'test':
    case 'tests':
      return 'missing_test';
    case 'efficiency':
    case 'performance':
    case 'perf':
      return 'efficiency';
    case 'security':
      return 'security';
    case 'feature':
      return 'feature';
    case 'refactor':
      return 'refactor';
    case 'documentation':
    case 'docs':
      return 'documentation';
    case 'next_step':
    case 'next_steps':
    case 'task':
      return 'next_step';
    default:
      return fromExternal || 'bug';
  }
}

function normalizePriority(raw: IssueImport): string {
  const value = String(raw.priority || raw.priorityLabel || 'P2').toUpperCase();
  if (/^P[0-3]$/.test(value)) return value;
  return 'P2';
}

function normalizeStatus(raw: IssueImport): string {
  const value = String(raw.status || 'open').toLowerCase();
  if (value === 'pending') return 'open';
  if (['open', 'in_progress', 'in_review', 'blocked', 'resolved', 'closed', 'wont_fix'].includes(value)) {
    return value;
  }
  return 'open';
}

function normalizeEvidence(snippet: string): string {
  const words = snippet.split(/\s+/).filter(Boolean).slice(0, 25);
  return words.join(' ').slice(0, 300);
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
  const totalIssues = Array.isArray(backlogData.issues) ? backlogData.issues.length : 0;

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

  let processed = 0;
  for (const raw of backlogData.issues as IssueImport[]) {
    processed += 1;
    if (!isVerbose && logEvery > 0 && processed % logEvery === 0) {
      console.log(
        `[progress] ${processed}/${totalIssues} processed (created=${summary.created} updated=${summary.updated} skipped=${summary.skipped} errors=${summary.errors.length})`
      );
    }
    try {
      const normalizedExternalId = resolveExternalId(raw);
      if (shouldSkipImport(raw, normalizedExternalId)) {
        summary.skipped++;
        continue;
      }

      const normalizedTitle = resolveTitle(raw, normalizedExternalId);
      const normalizedDescription = (raw.description || normalizedTitle || raw.evidenceSnippet || raw.title || '')
        .trim()
        .slice(0, 2000);
      const normalizedEvidence = normalizeEvidence(raw.evidenceSnippet || normalizedDescription || normalizedTitle);
      const normalizedCategory = normalizeCategory(raw.category, normalizedExternalId);
      const normalizedPriority = normalizePriority(raw);
      const normalizedStatus = normalizeStatus(raw);
      const rawAction = raw.action?.trim() || '';
      const normalizedAction =
        rawAction && !isPlaceholderTitle(rawAction) ? rawAction : `Fix: ${normalizedTitle}`;

      const candidateKey = normalizedExternalId?.trim() || raw.key?.trim() || slugify(normalizedTitle);
      if (!candidateKey) {
        summary.errors.push(`Invalid key: ${raw.key || raw.title}`);
        summary.skipped++;
        continue;
      }
      const lookupConditions = [{ key: candidateKey }];
      if (normalizedExternalId) {
        const lowerExternal = normalizedExternalId.toLowerCase();
        lookupConditions.push({ key: lowerExternal });
        lookupConditions.push({ issueId: normalizedExternalId });
        lookupConditions.push({ issueId: lowerExternal });
        lookupConditions.push({ externalId: normalizedExternalId });
      }
      const existing = await Issue.findOne({ orgId: SUPER_ADMIN_ORG, $or: lookupConditions });
      const key = existing?.key || candidateKey;
      const issueId =
        existing?.issueId ||
        normalizedExternalId ||
        (await Issue.generateIssueId(normalizedCategory as any));
      const externalId = normalizedExternalId || existing?.externalId || raw.externalId || undefined;

      const locationObj =
        typeof raw.location === 'string' ? { filePath: raw.location } : raw.location;

      const resolutionStr =
        typeof raw.resolution === 'object' && raw.resolution !== null
          ? JSON.stringify(raw.resolution)
          : raw.resolution || undefined;

      const issueData = {
        orgId: SUPER_ADMIN_ORG,
        key,
        issueId,
        externalId,
        legacyId: externalId,
        title: normalizedTitle,
        description: normalizedDescription,
        category: normalizedCategory,
        priority: normalizedPriority,
        status: normalizedStatus,
        effort: ['XS', 'S', 'M', 'L', 'XL'].includes(raw.effort?.toUpperCase() || '') ? raw.effort?.toUpperCase() : 'M',
        location: locationObj,
        sourcePath: raw.sourcePath,
        sourceRef: raw.sourceRef,
        evidenceSnippet: normalizedEvidence,
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
        action: normalizedAction,
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
              actor: AGENT_ID,
              actorRef: 'import-backlog-script',
              by: AGENT_ID,
              changes: { status: normalizedStatus, updatedAt: new Date() },
            },
          });

          summary.updated++;
          if (isVerbose) {
            console.log(`✓ Updated: ${key}`);
          }
        } else {
          try {
            const newIssue = await Issue.create(issueData);

            await IssueEvent.create({
              issueId: newIssue._id,
              key,
              type: 'SYNCED',
              orgId: SUPER_ADMIN_ORG,
              metadata: {
                actor: AGENT_ID,
                actorRef: 'import-backlog-script',
                by: AGENT_ID,
                status: normalizedStatus,
              },
            });

            summary.created++;
            if (isVerbose) {
              console.log(`+ Created: ${key}`);
            }
          } catch (createError) {
            // Handle duplicate key error (E11000) by merging into existing issue
            // Use error.code property for reliable detection, with string fallback
            const mongoError = createError as { code?: number; keyPattern?: Record<string, number>; keyValue?: Record<string, unknown> };
            const isDuplicateKeyError = mongoError.code === 11000 || String(mongoError.code) === '11000';
            const isIssueIdDuplicate = isDuplicateKeyError && (
              (mongoError.keyPattern && 'issueId' in mongoError.keyPattern) ||
              (mongoError.keyValue && 'issueId' in mongoError.keyValue) ||
              // Fallback to string check only if code/keyPattern are absent
              (!mongoError.code && createError instanceof Error && createError.message.includes('E11000') && createError.message.includes('issueId'))
            );

            if (isIssueIdDuplicate) {
              // Find the existing issue by issueId and merge
              const existingByIssueId = await Issue.findOne({ issueId });
              if (existingByIssueId) {
                // Merge: append evidence snippet to description if different
                const mergedDescription = existingByIssueId.description?.includes(issueData.evidenceSnippet || '')
                  ? existingByIssueId.description
                  : `${existingByIssueId.description || ''}\n\n---\nMerged from: ${issueData.key}\n${issueData.evidenceSnippet || ''}`.slice(0, 2000);
                
                await Issue.updateOne(
                  { _id: existingByIssueId._id },
                  {
                    $set: {
                      description: mergedDescription,
                      lastSeenAt: new Date(),
                    },
                    $inc: { mentionCount: 1 },
                  }
                );
                summary.updated++;
                if (isVerbose) {
                  console.log(`⇄ Merged: ${key} into ${existingByIssueId.key} (${issueId})`);
                }
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        }
      } else {
        if (existing) {
          summary.updated++;
          if (isVerbose) {
            console.log(`[DRY-RUN] Would update: ${key}`);
          }
        } else {
          summary.created++;
          if (isVerbose) {
            console.log(`[DRY-RUN] Would create: ${key}`);
          }
        }
      }

      issueIds.push(issueId);
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

