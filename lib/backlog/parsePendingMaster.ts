export type ParsedIssue = {
  externalId?: string;
  category: 'bug' | 'logic' | 'test' | 'efficiency' | 'next_step';
  title: string;
  description: string;
  action: string;
  location?: { file?: string; lines?: string; section?: string };
  rawSource: string;
  sourceEntries: string[];
};

const PENDING_MARKERS = ['🔲', '🟡', '⏳', '⚠️', 'TODO', 'Pending', 'Investigate', 'In Progress', 'Needs', 'Open'];
const DONE_MARKERS = ['✅', '🟢', 'Fixed', 'Done', 'Completed', 'Landed', 'Added', 'Resolved'];

function isDone(line: string) {
  const l = line.toLowerCase();
  return DONE_MARKERS.some((m) => l.includes(m.toLowerCase()));
}

function isPending(line: string) {
  const l = line.toLowerCase();
  return PENDING_MARKERS.some((m) => l.includes(m.toLowerCase()));
}

function extractExternalId(text: string) {
  const m = text.match(/\b(BUG|LOGIC|TEST|EFF|NEXT)[-_ ]?\d+\b/i);
  return m ? m[0].replace(/\s+/g, '-').toUpperCase() : undefined;
}

function inferCategoryFromHeader(h: string): ParsedIssue['category'] | null {
  const t = h.toLowerCase();
  if (t.includes('bug')) return 'bug';
  if (t.includes('logic')) return 'logic';
  if (t.includes('missing test') || t.includes('tests')) return 'test';
  if (t.includes('efficiency') || t.includes('performance') || t.includes('perf')) return 'efficiency';
  if (t.includes('next steps') || t.includes('planned next')) return 'next_step';
  return null;
}

export function parsePendingMasterMarkdown(md: string): ParsedIssue[] {
  const lines = md.split('\n');
  let category: ParsedIssue['category'] = 'next_step';
  let lastEntryTag = '';

  const out: ParsedIssue[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Date headers (best-effort): "## 2025-12-13" or similar
    const dateHeader = line.match(/^#{1,3}\s+(\d{4}-\d{2}-\d{2})\b/);
    if (dateHeader) lastEntryTag = dateHeader[1];

    // Section headers
    const header = line.match(/^#{2,6}\s+(.*)$/);
    if (header) {
      const c = inferCategoryFromHeader(header[1]);
      if (c) category = c;
      continue;
    }

    // Skip done
    if (isDone(line)) continue;

    // Markdown tables row
    if (line.startsWith('|') && line.includes('|')) {
      if (!isPending(line)) continue;

      const cols = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());

      const externalId = extractExternalId(cols.join(' '));
      const title = (cols.find((c) => c && c !== '—') || '').slice(0, 140) || (externalId ? externalId : 'Pending item');
      const description = cols.join(' | ').slice(0, 2000);
      const action = (cols.slice(2).find((c) => c && !c.includes('🔴') && !c.includes('🟠') && !c.includes('🟡') && !c.includes('🟢')) || '').slice(0, 2000) || 'See source row';

      out.push({
        externalId,
        category,
        title,
        description,
        action,
        location: { section: category },
        rawSource: line,
        sourceEntries: lastEntryTag ? [lastEntryTag] : [],
      });
      continue;
    }

    // Bullets
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      if (!isPending(line)) continue;

      const externalId = extractExternalId(line);
      const title = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').slice(0, 140);
      out.push({
        externalId,
        category,
        title,
        description: line.slice(0, 2000),
        action: 'See source bullet',
        location: { section: category },
        rawSource: line,
        sourceEntries: lastEntryTag ? [lastEntryTag] : [],
      });
    }
  }

  return out;
}
