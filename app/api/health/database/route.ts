import { NextResponse } from 'next/server';
import { checkDatabaseHealth, getDatabase } from '@/lib/mongodb-unified';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const isConnected = await checkDatabaseHealth();
    
    if (!isConnected) {
      return NextResponse.json({
        status: 'unhealthy',
        database: 'mongodb',
        connection: 'failed',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }, { status: 503 });
    }

    const db = await getDatabase();
    const pingResult = await db.admin().ping();
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      database: 'mongodb',
      connection: 'active',
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        ping: pingResult,
        database: db.databaseName
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'mongodb',
      connection: 'error',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 503 });
  }
}

export async function HEAD() {
  try {
    const isHealthy = await checkDatabaseHealth();
    return new NextResponse(null, { 
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': 'error'
      }
    });
  }
}
