import { NextResponse } from 'next/server';
import { FMPMPlan } from '@/src/server/models/FMPMPlan';

/**
 * GET /api/pm/plans/[id]
 * Get single PM plan by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    
    const plan = await FMPMPlan.findById(params.id);
    
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
    console.error('[API] Failed to fetch PM plan:', error);
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
  { params }: { params: { id: string } }
) {
  try {
    
    const body = await request.json();
    
    const plan = await FMPMPlan.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: true }
    );
    
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
    console.error('[API] Failed to update PM plan:', error);
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
  { params }: { params: { id: string } }
) {
  try {
    
    const plan = await FMPMPlan.findByIdAndUpdate(
      params.id,
      { $set: { status: 'INACTIVE' } },
      { new: true }
    );
    
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
    console.error('[API] Failed to delete PM plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete PM plan' },
      { status: 500 }
    );
  }
}
