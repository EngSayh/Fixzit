/**
 * @fileoverview Superadmin SSOT API - Read PENDING_MASTER.md
 *
 * Protected endpoint to serve the canonical SSOT file (docs/PENDING_MASTER.md)
 * for viewing in the Superadmin dashboard.
 *
 * @security Requires superadmin session (getSuperadminSession)
 * @see {@link /docs/PENDING_MASTER.md} for the canonical SSOT file
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * GET /api/superadmin/ssot - Read the canonical SSOT file
 *
 * @param {NextRequest} req - Next.js request object
 *
 * @returns {Promise<NextResponse>} JSON response with SSOT content
 * @returns {200} Success - { content: string, lastModified: string, sizeBytes: number }
 * @returns {401} Unauthorized - Superadmin session required
 * @returns {500} Server Error - File read failed
 *
 * @security
 * - Requires valid superadmin session
 * - Only reads the canonical SSOT file (docs/PENDING_MASTER.md)
 * - No write operations allowed via this endpoint
 */
export async function GET(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Resolve the canonical SSOT file path
    const ssotPath = path.join(process.cwd(), 'docs', 'PENDING_MASTER.md');
    
    // Read file stats for metadata
    const stats = await fs.stat(ssotPath);
    
    // Read file content
    const content = await fs.readFile(ssotPath, 'utf-8');
    
    // Return content with metadata
    return NextResponse.json({
      content,
      lastModified: stats.mtime.toISOString(),
      sizeBytes: stats.size,
      fileName: 'PENDING_MASTER.md',
      path: 'docs/PENDING_MASTER.md',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to read SSOT file', details: message },
      { status: 500 }
    );
  }
}
