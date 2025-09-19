'use client';

import { useState, useEffect } from 'react';
import EmployeeDirectory from '../../../src/components/hr/EmployeeDirectory';
import AttendanceTracker from '../../../src/components/hr/AttendanceTracker';
import ServiceCatalog from '../../../src/components/hr/ServiceCatalog';
import { Users, Clock, Settings, BarChart3, Calendar, UserCheck, Award, TrendingUp } from 'lucide-react';

export default function HRPage() {
  const [activeTab, setActiveTab] = useState('directory');
  const [orgId, setOrgId] = useState('');
  const [dashboardStats, setDashboardStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get organization ID from session or context
    // Use a real organization ID from the database
    setOrgId('org-1'); // FIXZIT SOUQ Enterprise Demo org
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch overview stats for dashboard
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
    }
  };

  const tabs = [
    { 
      id: 'directory', 
      name: 'Employee Directory', 
      icon: Users,
      description: 'Manage employee profiles and information'
    },
    { 
      id: 'attendance', 
      name: 'Attendance Tracking', 
      icon: Clock,
      description: 'Monitor employee attendance and time tracking'
    },
    { 
      id: 'services', 
      name: 'Service Catalog', 
      icon: Settings,
      description: 'Comprehensive service directory (1,150+ services)'
    },
    { 
      id: 'reports', 
      name: 'HR Analytics', 
      icon: BarChart3,
      description: 'Reports and workforce analytics'
    }
  ];

  const renderTabContent = () => {
    if (!orgId) return <div>Loading...</div>;

    switch (activeTab) {
      case 'directory':
        return <EmployeeDirectory orgId={orgId} />;
      case 'attendance':
        return <AttendanceTracker orgId={orgId} />;
      case 'services':
        return <ServiceCatalog orgId={orgId} />;
      case 'reports':
        return <HRReports orgId={orgId} />;
      default:
        return <EmployeeDirectory orgId={orgId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Human Resources Management</h1>
              <p className="text-gray-600">Comprehensive workforce management and employee operations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">FIXZIT SOUQ Enterprise</p>
                <p className="text-xs text-gray-400">HR Management System v2.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#0061A8] text-[#0061A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 mr-2 ${
                    activeTab === tab.id ? 'text-[#0061A8]' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400 font-normal">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {renderTabContent()}
      </div>
    </div>
  );
}

// HR Reports Component
function HRReports({ orgId }: { orgId: string }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const reportCards = [
    {
      title: 'Employee Overview',
      description: 'Total headcount, active employees, and department breakdown',
      icon: Users,
      color: 'blue',
      metrics: { total: 156, active: 142, departments: 8 }
    },
    {
      title: 'Attendance Summary',
      description: 'Monthly attendance rates and time tracking analytics',
      icon: UserCheck,
      color: 'green',
      metrics: { rate: '94.2%', hours: '5,640h', overtime: '230h' }
    },
    {
      title: 'Leave Management',
      description: 'Leave requests, balances, and approval workflow',
      icon: Calendar,
      color: 'yellow',
      metrics: { pending: 12, approved: 89, balance: '21 days' }
    },
    {
      title: 'Performance Metrics',
      description: 'Employee performance ratings and development tracking',
      icon: Award,
      color: 'purple',
      metrics: { avgRating: '4.2/5', reviews: 94, goals: 156 }
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Reports Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">HR Analytics & Reports</h2>
            <p className="text-gray-600">Comprehensive workforce analytics and reporting</p>
          </div>
          <button className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors">
            Generate Report
          </button>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportCards.map((report, index) => {
            const IconComponent = report.icon;
            return (
              <div key={index} className={`border-2 rounded-lg p-6 ${getColorClasses(report.color)}`}>
                <div className="flex items-center mb-4">
                  <IconComponent className="w-8 h-8 mr-3" />
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                <div className="space-y-2">
                  {Object.entries(report.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{key}:</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <TrendingUp className="w-6 h-6 text-[#0061A8] mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Monthly Report</p>
              <p className="text-sm text-gray-600">Generate monthly HR summary</p>
            </div>
          </button>
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="w-6 h-6 text-[#0061A8] mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Employee Export</p>
              <p className="text-sm text-gray-600">Export employee database</p>
            </div>
          </button>
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Clock className="w-6 h-6 text-[#0061A8] mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Attendance Report</p>
              <p className="text-sm text-gray-600">Generate attendance analytics</p>
            </div>
          </button>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics (Coming Soon)</h3>
        <p className="text-gray-600 mb-4">
          Enhanced reporting features including predictive analytics, performance trends, and automated insights.
        </p>
        <div className="flex space-x-4 text-sm text-gray-600">
          <span>• Predictive Workforce Analytics</span>
          <span>• Performance Trend Analysis</span>
          <span>• Automated HR Insights</span>
          <span>• Custom Report Builder</span>
        </div>
      </div>
    </div>
  );
}