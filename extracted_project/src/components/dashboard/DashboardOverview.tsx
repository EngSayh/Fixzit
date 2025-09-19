"use client";

import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../lib/services';
import { DashboardStats, ChartData, DashboardAlert } from '../../lib/types/dashboard';
import { ApiError } from '../../lib/services/api-client';
import KPICard from '../shared/KPICard';
import SimpleChart from '../shared/SimpleChart';

// Import icons (assuming these exist)
import { 
  HomeIcon, 
  WrenchIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  StarIcon 
} from '@heroicons/react/24/outline';

interface DashboardOverviewProps {
  className?: string;
  filters?: {
    dateRange?: { from: string; to: string };
    propertyIds?: string[];
  };
}

export default function DashboardOverview({ className = "", filters }: DashboardOverviewProps) {
  // State management with proper typing
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data using unified service
  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // Use Promise.all for parallel requests - more efficient than sequential
      const [statsData, chartsData] = await Promise.all([
        dashboardService.getStats(filters),
        dashboardService.getCharts(filters)
      ]);

      setStats(statsData);
      setCharts(chartsData);

      // Fetch alerts separately as they're less critical
      try {
        const alertsResponse = await dashboardService.getAlerts({ 
          acknowledged: false, 
          limit: 5 
        });
        setAlerts(alertsResponse.data);
      } catch (alertError) {
        // Log but don't fail the whole dashboard for alerts
        console.warn('Failed to fetch alerts:', alertError);
      }

    } catch (error: any) {
      console.error('Dashboard data fetch failed:', error);
      
      if (error instanceof ApiError) {
        if (error.isUnauthorized) {
          setError('Please log in to view dashboard data');
        } else if (error.isTimeout) {
          setError('Dashboard is taking too long to load. Please try again.');
        } else if (error.isServerError) {
          setError('Server error occurred. Please try again later.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
  }, [filters]);

  // Refresh data function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  // Handle alert acknowledgment
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await dashboardService.acknowledgeAlert(alertId);
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, isAcknowledged: true }
            : alert
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <button 
            className="px-4 py-2 bg-gray-200 rounded-lg animate-pulse"
            disabled
          >
            Refreshing...
          </button>
        </div>
        
        {/* Loading KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <KPICard 
              key={index}
              title="" 
              value={0} 
              icon={<div />} 
              color="blue" 
              loading={true}
            />
          ))}
        </div>

        {/* Loading Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
          <div className="bg-white rounded-lg border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-900">Dashboard Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard content
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors ${
            refreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-3">Active Alerts</h3>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">{alert.title}</span>
                </div>
                {!alert.isAcknowledged && (
                  <button
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    className="text-xs text-yellow-700 hover:text-yellow-900 underline"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            title="Total Properties"
            value={stats.totalProperties.value}
            change={stats.totalProperties.change.type !== 'none' ? {
              value: stats.totalProperties.change.value,
              type: stats.totalProperties.change.type as 'increase' | 'decrease',
              period: stats.totalProperties.change.period
            } : undefined}
            icon={<HomeIcon className="h-6 w-6" />}
            color="blue"
          />
          <KPICard
            title="Active Work Orders"
            value={stats.activeWorkOrders.value}
            change={stats.activeWorkOrders.change.type !== 'none' ? {
              value: stats.activeWorkOrders.change.value,
              type: stats.activeWorkOrders.change.type as 'increase' | 'decrease',
              period: stats.activeWorkOrders.change.period
            } : undefined}
            icon={<WrenchIcon className="h-6 w-6" />}
            color="orange"
          />
          <KPICard
            title="Monthly Revenue"
            value={`${stats.monthlyRevenue.value} ${stats.monthlyRevenue.currency}`}
            change={stats.monthlyRevenue.change.type !== 'none' ? {
              value: stats.monthlyRevenue.change.value,
              type: stats.monthlyRevenue.change.type as 'increase' | 'decrease',
              period: stats.monthlyRevenue.change.period
            } : undefined}
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            color="green"
          />
          <KPICard
            title="Occupancy Rate"
            value={`${stats.occupancyRate.value}%`}
            change={stats.occupancyRate.change.type !== 'none' ? {
              value: stats.occupancyRate.change.value,
              type: stats.occupancyRate.change.type as 'increase' | 'decrease',
              period: stats.occupancyRate.change.period
            } : undefined}
            icon={<ChartBarIcon className="h-6 w-6" />}
            color="yellow"
          />
          <KPICard
            title="Maintenance Costs"
            value={`${stats.maintenanceCosts.value} ${stats.maintenanceCosts.currency}`}
            change={stats.maintenanceCosts.change.type !== 'none' ? {
              value: stats.maintenanceCosts.change.value,
              type: stats.maintenanceCosts.change.type as 'increase' | 'decrease',
              period: stats.maintenanceCosts.change.period
            } : undefined}
            icon={<WrenchIcon className="h-6 w-6" />}
            color="red"
          />
          <KPICard
            title="Tenant Satisfaction"
            value={`${stats.tenantSatisfaction.value}/${stats.tenantSatisfaction.maxValue}`}
            change={stats.tenantSatisfaction.change.type !== 'none' ? {
              value: stats.tenantSatisfaction.change.value,
              type: stats.tenantSatisfaction.change.type as 'increase' | 'decrease',
              period: stats.tenantSatisfaction.change.period
            } : undefined}
            icon={<StarIcon className="h-6 w-6" />}
            color="green"
          />
        </div>
      )}

      {/* Charts Grid */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Work Orders - Last Week</h3>
            <SimpleChart
              data={charts.workOrdersLastWeek}
              type="bar"
              title="Work Orders - Last Week"
              height={300}
            />
          </div>
          
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Property Types</h3>
            <SimpleChart
              data={charts.propertyTypes}
              type="donut"
              title="Property Types"
              height={300}
            />
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue</h3>
            <SimpleChart
              data={charts.revenueMonthly}
              type="line"
              title="Monthly Revenue"
              height={300}
            />
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Maintenance by Category</h3>
            <SimpleChart
              data={charts.maintenanceByCategory}
              type="bar"
              title="Maintenance by Category"
              height={300}
            />
          </div>
        </div>
      )}
    </div>
  );
}