/**
 * Owner Portal API - Owner Statements
 * 
 * GET /api/owner/statements
 * Generates comprehensive financial statements for owner
 * Similar to bank statements showing all income and expenses
 * 
 * Query Parameters:
 * - period: "MTD" | "QTD" | "YTD" | "CUSTOM" (default: "MTD")
 * - startDate: ISO date string (required if period=CUSTOM)
 * - endDate: ISO date string (required if period=CUSTOM)
 * - propertyId: ObjectId (optional) - specific property filter
 * - format: "json" | "pdf" | "excel" (default: "json")
 * 
 * Requires: BASIC subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { requireSubscription } from '@/server/middleware/subscriptionCheck';
import { setTenantContext } from '@/server/plugins/tenantIsolation';

interface StatementLine {
  date: Date;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  reference: string;
  propertyName?: string;
  unitNumber?: string;
}

export async function GET(req: NextRequest) {
  try {
    // Check subscription
    const subCheck = await requireSubscription(req, {
      requirePlan: 'BASIC'
    });
    
    if (subCheck.error) {
      return subCheck.error;
    }
    
    const { ownerId, orgId } = subCheck;
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get('period') || 'MTD';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const propertyIdParam = searchParams.get('propertyId');
    const format = searchParams.get('format') || 'json';
    
    // Determine date range
    let startDate: Date;
    let endDate: Date = new Date();
    const now = new Date();
    
    switch (periodParam) {
      case 'MTD': // Month to date
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'QTD': { // Quarter to date
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'YTD': // Year to date
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'CUSTOM':
        if (!startDateParam || !endDateParam) {
          return NextResponse.json(
            { error: 'startDate and endDate required for CUSTOM period' },
            { status: 400 }
          );
        }
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid period parameter' },
          { status: 400 }
        );
    }
    
    // Connect to database and set tenant context
    await connectToDatabase();
    setTenantContext({ orgId });
    
    // Import Mongoose models
    const { Property } = await import('@/server/models/Property');
    const { Payment } = await import('@/server/models/finance/Payment');
    const { WorkOrder } = await import('@/server/models/WorkOrder');
    const { UtilityBillModel: UtilityBill } = await import('@/server/models/owner/UtilityBill');
    const { AgentContractModel: AgentContract } = await import('@/server/models/owner/AgentContract');
    
    // Build property filter
    const propertyFilter: Record<string, unknown> = {
      'ownerPortal.ownerId': ownerId
    };
    
    if (propertyIdParam) {
      propertyFilter._id = new Types.ObjectId(propertyIdParam);
    }
    
    // Get properties using Mongoose model
    const properties = await Property.find(propertyFilter).select('_id name code').lean();
    const propertyIds = properties.map(p => p._id as Types.ObjectId);
    const propertyMap = new Map(properties.map(p => [(p._id as Types.ObjectId).toString(), p]));
    
    // Collect all statement lines
    const statementLines: StatementLine[] = [];
    
    // 1. INCOME - Rent Payments (using Mongoose model)
    const payments = await Payment.find({
      propertyId: { $in: propertyIds },
      paymentDate: { $gte: startDate, $lte: endDate },
      status: 'PAID'
    }).lean();
    
    payments.forEach((payment: any) => {
      const property = propertyMap.get(payment.propertyId?.toString() || '');
      statementLines.push({
        date: payment.paymentDate,
        description: `Rent Payment - ${payment.tenantName || 'Unknown'}`,
        type: 'INCOME',
        category: 'RENTAL_INCOME',
        amount: payment.amount,
        reference: payment.reference || payment._id?.toString(),
        propertyName: property?.name,
        unitNumber: payment.unitNumber
      });
    });
    
    // 2. EXPENSES - Maintenance (Work Orders using Mongoose model)
    const workOrders = await WorkOrder.find({
      'property.propertyId': { $in: propertyIds },
      status: 'COMPLETED',
      completedDate: { $gte: startDate, $lte: endDate },
      'cost.total': { $gt: 0 }
    }).lean();
    
    workOrders.forEach((wo: any) => {
      const property = propertyMap.get(wo.property?.propertyId?.toString() || '');
      statementLines.push({
        date: wo.completedDate,
        description: `Maintenance - ${wo.title}`,
        type: 'EXPENSE',
        category: 'MAINTENANCE',
        amount: wo.cost?.total || 0,
        reference: wo.workOrderNumber,
        propertyName: property?.name,
        unitNumber: wo.property?.unitNumber
      });
    });
    
    // 3. EXPENSES - Utilities (using Mongoose model)
    const utilityBills = await UtilityBill.find({
      propertyId: { $in: propertyIds },
      'responsibility.ownerId': ownerId,
      'period.endDate': { $gte: startDate, $lte: endDate },
      'payment.status': 'PAID'
    }).lean();
    
    utilityBills.forEach((bill: any) => {
      const property = propertyMap.get(bill.propertyId?.toString());
      statementLines.push({
        date: bill.payment?.paidDate || bill.period?.endDate,
        description: `Utility - ${bill.utilityType}`,
        type: 'EXPENSE',
        category: 'UTILITIES',
        amount: bill.totalAmount || 0,
        reference: bill.billNumber,
        propertyName: property?.name,
        unitNumber: bill.unitNumber
      });
    });
    
    // 4. EXPENSES - Agent Commissions (using Mongoose model aggregate)
    const agentPayments = await AgentContract.aggregate([
      {
        $match: {
          ownerId,
          status: 'ACTIVE'
        }
      },
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'agentContractId',
          as: 'commissionPayments'
        }
      },
      {
        $unwind: '$commissionPayments'
      },
      {
        $match: {
          'commissionPayments.paymentDate': { $gte: startDate, $lte: endDate },
          'commissionPayments.type': 'COMMISSION'
        }
      }
    ]);
    
    agentPayments.forEach((contract: any) => {
      statementLines.push({
        date: contract.commissionPayments?.paymentDate || new Date(),
        description: `Agent Commission - ${contract.agentName}`,
        type: 'EXPENSE',
        category: 'AGENT_COMMISSION',
        amount: contract.commissionPayments?.amount || 0,
        reference: contract.commissionPayments?.reference || contract.contractNumber,
        propertyName: undefined
      });
    });
    
    // Sort by date (most recent first)
    statementLines.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Calculate totals
    const totalIncome = statementLines
      .filter(l => l.type === 'INCOME')
      .reduce((sum, l) => sum + l.amount, 0);
    
    const totalExpenses = statementLines
      .filter(l => l.type === 'EXPENSE')
      .reduce((sum, l) => sum + l.amount, 0);
    
    const netIncome = totalIncome - totalExpenses;
    
    // Breakdown by category
    const incomeByCategory: Record<string, number> = {};
    const expensesByCategory: Record<string, number> = {};
    
    statementLines.forEach(line => {
      if (line.type === 'INCOME') {
        incomeByCategory[line.category] = (incomeByCategory[line.category] || 0) + line.amount;
      } else {
        expensesByCategory[line.category] = (expensesByCategory[line.category] || 0) + line.amount;
      }
    });
    
    const statement = {
      period: {
        start: startDate,
        end: endDate,
        label: periodParam
      },
      summary: {
        totalIncome,
        totalExpenses,
        netIncome,
        profitMargin: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0
      },
      breakdown: {
        income: incomeByCategory,
        expenses: expensesByCategory
      },
      lines: statementLines,
      generatedAt: new Date()
    };
    
    // Handle different output formats
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: statement,
        subscription: subCheck.status
      });
    } else {
      // PDF and Excel would require additional libraries
      return NextResponse.json(
        { error: 'PDF and Excel formats not yet implemented' },
        { status: 501 } // Not Implemented
      );
    }
    
  } catch (error) {
    console.error('Error generating owner statement:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate statement',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
