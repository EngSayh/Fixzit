'use client';

import { useState, useMemo, useEffect } from 'react';
import { useI18n } from '@/src/providers/RootProviders';
import { useUnsavedChanges, UnsavedChangesWarning, SaveConfirmation } from '@/src/hooks/useUnsavedChanges';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import {
  Search, Plus, Filter, Download, Eye, Edit, Trash2,
  Star, Phone, Mail, MapPin, Calendar, DollarSign,
  ClipboardList, Building2, Users, DollarSign as FinanceIcon,
  Wrench, FileText, Settings, Headphones, Shield, BarChart3,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle
} from 'lucide-react';


interface WorkOrder {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  assignee?: string;
  property: string;
  dueDate: string;
  createdAt: string;
  cost?: number;
}

interface Property {
  id: string;
  name: string;
  type: 'apartment' | 'villa' | 'office' | 'commercial';
  units: number;
  occupancy: number;
  status: 'active' | 'maintenance' | 'vacant';
  location: string;
  lastInspection: string;
  issues: number;
}

interface FinancialMetric {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  actionRequired?: boolean;
}

export default function FMPage() {
  const { t, language, isRTL } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Unsaved changes management
  const {
    hasUnsavedChanges,
    showWarning,
    showSaveConfirm,
    markDirty,
    markClean,
    handleNavigation,
    handleSave,
    handleDiscard,
    handleStay
  } = useUnsavedChanges({
    message: t('unsaved.message', 'You have unsaved changes. Are you sure you want to leave without saving?'),
    saveMessage: t('unsaved.saved', 'Your changes have been saved successfully.'),
    cancelMessage: t('unsaved.cancelled', 'Changes were not saved.'),
    onSave: async () => {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  // Track initial values for unsaved changes detection
  useEffect(() => {
    markClean(); // Initialize as clean
  }, []); // Only run once on mount

  // Handle search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    markDirty(); // Mark as dirty when search changes
  };

  // Handle status filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    markDirty(); // Mark as dirty when filter changes
  };

  // Mock data for FM Dashboard
  const recentWorkOrders: WorkOrder[] = [
    {
      id: 'WO-1042',
      title: 'AC Maintenance - Tower A',
      priority: 'high',
      status: 'in_progress',
      category: 'HVAC',
      assignee: 'Ahmed Al-Rashid',
      property: 'Tower A - Floor 12',
      dueDate: '2025-09-20',
      createdAt: '2025-09-15',
      cost: 2500
    },
    {
      id: 'WO-1041',
      title: 'Electrical Outlet Repair',
      priority: 'medium',
      status: 'assigned',
      category: 'Electrical',
      assignee: 'Mohammed Al-Harbi',
      property: 'Office Complex B',
      dueDate: '2025-09-22',
      createdAt: '2025-09-14',
      cost: 850
    },
    {
      id: 'WO-1040',
      title: 'Plumbing Leak - Unit 503',
      priority: 'urgent',
      status: 'new',
      category: 'Plumbing',
      property: 'Residential Block C',
      dueDate: '2025-09-18',
      createdAt: '2025-09-15',
      cost: 1200
    }
  ];

  const properties: Property[] = [
    {
      id: 'PROP-001',
      name: 'Tower A',
      type: 'office',
      units: 120,
      occupancy: 98,
      status: 'active',
      location: 'Riyadh - Olaya',
      lastInspection: '2025-09-10',
      issues: 3
    },
    {
      id: 'PROP-002',
      name: 'Residential Block C',
      type: 'apartment',
      units: 60,
      occupancy: 55,
      status: 'maintenance',
      location: 'Jeddah - Al-Hamra',
      lastInspection: '2025-09-08',
      issues: 7
    },
    {
      id: 'PROP-003',
      name: 'Mall Complex',
      type: 'commercial',
      units: 45,
      occupancy: 42,
      status: 'active',
      location: 'Dammam - Al-Khobar',
      lastInspection: '2025-09-12',
      issues: 1
    }
  ];

  const financialMetrics: FinancialMetric[] = [
    {
      title: 'Monthly Revenue',
      value: 'SAR 2.8M',
      change: '+12%',
      trend: 'up',
      icon: DollarSign
    },
    {
      title: 'Maintenance Costs',
      value: 'SAR 180K',
      change: '-5%',
      trend: 'down',
      icon: Wrench
    },
    {
      title: 'Occupancy Rate',
      value: '94%',
      change: '+2%',
      trend: 'up',
      icon: Users
    },
    {
      title: 'Outstanding Invoices',
      value: 'SAR 45K',
      change: '-18%',
      trend: 'down',
      icon: FileText
    }
  ];

  const systemAlerts: SystemAlert[] = [
    {
      id: 'AL-001',
      type: 'warning',
      title: 'Scheduled Maintenance Due',
      message: 'Tower A elevator maintenance is due in 3 days',
      timestamp: '2025-09-15 14:30',
      actionRequired: true
    },
    {
      id: 'AL-002',
      type: 'error',
      title: 'Critical Work Order',
      message: 'WO-1040 requires immediate attention - urgent priority',
      timestamp: '2025-09-15 12:15',
      actionRequired: true
    },
    {
      id: 'AL-003',
      type: 'info',
      title: 'System Update Available',
      message: 'New FM system features are available for installation',
      timestamp: '2025-09-15 09:00'
    }
  ];

  // Filter data based on search and status
  const filteredWorkOrders = useMemo(() => {
    return recentWorkOrders.filter(workOrder => {
      const matchesSearch = workOrder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           workOrder.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           workOrder.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (workOrder.assignee?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      const matchesStatus = statusFilter === 'all' || workOrder.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [recentWorkOrders, searchTerm, statusFilter]);

  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           property.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           property.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || property.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'vacant': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-red-500 text-white border-red-600';
      case 'high': return 'bg-orange-500 text-white border-orange-600';
      case 'medium': return 'bg-yellow-500 text-white border-yellow-600';
      case 'low': return 'bg-green-500 text-white border-green-600';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-500 text-white border-red-600';
      case 'high': return 'bg-orange-500 text-white border-orange-600';
      case 'medium': return 'bg-yellow-500 text-white border-yellow-600';
      case 'low': return 'bg-green-500 text-white border-green-600';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('nav.fm', 'Facility Management')}</h1>
        <p className="text-gray-600">{t('fm.description', 'Comprehensive facility operations, work orders, and asset management')}</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('common.search', 'Search work orders, properties, or assets...')}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All Status')}</SelectItem>
              <SelectItem value="active">{t('status.active', 'Active')}</SelectItem>
              <SelectItem value="maintenance">{t('status.maintenance', 'Maintenance')}</SelectItem>
              <SelectItem value="new">{t('status.new', 'New')}</SelectItem>
              <SelectItem value="in_progress">{t('status.inProgress', 'In Progress')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {t('common.save', 'Save')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export', 'Export')}
          </Button>
          <Button size="sm" className="bg-[#0061A8] hover:bg-[#0061A8]/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            {t('common.new', 'New Work Order')}
          </Button>
        </div>
      </div>

      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {financialMetrics.map((metric) => (
          <Card key={metric.title} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-xs font-medium ${
                      metric.trend === 'up' ? 'text-green-600' :
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <metric.icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            📊 {t('fm.tabs.overview', 'Overview')}
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="flex items-center gap-2">
            📋 {t('fm.tabs.workOrders', 'Work Orders')}
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            🏢 {t('fm.tabs.properties', 'Properties')}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            ⚠️ {t('fm.tabs.alerts', 'Alerts')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    {t('fm.quickActions', 'Quick Actions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start bg-[#0061A8] hover:bg-[#0061A8]/90 text-white">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    {t('fm.createWorkOrder', 'Create Work Order')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Building2 className="h-4 w-4 mr-2" />
                    {t('fm.addProperty', 'Add Property')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    {t('fm.assignTechnician', 'Assign Technician')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('fm.generateReport', 'Generate Report')}
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('fm.recentActivity', 'Recent Activity')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentWorkOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        order.priority === 'urgent' ? 'bg-red-500' :
                        order.priority === 'high' ? 'bg-orange-500' :
                        order.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{order.title}</span>
                          <Badge className={getPriorityColor(order.priority)} variant="outline">
                            {order.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{order.property}</p>
                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Main Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Work Orders */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    {t('fm.recentWorkOrders', 'Recent Work Orders')}
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    {t('common.viewAll', 'View All')}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentWorkOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{order.title}</h4>
                            <Badge className={getStatusColor(order.status)} variant="outline">
                              {order.status}
                            </Badge>
                            <Badge className={getPriorityColor(order.priority)} variant="outline">
                              {order.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{order.property}</span>
                            {order.assignee && <span>👤 {order.assignee}</span>}
                            <span>📅 {new Date(order.dueDate).toLocaleDateString()}</span>
                            {order.cost && <span>💰 SAR {order.cost.toLocaleString()}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Properties Overview */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t('fm.propertiesOverview', 'Properties Overview')}
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    {t('common.viewAll', 'View All')}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {properties.map((property) => (
                      <div key={property.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{property.name}</h4>
                          <Badge className={getStatusColor(property.status)} variant="outline">
                            {property.status}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>{t('fm.units', 'Units')}:</span>
                            <span>{property.units}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('fm.occupancy', 'Occupancy')}:</span>
                            <span>{property.occupancy}/{property.units}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('fm.issues', 'Issues')}:</span>
                            <span className="text-red-600">{property.issues}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {t('fm.lastInspection', 'Last Inspection')}: {new Date(property.lastInspection).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Work Orders Tab */}
        <TabsContent value="work-orders" className="mt-6">
          <div className="space-y-4">
            {filteredWorkOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{order.title}</h3>
                        <Badge className={getStatusColor(order.status)} variant="outline">
                          {order.status}
                        </Badge>
                        <Badge className={getPriorityColor(order.priority)} variant="outline">
                          {order.priority}
                        </Badge>
                        <Badge variant="outline">{order.category}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{t('workOrder.property', 'Property')}:</span>
                          {order.property}
                        </div>
                        {order.assignee && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{t('workOrder.assignee', 'Assignee')}:</span>
                            {order.assignee}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{t('workOrder.due', 'Due Date')}:</span>
                          {new Date(order.dueDate).toLocaleDateString()}
                        </div>
                        {order.cost && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">{t('workOrder.cost', 'Cost')}:</span>
                            SAR {order.cost.toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {t('workOrder.id', 'Work Order ID')}: {order.id}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view', 'View')}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit', 'Edit')}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete', 'Delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{property.name}</h3>
                    <Badge className={getStatusColor(property.status)} variant="outline">
                      {property.status}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4" />
                      <span>{property.type} • {property.units} {t('common.units', 'units')}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{property.occupancy}/{property.units} {t('common.occupied', 'occupied')}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{property.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{t('fm.lastInspection', 'Last Inspection')}: {new Date(property.lastInspection).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t('fm.issues', 'Issues')}:</span>
                        <Badge variant={property.issues > 5 ? 'destructive' : property.issues > 0 ? 'secondary' : 'default'}>
                          {property.issues}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-6">
          <div className="space-y-4">
            {systemAlerts.map((alert) => (
              <Card key={alert.id} className="border-l-4 border-l-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                        <Badge variant={alert.type === 'error' ? 'destructive' : alert.type === 'warning' ? 'secondary' : 'default'}>
                          {alert.type}
                        </Badge>
                        {alert.actionRequired && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            {t('alert.actionRequired', 'Action Required')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{alert.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            {t('common.view', 'View')}
                          </Button>
                          {alert.actionRequired && (
                            <Button size="sm" className="bg-[#0061A8] hover:bg-[#0061A8]/90 text-white">
                              {t('common.resolve', 'Resolve')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Unsaved Changes Warning Dialog */}
      <UnsavedChangesWarning
        isOpen={showWarning}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onStay={handleStay}
        title={t('unsaved.warningTitle', 'Unsaved Changes')}
        message={t('unsaved.warningMessage', 'You have unsaved changes. Would you like to save them before leaving?')}
        saveText={t('unsaved.saveChanges', 'Save Changes')}
        discardText={t('unsaved.discardChanges', 'Discard Changes')}
        stayText={t('unsaved.stayHere', 'Stay Here')}
      />

      {/* Save Confirmation Dialog */}
      <SaveConfirmation
        isOpen={showSaveConfirm}
        onConfirm={handleSave}
        onCancel={handleStay}
        title={t('unsaved.saveTitle', 'Save Changes')}
        message={t('unsaved.saveMessage', 'Are you sure you want to save these changes?')}
        confirmText={t('unsaved.save', 'Save')}
        cancelText={t('unsaved.cancel', 'Cancel')}
      />
    </div>
  );
}
