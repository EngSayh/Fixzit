// app/api/ai/tools/approve-quote/route.ts - Approve work order quotation
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { canPerformAction, Role, ModuleKey } from '@/src/lib/rbac';
import { ObjectId } from 'mongodb';
import { getDatabase } from 'lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

/**
 * Handle POST requests to approve or reject a work order quotation.
 *
 * Authenticates the current user, validates the JSON payload (requires `workOrderId`), enforces role- and amount-based approval authority, inserts an approval record, updates the work order's quotation status and history, and returns a localized JSON response.
 *
 * Returns a JSON NextResponse with appropriate HTTP status codes:
 * - 200: success with { success: true, data: { workOrderId, action, amount, message } }
 * - 400: missing or invalid input
 * - 401: unauthorized (no current user)
 * - 403: user not authorized to approve the quotation amount
 * - 404: work order not found
 * - 500: server error
 *
 * Localization: error and success messages are returned in Arabic when the user's locale is 'ar', otherwise in English.
 *
 * @returns A NextResponse containing a JSON payload and the appropriate HTTP status code.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId, action = 'approve', comments } = await req.json();

    if (!workOrderId) {
      return NextResponse.json({ 
        error: user.locale === 'ar'
          ? 'معرف أمر العمل مطلوب'
          : 'Work order ID is required'
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Get work order
    const workOrder = await db.collection('work_orders').findOne({
      _id: new ObjectId(workOrderId),
      orgId: user.orgId
    });

    if (!workOrder) {
      return NextResponse.json({ 
        error: user.locale === 'ar'
          ? 'أمر العمل غير موجود'
          : 'Work order not found'
      }, { status: 404 });
    }

    // Check approval authority based on amount and role
    const quotationAmount = workOrder.quotation?.amount || 0;
    let canApprove = false;

    switch (user.role) {
      case 'SUPER_ADMIN':
      case 'CORP_ADMIN':
        canApprove = true; // Can approve any amount
        break;
      case 'MANAGEMENT':
      case 'FINANCE':
        canApprove = quotationAmount <= 50000; // 50K SAR limit
        break;
      case 'PROPERTY_OWNER':
        canApprove = workOrder.propertyOwnerId === user.id && quotationAmount <= 10000; // 10K SAR limit
        break;
      case 'TECHNICIAN':
        canApprove = workOrder.technicianId === user.id && quotationAmount <= 1000; // 1K SAR limit
        break;
      default:
        canApprove = false;
    }

    if (!canApprove) {
      return NextResponse.json({ 
        error: user.locale === 'ar'
          ? `ليس لديك صلاحية للموافقة على مبلغ ${quotationAmount} ريال`
          : `You do not have authority to approve amount of ${quotationAmount} SAR`
      }, { status: 403 });
    }

    // Create approval record
    const approval = {
      workOrderId: new ObjectId(workOrderId),
      approvedBy: user.id,
      approverRole: user.role,
      action: action,
      amount: quotationAmount,
      comments: comments,
      createdAt: new Date(),
      orgId: user.orgId
    };

    await db.collection('approvals').insertOne(approval as any);

    // Update work order status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await db.collection('work_orders').updateOne(
      { _id: new ObjectId(workOrderId) },
      {
        $set: {
          quotationStatus: newStatus,
          quotationApprovedBy: user.id,
          quotationApprovedAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          history: {
            $each: [{
              action: `quotation_${action}`,
              performedBy: user.id,
              timestamp: new Date(),
              comments: comments
            }]
          }
        } as any
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        workOrderId: workOrderId,
        action: action,
        amount: quotationAmount,
        message: user.locale === 'ar'
          ? `تم ${action === 'approve' ? 'الموافقة على' : 'رفض'} عرض السعر بنجاح`
          : `Quotation ${action}d successfully`
      }
    });

  } catch (error) {
    console.error('Approve quote error:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}
