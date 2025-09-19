/**
 * Dashboard Service - Replaces lib/dashboard-api.ts with unified API client
 */

import { apiClient } from './api-client';
import { DashboardStats, ChartData, DashboardFilter, DashboardAlert, PropertyPerformance } from '../types/dashboard';

export class DashboardService {
  private static instance: DashboardService;

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  /**
   * Fetch dashboard statistics with optional filters
   */
  async getStats(filters?: DashboardFilter): Promise<DashboardStats> {
    const params = this.buildFilterParams(filters);
    return apiClient.get<DashboardStats>('/dashboard/stats', params);
  }

  /**
   * Fetch dashboard chart data
   */
  async getCharts(filters?: DashboardFilter): Promise<ChartData> {
    const params = this.buildFilterParams(filters);
    return apiClient.get<ChartData>('/dashboard/charts', params);
  }

  /**
   * Fetch real-time dashboard data with WebSocket support
   */
  async getRealTimeData(): Promise<{
    activeUsers: number;
    ongoingWorkOrders: number;
    systemStatus: string;
    alerts: DashboardAlert[];
  }> {
    return apiClient.get('/dashboard/realtime');
  }

  /**
   * Get dashboard alerts
   */
  async getAlerts(params?: {
    severity?: string;
    type?: string;
    acknowledged?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: DashboardAlert[];
    pagination: any;
  }> {
    return apiClient.get('/dashboard/alerts', params);
  }

  /**
   * Acknowledge dashboard alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    return apiClient.patch(`/dashboard/alerts/${alertId}/acknowledge`);
  }

  /**
   * Get property performance metrics
   */
  async getPropertyPerformance(params?: {
    propertyIds?: string[];
    dateRange?: { from: string; to: string };
    metrics?: string[];
    sortBy?: string;
    limit?: number;
  }): Promise<PropertyPerformance[]> {
    return apiClient.get('/dashboard/property-performance', params);
  }

  /**
   * Get dashboard configuration for current user role
   */
  async getDashboardConfig(): Promise<{
    layout: any;
    widgets: any[];
    permissions: string[];
    preferences: Record<string, any>;
  }> {
    return apiClient.get('/dashboard/config');
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboardConfig(config: {
    layout?: any;
    widgets?: any[];
    preferences?: Record<string, any>;
  }): Promise<void> {
    return apiClient.put('/dashboard/config', config);
  }

  /**
   * Export dashboard data
   */
  async exportDashboard(params: {
    format: 'pdf' | 'excel' | 'csv';
    includeCharts?: boolean;
    filters?: DashboardFilter;
  }): Promise<{ exportId: string; downloadUrl: string }> {
    return apiClient.post('/dashboard/export', params);
  }

  /**
   * Get benchmark data for comparisons
   */
  async getBenchmarks(params?: {
    type: 'industry' | 'regional' | 'size';
    metrics?: string[];
  }): Promise<Record<string, number>> {
    return apiClient.get('/dashboard/benchmarks', params);
  }

  /**
   * Build filter parameters for API calls
   */
  private buildFilterParams(filters?: DashboardFilter): Record<string, any> {
    if (!filters) return {};

    const params: Record<string, any> = {};

    if (filters.dateRange) {
      params.dateFrom = filters.dateRange.from;
      params.dateTo = filters.dateRange.to;
    }

    if (filters.propertyIds && filters.propertyIds.length > 0) {
      params.propertyIds = filters.propertyIds.join(',');
    }

    if (filters.categories && filters.categories.length > 0) {
      params.categories = filters.categories.join(',');
    }

    if (filters.status && filters.status.length > 0) {
      params.status = filters.status.join(',');
    }

    if (filters.assignedTo && filters.assignedTo.length > 0) {
      params.assignedTo = filters.assignedTo.join(',');
    }

    if (filters.priority && filters.priority.length > 0) {
      params.priority = filters.priority.join(',');
    }

    if (filters.customFilters) {
      Object.assign(params, filters.customFilters);
    }

    return params;
  }
}

// Export singleton instance
export const dashboardService = DashboardService.getInstance();