'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Users, FileText, Package, Car, Building, Shield, TrendingUp, AlertTriangle
} from 'lucide-react';
import DelegationOfAuthority from './DelegationOfAuthority';
import PolicyManagement from './PolicyManagement';
import AssetManagement from './AssetManagement';
import FleetManagement from './FleetManagement';
import VendorManagement from './VendorManagement';

type PlanCode = 'basic' | 'pro' | 'enterprise';

interface AdminStats {
  totalAssets: number;
  totalPolicies: number;
  totalVehicles: number;
  totalVendors: number;
  pendingApprovals: number;
  assetsNeedingMaintenance: number;
  expiredPolicies: number;
  fleetUtilization: number;
}

// Remove SWR usage and use simple state management

export default function AdministrationClient({
  orgId,
  tokenPresent,
  plan,
  features
}: {
  orgId: string;
  tokenPresent: boolean;
  plan: PlanCode;
  features: Record<string, any>;
}) {
  const [activeTab, setActiveTab] = useState<'dashboard'|'authority'|'policies'|'assets'|'fleet'|'vendors'>('dashboard');

  // Feature gating example (custom dashboards / fleet might be gated)
  const canViewFleet = true; // gate with features?.fleet or plan !== 'basic'
  const canCustomDash = !!features?.customDash || plan !== 'basic';

  // Simple state management without SWR
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (orgId) {
      fetch(`/api/admin/dashboard/stats?orgId=${encodeURIComponent(orgId)}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'FixizitAdmin' }
      })
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
    }
  }, [orgId]);

  const stats: AdminStats = useMemo(() => data ?? {
    totalAssets: 248,
    totalPolicies: 34,
    totalVehicles: 12,
    totalVendors: 67,
    pendingApprovals: 8,
    assetsNeedingMaintenance: 15,
    expiredPolicies: 2,
    fleetUtilization: 78.5
  }, [data]);

  const tabs = [
    { id: 'dashboard', name: 'Administration Dashboard', icon: Building, description: 'Overview of all administrative functions' },
    { id: 'authority',  name: 'Delegation of Authority', icon: Shield,   description: 'Authority matrix and approval workflows' },
    { id: 'policies',   name: 'Policies & Procedures',   icon: FileText, description: 'Policy management and compliance tracking' },
    { id: 'assets',     name: 'Asset Management',        icon: Package,  description: 'Asset register and inventory control' },
    ...(canViewFleet ? [{ id: 'fleet', name: 'Fleet Management', icon: Car, description: 'Vehicle tracking and maintenance' } as const] : []),
    { id: 'vendors',    name: 'Vendor Management',       icon: Users,    description: 'Supplier database and performance tracking' },
  ] as const;

  const renderTab = () => {
    if (!orgId) return <div className="p-6">Loading organization…</div>;
    switch (activeTab) {
      case 'dashboard': return <AdministrationDashboard stats={stats} loading={isLoading} canCustomDash={canCustomDash} />;
      case 'authority': return <DelegationOfAuthority orgId={orgId} />;
      case 'policies':  return <PolicyManagement orgId={orgId} />;
      case 'assets':    return <AssetManagement orgId={orgId} />;
      case 'fleet':     return <FleetManagement orgId={orgId} />;
      case 'vendors':   return <VendorManagement orgId={orgId} />;
      default:          return <AdministrationDashboard stats={stats} loading={isLoading} canCustomDash={canCustomDash} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration Center</h1>
              <p className="text-gray-600">Comprehensive administrative management and oversight</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Fixizit Enterprise</p>
                <p className="text-xs text-gray-400">Administration</p>
              </div>
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" aria-label="system online" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 px-6" role="tablist" aria-label="Administration tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selected
                      ? 'border-[#0061A8] text-[#0061A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-2 ${selected ? 'text-[#0061A8]' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden />
                  <span className="text-left">
                    <span className="block">{tab.name}</span>
                    <span className="text-xs text-gray-400 font-normal">{tab.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <section id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={activeTab} className="flex-1">
        {renderTab()}
        {error && (
          <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            Failed to load statistics. {String(error)}
          </div>
        )}
      </section>
    </div>
  );
}

function AdministrationDashboard({
  stats, loading, canCustomDash
}: { stats: AdminStats; loading: boolean; canCustomDash: boolean }) {
  const kpiCards = [
    { title: 'Total Assets',           value: stats.totalAssets, icon: Package,   color: 'blue',   trend: '+8% this month' },
    { title: 'Active Policies',        value: stats.totalPolicies,icon: FileText,  color: 'green',  trend: '2 policies updated' },
    { title: 'Fleet Vehicles',         value: stats.totalVehicles,icon: Car,       color: 'purple', trend: `${stats.fleetUtilization}% utilization` },
    { title: 'Registered Vendors',     value: stats.totalVendors, icon: Users,     color: 'orange', trend: '+3 new vendors' },
  ];

  const alertCards = [
    { title: 'Pending Approvals',           value: stats.pendingApprovals,        icon: Shield,      color: 'yellow', urgent: stats.pendingApprovals > 5 },
    { title: 'Assets Needing Maintenance',  value: stats.assetsNeedingMaintenance,icon: AlertTriangle,color: 'red',    urgent: stats.assetsNeedingMaintenance > 10 },
    { title: 'Expired Policies',            value: stats.expiredPolicies,          icon: FileText,    color: 'red',    urgent: stats.expiredPolicies > 0 },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue:   'bg-blue-50 text-blue-700 border-blue-200',
      green:  'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      red:    'bg-red-50 text-red-700 border-red-200'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="p-6 space-y-6">
      {/* KPI Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Administrative Overview</h2>
            <p className="text-gray-600">Key metrics and system status</p>
          </div>
          {canCustomDash && (
            <button className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors">
              Export Dashboard
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div key={index} className={`border-2 rounded-lg p-6 ${getColorClasses(card.color)}`}>
                <div className="flex items-center justify-between mb-4">
                  <IconComponent className="w-8 h-8" />
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">{card.title}</h3>
                  <div className="text-3xl font-bold text-gray-900">{loading ? '...' : card.value.toLocaleString()}</div>
                  <p className="text-sm text-gray-600">{card.trend}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts & Notifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alertCards.map((alert, index) => {
            const IconComponent = alert.icon;
            return (
              <div key={index} className={`border-2 rounded-lg p-4 ${getColorClasses(alert.color)} ${
                alert.urgent ? 'animate-pulse' : ''
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <IconComponent className="w-6 h-6" />
                  {alert.urgent && <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>}
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-gray-900">{alert.title}</h4>
                  <div className="text-2xl font-bold text-gray-900">{loading ? '...' : alert.value}</div>
                  {alert.urgent && <p className="text-sm font-medium text-red-600">Requires attention</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}