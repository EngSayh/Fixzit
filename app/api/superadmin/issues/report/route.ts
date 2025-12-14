import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/superadmin/require';
import { connectMongo } from '@/lib/db/mongoose';
import BacklogIssue from '@/server/models/BacklogIssue';

export async function GET(req: NextRequest) {
  const sa = await requireSuperadmin();
  if (!sa) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';

  const issues = await BacklogIssue.find().sort({ priority: 1, impact: -1 }).lean();

  const total = issues.length;
  const byStatus = Object.fromEntries(
    ['pending', 'in_progress', 'resolved', 'wont_fix'].map((s) => [
      s,
      issues.filter((i) => i.status === s).length,
    ])
  );
  const byPriority = Object.fromEntries(
    ['P0', 'P1', 'P2', 'P3'].map((p) => [p, issues.filter((i) => i.priority === p).length])
  );
  const byCategory = Object.fromEntries(
    ['bug', 'logic', 'test', 'efficiency', 'next_step'].map((c) => [
      c,
      issues.filter((i) => i.category === c).length,
    ])
  );

  const data = { total, byStatus, byPriority, byCategory, issues };

  if (format === 'markdown') {
    const md = generateMarkdownReport(data);
    return new NextResponse(md, {
      headers: { 'Content-Type': 'text/markdown' },
    });
  }

  return NextResponse.json(data);
}

function generateMarkdownReport(data: {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  issues: unknown[];
}) {
  let md = `# Backlog Report\n\n`;
  md += `Total issues: ${data.total}\n\n`;
  md += `## By Status\n`;
  for (const [k, v] of Object.entries(data.byStatus)) {
    md += `- ${k}: ${v}\n`;
  }
  md += `\n## By Priority\n`;
  for (const [k, v] of Object.entries(data.byPriority)) {
    md += `- ${k}: ${v}\n`;
  }
  md += `\n## By Category\n`;
  for (const [k, v] of Object.entries(data.byCategory)) {
    md += `- ${k}: ${v}\n`;
  }
  return md;
}
