#!/usr/bin/env node
/**
 * Import BACKLOG_AUDIT.json into MongoDB Issue Tracker with tenant scope
 * and schema-safe defaults. Uses raw MongoDB driver but preserves required
 * Issue fields so downstream consumers stay consistent.
 */

import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load local env (keeps parity with Next.js env loading)
config({ path: join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const TENANT_ID =
  process.env.PUBLIC_ORG_ID ||
  process.env.DEFAULT_ORG_ID ||
  process.env.TEST_ORG_ID;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in environment');
  process.exit(1);
}

if (!TENANT_ID) {
  console.error('ERROR: Tenant org id missing (PUBLIC_ORG_ID/DEFAULT_ORG_ID/TEST_ORG_ID)');
  process.exit(1);
}

if (!ObjectId.isValid(TENANT_ID)) {
  console.error('ERROR: Tenant org id is not a valid ObjectId string');
  process.exit(1);
}

const ORG_ID = new ObjectId(TENANT_ID);
const AUDIT_PATH = join(__dirname, '../BACKLOG_AUDIT.json');

const auditData = JSON.parse(readFileSync(AUDIT_PATH, 'utf8'));
const auditMeta = {
  sessionId: auditData.timestamp || new Date().toISOString(),
  source: auditData.source || 'BACKLOG_AUDIT.json',
  timestamp: new Date(auditData.timestamp || Date.now()),
};

/**
 * Parse location strings like "file.ts:12-20" into structured form.
 */
function parseLocation(rawLocation = '') {
  const match = rawLocation.match(/^([^:]+)(?::(\d+)(?:-(\d+))?)?$/);
  if (match) {
    return {
      filePath: match[1],
      lineStart: match[2] ? parseInt(match[2], 10) : undefined,
      lineEnd: match[3] ? parseInt(match[3], 10) : undefined,
    };
  }
  return { filePath: rawLocation || 'UNKNOWN' };
}

/**
 * Infer module/submodule from file path (keeps parity with API import route).
 */
function inferModule(filePath = '') {
  const parts = filePath.split('/');

  if (filePath.includes('/fm/')) {
    const subIdx = parts.indexOf('fm');
    return { module: 'fm', subModule: parts[subIdx + 1] || undefined };
  }

  if (filePath.includes('/souq/')) {
    const subIdx = parts.indexOf('souq');
    return { module: 'souq', subModule: parts[subIdx + 1] || undefined };
  }

  if (filePath.includes('/aqar/')) {
    return { module: 'aqar' };
  }

  if (filePath.includes('/auth/') || filePath.includes('/api/auth')) {
    return { module: 'auth' };
  }

  if (filePath.includes('/upload/')) {
    return { module: 'upload' };
  }

  if (filePath.includes('/tests/')) {
    return { module: 'tests' };
  }

  if (filePath.includes('.github/workflows/')) {
    return { module: 'ops', subModule: 'github-actions' };
  }

  return { module: 'core' };
}

const EXTERNAL_ID_PATTERN = /\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*-\d+\b/;

function stripDecorations(value = '') {
  return value.replace(/[*_`]/g, '').replace(/[^\w\s:./-]+/g, '').trim();
}

function isPlaceholderTitle(value = '') {
  const cleaned = stripDecorations(value).toUpperCase();
  if (!cleaned) return true;
  if (/^P[0-3]$/.test(cleaned)) return true;
  if (/^\d+$/.test(cleaned)) return true;
  return ['OPEN', 'PENDING', 'DONE', 'RESOLVED', 'CLOSED', 'DEFERRED'].includes(cleaned);
}

function parseSnippetColumns(snippet = '') {
  if (!snippet.includes('|')) return [];
  return snippet
    .split('|')
    .map((col) => col.trim())
    .filter(Boolean);
}

function isHeaderRow(snippet = '') {
  const normalized = snippet.toLowerCase();
  if (!normalized.includes('|')) return false;
  const hasId = normalized.includes('| id |');
  const hasPriority = normalized.includes('| priority |');
  const hasTitle = normalized.includes('| title |');
  const hasModule = normalized.includes('| module |');
  const hasComponent = normalized.includes('| component');
  return hasId && hasPriority && (hasTitle || hasModule || hasComponent);
}

function isStatusToken(value = '') {
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

function isEffortToken(value = '') {
  const cleaned = stripDecorations(value).toLowerCase();
  if (/^\d+\s*(m|h|d)$/.test(cleaned)) return true;
  return ['xs', 's', 'm', 'l', 'xl'].includes(cleaned);
}

function extractExternalIdFromText(text = '') {
  const match = text.match(EXTERNAL_ID_PATTERN);
  return match ? match[0] : null;
}

function resolveExternalId(rawIssue) {
  if (rawIssue.externalId && EXTERNAL_ID_PATTERN.test(rawIssue.externalId)) {
    return rawIssue.externalId;
  }
  const fromSnippet = extractExternalIdFromText(rawIssue.evidenceSnippet || '');
  return fromSnippet || null;
}

function extractTitleFromSnippet(snippet, externalId) {
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

function resolveTitle(rawIssue, externalId) {
  const rawTitle = rawIssue.title ? rawIssue.title.trim() : '';
  if (rawTitle && !isPlaceholderTitle(rawTitle)) {
    return rawTitle;
  }

  const action = rawIssue.action ? rawIssue.action.trim() : '';
  if (action && !isPlaceholderTitle(action)) {
    return action;
  }

  const fromSnippet = extractTitleFromSnippet(rawIssue.evidenceSnippet || '', externalId);
  if (fromSnippet) return fromSnippet;

  return externalId || rawTitle || 'Pending item';
}

function shouldSkipImport(rawIssue, externalId) {
  if (rawIssue.evidenceSnippet && isHeaderRow(rawIssue.evidenceSnippet)) {
    return true;
  }
  const title = rawIssue.title ? rawIssue.title.trim() : '';
  if (!isPlaceholderTitle(title)) return false;
  if (externalId) return false;
  if (!rawIssue.evidenceSnippet || !rawIssue.evidenceSnippet.includes('|')) return false;
  const snippet = rawIssue.evidenceSnippet.toLowerCase();
  if (snippet.includes('open prs') || snippet.includes('status summary') || snippet.includes('metrics overview')) {
    return true;
  }
  return true;
}

function normalizeCategory(category, externalId) {
  const normalized = (category || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_');

  const externalPrefix = externalId ? externalId.split('-')[0] : '';
  const externalMap = {
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

function normalizePriority(rawIssue) {
  const value = String(rawIssue.priority || rawIssue.priorityLabel || 'P2').toUpperCase();
  if (/^P[0-3]$/.test(value)) return value;
  return 'P2';
}

function normalizeStatus(rawIssue) {
  const value = String(rawIssue.status || 'open').toLowerCase();
  if (value === 'pending') return 'open';
  if (['open', 'in_progress', 'in_review', 'blocked', 'resolved', 'closed', 'wont_fix'].includes(value)) {
    return value;
  }
  return 'open';
}

function normalizeEvidence(snippet = '') {
  const words = snippet.split(/\s+/).filter(Boolean).slice(0, 25);
  return words.join(' ').slice(0, 300);
}

/**
 * Build a schema-safe issue document from the lean BACKLOG_AUDIT format.
 */
function buildIssueDocument(rawIssue) {
  const normalizedExternalId = resolveExternalId(rawIssue);
  if (shouldSkipImport(rawIssue, normalizedExternalId)) {
    return null;
  }

  const normalizedTitle = resolveTitle(rawIssue, normalizedExternalId);
  const normalizedDescription = (
    rawIssue.impact ||
    rawIssue.evidenceSnippet ||
    rawIssue.description ||
    normalizedTitle ||
    'Backlog issue imported from audit log'
  ).slice(0, 2000);
  const normalizedCategory = normalizeCategory(rawIssue.category, normalizedExternalId);
  const normalizedPriority = normalizePriority(rawIssue);
  const normalizedStatus = normalizeStatus(rawIssue);
  const normalizedEvidence = normalizeEvidence(rawIssue.evidenceSnippet || normalizedDescription);
  const rawAction = rawIssue.action ? rawIssue.action.trim() : '';
  const normalizedAction =
    rawAction && !isPlaceholderTitle(rawAction) ? rawAction : `Fix: ${normalizedTitle}`;

  const now = new Date();
  const location = parseLocation(rawIssue.location);
  const moduleInfo = inferModule(location.filePath);
  const key = normalizedExternalId || rawIssue.key || rawIssue.issueId || `ISSUE-${Date.now()}`;
  const issueId = normalizedExternalId || rawIssue.issueId || rawIssue.key || key;

  const baseAuditEntry = {
    sessionId: auditMeta.sessionId,
    timestamp: auditMeta.timestamp,
    action: 'IMPORTED',
    findings:
      rawIssue.evidenceSnippet ||
      rawIssue.impact ||
      rawIssue.title ||
      'Backlog sync import',
    agentId: 'backlog-sync',
    sourceFile: 'BACKLOG_AUDIT.json',
  };

  const statusHistory = [];
  if (normalizedStatus && normalizedStatus !== 'open') {
    statusHistory.push({
      from: 'open',
      to: normalizedStatus,
      changedBy: 'backlog-sync',
      changedAt: auditMeta.timestamp,
      reason: 'Imported from backlog audit',
    });
  }

  return {
    key,
    issueId,
    externalId: normalizedExternalId || rawIssue.externalId,
    legacyId: normalizedExternalId || rawIssue.externalId,
    title: normalizedTitle.slice(0, 200),
    description: normalizedDescription,
    category: normalizedCategory,
    priority: normalizedPriority,
    status: normalizedStatus,
    effort: rawIssue.effort || 'M',
    location,
    module: moduleInfo.module,
    subModule: moduleInfo.subModule,
    action: rawIssue.proposedFix || normalizedAction,
    rootCause: rawIssue.rootCause,
    resolution: rawIssue.resolution?.notes,
    definitionOfDone:
      rawIssue.definitionOfDone || 'Fix implemented and validated (pnpm lint + pnpm typecheck).',
    riskTags: Array.isArray(rawIssue.riskTags) ? rawIssue.riskTags : [],
    source: 'audit',
    sourceDetail: auditMeta.source,
    sourcePath: rawIssue.sourcePath,
    sourceRef: rawIssue.sourceRef,
    sourceSnippet: normalizedEvidence,
    reportedBy: rawIssue.resolution?.resolvedBy || 'backlog-sync',
    orgId: ORG_ID,
    sprintReady: true,
    dependencies: [],
    relatedIssues: [],
    comments: [],
    auditEntries: [baseAuditEntry],
    statusHistory,
    mentionCount: 1,
    firstSeenAt: auditMeta.timestamp,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
    resolvedAt:
      rawIssue.status === 'resolved'
        ? rawIssue.resolution?.resolvedAt
          ? new Date(rawIssue.resolution.resolvedAt)
          : now
        : undefined,
    labels: Array.isArray(rawIssue.riskTags) ? rawIssue.riskTags : [],
  };
}

async function importIssues() {
  const client = new MongoClient(MONGODB_URI);

  console.log('[connect] MongoDB...');
  await client.connect();
  const db = client.db();
  const issuesCollection = db.collection('issues');

  console.log(`[audit] Found ${auditData.issues.length} issues in BACKLOG_AUDIT.json`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let repaired = 0;
  let errors = 0;

  try {
    for (const rawIssue of auditData.issues) {
      try {
        const doc = buildIssueDocument(rawIssue);
        if (!doc) {
          skipped += 1;
          continue;
        }
        const now = new Date();

        const scopedExisting = await issuesCollection.findOne({
          orgId: ORG_ID,
          key: doc.key,
        });

        // Repair previously unscoped entries (legacy import bug)
        const unscopedExisting = scopedExisting
          ? null
          : await issuesCollection.findOne({
              key: doc.key,
              orgId: { $exists: false },
            });

        const existing = scopedExisting || unscopedExisting;

        if (existing) {
          const auditEntries = [
            ...(existing.auditEntries || []),
            ...doc.auditEntries,
          ];

          const statusHistory = [...(existing.statusHistory || [])];
          if (existing.status !== doc.status) {
            statusHistory.push({
              from: existing.status,
              to: doc.status,
              changedBy: 'backlog-sync',
              changedAt: now,
              reason: 'Backlog sync status update',
            });
          }

          const hasChanges =
            existing.status !== doc.status ||
            existing.priority !== doc.priority ||
            existing.effort !== doc.effort ||
            existing.definitionOfDone !== doc.definitionOfDone ||
            existing.rootCause !== doc.rootCause ||
            existing.action !== doc.action ||
            existing.resolution !== doc.resolution ||
            existing.module !== doc.module ||
            existing.subModule !== doc.subModule ||
            (existing.sourceRef || '') !== (doc.sourceRef || '') ||
            (existing.sourcePath || '') !== (doc.sourcePath || '');

          if (hasChanges || unscopedExisting) {
            await issuesCollection.updateOne(
              { _id: existing._id },
              {
                $set: {
                  title: doc.title,
                  description: doc.description,
                  category: doc.category,
                  priority: doc.priority,
                  status: doc.status,
                  effort: doc.effort,
                  location: doc.location,
                  module: doc.module,
                  subModule: doc.subModule,
                  action: doc.action,
                  rootCause: doc.rootCause,
                  resolution: doc.resolution,
                  definitionOfDone: doc.definitionOfDone,
                  riskTags: doc.riskTags,
                  source: doc.source,
                  sourceDetail: doc.sourceDetail,
                  sourcePath: doc.sourcePath,
                  sourceRef: doc.sourceRef,
                  sourceSnippet: doc.sourceSnippet,
                  reportedBy: doc.reportedBy,
                  orgId: ORG_ID,
                  sprintReady: doc.sprintReady,
                  auditEntries,
                  statusHistory,
                  mentionCount: (existing.mentionCount || 0) + 1,
                  lastSeenAt: now,
                  updatedAt: now,
                  resolvedAt: doc.resolvedAt || existing.resolvedAt,
                  labels: doc.labels,
                },
              },
            );
            updated++;
            if (unscopedExisting) repaired++;
          } else {
            await issuesCollection.updateOne(
              { _id: existing._id },
              {
                $set: {
                  orgId: existing.orgId || ORG_ID,
                  lastSeenAt: now,
                  updatedAt: now,
                },
                $inc: { mentionCount: 1 },
              },
            );
            skipped++;
          }
        } else {
          await issuesCollection.insertOne(doc);
          created++;
        }
      } catch (err) {
        errors++;
        console.error(`ERROR processing issue ${rawIssue.key || rawIssue.title}:`, err.message);
      }
    }

    console.log('\n[summary]');
    console.log(`created=${created}`);
    console.log(`updated=${updated}`);
    console.log(`repaired=${repaired}`);
    console.log(`skipped=${skipped}`);
    console.log(`errors=${errors}`);

    const totalIssues = await issuesCollection.countDocuments({ orgId: ORG_ID });
    const openIssues = await issuesCollection.countDocuments({
      orgId: ORG_ID,
      status: { $in: ['open', 'in_progress', 'blocked'] },
    });
    const resolvedIssues = await issuesCollection.countDocuments({
      orgId: ORG_ID,
      status: 'resolved',
    });

    console.log('\n[stats]');
    console.log(`tenant: ${ORG_ID.toHexString()}`);
    console.log(`total=${totalIssues}`);
    console.log(`open=${openIssues}`);
    console.log(`resolved=${resolvedIssues}`);
  } finally {
    await client.close();
    console.log('\n[done] MongoDB connection closed');
  }
}

importIssues().catch((error) => {
  console.error('\nFATAL:', error);
  process.exit(1);
});
