import crypto from 'crypto';
import BacklogIssue from '@/server/models/BacklogIssue';
import BacklogEvent from '@/server/models/BacklogEvent';
import { parsePendingMasterMarkdown } from './parsePendingMaster';

function inferPriority(text: string): 'P0' | 'P1' | 'P2' | 'P3' {
  const t = text.toLowerCase();
  if (t.includes('cross-tenant') || t.includes('data leak') || t.includes('rbac bypass') || t.includes('auth bypass')) return 'P0';
  if (t.includes('authorization') || t.includes('ownership') || t.includes('permission') || t.includes('incorrect')) return 'P1';
  if (t.includes('missing test') || t.includes('coverage') || t.includes('slow') || t.includes('optimize') || t.includes('index')) return 'P2';
  return 'P3';
}

function inferEffort(text: string): 'XS' | 'S' | 'M' | 'L' | 'XL' {
  const t = text.toLowerCase();
  if (t.includes('one-liner') || t.includes('toggle') || t.includes('index')) return 'XS';
  if (t.includes('single file') || t.includes('add guard') || t.includes('add filter')) return 'S';
  if (t.includes('test suite') || t.includes('multiple files')) return 'M';
  if (t.includes('migration') || t.includes('backfill') || t.includes('cross-module')) return 'L';
  if (t.includes('architect') || t.includes('redesign')) return 'XL';
  return 'S';
}

function inferRiskTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags = new Set<string>();
  if (t.includes('auth') || t.includes('rbac') || t.includes('permission')) tags.add('SECURITY');
  if (t.includes('tenant') || t.includes('vendor_id') || t.includes('org')) tags.add('MULTI-TENANT');
  if (t.includes('payment') || t.includes('invoice') || t.includes('billing')) tags.add('FINANCIAL');
  if (t.includes('test') || t.includes('coverage') || t.includes('flaky')) tags.add('TEST-GAP');
  if (t.includes('index') || t.includes('lean()') || t.includes('projection') || t.includes('optimize') || t.includes('slow')) tags.add('PERF');
  if (t.includes('migration') || t.includes('backfill') || t.includes('integrity')) tags.add('DATA');
  return Array.from(tags);
}

function impactFrom(priority: string, tags: string[]) {
  if (priority === 'P0') return 10;
  if (priority === 'P1') return tags.includes('SECURITY') ? 8 : 7;
  if (priority === 'P2') return 5;
  return 3;
}

function stableKey(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

export async function importPendingMaster(md: string, actor = 'system:importer') {
  const parsed = parsePendingMasterMarkdown(md);

  let upserted = 0;

  for (const item of parsed) {
    const base = `${item.externalId || ''}|${item.category}|${item.title}|${item.rawSource}`;
    const key = item.externalId || stableKey(base);

    const triageText = `${item.title}\n${item.description}\n${item.action}\n${item.rawSource}`;
    const priority = inferPriority(triageText);
    const effort = inferEffort(triageText);
    const riskTags = inferRiskTags(triageText);
    const impact = impactFrom(priority, riskTags);

    const now = new Date();

    type ExistingIssue = { firstSeen?: Date; mentionCount?: number; sourceEntries?: string[]; status?: string };
    const existing = await (/* PLATFORM-WIDE */ BacklogIssue.findOne({ key }).lean()) as ExistingIssue | null;

    const firstSeen = existing?.firstSeen ? new Date(existing.firstSeen) : now;
    const mentionCount = (existing?.mentionCount || 0) + 1;
    const sourceEntries = Array.from(new Set([...(existing?.sourceEntries || []), ...(item.sourceEntries || [])]));

    const nextStatus =
      existing?.status === 'resolved' ? 'pending' : (existing?.status || 'pending');

    await (/* PLATFORM-WIDE */ BacklogIssue.updateOne(
      { key },
      {
        $set: {
          key,
          externalId: item.externalId,
          category: item.category,
          title: item.title,
          description: item.description,
          action: item.action,
          location: item.location,
          priority,
          effort,
          riskTags,
          impact,
          status: nextStatus,
          firstSeen,
          lastSeen: now,
          mentionCount,
          sourceEntries,
          rawSource: item.rawSource,
          sourcePath: 'PENDING_MASTER.md',
        },
      },
      { upsert: true }
    ));

    await (/* PLATFORM-WIDE */ BacklogEvent.create({
      issueKey: key,
      type: 'import',
      message: existing ? 'Updated from PENDING_MASTER.md import' : 'Created from PENDING_MASTER.md import',
      actor,
      meta: { externalId: item.externalId, priority, effort, impact },
    }));

    upserted += 1;
  }

  return { upserted };
}
