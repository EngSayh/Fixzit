/**
 * @fileoverview Superadmin Issues Import API - PENDING_MASTER.md Importer
 *
 * Imports backlog issues from PENDING_MASTER.md file into MongoDB BacklogIssue collection
 * with automatic parsing, deduplication, and audit trail creation.
 *
 * @security Requires superadmin session
 * @see {@link /lib/backlog/importPendingMaster.ts} for parsing logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { connectMongo } from '@/lib/db/mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { importPendingMaster } from '@/lib/backlog/importPendingMaster';

/**
 * POST /api/superadmin/issues/import - Import issues from PENDING_MASTER.md
 *
 * Reads PENDING_MASTER.md from project root (fallback to docs/PENDING_MASTER.md)
 * and imports all backlog issues into MongoDB.
 * Creates/updates BacklogIssue records and generates BacklogEvent audit entries.
 *
 * @param {NextRequest} req - Next.js request object (no body required)
 *
 * @returns {Promise<NextResponse>} JSON response with import results
 * @returns {200} Success - { success: true, created: number, updated: number, skipped: number }
 * @returns {401} Unauthorized - Superadmin session required
 * @returns {404} Not Found - PENDING_MASTER.md file missing from expected locations
 *
 * @example
 * POST /api/superadmin/issues/import
 * // Returns: { success: true, created: 5, updated: 3, skipped: 2 }
 *
 * @security
 * - Requires valid superadmin session
 * - Reads PENDING_MASTER.md from filesystem (server-side only)
 * - Actor recorded as session.username for audit trail
 *
 * @performance
 * - Parses entire PENDING_MASTER.md file (typically 500-2000 lines)
 * - Batch MongoDB operations (not transactional)
 * - Average execution time: 2-5 seconds for 50-100 issues
 */
export async function POST(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const pendingPaths = [
    path.join(process.cwd(), 'PENDING_MASTER.md'),
    path.join(process.cwd(), 'docs', 'PENDING_MASTER.md'),
  ];

  const readPendingMaster = async (pendingPath: string) => {
    try {
      return await fs.readFile(pendingPath, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err?.code === 'ENOENT') return null;
      throw error;
    }
  };

  let md: string | null = null;
  for (const pendingPath of pendingPaths) {
    md = await readPendingMaster(pendingPath);
    if (md) break;
  }

  if (!md) {
    return NextResponse.json({ error: 'PENDING_MASTER.md not found' }, { status: 404 });
  }

  const result = await importPendingMaster(md, session.username);

  return NextResponse.json({ success: true, ...result });
}
