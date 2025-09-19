import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CalendarIcon,
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Eye,
  Share,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';

interface ReportConfig {
  type: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  filters: Record<string, any>;
}

interface AnalyticsData {
  workOrders: any;
  properties: any;
  financial: any;
  tenants: any;
  maintenance: any;
  generatedAt: Date;
  dateRange: any;
}

const COLORS = ['#0078D4', '#00BCF2', '#00A859', '#FFB400', '#E74C3C', '#9C27B0', '#FF9800'];

export const AdvancedReporting: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'dashboard',
    dateRange: {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
    },
    format: 'pdf',
    includeCharts: true,
    filters: {},
  });
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: reportConfig.dateRange.startDate,
    to: reportConfig.dateRange.endDate,
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [realTimeData, setRealTimeData] = useState<any>(null);

  useEffect(() => {
    loadAnalyticsData();
    loadRealTimeData();
    
    // Set up real-time updates
    const interval = setInterval(loadRealTimeData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [reportConfig.dateRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analytics/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRange: reportConfig.dateRange,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealTimeData = async () => {
    try {
      const response = await fetch('/api/analytics/realtime');
      if (response.ok) {
        const data = await response.json();
        setRealTimeData(data);
      }
    } catch (error) {
      console.error('Failed to load real-time data:', error);
    }
  };

  const generateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportConfig),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportConfig.type}_report.${reportConfig.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const updateDateRange = () => {
    if (selectedDateRange.from && selectedDateRange.to) {
      setReportConfig(prev => ({
        ...prev,
        dateRange: {
          startDate: selectedDateRange.from!,
          endDate: selectedDateRange.to!,
        },
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const KPICard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, change, icon, color }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-1">
                {getChangeIcon(change)}
                <span className={`text-sm ml-1 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {Math.abs(change).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ChartCard: React.FC<{
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
  }> = ({ title, children, actions }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const DashboardView = () => {
    if (!analyticsData) return <div>Loading...</div>;

    const { workOrders, properties, financial, tenants, maintenance } = analyticsData;

    return (
      <div className="space-y-6">
        {/* Real-time Status Bar */}
        {realTimeData && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm font-medium">System Online</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{realTimeData.activeWorkOrders}</span> Active Work Orders
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{realTimeData.onlineTechnicians}</span> Online Technicians
                  </div>
                  {realTimeData.emergencyAlerts > 0 && (
                    <Badge variant="destructive">
                      {realTimeData.emergencyAlerts} Emergency Alerts
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(realTimeData.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Work Orders"
            value={workOrders.total}
            change={12.5}
            icon={<Wrench className="h-6 w-6" />}
            color="bg-blue-100"
          />
          <KPICard
            title="Revenue"
            value={formatCurrency(financial.totalRevenue)}
            change={8.2}
            icon={<DollarSign className="h-6 w-6" />}
            color="bg-green-100"
          />
          <KPICard
            title="Occupancy Rate"
            value={formatPercentage(properties.occupancyRate)}
            change={-1.5}
            icon={<Building className="h-6 w-6" />}
            color="bg-purple-100"
          />
          <KPICard
            title="SLA Compliance"
            value={formatPercentage(workOrders.slaCompliance)}
            change={3.1}
            icon={<CheckCircle className="h-6 w-6" />}
            color="bg-orange-100"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Work Order Trends */}
          <ChartCard
            title="Work Order Trends"
            actions={
              <Select defaultValue="7d">
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={workOrders.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#0078D4" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" stroke="#00A859" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Revenue by Month */}
          <ChartCard title="Revenue Trends">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={financial.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Area type="monotone" dataKey="revenue" stroke="#00BCF2" fill="#00BCF2" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Work Orders by Priority */}
          <ChartCard title="Work Orders by Priority">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(workOrders.byPriority).map(([key, value]) => ({
                    name: key,
                    value,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {Object.entries(workOrders.byPriority).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Expenses by Category */}
          <ChartCard title="Expenses by Category">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(financial.expensesByCategory).map(([key, value]) => ({
                category: key,
                amount: value,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="amount" fill="#FFB400" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Work Orders</span>
                  <span>{formatPercentage(workOrders.completionRate)}</span>
                </div>
                <Progress value={workOrders.completionRate} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Payments</span>
                  <span>{formatPercentage(financial.collectionRate)}</span>
                </div>
                <Progress value={financial.collectionRate} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Average Rating</span>
                  <span>{tenants.tenantSatisfaction}/5.0</span>
                </div>
                <Progress value={(tenants.tenantSatisfaction / 5) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const ReportBuilder = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Configure and generate custom reports for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="report-type">Report Type</Label>
              <Select
                value={reportConfig.type}
                onValueChange={(value) =>
                  setReportConfig(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard Summary</SelectItem>
                  <SelectItem value="financial">Financial Report</SelectItem>
                  <SelectItem value="operational">Operational Report</SelectItem>
                  <SelectItem value="tenant">Tenant Report</SelectItem>
                  <SelectItem value="maintenance">Maintenance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="report-format">Export Format</Label>
              <Select
                value={reportConfig.format}
                onValueChange={(value: any) =>
                  setReportConfig(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <Label>Date Range</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDateRange?.from ? (
                      selectedDateRange.to ? (
                        <>
                          {format(selectedDateRange.from, "LLL dd, y")} -{" "}
                          {format(selectedDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(selectedDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={selectedDateRange?.from}
                    selected={selectedDateRange}
                    onSelect={setSelectedDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={updateDateRange} variant="outline" size="sm">
                Apply
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-charts"
                checked={reportConfig.includeCharts}
                onCheckedChange={(checked) =>
                  setReportConfig(prev => ({ ...prev, includeCharts: checked }))
                }
              />
              <Label htmlFor="include-charts">Include Charts and Graphs</Label>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={loadAnalyticsData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
            <div className="space-x-2">
              <Button variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button onClick={generateReport} disabled={isGeneratingReport}>
                {isGeneratingReport ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading && !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Reporting</h2>
          <p className="text-muted-foreground">
            Comprehensive analytics and reporting for your facility management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadAnalyticsData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Share className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Report Builder
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="mr-2 h-4 w-4" />
            Predictive Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardView />
        </TabsContent>

        <TabsContent value="reports">
          <ReportBuilder />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Analytics</CardTitle>
              <CardDescription>
                AI-powered predictions and forecasting (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Predictive Analytics</h3>
                <p className="text-muted-foreground">
                  Advanced forecasting and trend analysis features will be available soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReporting;