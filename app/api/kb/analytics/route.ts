import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/src/lib/db';
import { KbAnalytics } from '@/src/db/models/KbAnalytics';

/**
 * Records an analytics event from the request body into the KbAnalytics collection.
 *
 * Accepts a JSON payload from the incoming NextRequest, connects to the database,
 * creates a KbAnalytics document by merging the request data with a server-side
 * `timestamp` set to the current time, and returns a JSON response indicating success.
 * Errors during tracking are caught and logged; the handler deliberately returns
 * `{ success: true }` even on failure so analytics failures do not impact the caller.
 *
 * @returns A JSON NextResponse with `{ success: true }` (always).
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const data = await req.json();
    
    // Create analytics entry
    await KbAnalytics.create({
      ...data,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track analytics:', error);
    // Don't fail the request for analytics
    return NextResponse.json({ success: true });
  }
}

/**
 * Retrieve aggregated analytics for a knowledge base organization over a specified period.
 *
 * Accepts `orgId` (required) and `period` (optional, defaults to `"7d"`) as URL query parameters.
 * Supported `period` values: `"24h"`, `"7d"`, `"30d"`, `"90d"`. Returns an analytics summary containing:
 * - `period`: the requested period string
 * - `totalSearches`: number of `search` actions since the period start
 * - `popularSearches`: top search queries as `{ query, count }[]`
 * - `topArticles`: top viewed articles as `{ articleId, views }[]`
 * - `helpfulness`: `{ helpful, notHelpful, percentage }` where `percentage` is rounded (0 if no votes)
 *
 * If `orgId` is missing the handler responds with 400 and `{ error: 'Missing orgId' }`.
 * On internal failures it responds with 500 and `{ error: 'Internal server error' }`.
 *
 * @returns A NextResponse JSON payload with the described analytics structure or an error object.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const period = searchParams.get('period') || '7d';
    
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
    }

    // Aggregate analytics
    const [
      totalSearches,
      popularSearches,
      articleViews,
      helpfulnessStats
    ] = await Promise.all([
      // Total searches
      KbAnalytics.countDocuments({
        orgId,
        action: 'search',
        timestamp: { $gte: startDate }
      }),
      
      // Popular searches
      KbAnalytics.aggregate([
        {
          $match: {
            orgId,
            action: 'search',
            searchQuery: { $exists: true },
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$searchQuery',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Article views
      KbAnalytics.aggregate([
        {
          $match: {
            orgId,
            action: 'view',
            articleId: { $exists: true },
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$articleId',
            views: { $sum: 1 }
          }
        },
        { $sort: { views: -1 } },
        { $limit: 10 }
      ]),
      
      // Helpfulness stats
      KbAnalytics.aggregate([
        {
          $match: {
            orgId,
            action: { $in: ['helpful', 'not_helpful'] },
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format helpfulness
    const helpfulness = helpfulnessStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, { helpful: 0, not_helpful: 0 });

    return NextResponse.json({
      period,
      totalSearches,
      popularSearches: popularSearches.map(s => ({
        query: s._id,
        count: s.count
      })),
      topArticles: articleViews.map(a => ({
        articleId: a._id,
        views: a.views
      })),
      helpfulness: {
        helpful: helpfulness.helpful,
        notHelpful: helpfulness.not_helpful,
        percentage: helpfulness.helpful > 0 
          ? Math.round((helpfulness.helpful / (helpfulness.helpful + helpfulness.not_helpful)) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
