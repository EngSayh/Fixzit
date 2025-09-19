'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';
import {
  Building, Shield, FileText, Package, Car, Users,
  BarChart3, CheckCircle, AlertTriangle, Settings,
  Server, Activity, Database, Globe, Lock, Zap,
  Headphones, MessageSquare, HelpCircle, ThumbsUp
} from 'lucide-react';
import KPICard from '../../../src/components/shared/KPICard';
import DelegationOfAuthority from '../../../src/components/admin/DelegationOfAuthority';
import PolicyManagement from '../../../src/components/admin/PolicyManagement';
import AssetManagement from '../../../src/components/admin/AssetManagement';
import FleetManagement from '../../../src/components/admin/FleetManagement';
import VendorManagement from '../../../src/components/admin/VendorManagement';

// Import types from compliance, system, and support
import { ComplianceItem, Inspection, ComplianceStats, ComplianceFilters } from '../../../types/compliance';
import { SystemModule, SystemReport } from '../../../types/system';
import { SupportTicket, SupportStats, SupportFilters, KnowledgeBaseArticle } from '../../../types/support';

// Admin tabs configuration - consolidated with Compliance and System
const ADMIN_TABS = [
  { id: 'dashboard', name: 'Dashboard', icon: Building, description: 'Administrative overview' },
  { id: 'authority', name: 'Authority', icon: Shield, description: 'Delegation & approvals' },
  { id: 'policies', name: 'Policies', icon: FileText, description: 'Policy management' },
  { id: 'assets', name: 'Assets', icon: Package, description: 'Asset register' },
  { id: 'fleet', name: 'Fleet', icon: Car, description: 'Vehicle management' },
  { id: 'vendors', name: 'Vendors', icon: Users, description: 'Vendor database' },
  { id: 'compliance', name: 'Compliance', icon: CheckCircle, description: 'Legal & regulatory' },
  { id: 'support', name: 'Support', icon: Headphones, description: 'Support tickets' },
  { id: 'system', name: 'System', icon: Server, description: 'System monitoring' }
];

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

export default function AdminPage() {
  const { t, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [systemReport, setSystemReport] = useState<SystemReport | null>(null);
  const [supportStats, setSupportStats] = useState<SupportStats | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load data based on active tab
  useEffect(() => {
    const loadTabData = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'dashboard':
            // Load admin dashboard stats
            const statsRes = await fetch('/api/admin/dashboard/stats');
            if (statsRes.ok) setAdminStats(await statsRes.json());
            else setAdminStats(getMockAdminStats());
            break;
            
          case 'compliance':
            // Load compliance data
            setComplianceStats(getMockComplianceStats());
            setComplianceItems(getMockComplianceItems());
            break;
            
          case 'support':
            // Load support data
            setSupportStats(getMockSupportStats());
            setSupportTickets(getMockSupportTickets());
            break;
            
          case 'system':
            // Load system monitoring data
            const sysRes = await fetch('/api/system/analyze');
            if (sysRes.ok) setSystemReport(await sysRes.json());
            else setSystemReport(getMockSystemReport());
            break;
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Use mock data on error
        if (activeTab === 'dashboard') setAdminStats(getMockAdminStats());
        if (activeTab === 'compliance') {
          setComplianceStats(getMockComplianceStats());
          setComplianceItems(getMockComplianceItems());
        }
        if (activeTab === 'system') setSystemReport(getMockSystemReport());
      } finally {
        setLoading(false);
      }
    };

    loadTabData();
  }, [activeTab]);

  // Mock data functions
  const getMockAdminStats = (): AdminStats => ({
    totalAssets: 248,
    totalPolicies: 34,
    totalVehicles: 12,
    totalVendors: 67,
    pendingApprovals: 8,
    assetsNeedingMaintenance: 15,
    expiredPolicies: 2,
    fleetUtilization: 78.5
  });

  const getMockSupportStats = (): SupportStats => ({
    totalTickets: 156,
    openTickets: 23,
    resolvedTickets: 133,
    avgResolutionTime: 2.4,
    customerSatisfactionScore: 4.6,
    ticketsByType: {
      technical: 45,
      billing: 32,
      general: 28,
      complaint: 18,
      feature: 15,
      bug: 18
    },
    ticketsByPriority: {
      urgent: 8,
      high: 25,
      medium: 67,
      low: 56
    },
    monthlyTrend: [
      { month: 'Jan', tickets: 42, resolved: 38 },
      { month: 'Feb', tickets: 38, resolved: 35 },
      { month: 'Mar', tickets: 45, resolved: 42 }
    ]
  });

  const getMockSupportTickets = (): SupportTicket[] => [
    {
      id: '1',
      ticketNumber: 'TKT-001',
      subject: 'Login Issues with Mobile App',
      description: 'Unable to login to the mobile application.',
      type: 'technical',
      priority: 'high',
      status: 'open',
      submittedBy: 'Ahmed Al-Rashid',
      assignedTo: 'Sara Technical Team',
      submittedDate: '2024-01-15T10:30:00Z',
      lastUpdate: '2024-01-15T14:45:00Z',
      customerSatisfaction: 4
    },
    {
      id: '2',
      ticketNumber: 'TKT-002',
      subject: 'Billing Discrepancy',
      description: 'Invoice shows incorrect charges.',
      type: 'billing',
      priority: 'medium',
      status: 'in_progress',
      submittedBy: 'Fatima Al-Zahra',
      assignedTo: 'Finance Team',
      submittedDate: '2024-01-14T09:15:00Z',
      lastUpdate: '2024-01-15T11:20:00Z',
      customerSatisfaction: 3
    }
  ];

  const getMockComplianceStats = (): ComplianceStats => ({
    totalItems: 45,
    activeItems: 38,
    expiringSoon: 7,
    expiredItems: 3,
    totalInspections: 24,
    passedInspections: 22,
    avgInspectionScore: 87.5,
    complianceRate: 94.2,
    costYTD: 125000,
    itemsByType: {
      permit: 15,
      license: 12,
      certificate: 8,
      inspection: 6,
      insurance: 4
    },
    expiryTrend: [
      { month: 'Jan', expiring: 3 },
      { month: 'Feb', expiring: 5 },
      { month: 'Mar', expiring: 7 }
    ]
  });

  const getMockComplianceItems = (): ComplianceItem[] => [
    {
      id: '1',
      title: 'Fire Safety Certificate',
      type: 'certificate',
      status: 'active',
      description: 'Fire safety certification for Building A',
      issuer: 'Riyadh Fire Department',
      issueDate: '2024-01-15',
      expiryDate: '2025-01-15',
      cost: 5000,
      propertyId: '1',
      assignedTo: 'Ahmed Al-Rashid',
      reminders: []
    },
    {
      id: '2',
      title: 'Building Permit',
      type: 'permit',
      status: 'expired_soon',
      description: 'Construction permit for Tower B renovation',
      issuer: 'Municipality of Riyadh',
      issueDate: '2023-06-01',
      expiryDate: '2024-12-31',
      cost: 15000,
      propertyId: '2',
      assignedTo: 'Sara Mohammed',
      reminders: []
    }
  ];

  const getMockSystemReport = (): SystemReport => ({
    timestamp: new Date(),
    overall: {
      health: 95,
      status: 'operational',
      uptime: 432000,
      activeUsers: 124
    },
    modules: [],
    database: { status: 'healthy', connections: 12 },
    infrastructure: { cpu: 45, memory: 62, disk: 38 },
    integrations: [],
    kpis: {},
    errors: [],
    recommendations: [],
    performanceMetrics: {}
  });

  // Dashboard component
  const renderDashboard = () => {
    if (!adminStats) return null;

    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Admin KPIs */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalAssets}</p>
                <p className="text-xs text-green-600 mt-1">+8% this month</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Policies</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalPolicies}</p>
                <p className="text-xs text-gray-600 mt-1">2 policies updated</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fleet Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalVehicles}</p>
                <p className="text-xs text-gray-600 mt-1">{adminStats.fleetUtilization}% utilization</p>
              </div>
              <Car className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-red-600">{adminStats.pendingApprovals}</p>
                <p className="text-xs text-gray-600 mt-1">Requires attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Shield className="h-6 w-6 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">Review Approvals</p>
            </button>
            <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <FileText className="h-6 w-6 text-green-600 mb-2" />
              <p className="font-medium text-gray-900">Add Policy</p>
            </button>
            <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <Package className="h-6 w-6 text-purple-600 mb-2" />
              <p className="font-medium text-gray-900">Register Asset</p>
            </button>
            <button className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <Users className="h-6 w-6 text-orange-600 mb-2" />
              <p className="font-medium text-gray-900">Add Vendor</p>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Compliance component
  const renderCompliance = () => {
    if (!complianceStats || !complianceItems) return null;

    const statusConfig = {
      active: { color: 'text-green-600', bg: 'bg-green-100', icon: '✓' },
      expired: { color: 'text-red-600', bg: 'bg-red-100', icon: '⚠' },
      pending: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '⏳' },
      expired_soon: { color: 'text-orange-600', bg: 'bg-orange-100', icon: '⚡' }
    };

    return (
      <div className="p-6 space-y-6">
        {/* Compliance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{complianceStats.totalItems}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{complianceStats.activeItems}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{complianceStats.expiringSoon}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{complianceStats.complianceRate}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Compliance Items */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Items</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {complianceItems.map(item => {
              const config = statusConfig[item.status as keyof typeof statusConfig];
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      {config.icon} {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  <div className="text-sm text-gray-500">
                    <p>Expires: {new Date(item.expiryDate).toLocaleDateString()}</p>
                    <p>Issuer: {item.issuer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // System Monitoring component
  const renderSystem = () => {
    if (!systemReport) return null;

    const getHealthColor = (health: number) => {
      if (health >= 90) return 'text-green-600';
      if (health >= 70) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="p-6 space-y-6">
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Health</p>
                <p className={`text-2xl font-bold ${getHealthColor(systemReport.overall.health)}`}>
                  {systemReport.overall.health}%
                </p>
                <p className="text-xs text-gray-600 mt-1">Status: {systemReport.overall.status}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-blue-600">{systemReport.overall.activeUsers}</p>
                <p className="text-xs text-gray-600 mt-1">Last 24 hours</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.floor(systemReport.overall.uptime / 3600)}h
                </p>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Database</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{systemReport.database.status}</p>
                <p className="text-xs text-gray-600 mt-1">{systemReport.database.connections} connections</p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Infrastructure Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Infrastructure Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">CPU Usage</span>
                <span className="text-sm font-bold text-gray-900">{systemReport.infrastructure.cpu}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${systemReport.infrastructure.cpu}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Memory Usage</span>
                <span className="text-sm font-bold text-gray-900">{systemReport.infrastructure.memory}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${systemReport.infrastructure.memory}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Disk Usage</span>
                <span className="text-sm font-bold text-gray-900">{systemReport.infrastructure.disk}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${systemReport.infrastructure.disk}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Auto-refresh controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
              </label>
              <span className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <button 
              onClick={() => setActiveTab('system')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Support tab component
  const renderSupport = () => {
    if (!supportStats || !supportTickets) return null;

    return (
      <div className="space-y-6">
        {/* Support Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Tickets"
            value={supportStats.totalTickets.toString()}
            icon={<MessageSquare className="w-5 h-5" />}
            color="blue"
          />
          <KPICard
            title="Open Tickets"
            value={supportStats.openTickets.toString()}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="yellow"
          />
          <KPICard
            title="Resolved"
            value={supportStats.resolvedTickets.toString()}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
          <KPICard
            title="Satisfaction Score"
            value={`${supportStats.customerSatisfactionScore}/5`}
            icon={<ThumbsUp className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Active Tickets */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Active Support Tickets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supportTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.ticketNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.submittedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'authority':
        return <DelegationOfAuthority orgId="demo-org" />;
      case 'policies':
        return <PolicyManagement orgId="demo-org" />;
      case 'assets':
        return <AssetManagement orgId="demo-org" />;
      case 'fleet':
        return <FleetManagement orgId="demo-org" />;
      case 'vendors':
        return <VendorManagement orgId="demo-org" />;
      case 'compliance':
        return renderCompliance();
      case 'support':
        return renderSupport();
      case 'system':
        return renderSystem();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration Center</h1>
              <p className="text-gray-600">Comprehensive administrative management and oversight</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">FIXZIT Enterprise</span>
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex gap-6 overflow-x-auto">
            {ADMIN_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-[#0061A8] text-[#0061A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#0061A8]' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="text-sm font-medium">{tab.name}</div>
                    <div className="text-xs text-gray-400">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
}