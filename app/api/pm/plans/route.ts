import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { FMPMPlan } from '@/server/models/FMPMPlan';

/**
 * GET /api/pm/plans
 * List all PM plans with optional filters
 */
export async function GET(request: Request) {
  try {
    
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    
    const query: Record<string, string> = {};
    if (propertyId) query.propertyId = propertyId;
    if (status) query.status = status;
    if (category) query.category = category;
    
    // @ts-ignore - Mongoose type inference issue with conditional model export
    const plans = (await FMPMPlan.find(query)
      .sort({ nextScheduledDate: 1 })
      .lean()) as any;
    
    return NextResponse.json({
      success: true,
      data: plans,
      count: plans.length
    });
  } catch (error) {
    logger.error('[API] Failed to fetch PM plans:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PM plans' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pm/plans
 * Create new PM plan
 */
export async function POST(request: Request) {
  try {
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.propertyId || !body.recurrencePattern) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create PM plan
    // @ts-ignore - Mongoose type inference issue with conditional model export
    const plan = (await FMPMPlan.create({
      ...body,
      status: body.status || 'ACTIVE',
      nextScheduledDate: body.startDate || new Date()
    })) as any;
    
    return NextResponse.json({
      success: true,
      data: plan
    }, { status: 201 });
  } catch (error) {
    logger.error('[API] Failed to create PM plan:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to create PM plan' },
      { status: 500 }
    );
  }
}
