// app/api/admin/error-registry/route.ts - Export error registry as CSV/JSON
import { NextRequest, NextResponse } from 'next/server';
import { exportErrorRegistry, ERROR_REGISTRY } from '@/src/errors/registry';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * HTTP GET handler that exports the application's error registry as a downloadable CSV or JSON file.
 *
 * Authenticates the session user (requires role "SUPER_ADMIN" or "ADMIN"); responds 401 if unauthorized.
 * Reads the `format` query parameter (allowed values: `"csv"`, `"json"`, defaults to `"json"`), calls
 * `exportErrorRegistry(format)` to produce the payload, and returns it as an attachment named
 * `error-registry-<YYYY-MM-DD>.<format>` with the appropriate `Content-Type` (`text/csv` or `application/json`).
 *
 * On unexpected failures, logs the error and responds with a 500 JSON payload: `{ error: "Failed to export registry" }`.
 *
 * @param req - Incoming NextRequest; used for authentication and to read the `format` query parameter.
 * @returns A NextResponse containing the exported file on success, or a 401/500 response on failure.
 */
export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const user = await getSessionUser(req);
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Get format from query params
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') as 'csv' | 'json' || 'json';
    
    // Export registry
    const data = exportErrorRegistry(format);
    
    // Set appropriate headers
    const headers: HeadersInit = {
      'Content-Disposition': `attachment; filename=error-registry-${new Date().toISOString().split('T')[0]}.${format}`,
    };
    
    if (format === 'csv') {
      headers['Content-Type'] = 'text/csv';
    } else {
      headers['Content-Type'] = 'application/json';
    }
    
    return new NextResponse(data, { headers });
    
  } catch (error) {
    console.error('Error exporting registry:', error);
    return NextResponse.json({ error: 'Failed to export registry' }, { status: 500 });
  }
}
