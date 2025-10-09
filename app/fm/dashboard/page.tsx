'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Building2, Users, Wrench, DollarSign, 
  ClipboardList,
  ChevronRight, Plus, Bell
} from 'lucide-react';
import type { WorkOrder } from '@/lib/models';

const fetcher = (url: string) => fetch(url, {
  headers: { 
    "x-tenant-id": "demo-tenant",
    "Authorization": `Bearer ${localStorage.getItem('fixzit_token') || ''}`
  }
}).then(r => r.json());

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('fixzit_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Fetch dashboard data
  const { data: workOrders } = useSWR('/api/work-orders?limit=5', fetcher);
  const { data: properties } = useSWR('/api/properties?limit=5', fetcher);
  const { data: assets } = useSWR('/api/assets?status=MAINTENANCE&limit=5', fetcher);
  const { data: invoices } = useSWR('/api/finance/invoices?status=OVERDUE&limit=5', fetcher);

  const stats = {
    workOrders: {
      total: workOrders?.total || 0,
      pending: workOrders?.items?.filter((wo: WorkOrder) => wo.status === 'SUBMITTED').length || 0,
      overdue: workOrders?.items?.filter((wo: WorkOrder) => new Date(wo.dueAt) < new Date()).length || 0
    },
    properties: {
      total: properties?.total || 0,
      occupied: properties?.items?.filter((p: any) => p.details?.occupancyRate > 0).length || 0,
      maintenance: properties?.items?.filter((p: any) => p.maintenance?.issues?.some((i: any) => !i.resolved)).length || 0
    },
    assets: {
      total: assets?.total || 0,
      critical: assets?.items?.filter((a: any) => a.criticality === 'CRITICAL').length || 0,
      maintenance: assets?.items?.filter((a: any) => a.status === 'MAINTENANCE').length || 0
    },
    finance: {
      overdue: invoices?.total || 0,
      amount: invoices?.items?.reduce((sum: number, inv: any) => sum + inv.total, 0) || 0
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name || 'User'}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
            <Badge className="ml-2 bg-red-500 text-white">3</Badge>
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Quick Action
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workOrders.total}</div>
            <p className="text-xs text-gray-600">
              {stats.workOrders.pending} pending • {stats.workOrders.overdue} overdue
            </p>
            <Link href="/fm/work-orders" className="text-xs text-blue-600 hover:underline flex items-center mt-2">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties.total}</div>
            <p className="text-xs text-gray-600">
              {stats.properties.occupied} occupied • {stats.properties.maintenance} need attention
            </p>
            <Link href="/fm/properties" className="text-xs text-green-600 hover:underline flex items-center mt-2">
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets Under Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assets.maintenance}</div>
            <p className="text-xs text-gray-600">
              {stats.assets.critical} critical assets
            </p>
            <Link href="/fm/assets" className="text-xs text-orange-600 hover:underline flex items-center mt-2">
              View assets <ChevronRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.finance.overdue}</div>
            <p className="text-xs text-gray-600">
              {stats.finance.amount.toLocaleString()} SAR pending
            </p>
            <Link href="/fm/finance" className="text-xs text-red-600 hover:underline flex items-center mt-2">
              View invoices <ChevronRight className="w-3 h-3" />
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
              <CardTitle className="text-lg">Recent Work Orders</CardTitle>
              <Link href="/fm/work-orders">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workOrders?.items?.slice(0, 5).map((wo: unknown) => (
                <div key={wo._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      wo.priority === 'CRITICAL' ? 'bg-red-500' :
                      wo.priority === 'HIGH' ? 'bg-orange-500' :
                      wo.priority === 'MEDIUM' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{wo.code}</p>
                      <p className="text-xs text-gray-600">{wo.title}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {wo.status}
                  </Badge>
                </div>
              ))}
              {(!workOrders?.items || workOrders.items.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No recent work orders</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Property Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Property Alerts</CardTitle>
              <Link href="/fm/properties">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {properties?.items?.slice(0, 5).map((property: unknown) => (
                <div key={property._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{property.name}</p>
                      <p className="text-xs text-gray-600">
                        {property.address?.city} • {property.units?.length || 0} units
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">
                    {property.details?.occupancyRate || 0}% occupied
                  </span>
                </div>
              ))}
              {(!properties?.items || properties.items.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No properties found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/fm/work-orders/new">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="w-4 h-4 mr-2" />
                New Work Order
              </Button>
            </Link>
            <Link href="/fm/properties/new">
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </Link>
            <Link href="/fm/tenants/new">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                New Tenant
              </Button>
            </Link>
            <Link href="/fm/invoices/new">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
