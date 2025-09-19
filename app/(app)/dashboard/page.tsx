"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "../../../contexts/I18nContext";
import DashboardOverview from "../../../src/components/dashboard/DashboardOverview";
import ActivityFeed from "../../../src/components/shared/ActivityFeed";
import QuickActions from "../../../src/components/shared/QuickActions";
import { dashboardService } from "../../../lib/services";
import { DashboardFilter } from "../../../lib/types/dashboard";
import { ApiError } from "../../../lib/services/api-client";

export default function DashboardPage() {
  const { t, isRTL } = useTranslation();
  const [userRole, setUserRole] = useState("admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilter>({});

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user session using unified service (would be moved to auth service)
        const sessionResponse = await fetch('/api/auth/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.data?.user?.role) {
            setUserRole(sessionData.data.user.role);
          }
        }

        // Get dashboard configuration using unified service
        try {
          const config = await dashboardService.getDashboardConfig();
          // Use config to customize dashboard layout if needed
          console.log('Dashboard config loaded:', config);
        } catch (configError) {
          console.warn('Failed to load dashboard config:', configError);
          // Continue without config - use defaults
        }

      } catch (error: any) {
        console.error('Dashboard initialization error:', error);
        
        if (error instanceof ApiError) {
          if (error.isUnauthorized) {
            setError('Please log in to access the dashboard');
          } else {
            setError('Failed to initialize dashboard');
          }
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Handle filter changes
  const handleFiltersChange = (newFilters: DashboardFilter) => {
    setFilters(newFilters);
  };

  // Handle date range changes
  const handleDateRangeChange = (dateRange: { from: string; to: string }) => {
    setFilters(prev => ({ ...prev, dateRange }));
  };

  // Handle property selection changes
  const handlePropertySelectionChange = (propertyIds: string[]) => {
    setFilters(prev => ({ ...prev, propertyIds }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Dashboard Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t("dashboard.title")}
          </h1>
          <p className={`text-gray-600 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Filters Section */}
        <div className="mb-6 bg-white rounded-lg border p-4">
          <div className="flex flex-wrap gap-4">
            {/* Date Range Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                {t("dashboard.dateRange")}
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  onChange={(e) => {
                    const from = e.target.value;
                    const to = filters.dateRange?.to || '';
                    if (from && to) {
                      handleDateRangeChange({ from, to });
                    }
                  }}
                />
                <input
                  type="date"
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  onChange={(e) => {
                    const to = e.target.value;
                    const from = filters.dateRange?.from || '';
                    if (from && to) {
                      handleDateRangeChange({ from, to });
                    }
                  }}
                />
              </div>
            </div>

            {/* Quick Date Filters */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                {t("dashboard.quickFilters")}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const today = new Date();
                    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    handleDateRangeChange({
                      from: lastWeek.toISOString().split('T')[0],
                      to: today.toISOString().split('T')[0]
                    });
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  {t("dashboard.lastWeek")}
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    handleDateRangeChange({
                      from: lastMonth.toISOString().split('T')[0],
                      to: today.toISOString().split('T')[0]
                    });
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  {t("dashboard.lastMonth")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Dashboard Overview - Spans 3 columns on xl screens */}
          <div className="xl:col-span-3">
            <DashboardOverview 
              filters={filters}
              className="mb-6"
            />
            
            {/* Quick Actions - Role-based */}
            <QuickActions userRole={userRole} />
          </div>

          {/* Sidebar - Activity Feed */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("dashboard.recentActivity")}
                </h3>
              </div>
              <div className="p-6">
                <ActivityFeed limit={10} />
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific Additional Sections */}
        {userRole === 'super_admin' && (
          <div className="mt-8">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">
                {t("dashboard.systemOverview")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">98.5%</div>
                  <div className="text-sm text-gray-600">{t("dashboard.systemUptime")}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">45</div>
                  <div className="text-sm text-gray-600">{t("dashboard.activeUsers")}</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">2.3GB</div>
                  <div className="text-sm text-gray-600">{t("dashboard.storageUsed")}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}