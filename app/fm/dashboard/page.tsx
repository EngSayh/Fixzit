'use client';
/* eslint-disable react-hooks/rules-of-hooks */
import { logger } from '@/lib/logger';
import { toFiniteNumber } from '@/lib/numbers';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { StatsCardSkeleton } from '@/components/skeletons';
import { 
  Building2, Users, Wrench, DollarSign, 
  ClipboardList,
  ChevronRight, Plus, Bell
} from 'lucide-react';
import type { WorkOrder } from '@/types/fm';
import { WOStatus } from '@/types/fm';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

interface User {
  name?: string;
  [key: string]: unknown;
}

interface Property {
  id: string;
  name: string;
  address?: {
    city?: string;
  };
  units?: unknown[];
  details?: {
    occupancyRate?: number;
  };
  maintenance?: {
    issues?: Array<{ resolved?: boolean }>;
  };
}

interface Asset {
  criticality?: string;
  status?: string;
}

interface Invoice {
  total: number;
}

// Frontend serialized version of WorkOrder (API returns id instead of _id)
interface WorkOrderResponse extends Omit<WorkOrder, '_id'> {
  id: string;
  dueAt?: string;
}

interface WorkOrderWithDue extends WorkOrder {
  dueAt?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({ moduleId: 'dashboard' });
  const userRole = (session?.user as { role?: string })?.role;
  
  if (!hasOrgContext || !orgId) {
    return guard;
  }

  // Role-based redirect logic
  useEffect(() => {
    if (sessionStatus === 'authenticated' && userRole) {
      if (userRole === 'TENANT') {
        router.replace('/fm/properties');
        return;
      } else if (userRole === 'VENDOR') {
        router.replace('/fm/marketplace');
        return;
      }
    }
  }, [sessionStatus, userRole, router]);

  useEffect(() => {
    if (session?.user) {
      setUser(session.user as User);
    }
  }, [session]);

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    return fetch(url, {
      headers: { 
        'x-tenant-id': orgId
      }
    })
      .then(r => r.json())
      .catch(error => {
        logger.error('FM dashboard fetch error', error);
        throw error;
      });
  };

  // Fetch dashboard data
  const { data: workOrders } = useSWR(orgId ? '/api/work-orders?limit=5' : null, fetcher);
  const { data: properties } = useSWR(orgId ? '/api/properties?limit=5' : null, fetcher);
  const { data: assets } = useSWR(orgId ? '/api/assets?status=MAINTENANCE&limit=5' : null, fetcher);
  const { data: invoices } = useSWR(orgId ? '/api/finance/invoices?status=OVERDUE&limit=5' : null, fetcher);

  // isLoading computed but unused - keep for future loading states
  // const isLoading = woLoading || propsLoading || assetsLoading || invoicesLoading;

  if (!session) {
    return <StatsCardSkeleton count={4} />;
  }

  if (!orgId) {
    return (
      <div className="space-y-6 p-6">
        <ModuleViewTabs moduleId="dashboard" />
        {guard}
      </div>
    );
  }

  const stats = {
    workOrders: {
      total: toFiniteNumber(workOrders?.total),
      pending: toFiniteNumber(
        workOrders?.items?.filter((wo: WorkOrder) => wo.status === WOStatus.NEW).length
      ),
      overdue: toFiniteNumber(
        workOrders?.items?.filter((wo: WorkOrderWithDue) => {
          if (!wo.dueAt) return false;
          return Date.parse(wo.dueAt) < Date.now();
        }).length
      )
    },
    properties: {
      total: toFiniteNumber(properties?.total),
      occupied: toFiniteNumber(
        properties?.items?.filter((p: Property) => (p.details?.occupancyRate ?? 0) > 0).length
      ),
      maintenance: toFiniteNumber(
        properties?.items?.filter((p: Property) => p.maintenance?.issues?.some((i) => !i.resolved)).length
      )
    },
    assets: {
      total: toFiniteNumber(assets?.total),
      critical: toFiniteNumber(
        assets?.items?.filter((a: Asset) => a.criticality === 'CRITICAL').length
      ),
      maintenance: toFiniteNumber(
        assets?.items?.filter((a: Asset) => a.status === 'MAINTENANCE').length
      )
    },
    finance: {
      overdue: toFiniteNumber(invoices?.total),
      amount: toFiniteNumber(invoices?.items?.reduce((sum: number, inv: Invoice) => sum + inv.total, 0))
    }
  };

  return (
    <div className="space-y-6 p-6">
      <ModuleViewTabs moduleId="dashboard" />
      {supportBanner}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcomeBack')}, {user?.name || t('common.user', 'User')}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t('dashboard.notifications')}
            <Badge className="ms-2 bg-destructive/20 text-destructive">3</Badge>
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 me-2" />
            {t('dashboard.quickAction')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.activeWorkOrders')}</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workOrders.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.workOrders.pending} {t('dashboard.pending')} • {stats.workOrders.overdue} {t('dashboard.overdue')}
            </p>
            <Link href="/fm/work-orders" className="text-xs text-primary hover:underline flex items-center mt-2">
              {t('dashboard.viewAll')} <ChevronRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalProperties')}</CardTitle>
            <Building2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.properties.occupied} {t('dashboard.occupied')} • {stats.properties.maintenance} {t('dashboard.needAttention')}
            </p>
            <Link href="/fm/properties" className="text-xs text-success hover:underline flex items-center mt-2">
              {t('dashboard.manage')} <ChevronRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.assetsUnderMaintenance')}</CardTitle>
            <Wrench className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assets.maintenance}</div>
            <p className="text-xs text-muted-foreground">
              {stats.assets.critical} {t('dashboard.criticalAssets')}
            </p>
            <Link href="/fm/assets" className="text-xs text-warning hover:underline flex items-center mt-2">
              {t('dashboard.viewAssets')} <ChevronRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.overdueInvoices')}</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.finance.overdue}</div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('en-SA').format(stats.finance.amount)} {t('dashboard.sarPending')}
            </p>
            <Link href="/fm/finance" className="text-xs text-destructive hover:underline flex items-center mt-2">
              {t('dashboard.viewInvoices')} <ChevronRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('dashboard.recentWorkOrders')}</CardTitle>
              <Link href="/fm/work-orders">
                <Button variant="ghost" size="sm">{t('dashboard.viewAll')}</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workOrders?.items?.slice(0, 5).map((wo: WorkOrderResponse, index: number) => {
                const key = wo.id ?? wo.code ?? `work-order-${index}`;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        wo.priority === 'CRITICAL' ? 'bg-destructive' :
                        wo.priority === 'HIGH' ? 'bg-warning' :
                        wo.priority === 'MEDIUM' ? 'bg-warning' :
                        'bg-success'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{wo.code}</p>
                        <p className="text-xs text-muted-foreground">{wo.title}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {wo.status}
                    </Badge>
                  </div>
                );
              })}
              {(!workOrders?.items || workOrders.items.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noRecentWorkOrders')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Property Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('dashboard.propertyAlerts')}</CardTitle>
              <Link href="/fm/properties">
                <Button variant="ghost" size="sm">{t('dashboard.viewAll')}</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {properties?.items?.slice(0, 5).map((property: Property, index: number) => {
                const key = property.id ?? property.name ?? `property-${index}`;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{property.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.address?.city} • {toFiniteNumber(property.units?.length)} {t('dashboard.units')}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {toFiniteNumber(property.details?.occupancyRate)}% {t('dashboard.occupied')}
                    </span>
                  </div>
                );
              })}
              {(!properties?.items || properties.items.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noProperties')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/fm/work-orders/new">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="w-4 h-4 me-2" />
                {t('dashboard.newWorkOrder')}
              </Button>
            </Link>
            <Link href="/fm/properties/new">
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="w-4 h-4 me-2" />
                {t('dashboard.addProperty')}
              </Button>
            </Link>
            <Link href="/fm/tenants/new">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 me-2" />
                {t('dashboard.newTenant')}
              </Button>
            </Link>
            <Link href="/fm/invoices/new">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="w-4 h-4 me-2" />
                {t('dashboard.createInvoice')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
