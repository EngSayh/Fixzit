import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Organization } from '@/server/models/Organization';
import { User } from '@/server/models/User';
import Subscription from '@/server/models/Subscription';
import SubscriptionInvoice from '@/server/models/SubscriptionInvoice';

/**
 * GET /api/admin/subscriptions
 * Super admin endpoint to view all subscriptions, users, and payment status
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Auth check - super_admin only
    const user = await getUserFromToken(req.cookies.get('fixzit_auth')?.value || req.headers.get('Authorization')?.replace('Bearer ', ''));
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 403 }
      );
    }

    // 2. Connect to database
    await connectToDatabase();

    // 3. Parse query parameters
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const planFilter = searchParams.get('plan');
    const orgFilter = searchParams.get('org');

    // 4. Build query
    const orgQuery: any = { isActive: true };
    if (statusFilter) {
      orgQuery['subscription.status'] = statusFilter;
    }
    if (planFilter) {
      orgQuery['subscription.plan'] = planFilter;
    }
    if (orgFilter) {
      orgQuery._id = orgFilter;
    }

    // 5. Get all organizations with subscription data
    const organizations = await Organization.find(orgQuery)
      .select('code nameEn nameAr subscription contact legal createdAt')
      .lean()
      .exec();

    // 6. Get user counts per organization
    const orgIds = organizations.map((org: any) => org._id);
    const userCounts = await User.aggregate([
      { $match: { orgId: { $in: orgIds }, isActive: true } },
      { 
        $group: { 
          _id: '$orgId', 
          totalUsers: { $sum: 1 },
          usersByRole: { 
            $push: { role: '$professional.role' } 
          }
        } 
      }
    ]);

    // 7. Get active subscriptions (from Subscription collection)
    const activeSubscriptions = await Subscription.find({
      tenant_id: { $in: orgIds },
      status: { $in: ['ACTIVE', 'PAST_DUE'] }
    })
      .select('tenant_id subscriber_type modules seats billing_cycle currency amount status paytabs createdAt')
      .lean()
      .exec();

    // 8. Get payment history (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentInvoices = await SubscriptionInvoice.find({
      createdAt: { $gte: threeMonthsAgo }
    })
      .select('subscriptionId amount currency status dueDate paidAt paymentMethod paytabsTranRef createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();

    // 9. Aggregate data per organization
    const subscriptionData = organizations.map((org: any) => {
      const orgUserData = userCounts.find((uc: any) => uc._id.toString() === org._id.toString());
      const orgSubscription = activeSubscriptions.find((sub: any) => sub.tenant_id?.toString() === org._id.toString());
      
      // Count users by role
      const roleBreakdown: Record<string, number> = {};
      if (orgUserData?.usersByRole) {
        orgUserData.usersByRole.forEach((item: any) => {
          const role = item.role || 'unknown';
          roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
        });
      }

      // Get invoices for this subscription
      const orgInvoices = orgSubscription 
        ? recentInvoices.filter((inv: any) => inv.subscriptionId === orgSubscription._id.toString())
        : [];

      const totalPaid = orgInvoices
        .filter((inv: any) => inv.status === 'paid')
        .reduce((sum: number, inv: any) => sum + inv.amount, 0);

      const pendingAmount = orgInvoices
        .filter((inv: any) => inv.status === 'pending')
        .reduce((sum: number, inv: any) => sum + inv.amount, 0);

      return {
        organizationId: org._id,
        organizationCode: org.code,
        organizationName: org.nameEn,
        organizationNameAr: org.nameAr,
        
        // Subscription details
        plan: org.subscription?.plan || 'BASIC',
        status: org.subscription?.status || 'TRIAL',
        billingCycle: org.subscription?.billingCycle || 'MONTHLY',
        startDate: org.subscription?.startDate,
        endDate: org.subscription?.endDate,
        trialEndsAt: org.subscription?.trialEndsAt,
        
        // Pricing
        price: {
          amount: org.subscription?.price?.amount || 0,
          currency: org.subscription?.price?.currency || 'SAR'
        },
        
        // User metrics
        users: {
          total: orgUserData?.totalUsers || 0,
          limit: org.subscription?.features?.maxUsers || 10,
          breakdown: roleBreakdown,
          percentUsed: orgUserData?.totalUsers && org.subscription?.features?.maxUsers
            ? Math.round((orgUserData.totalUsers / org.subscription.features.maxUsers) * 100)
            : 0
        },
        
        // Usage metrics
        usage: {
          currentUsers: org.subscription?.usage?.currentUsers || 0,
          currentProperties: org.subscription?.usage?.currentProperties || 0,
          currentWorkOrders: org.subscription?.usage?.currentWorkOrders || 0,
          apiCalls: org.subscription?.usage?.apiCalls || 0,
          storageUsed: org.subscription?.usage?.storageUsed || 0,
          limitsExceeded: org.subscription?.limits?.exceeded || false,
          warnings: org.subscription?.limits?.warnings || []
        },
        
        // Features
        features: {
          maxUsers: org.subscription?.features?.maxUsers || 10,
          maxProperties: org.subscription?.features?.maxProperties || 5,
          maxWorkOrders: org.subscription?.features?.maxWorkOrders || 100,
          advancedReporting: org.subscription?.features?.advancedReporting || false,
          apiAccess: org.subscription?.features?.apiAccess || false,
          customBranding: org.subscription?.features?.customBranding || false,
          ssoIntegration: org.subscription?.features?.ssoIntegration || false,
          mobileApp: org.subscription?.features?.mobileApp || true,
          supportLevel: org.subscription?.features?.supportLevel || 'BASIC'
        },
        
        // External subscription (PayTabs, etc.)
        externalSubscription: orgSubscription ? {
          subscriptionId: orgSubscription._id,
          subscriberType: orgSubscription.subscriber_type,
          modules: orgSubscription.modules,
          seats: orgSubscription.seats,
          billingCycle: orgSubscription.billing_cycle,
          currency: orgSubscription.currency,
          amount: orgSubscription.amount,
          status: orgSubscription.status,
          paymentGateway: orgSubscription.paytabs?.profile_id ? 'PayTabs' : null,
          createdAt: orgSubscription.createdAt
        } : null,
        
        // Payment summary
        payments: {
          totalPaid,
          pendingAmount,
          currency: org.subscription?.price?.currency || 'SAR',
          recentInvoices: orgInvoices.slice(0, 5).map((inv: any) => ({
            invoiceId: inv._id,
            amount: inv.amount,
            currency: inv.currency,
            status: inv.status,
            dueDate: inv.dueDate,
            paidAt: inv.paidAt,
            paymentMethod: inv.paymentMethod,
            transactionRef: inv.paytabsTranRef
          }))
        },
        
        // Contact info
        contact: {
          email: org.contact?.email,
          phone: org.contact?.phone,
          billingEmail: org.legal?.taxId ? org.contact?.email : undefined
        },
        
        // Metadata
        createdAt: org.createdAt
      };
    });

    // 10. Calculate summary statistics
    const summary = {
      totalOrganizations: organizations.length,
      totalUsers: userCounts.reduce((sum: number, uc: any) => sum + uc.totalUsers, 0),
      
      byPlan: {
        BASIC: subscriptionData.filter((s: any) => s.plan === 'BASIC').length,
        STANDARD: subscriptionData.filter((s: any) => s.plan === 'STANDARD').length,
        PREMIUM: subscriptionData.filter((s: any) => s.plan === 'PREMIUM').length,
        ENTERPRISE: subscriptionData.filter((s: any) => s.plan === 'ENTERPRISE').length
      },
      
      byStatus: {
        ACTIVE: subscriptionData.filter((s: any) => s.status === 'ACTIVE').length,
        TRIAL: subscriptionData.filter((s: any) => s.status === 'TRIAL').length,
        SUSPENDED: subscriptionData.filter((s: any) => s.status === 'SUSPENDED').length,
        CANCELLED: subscriptionData.filter((s: any) => s.status === 'CANCELLED').length,
        EXPIRED: subscriptionData.filter((s: any) => s.status === 'EXPIRED').length
      },
      
      revenue: {
        totalPaid: subscriptionData.reduce((sum: number, s: any) => sum + s.payments.totalPaid, 0),
        pendingAmount: subscriptionData.reduce((sum: number, s: any) => sum + s.payments.pendingAmount, 0),
        currency: 'SAR'
      },
      
      alerts: {
        usersOverLimit: subscriptionData.filter((s: any) => s.users.percentUsed > 100).length,
        expiringSoon: subscriptionData.filter((s: any) => {
          if (!s.endDate) return false;
          const daysUntilExpiry = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
        }).length,
        suspended: subscriptionData.filter((s: any) => s.status === 'SUSPENDED').length
      }
    };

    return NextResponse.json({
      ok: true,
      summary,
      subscriptions: subscriptionData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[API /admin/subscriptions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription data', details: error.message },
      { status: 500 }
    );
  }
}
