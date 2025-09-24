// app/api/ai/tools/owner-statements/route.ts - Get owner financial statements
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { canPerformAction, Role, ModuleKey } from '@/src/lib/rbac';
import { getDatabase } from 'lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view financial statements
    const allowedRoles = ['SUPER_ADMIN', 'CORP_ADMIN', 'MANAGEMENT', 'FINANCE', 'PROPERTY_OWNER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ 
        error: user.locale === 'ar' 
          ? 'ليس لديك صلاحية لعرض البيانات المالية'
          : 'You do not have permission to view financial statements'
      }, { status: 403 });
    }

    const { ownerId, period = 'YTD' } = await req.json();

    // If user is property owner, they can only view their own statements
    if (user.role === 'PROPERTY_OWNER' && ownerId !== user.id) {
      return NextResponse.json({ 
        error: user.locale === 'ar'
          ? 'يمكنك فقط عرض بياناتك المالية الخاصة'
          : 'You can only view your own financial statements'
      }, { status: 403 });
    }

    const db = await getDatabase();

    // Get financial statements
    const statements = await db.collection('financial_statements')
      .find({
        ownerId: ownerId || user.id,
        orgId: user.orgId,
        period: period
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Get summary
    const summary = {
      totalRevenue: statements.reduce((sum, s) => sum + (s.revenue || 0), 0),
      totalExpenses: statements.reduce((sum, s) => sum + (s.expenses || 0), 0),
      netIncome: statements.reduce((sum, s) => sum + (s.netIncome || 0), 0),
      pendingPayments: statements.filter(s => s.status === 'pending').length
    };

    return NextResponse.json({
      success: true,
      data: {
        statements: statements.map(s => ({
          id: s._id,
          period: s.period,
          revenue: s.revenue,
          expenses: s.expenses,
          netIncome: s.netIncome,
          status: s.status,
          createdAt: s.createdAt
        })),
        summary,
        message: user.locale === 'ar'
          ? `تم العثور على ${statements.length} كشف حساب للفترة ${period}`
          : `Found ${statements.length} statements for period ${period}`
      }
    });

  } catch (error) {
    console.error('Owner statements error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve statements' },
      { status: 500 }
    );
  }
}
