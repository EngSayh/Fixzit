import { NextResponse } from 'next/server';
import { WorkOrder } from '@/server/models/WorkOrder';

import { logger } from '@/lib/logger';
import { parseDate } from '@/lib/date-utils';

interface WorkOrderWithSLA {
  workOrderNumber: string;
  title: string;
  status: string;
  priority: string;
  sla?: {
    resolutionDeadline?: Date | string;
    responseDeadline?: Date | string;
  };
}

/**
 * POST /api/work-orders/sla-check
 * Check for SLA breaches and send escalation notifications
 * 
 * This endpoint should be called by a cron job (e.g., every 15 minutes)
 * It identifies work orders approaching or breaching their SLA deadlines
 */
export async function POST() {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    
    // Find work orders that:
    // 1. Are not closed/cancelled
    // 2. Have SLA deadline approaching (within 2 hours) or breached
    const workOrders = await WorkOrder.find({
      status: { $nin: ['CLOSED', 'CANCELLED', 'ARCHIVED'] },
      'sla.resolutionDeadline': { $exists: true, $lte: twoHoursFromNow }
    }).lean();
    
    const results = {
      checked: await WorkOrder.countDocuments({
        status: { $nin: ['CLOSED', 'CANCELLED', 'ARCHIVED'] },
        'sla.resolutionDeadline': { $exists: true }
      }),
      atRisk: 0,
      breached: 0,
      notifications: [] as Array<{ woNumber: string; status: string; timeRemaining: string }>
    };
    
    for (const wo of workOrders) {
      // Schema has responseDeadline/resolutionDeadline
      const woTyped = wo as WorkOrderWithSLA;
      const deadline = parseDate(woTyped.sla?.resolutionDeadline, () => new Date());
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        // SLA Breached
        results.breached++;
        const overdue = Math.abs(diff);
        const hours = Math.floor(overdue / (1000 * 60 * 60));
        
        // In real implementation, send escalation notifications here
        logger.info(`[SLA] BREACH: WO ${wo.workOrderNumber} is ${hours}h overdue`);
        
        results.notifications.push({
          woNumber: wo.workOrderNumber as string,
          status: 'BREACHED',
          timeRemaining: `${hours}h overdue`
        });
      } else {
        // At Risk (within 2 hours)
        results.atRisk++;
        const minutes = Math.floor(diff / (1000 * 60));
        
        logger.info(`[SLA] WARNING: WO ${wo.workOrderNumber} due in ${minutes}m`);
        
        results.notifications.push({
          woNumber: wo.workOrderNumber as string,
          status: 'AT_RISK',
          timeRemaining: `${minutes}m remaining`
        });
      }
    }
    
    logger.info('[SLA] Check complete:', { results });
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('[API] SLA check failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'SLA check failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/work-orders/sla-check
 * Preview SLA status without sending notifications
 */
export async function GET() {
  try {
    const now = new Date();
    
    const allWorkOrders = await WorkOrder.find({
      status: { $nin: ['CLOSED', 'CANCELLED', 'ARCHIVED'] },
      'sla.resolutionDeadline': { $exists: true }
    }).lean();
    
    const preview = {
      total: allWorkOrders.length,
      safe: 0,
      warning: 0,
      critical: 0,
      breached: 0,
      workOrders: allWorkOrders.map((wo) => {
        const woTyped = wo as WorkOrderWithSLA;
        const deadline = parseDate(woTyped.sla?.resolutionDeadline, () => new Date());
        const diff = deadline.getTime() - now.getTime();
        const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
        
        let urgency: 'safe' | 'warning' | 'critical' | 'breached';
        if (diff <= 0) {
          urgency = 'breached';
          preview.breached++;
        } else if (hours < 2) {
          urgency = 'critical';
          preview.critical++;
        } else if (hours < 4) {
          urgency = 'warning';
          preview.warning++;
        } else {
          urgency = 'safe';
          preview.safe++;
        }
        
        return {
          woNumber: wo.workOrderNumber,
          title: wo.title,
          status: wo.status,
          priority: wo.priority,
          deadline: wo.sla?.resolutionDeadline,
          urgency,
          hoursRemaining: diff > 0 ? hours : -hours
        };
      }).sort((a, b) => a.hoursRemaining - b.hoursRemaining)
    };
    
    return NextResponse.json({
      success: true,
      data: preview
    });
  } catch (error) {
    logger.error('[API] SLA preview failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'SLA preview failed' },
      { status: 500 }
    );
  }
}
