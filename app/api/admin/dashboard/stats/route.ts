import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const stats = {
      totalUsers: 234,
      activeUsers: 189,
      systemUptime: 99.8,
      apiCalls24h: 45620,
      storageUsed: 67.3,
      errorRate: 0.02,
      avgResponseTime: 124,
      scheduledJobs: 42,
      pendingTasks: 16,
      securityAlerts: 2
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}