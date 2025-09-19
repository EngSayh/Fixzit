'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';
import KPICard from '../../../src/components/shared/KPICard';
import SimpleChart from '../../../src/components/shared/SimpleChart';
import { 
  Report, 
  Analytics, 
  DashboardWidget, 
  PropertyAnalytics, 
  FinancialTrend,
  MaintenanceMetrics,
  TenantAnalytics 
} from '../../../types/reports';

// Mock comprehensive analytics data
const mockAnalytics: Analytics = {
  propertyPerformance: [
    {
      propertyId: '1',
      propertyName: 'Sunset Towers',
      occupancyRate: 95.2,
      avgRent: 4500,
      totalRevenue: 285000,
      maintenanceCost: 45000,
      profitMargin: 84.2,
      tenantSatisfaction: 4.6,
      workOrderCount: 23,
      trend: 'up'
    },
    {
      propertyId: '2',
      propertyName: 'Business Plaza',
      occupancyRate: 88.7,
      avgRent: 6200,
      totalRevenue: 425000,
      maintenanceCost: 68000,
      profitMargin: 84.0,
      tenantSatisfaction: 4.3,
      workOrderCount: 31,
      trend: 'stable'
    },
    {
      propertyId: '3',
      propertyName: 'Green Villas',
      occupancyRate: 92.1,
      avgRent: 8500,
      totalRevenue: 510000,
      maintenanceCost: 72000,
      profitMargin: 85.9,
      tenantSatisfaction: 4.8,
      workOrderCount: 18,
      trend: 'up'
    }
  ],
  financialTrends: [
    { period: 'Jan 2024', revenue: 1200000, expenses: 180000, profit: 1020000, occupancyRate: 91.5, avgRentPerSqft: 65 },
    { period: 'Feb 2024', revenue: 1180000, expenses: 175000, profit: 1005000, occupancyRate: 90.2, avgRentPerSqft: 64 },
    { period: 'Mar 2024', revenue: 1250000, expenses: 185000, profit: 1065000, occupancyRate: 93.1, avgRentPerSqft: 67 },
    { period: 'Apr 2024', revenue: 1320000, expenses: 195000, profit: 1125000, occupancyRate: 94.8, avgRentPerSqft: 68 },
    { period: 'May 2024', revenue: 1285000, expenses: 190000, profit: 1095000, occupancyRate: 93.5, avgRentPerSqft: 66 },
    { period: 'Jun 2024', revenue: 1340000, expenses: 200000, profit: 1140000, occupancyRate: 95.2, avgRentPerSqft: 69 }
  ],
  maintenanceMetrics: {
    totalWorkOrders: 234,
    avgCompletionTime: 2.8,
    costPerWorkOrder: 1250,
    preventiveVsReactive: { preventive: 60, reactive: 40 },
    topCategories: [
      { category: 'HVAC', count: 56, cost: 89000 },
      { category: 'Plumbing', count: 42, cost: 52000 },
      { category: 'Electrical', count: 38, cost: 67000 },
      { category: 'Cleaning', count: 45, cost: 28000 },
      { category: 'Landscaping', count: 25, cost: 35000 }
    ],
    technicianPerformance: [
      { name: 'Ahmed Al-Rashid', completed: 45, avgTime: 2.2, rating: 4.8 },
      { name: 'Sara Mohammed', completed: 38, avgTime: 2.5, rating: 4.6 },
      { name: 'Khalid Al-Otaibi', completed: 42, avgTime: 2.1, rating: 4.9 },
      { name: 'Fatima Al-Zahra', completed: 35, avgTime: 2.8, rating: 4.5 }
    ]
  },
  tenantAnalytics: {
    totalTenants: 342,
    avgLeaseLength: 14.5,
    turnoverRate: 12.3,
    satisfactionScore: 4.5,
    renewalRate: 87.7,
    latePaymentRate: 5.8,
    topComplaints: [
      { category: 'Maintenance Response Time', count: 23 },
      { category: 'Noise Issues', count: 18 },
      { category: 'Parking Problems', count: 15 },
      { category: 'HVAC Issues', count: 12 },
      { category: 'Elevator Problems', count: 8 }
    ]
  },
  marketplaceTrends: {
    totalOrders: 156,
    avgOrderValue: 3500,
    topVendors: [
      { name: 'Al-Rashid Maintenance Co.', orders: 45, value: 185000 },
      { name: 'Saudi Electric Services', orders: 32, value: 125000 },
      { name: 'Green Clean Solutions', orders: 28, value: 85000 },
      { name: 'Tech Support Plus', orders: 25, value: 95000 }
    ],
    categoryTrends: [
      { category: 'HVAC Services', growth: 15.2 },
      { category: 'Cleaning Services', growth: 8.7 },
      { category: 'Electrical Work', growth: 12.1 },
      { category: 'Plumbing Services', growth: 6.3 }
    ],
    paymentTrends: [
      { month: 'Jan', value: 425000 },
      { month: 'Feb', value: 385000 },
      { month: 'Mar', value: 465000 },
      { month: 'Apr', value: 520000 },
      { month: 'May', value: 485000 },
      { month: 'Jun', value: 545000 }
    ]
  },
  complianceMetrics: {
    complianceRate: 94.2,
    expiringSoon: 7,
    overdue: 3,
    inspectionsPassed: 22,
    averageScore: 87.5
  }
};

const mockReports: Report[] = [
  {
    id: '1',
    name: 'Monthly Financial Summary',
    description: 'Comprehensive monthly financial report including revenue, expenses, and profit analysis',
    type: 'financial',
    category: 'Management Reports',
    dataSource: ['properties', 'payments', 'expenses'],
    filters: [],
    format: 'pdf',
    createdBy: 'System',
    createdDate: '2024-01-01T00:00:00Z',
    lastRun: '2024-01-15T09:00:00Z',
    isActive: true,
    parameters: {}
  },
  {
    id: '2',
    name: 'Property Performance Dashboard',
    description: 'Real-time dashboard showing occupancy rates, maintenance costs, and tenant satisfaction',
    type: 'operational',
    category: 'Property Management',
    dataSource: ['properties', 'work_orders', 'tenants'],
    filters: [],
    format: 'dashboard',
    createdBy: 'Admin',
    createdDate: '2024-01-05T00:00:00Z',
    lastRun: '2024-01-15T14:30:00Z',
    isActive: true,
    parameters: {}
  },
  {
    id: '3',
    name: 'Maintenance Cost Analysis',
    description: 'Detailed analysis of maintenance costs by category, property, and time period',
    type: 'maintenance',
    category: 'Operations',
    dataSource: ['work_orders', 'expenses'],
    filters: [],
    format: 'excel',
    createdBy: 'Maintenance Manager',
    createdDate: '2024-01-10T00:00:00Z',
    lastRun: '2024-01-14T16:00:00Z',
    isActive: true,
    parameters: {}
  }
];

const trendIcons = {
  up: { icon: '📈', color: 'text-green-600' },
  down: { icon: '📉', color: 'text-red-600' },
  stable: { icon: '➡️', color: 'text-yellow-600' }
};

export default function ReportsPage() {
  const { t, isRTL } = useTranslation();
  const [analytics, setAnalytics] = useState<Analytics>(mockAnalytics);
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'insights'>('dashboard');
  const [selectedTimeRange, setSelectedTimeRange] = useState('6m');

  // Prepare chart data
  const revenueChartData = analytics.financialTrends.map(trend => ({
    name: trend.period.split(' ')[0],
    value: trend.revenue / 1000 // Convert to thousands
  }));

  const profitChartData = analytics.financialTrends.map(trend => ({
    name: trend.period.split(' ')[0],
    profit: trend.profit / 1000,
    expenses: trend.expenses / 1000
  }));

  const occupancyChartData = analytics.financialTrends.map(trend => ({
    name: trend.period.split(' ')[0],
    value: trend.occupancyRate
  }));

  const maintenanceChartData = analytics.maintenanceMetrics.topCategories.map(cat => ({
    name: cat.category,
    value: cat.count
  }));

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.reports')}</h1>
          <p className="text-gray-600 mt-1">{isRTL ? 'التقارير والتحليلات الشاملة' : 'Comprehensive reports and analytics'}</p>
        </div>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1m">{isRTL ? 'شهر واحد' : '1 Month'}</option>
            <option value="3m">{isRTL ? '3 أشهر' : '3 Months'}</option>
            <option value="6m">{isRTL ? '6 أشهر' : '6 Months'}</option>
            <option value="1y">{isRTL ? 'سنة واحدة' : '1 Year'}</option>
          </select>
          <button className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-blue-700 transition-colors">
            {isRTL ? 'إنشاء تقرير' : 'Create Report'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 {t('dashboard.title')}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 {t('finance.reports')}
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'insights'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              💡 {isRTL ? 'الرؤى' : 'Insights'}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'المؤشرات الرئيسية' : 'Key Metrics'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard
                    title={t('dashboard.monthlyRevenue')}
                    value="1.34M SAR"
                    change={{ value: 8.2, type: 'increase', period: 'vs last month' }}
                    icon={<span>💰</span>}
                    color="green"
                  />
                  <KPICard
                    title={t('dashboard.occupancyRate')}
                    value="95.2%"
                    change={{ value: 2.1, type: 'increase', period: 'vs last month' }}
                    icon={<span>🏠</span>}
                    color="blue"
                  />
                  <KPICard
                    title={t('dashboard.tenantSatisfaction')}
                    value="4.5/5"
                    change={{ value: 4.2, type: 'increase', period: 'vs last month' }}
                    icon={<span>⭐</span>}
                    color="yellow"
                  />
                  <KPICard
                    title={t('workOrders.totalWorkOrders')}
                    value="234"
                    change={{ value: 12.5, type: 'decrease', period: 'vs last month' }}
                    icon={<span>🔧</span>}
                    color="orange"
                  />
                </div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className={`font-medium mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('dashboard.monthlyRevenueTrend')}
                  </h4>
                  <SimpleChart
                    data={revenueChartData}
                    type="line"
                    height={250}
                    color="#0061A8"
                  />
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className={`font-medium mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'معدل الإشغال' : 'Occupancy Rate Trend'}
                  </h4>
                  <SimpleChart
                    data={occupancyChartData}
                    type="area"
                    height={250}
                    color="#10B981"
                  />
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className={`font-medium mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('dashboard.maintenanceByCategory')}
                  </h4>
                  <SimpleChart
                    data={maintenanceChartData}
                    type="bar"
                    height={250}
                    color="#F59E0B"
                  />
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className={`font-medium mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'الربح مقابل المصروفات' : 'Profit vs Expenses'}
                  </h4>
                  <SimpleChart
                    data={profitChartData}
                    type="bar"
                    height={250}
                    color="#8B5CF6"
                  />
                </div>
              </div>

              {/* Property Performance Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h4 className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'أداء العقارات' : 'Property Performance'}
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('properties.propertyName')}
                        </th>
                        <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('dashboard.occupancyRate')}
                        </th>
                        <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                          {isRTL ? 'الإيرادات' : 'Revenue'}
                        </th>
                        <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                          {isRTL ? 'هامش الربح' : 'Profit Margin'}
                        </th>
                        <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                          {isRTL ? 'الاتجاه' : 'Trend'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.propertyPerformance.map((property) => (
                        <tr key={property.propertyId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {property.propertyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className={`w-16 bg-gray-200 rounded-full h-2 ${isRTL ? 'ml-3' : 'mr-3'}`}>
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${property.occupancyRate}%` }}
                                ></div>
                              </div>
                              <span>{property.occupancyRate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(property.totalRevenue / 1000).toLocaleString()}K SAR
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {property.profitMargin}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`flex items-center gap-1 ${trendIcons[property.trend].color}`}>
                              {trendIcons[property.trend].icon}
                              <span className="capitalize">{property.trend}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-lg font-semibold">{isRTL ? 'التقارير المحفوظة' : 'Saved Reports'}</h3>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  {isRTL ? 'إنشاء تقرير جديد' : 'Create New Report'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                  <div key={report.id} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
                    <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h4 className={`font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{report.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        report.type === 'financial' ? 'bg-green-100 text-green-800' :
                        report.type === 'operational' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {report.type}
                      </span>
                    </div>
                    <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {report.description}
                    </p>
                    <div className={`flex items-center justify-between text-xs text-gray-500 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span>{isRTL ? 'آخر تشغيل:' : 'Last run:'} {report.lastRun ? new Date(report.lastRun).toLocaleDateString() : 'Never'}</span>
                      <span className="capitalize">{report.format}</span>
                    </div>
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        {isRTL ? 'تشغيل' : 'Run'}
                      </button>
                      <button className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                        {t('common.edit')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-8">
              <h3 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'الرؤى والتوصيات' : 'Insights & Recommendations'}
              </h3>

              {/* Key Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-2xl">💡</span>
                    <h4 className={`font-semibold text-blue-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {isRTL ? 'فرصة تحسين' : 'Optimization Opportunity'}
                    </h4>
                  </div>
                  <p className={`text-blue-800 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'زيادة الصيانة الوقائية بنسبة 20% يمكن أن تقلل التكاليف الإجمالية بنسبة 15%' : 
                    'Increasing preventive maintenance by 20% could reduce overall costs by 15%'}
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-2xl">📈</span>
                    <h4 className={`font-semibold text-green-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {isRTL ? 'أداء ممتاز' : 'Excellent Performance'}
                    </h4>
                  </div>
                  <p className={`text-green-800 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'معدل رضا المستأجرين يتجاوز المعيار الصناعي بنسبة 12%' : 
                    'Tenant satisfaction is 12% above industry standard'}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-2xl">⚠️</span>
                    <h4 className={`font-semibold text-yellow-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {isRTL ? 'تنبيه' : 'Alert'}
                    </h4>
                  </div>
                  <p className={`text-yellow-800 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? '7 متطلبات امتثال تنتهي صلاحيتها خلال 30 يوماً' : 
                    '7 compliance requirements expiring within 30 days'}
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-2xl">💰</span>
                    <h4 className={`font-semibold text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {isRTL ? 'توفير في التكاليف' : 'Cost Savings'}
                    </h4>
                  </div>
                  <p className={`text-purple-800 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'تم توفير 125,000 ريال هذا الشهر مقارنة بالشهر الماضي' : 
                    'Saved 125,000 SAR this month compared to last month'}
                  </p>
                </div>
              </div>

              {/* Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tenant Analytics */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className={`font-medium mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'تحليلات المستأجرين' : 'Tenant Analytics'}
                  </h4>
                  <div className="space-y-4">
                    <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-gray-600">{isRTL ? 'معدل التجديد' : 'Renewal Rate'}</span>
                      <span className="font-semibold text-green-600">{analytics.tenantAnalytics.renewalRate}%</span>
                    </div>
                    <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-gray-600">{isRTL ? 'معدل التأخير في الدفع' : 'Late Payment Rate'}</span>
                      <span className="font-semibold text-red-600">{analytics.tenantAnalytics.latePaymentRate}%</span>
                    </div>
                    <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-gray-600">{isRTL ? 'متوسط مدة الإيجار' : 'Avg Lease Length'}</span>
                      <span className="font-semibold">{analytics.tenantAnalytics.avgLeaseLength} {isRTL ? 'شهر' : 'months'}</span>
                    </div>
                  </div>
                </div>

                {/* Top Vendor Performance */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className={`font-medium mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'أفضل الموردين' : 'Top Vendor Performance'}
                  </h4>
                  <div className="space-y-3">
                    {analytics.marketplaceTrends.topVendors.slice(0, 4).map((vendor, index) => (
                      <div key={vendor.name} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">{vendor.name}</span>
                        </div>
                        <span className="text-sm text-gray-600">{(vendor.value / 1000).toFixed(0)}K SAR</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}