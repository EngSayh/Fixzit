import { NextRequest, NextResponse } from 'next/server';
import getServerSession from 'next-auth';
import { authOptions } from '@/auth';
import { AuditLogModel } from '@/server/models/AuditLog';
import { connectDb } from '@/lib/mongo';

/**
 * GET /api/admin/audit-logs
 * 
 * Fetch audit logs with filters (Super Admin only)
 */
export async function GET(request: NextRequest) {
  try {
  const session = (await getServerSession(authOptions)) as any;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }
    
  await connectDb();
    
    // Get query parameters
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    
    // Search logs
    const logs = await (AuditLogModel as any).search({
      orgId: session.user.orgId || 'default',
      userId: userId || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      skip,
    });
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
