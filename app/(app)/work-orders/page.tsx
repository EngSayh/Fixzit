'use client';

import React, { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderFilters, WorkOrderStats, ViewMode } from '../../../types/work-orders';
import WorkOrderCard from '../../../src/components/work-orders/WorkOrderCard';
import WorkOrderFiltersComponent from '../../../src/components/work-orders/WorkOrderFilters';
import WorkOrderStatsComponent from '../../../src/components/work-orders/WorkOrderStats';
import WorkOrderKanbanBoard from '../../../src/components/work-orders/WorkOrderKanbanBoard';
import WorkOrderTableView from '../../../src/components/work-orders/WorkOrderTableView';
import WorkOrderSortAndView from '../../../src/components/work-orders/WorkOrderSortAndView';
import BulkActionsModal from '../../../src/components/work-orders/BulkActionsModal';
import EnhancedCreateWorkOrderModal from '../../../src/components/work-orders/EnhancedCreateWorkOrderModal';
import workOrdersApi from '../../../lib/work-orders-api';
import { useTranslation } from '../../../contexts/I18nContext';
import KPICard from '../../../src/components/shared/KPICard';
import SimpleChart from '../../../src/components/shared/SimpleChart';
import { 
  PreventiveMaintenanceTask, 
  MaintenanceSchedule, 
  MaintenanceAsset, 
  MaintenanceStats,
  MaintenanceFilters 
} from '../../../types/preventive-maintenance';
import {
  Wrench, Calendar, Clock, CheckCircle, AlertTriangle,
  Plus, Filter, Search, Grid3x3, List, BarChart3,
  TrendingUp, Users, DollarSign, Settings, X
} from 'lucide-react';
import WorkOrderDetailView from '../../../src/components/work-orders/WorkOrderDetailView';

// Tab configuration for Work Orders module
const WORK_ORDER_TABS = [
  { id: 'overview', name: 'Overview', icon: BarChart3, description: 'Work order dashboard' },
  { id: 'active', name: 'Active Orders', icon: Wrench, description: 'Current work orders' },
  { id: 'preventive', name: 'Preventive Maintenance', icon: Calendar, description: 'Scheduled maintenance' },
  { id: 'history', name: 'History', icon: Clock, description: 'Completed orders' }
];

export default function WorkOrdersPage() {
  const { t, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Work Orders state
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<WorkOrderStats | null>(null);
  const [filters, setFilters] = useState<WorkOrderFilters>({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState('created_desc');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk actions
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [selectedWorkOrders, setSelectedWorkOrders] = useState<string[]>([]);
  
  // Work Order Detail Modal
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Preventive Maintenance state
  const [maintenanceStats, setMaintenanceStats] = useState<MaintenanceStats | null>(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState<PreventiveMaintenanceTask[]>([]);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<MaintenanceSchedule[]>([]);
  const [maintenanceAssets, setMaintenanceAssets] = useState<MaintenanceAsset[]>([]);
  const [maintenanceFilters, setMaintenanceFilters] = useState<MaintenanceFilters>({});

  // Mock data for properties, users, and technicians
  const properties = [
    { 
      id: '1', 
      name: 'Sunset Towers',
      address: 'King Fahd Road, Riyadh',
      units: [
        { id: '1', unitNumber: 'A001' }, 
        { id: '2', unitNumber: 'A002' },
        { id: '25', unitNumber: 'A025' }
      ] 
    },
    { 
      id: '2', 
      name: 'Business Plaza',
      address: 'Olaya Street, Riyadh',
      units: [
        { id: '3', unitNumber: 'B001' }, 
        { id: '4', unitNumber: 'B002' }
      ] 
    }
  ];

  const users = [
    { id: '1', firstName: 'John', lastName: 'Smith', role: 'technician' },
    { id: '2', firstName: 'Sarah', lastName: 'Johnson', role: 'manager' },
    { id: '3', firstName: 'Mike', lastName: 'Davis', role: 'technician' },
    { id: '4', firstName: 'Ahmed', lastName: 'Hassan', role: 'technician' },
    { id: '5', firstName: 'Fatima', lastName: 'Al-Zahra', role: 'supervisor' }
  ];

  const technicians = users.filter(user => user.role === 'technician' || user.role === 'supervisor');

  // Load data based on active tab
  useEffect(() => {
    const loadTabData = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'overview':
            await loadStats();
            await loadWorkOrders();
            break;
          case 'active':
            await loadWorkOrders();
            break;
          case 'preventive':
            await loadPreventiveMaintenanceData();
            break;
          case 'history':
            await loadHistoricalOrders();
            break;
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTabData();
  }, [activeTab, filters, maintenanceFilters, page]);

  // Load work orders
  const loadWorkOrders = async () => {
    try {
      const response = await workOrdersApi.getWorkOrders(filters, page);
      setWorkOrders(response.workOrders);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Error loading work orders:', error);
      // Use mock data for demo
      setWorkOrders(getMockWorkOrders());
      setTotalPages(1);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const statsData = await workOrdersApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(getMockStats());
    }
  };

  // Load preventive maintenance data
  const loadPreventiveMaintenanceData = async () => {
    try {
      // In real app, fetch from API
      setMaintenanceStats(getMockMaintenanceStats());
      setMaintenanceTasks(getMockMaintenanceTasks());
      setMaintenanceSchedule(getMockMaintenanceSchedule());
      setMaintenanceAssets(getMockMaintenanceAssets());
    } catch (error) {
      console.error('Error loading preventive maintenance:', error);
    }
  };

  // Load historical orders
  const loadHistoricalOrders = async () => {
    try {
      const historicalFilters = { ...filters, status: ['completed', 'cancelled'] };
      const response = await workOrdersApi.getWorkOrders(historicalFilters, page);
      setWorkOrders(response.workOrders);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Error loading historical orders:', error);
      setWorkOrders(getMockWorkOrders().filter(wo => wo.status === 'completed'));
    }
  };

  // Mock data functions
  const getMockWorkOrders = (): WorkOrder[] => [
    {
      id: "1",
      woNumber: "WO-001",
      title: "AC Repair - Unit A001",
      description: "Air conditioning unit not cooling properly",
      category: "hvac",
      priority: "high",
      status: "in_progress",
      propertyId: "1",
      unitId: "1",
      assignedTo: "1",
      createdBy: "2",
      orgId: "demo-org",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T14:30:00Z",
      dueDate: "2024-01-18T17:00:00Z",
      estimatedHours: 4,
      estimatedCost: 250,
      property: { name: "Sunset Towers", address: "King Fahd Road, Riyadh" },
      unit: { unitNumber: "A001" },
      creator: { firstName: "Sarah", lastName: "Johnson" },
      assignee: { firstName: "John", lastName: "Smith" }
    },
    {
      id: "2",
      woNumber: "WO-002",
      title: "Water Leak - Bathroom A025",
      description: "Water leak reported in bathroom",
      category: "plumbing",
      priority: "emergency",
      status: "open",
      propertyId: "1",
      unitId: "25",
      createdBy: "2",
      orgId: "demo-org",
      createdAt: "2024-01-14T09:15:00Z",
      updatedAt: "2024-01-14T09:15:00Z",
      dueDate: "2024-01-15T17:00:00Z",
      estimatedHours: 2,
      estimatedCost: 150,
      property: { name: "Sunset Towers", address: "King Fahd Road, Riyadh" },
      unit: { unitNumber: "A025" },
      creator: { firstName: "Sarah", lastName: "Johnson" },
      assignee: null
    }
  ];

  const getMockStats = (): WorkOrderStats => ({
    total: 145,
    open: 28,
    inProgress: 42,
    completed: 68,
    overdue: 7,
    avgCompletionTime: 3.2,
    completionRate: 88.5,
    byCategory: {
      hvac: 35,
      plumbing: 28,
      electrical: 25,
      maintenance: 20,
      cleaning: 15,
      other: 22
    },
    byPriority: {
      emergency: 5,
      high: 18,
      medium: 52,
      low: 70
    },
    trend: [
      { date: '2024-01-01', created: 12, completed: 10 },
      { date: '2024-01-08', created: 15, completed: 14 },
      { date: '2024-01-15', created: 18, completed: 16 }
    ]
  });

  const getMockMaintenanceStats = (): MaintenanceStats => ({
    totalTasks: 145,
    completedTasks: 128,
    overdueTasks: 8,
    upcomingTasks: 25,
    avgCompletionTime: 2.4,
    costSavings: 185000,
    preventiveRatio: 72.5,
    assetUptime: 96.8,
    tasksByCategory: {
      hvac: 42,
      electrical: 28,
      plumbing: 18,
      fire_safety: 15,
      elevator: 12,
      cleaning: 20,
      landscaping: 10
    },
    completionTrend: [
      { month: 'Jan', completed: 35, scheduled: 38 },
      { month: 'Feb', completed: 42, scheduled: 45 },
      { month: 'Mar', completed: 38, scheduled: 40 }
    ],
    costTrend: [
      { month: 'Jan', preventive: 25000, reactive: 18000 },
      { month: 'Feb', preventive: 28000, reactive: 15000 },
      { month: 'Mar', preventive: 32000, reactive: 12000 }
    ]
  });

  const getMockMaintenanceTasks = (): PreventiveMaintenanceTask[] => [
    {
      id: '1',
      title: 'HVAC Filter Replacement',
      description: 'Replace air filters in all HVAC units',
      category: 'hvac',
      priority: 'medium',
      frequency: { type: 'monthly', dayOfMonth: 15 },
      duration: 120,
      assignedTo: 'Ahmed Al-Rashid',
      propertyId: '1',
      checklist: [
        { id: 'c1', item: 'Check filter condition', isRequired: true },
        { id: 'c2', item: 'Replace filter if dirty', isRequired: true }
      ],
      requiredTools: ['Screwdriver', 'Ladder', 'Safety mask'],
      requiredMaterials: [
        { id: 'm1', name: 'HVAC Filter 20x25x1', quantity: 8, unit: 'pieces', cost: 150, supplier: 'AC Parts Co.' }
      ],
      instructions: 'Turn off HVAC system before maintenance.',
      safetyNotes: 'Wear safety mask when removing old filters.',
      estimatedCost: 300,
      isActive: true,
      createdDate: '2024-01-01T00:00:00Z',
      lastCompleted: '2024-01-15T10:00:00Z',
      nextDue: '2024-02-15T10:00:00Z'
    }
  ];

  const getMockMaintenanceSchedule = (): MaintenanceSchedule[] => [
    {
      id: 's1',
      taskId: '1',
      propertyId: '1',
      assignedTo: 'Ahmed Al-Rashid',
      scheduledDate: '2024-02-15',
      scheduledTime: '10:00',
      status: 'scheduled'
    }
  ];

  const getMockMaintenanceAssets = (): MaintenanceAsset[] => [
    {
      id: 'a1',
      name: 'Central HVAC Unit A1',
      type: 'HVAC System',
      location: 'Building A - Rooftop',
      propertyId: '1',
      serialNumber: 'HVAC-2023-001',
      manufacturer: 'Carrier',
      model: 'WeatherExpert 50HC',
      installDate: '2023-03-15',
      warrantyExpiry: '2026-03-15',
      specifications: { capacity: '50 ton', refrigerant: 'R-410A', voltage: '460V' },
      maintenanceTasks: ['1'],
      currentCondition: 'good',
      lastInspection: '2024-01-15',
      nextInspection: '2024-02-15'
    }
  ];

  // Overview tab component
  const renderOverview = () => {
    if (!stats) return null;

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-600 mt-1">All time</p>
              </div>
              <Wrench className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                <p className="text-xs text-gray-600 mt-1">Active now</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-xs text-gray-600 mt-1">{stats.completionRate}% rate</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-gray-600 mt-1">Needs attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Category</h3>
            <SimpleChart
              data={Object.entries(stats.byCategory).map(([key, value]) => ({
                label: key.charAt(0).toUpperCase() + key.slice(1),
                value
              }))}
              type="donut"
              height={300}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
            <SimpleChart
              data={stats.trend.map(item => ({
                label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                created: item.created,
                completed: item.completed
              }))}
              type="line"
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  // Active orders tab component
  const renderActiveOrders = () => {
    const activeOrders = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled');

    return (
      <div className="space-y-6">
        {/* Filters and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <WorkOrderFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              properties={properties}
              users={users}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </button>
        </div>

        {/* View toggle */}
        <WorkOrderSortAndView
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={(newSort) => {
            setSortBy(newSort);
            setSortOrder(newSort.includes('desc') ? 'desc' : 'asc');
          }}
        />

        {/* Work Orders Display */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.map(workOrder => (
              <WorkOrderCard
                key={workOrder.id}
                workOrder={workOrder}
                onSelect={() => {
                  setSelectedWorkOrder(workOrder);
                  setShowDetailModal(true);
                }}
                selected={selectedWorkOrders.includes(workOrder.id)}
              />
            ))}
          </div>
        )}

        {viewMode === 'table' && (
          <WorkOrderTableView
            workOrders={activeOrders}
            onSelect={() => {}}
            selectedIds={selectedWorkOrders}
          />
        )}

        {viewMode === 'kanban' && (
          <WorkOrderKanbanBoard
            workOrders={activeOrders}
            onWorkOrderMove={() => {}}
          />
        )}
      </div>
    );
  };

  // Preventive Maintenance tab component
  const renderPreventiveMaintenance = () => {
    if (!maintenanceStats || !maintenanceTasks) return null;

    return (
      <div className="space-y-6">
        {/* PM Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Tasks"
            value={maintenanceStats.totalTasks.toString()}
            icon={<Calendar className="w-5 h-5" />}
            color="blue"
          />
          <KPICard
            title="Completed"
            value={maintenanceStats.completedTasks.toString()}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
            change={{ value: 5, type: 'increase', period: 'vs last month' }}
          />
          <KPICard
            title="Overdue"
            value={maintenanceStats.overdueTasks.toString()}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
          <KPICard
            title="Cost Savings"
            value={`$${(maintenanceStats.costSavings / 1000).toFixed(0)}k`}
            icon={<DollarSign className="w-5 h-5" />}
            color="green"
            change={{ value: 12, type: 'increase', period: 'YTD' }}
          />
        </div>

        {/* Maintenance Schedule */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedule</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {maintenanceTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div>
                    <h4 className="font-semibold text-gray-900">{task.title}</h4>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">Next Due: {new Date(task.nextDue).toLocaleDateString()}</span>
                      <span className="text-xs text-gray-500">Assigned: {task.assignedTo}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preventive vs Reactive Cost Comparison</h3>
          <SimpleChart
            data={maintenanceStats.costTrend.map(item => ({
              label: item.month,
              preventive: item.preventive / 1000,
              reactive: item.reactive / 1000
            }))}
            type="bar"
            title="Cost (K SAR)"
            height={300}
          />
        </div>
      </div>
    );
  };

  // History tab component
  const renderHistory = () => {
    const completedOrders = workOrders.filter(wo => wo.status === 'completed');

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Completed Work Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.woNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.property?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.actualHours || order.estimatedHours} hrs</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.actualCost || order.estimatedCost}</td>
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
      case 'overview':
        return renderOverview();
      case 'active':
        return renderActiveOrders();
      case 'preventive':
        return renderPreventiveMaintenance();
      case 'history':
        return renderHistory();
      default:
        return renderOverview();
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Work Orders & Maintenance</h1>
              <p className="text-gray-600">Manage work orders and preventive maintenance schedules</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex gap-6 overflow-x-auto">
            {WORK_ORDER_TABS.map(tab => {
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
      <div className="p-6">
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

      {/* Modals */}
      {showCreateModal && (
        <EnhancedCreateWorkOrderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            console.log('Creating work order:', data);
            setShowCreateModal(false);
            await loadWorkOrders();
          }}
          properties={properties}
          technicians={technicians}
        />
      )}

      {showBulkModal && (
        <BulkActionsModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          workOrderIds={selectedWorkOrders}
          action={bulkAction}
          onConfirm={async () => {
            console.log('Bulk action:', bulkAction, selectedWorkOrders);
            setShowBulkModal(false);
            setSelectedWorkOrders([]);
            await loadWorkOrders();
          }}
        />
      )}

      {/* Work Order Detail Modal */}
      {showDetailModal && selectedWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Work Order Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedWorkOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <WorkOrderDetailView
                workOrder={selectedWorkOrder}
                onClose={() => {
                  setShowDetailModal(false);
                  setSelectedWorkOrder(null);
                }}
                onUpdate={async (updated) => {
                  setSelectedWorkOrder(updated);
                  await loadWorkOrders();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}