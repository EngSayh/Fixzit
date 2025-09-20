import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const systemReport = {
      health: 'healthy',
      cpu: {
        usage: 34.5,
        cores: 4,
        temperature: 45
      },
      memory: {
        total: 16384,
        used: 8234,
        free: 8150,
        percentage: 50.2
      },
      disk: {
        total: 512000,
        used: 344576,
        free: 167424,
        percentage: 67.3
      },
      network: {
        inbound: '124 MB/s',
        outbound: '89 MB/s',
        connections: 234
      },
      services: [
        { name: 'Database', status: 'running', uptime: '14d 3h' },
        { name: 'Cache', status: 'running', uptime: '14d 3h' },
        { name: 'Queue', status: 'running', uptime: '14d 3h' },
        { name: 'Storage', status: 'running', uptime: '14d 3h' }
      ],
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json(systemReport);
  } catch (error) {
    console.error('Error fetching system report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}