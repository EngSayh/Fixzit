import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

export async function GET(req: NextRequest) {
  try {
    await db;
    const user = await getSessionUser(req).catch(() => null);
    
    // Only allow admin/support users to view aggregated errors
    if (!user || !['SUPER_ADMIN', 'SUPPORT', 'CORPORATE_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const timeRange = url.searchParams.get('timeRange') || '24h';
    const module = url.searchParams.get('module');
    const severity = url.searchParams.get('severity');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: startTime },
          ...(module && { module }),
          ...(severity && { severity })
        }
      },
      {
        $group: {
          _id: {
            errorCode: '$errorCode',
            module: '$module',
            category: '$category'
          },
          count: { $sum: 1 },
          firstOccurrence: { $min: '$createdAt' },
          lastOccurrence: { $max: '$createdAt' },
          severity: { $first: '$severity' },
          userFacing: { $first: '$userFacing' },
          autoTicket: { $first: '$autoTicket' },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueOrgs: { $addToSet: '$orgId' }
        }
      },
      {
        $project: {
          errorCode: '$_id.errorCode',
          module: '$_id.module',
          category: '$_id.category',
          count: 1,
          firstOccurrence: 1,
          lastOccurrence: 1,
          severity: 1,
          userFacing: 1,
          autoTicket: 1,
          uniqueUserCount: { $size: '$uniqueUsers' },
          uniqueOrgCount: { $size: '$uniqueOrgs' }
        }
      },
      {
        $sort: { count: -1, lastOccurrence: -1 }
      },
      {
        $limit: limit
      }
    ];

    const dbInstance = await db;
    const collection = dbInstance.collection('error_events');
    const aggregatedErrors = await collection.aggregate(pipeline).toArray();

    // Get summary statistics
    const summaryPipeline = [
      {
        $match: {
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: null,
          totalErrors: { $sum: 1 },
          uniqueIncidents: { $addToSet: '$incidentId' },
          bySeverity: {
            $push: {
              severity: '$severity',
              count: 1
            }
          },
          byModule: {
            $push: {
              module: '$module',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          totalErrors: 1,
          uniqueIncidentCount: { $size: '$uniqueIncidents' },
          severityBreakdown: {
            $reduce: {
              input: '$bySeverity',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{
                        k: '$$this.severity',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.severity', input: '$$value' } }, 0] }, 1] }
                      }]
                    ]
                  }
                ]
              }
            }
          },
          moduleBreakdown: {
            $reduce: {
              input: '$byModule',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{
                        k: '$$this.module',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.module', input: '$$value' } }, 0] }, 1] }
                      }]
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ];

    const summary = await collection.aggregate(summaryPipeline).toArray();

    return NextResponse.json({
      success: true,
      timeRange,
      summary: summary[0] || {
        totalErrors: 0,
        uniqueIncidentCount: 0,
        severityBreakdown: {},
        moduleBreakdown: {}
      },
      aggregatedErrors,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error aggregation failed:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate errors' },
      { status: 500 }
    );
  }
}