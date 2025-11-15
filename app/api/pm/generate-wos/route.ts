import { NextResponse } from 'next/server';
import { FMPMPlan } from '@/server/models/FMPMPlan';

import { logger } from '@/lib/logger';
/**
 * POST /api/pm/generate-wos
 * Auto-generate work orders from PM plans that are due
 * 
 * This endpoint should be called by a cron job (e.g., daily at midnight)
 * It checks all ACTIVE PM plans and generates WOs for those due
 */
export async function POST() {
  try {
    
    // Find all ACTIVE PM plans that should generate WOs now
    const plans = (await FMPMPlan.find({
      status: 'ACTIVE',
      nextScheduledDate: { $exists: true }
    }));
    
    const results = {
      checked: plans.length,
      generated: 0,
      skipped: 0,
      failed: 0,
      workOrders: [] as Array<{ planId: string; planNumber: string; woNumber: string; scheduledFor: Date }>
    };
    
    for (const plan of plans) {
      // Check if plan should generate WO now (considering lead time)
      const shouldGenerate = (plan as unknown as { shouldGenerateNow?: () => boolean }).shouldGenerateNow?.();
      if (!shouldGenerate) {
        results.skipped++;
        continue;
      }
      
      try {
        // In a real implementation, this would call WorkOrder.create()
        // For now, we simulate WO creation and just record it
        // SECURITY: Use crypto-random UUID instead of predictable Date.now() + Math.random()
        const woNumber = `WO-PM-${crypto.randomUUID()}`;
        const workOrderData = {
          title: plan.woTitle,
          description: plan.woDescription || `Preventive maintenance: ${plan.title}`,
          category: plan.woCategory,
          priority: plan.woPriority,
          propertyId: plan.propertyId,
          unitId: plan.unitId,
          type: 'MAINTENANCE',
          status: 'SCHEDULED',
          scheduledDate: plan.nextScheduledDate,
          pmPlanId: plan._id,
          pmPlanNumber: plan.planNumber,
          estimatedCost: plan.estimatedCost,
          budgetCode: plan.budgetCode,
          checklist: plan.checklist
        };
        
        // Log the WO that would be created
        logger.info(`[PM] Generated WO: ${woNumber} from plan ${plan.planNumber}`);
        logger.info(`[PM] WO Data:`, { workOrderData });
        
        // Record generation in plan
        // TODO(type-safety): Add recordGeneration method to PMPlan model
        await (plan as any).recordGeneration(
          plan._id, // In real impl, this would be the actual WorkOrder._id
          woNumber,
          'SUCCESS'
        );
        
        results.generated++;
        results.workOrders.push({
          planId: plan._id.toString(),
          planNumber: plan.planNumber,
          woNumber,
          scheduledFor: plan.nextScheduledDate
        });
      } catch (error) {
        logger.error(`[PM] Failed to generate WO for plan ${plan.planNumber}`, error);
        results.failed++;
      }
    }
    
    logger.info(`[PM] Generation complete:`, { results });
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error(`[API] PM generation failed:`, error);
    return NextResponse.json(
      { success: false, error: 'PM generation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pm/generate-wos
 * Preview which PM plans would generate WOs if run now
 */
export async function GET() {
  try {
    
    const plans = await FMPMPlan.find({
      status: 'ACTIVE',
      nextScheduledDate: { $exists: true }
    }).lean();
    
    const preview = plans.filter((plan: any) => {
      // Manually check shouldGenerateNow logic
      const now = new Date();
      const leadTime = plan.woLeadTimeDays * 24 * 60 * 60 * 1000;
      const generateByDate = new Date(plan.nextScheduledDate.getTime() - leadTime);
      
      return now >= generateByDate && (!plan.lastGeneratedDate || plan.lastGeneratedDate < generateByDate);
    }).map((plan: any) => ({
      planId: plan._id,
      planNumber: plan.planNumber,
      title: plan.title,
      propertyId: plan.propertyId,
      nextScheduledDate: plan.nextScheduledDate,
      woLeadTimeDays: plan.woLeadTimeDays,
      woTitle: plan.woTitle,
      estimatedCost: plan.estimatedCost
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        total: plans.length,
        readyToGenerate: preview.length,
        plans: preview
      }
    });
  } catch (error) {
    logger.error(`[API] PM preview failed:`, error);
    return NextResponse.json(
      { success: false, error: 'PM preview failed' },
      { status: 500 }
    );
  }
}
