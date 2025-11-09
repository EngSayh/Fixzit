/**
 * Owner Portal API - Unit History
 * 
 * GET /api/owner/units/[unitId]/history
 * Returns historical data for a specific unit including:
 * - Tenant history
 * - Maintenance history
 * - Inspection records (move-in/move-out)
 * - Revenue history
 * - Utility consumption
 * 
 * Query Parameters:
 * - include: comma-separated list of data to include
 *   Options: tenants, maintenance, inspections, revenue, utilities
 *   Default: all
 * - startDate: ISO date string (optional) - filter from date
 * - endDate: ISO date string (optional) - filter to date
 * 
 * Requires: BASIC subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { requireSubscription } from '@/server/middleware/subscriptionCheck';
import { Property } from '@/server/models/Property';
import { setTenantContext } from '@/server/plugins/tenantIsolation';

export async function GET(
  req: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    // Check subscription
    const subCheck = await requireSubscription(req, {
      requirePlan: 'BASIC'
    });
    
    if (subCheck.error) {
      return subCheck.error;
    }
    
    const { ownerId, orgId } = subCheck;
    
    // Parse parameters
    const { searchParams } = new URL(req.url);
    const includeParam = searchParams.get('include') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    const includeOptions = includeParam === 'all' 
      ? ['tenants', 'maintenance', 'inspections', 'revenue', 'utilities']
      : includeParam.split(',');
    
    // Date filters
    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (startDateParam) dateFilter.$gte = new Date(startDateParam);
    if (endDateParam) dateFilter.$lte = new Date(endDateParam);
    
    // Connect to database and set tenant context
    await connectToDatabase();
    setTenantContext({ orgId });
    
    // Import Mongoose models
    const { WorkOrder } = await import('@/server/models/WorkOrder');
    const { MoveInOutInspectionModel: MoveInOutInspection } = await import('@/server/models/owner/MoveInOutInspection');
    const { Payment } = await import('@/server/models/finance/Payment');
    const { UtilityBillModel: UtilityBill } = await import('@/server/models/owner/UtilityBill');
    
    // Find property and unit using Mongoose
    const property = await Property.findOne({
      'ownerPortal.ownerId': ownerId,
      'units.unitNumber': params.unitId
    }).lean();
    
    if (!property || Array.isArray(property)) {
      return NextResponse.json(
        { error: 'Unit not found or access denied' },
        { status: 404 }
      );
    }
    
    const unit = property.units?.find((u: { unitNumber: string }) => u.unitNumber === params.unitId);
    
    if (!unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      );
    }
    
    // Build response data
    const historyData: Record<string, unknown> = {
      unit: {
        unitNumber: unit.unitNumber,
        type: unit.type,
        area: unit.area,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        status: unit.status
      }
    };
    
    // Tenant History
    if (includeOptions.includes('tenants')) {
      // In production, this would query a Tenant/Lease collection
      // For now, using data from property model
      historyData.tenants = unit.tenant ? [{
        name: unit.tenant.name,
        contact: unit.tenant.contact,
        leaseStart: unit.tenant.leaseStart,
        leaseEnd: unit.tenant.leaseEnd,
        monthlyRent: unit.tenant.monthlyRent,
        status: unit.status === 'OCCUPIED' ? 'CURRENT' : 'PAST'
      }] : [];
    }
    
    // Maintenance History (using Mongoose model)
    if (includeOptions.includes('maintenance')) {
      const maintenanceMatch: Record<string, unknown> = {
        'property.propertyId': property._id,
        'property.unitNumber': params.unitId,
        status: 'COMPLETED'
      };
      
      if (dateFilter.$gte || dateFilter.$lte) {
        maintenanceMatch.completedDate = dateFilter;
      }
      
      const workOrders = await WorkOrder.find(maintenanceMatch)
        .sort({ completedDate: -1 })
        .limit(50)
        .lean();
      
      historyData.maintenance = workOrders.map(wo => ({
        workOrderNumber: wo.workOrderNumber,
        title: wo.title,
        category: wo.category,
        priority: wo.priority,
        cost: wo.cost?.total,
        completedDate: wo.completedDate,
        vendor: wo.vendor?.name
      }));
    }
    
    // Inspection History (using Mongoose model)
    if (includeOptions.includes('inspections')) {
      const inspectionMatch: Record<string, unknown> = {
        propertyId: property._id,
        unitNumber: params.unitId,
        status: { $in: ['COMPLETED', 'APPROVED'] }
      };
      
      if (dateFilter.$gte || dateFilter.$lte) {
        inspectionMatch.actualDate = dateFilter;
      }
      
      const inspections = await MoveInOutInspection.find(inspectionMatch)
        .sort({ actualDate: -1 })
        .limit(20)
        .lean();
      
      historyData.inspections = inspections.map((insp: any) => {
        return {
          inspectionNumber: insp.inspectionNumber,
          type: insp.type,
          date: insp.actualDate,
          overallCondition: insp.overallCondition,
          issuesFound: insp.issues?.length || 0,
          signatures: {
            owner: insp.signatures?.owner?.signed || false,
            tenant: insp.signatures?.tenant?.signed || false,
            inspector: insp.signatures?.inspector?.signed || false
          }
        };
      });
    }
    
    // Revenue History (using Mongoose model)
    if (includeOptions.includes('revenue')) {
      const paymentMatch: Record<string, unknown> = {
        propertyId: property._id,
        unitNumber: params.unitId,
        status: 'PAID'
      };
      
      if (dateFilter.$gte || dateFilter.$lte) {
        paymentMatch.paymentDate = dateFilter;
      }
      
      const payments = await Payment.find(paymentMatch)
        .sort({ paymentDate: -1 })
        .limit(50)
        .lean();
      
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      historyData.revenue = {
        total: totalRevenue,
        payments: payments.map(p => ({
          amount: p.amount,
          date: p.paymentDate,
          method: p.method,
          reference: p.reference,
          tenant: p.tenantName
        }))
      };
    }
    
    // Utility Consumption (using Mongoose model)
    if (includeOptions.includes('utilities')) {
      const billMatch: Record<string, unknown> = {
        propertyId: property._id,
        unitNumber: params.unitId
      };
      
      if (dateFilter.$gte || dateFilter.$lte) {
        billMatch['period.endDate'] = dateFilter;
      }
      
      const utilityBills = await UtilityBill.find(billMatch)
        .sort({ 'period.endDate': -1 })
        .limit(24) // Last 2 years of monthly bills
        .lean();
      
      const totalUtilityCost = utilityBills.reduce((sum: number, b: any) => {
        return sum + (b.charges?.totalAmount || 0);
      }, 0);
      
      historyData.utilities = {
        totalCost: totalUtilityCost,
        bills: utilityBills.map((b: any) => {
          return {
            billNumber: b.billNumber,
            utilityType: b.meterId, // Would need to lookup meter details
            period: {
              start: b.period?.startDate,
              end: b.period?.endDate
            },
            consumption: b.readings?.consumption,
            amount: b.charges?.totalAmount,
            status: b.payment?.status
          };
        })
      };
    }
    
    return NextResponse.json({
      success: true,
      data: historyData,
      subscription: subCheck.status
    });
    
  } catch (error) {
    console.error('Error fetching unit history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch unit history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
