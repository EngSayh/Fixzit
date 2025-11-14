import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { FMPMPlan } from '@/server/models/FMPMPlan';

/**
 * GET /api/pm/plans/[id]
 * Get single PM plan by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = (await FMPMPlan.findById(id)) as any;
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'PM plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: plan
    });
  } catch (error) {
    logger.error('[API] Failed to fetch PM plan:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PM plan' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pm/plans/[id]
 * Update PM plan
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const plan = (await FMPMPlan.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    )) as any;
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'PM plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: plan
    });
  } catch (error) {
    logger.error('[API] Failed to update PM plan:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to update PM plan' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pm/plans/[id]
 * Delete PM plan (soft delete - set status to INACTIVE)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = (await FMPMPlan.findByIdAndUpdate(
      id,
      { $set: { status: 'INACTIVE' } },
      { new: true }
    )) as any;
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'PM plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'PM plan deactivated'
    });
  } catch (error) {
    logger.error('[API] Failed to delete PM plan:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to delete PM plan' },
      { status: 500 }
    );
  }
}
