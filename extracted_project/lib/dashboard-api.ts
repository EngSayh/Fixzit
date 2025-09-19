import api from './api';

export interface DashboardStats {
  totalProperties: {
    value: number;
    change: { value: number; type: "increase" | "decrease"; period: string };
  };
  activeWorkOrders: {
    value: number;
    change: { value: number; type: "increase" | "decrease"; period: string };
  };
  monthlyRevenue: {
    value: string;
    currency: string;
    change: { value: number; type: "increase" | "decrease"; period: string };
  };
  occupancyRate: {
    value: number;
    change: { value: number; type: "increase" | "decrease"; period: string };
  };
  maintenanceCosts: {
    value: string;
    currency: string;
    change: { value: number; type: "increase" | "decrease"; period: string };
  };
  tenantSatisfaction: {
    value: number;
    maxValue: number;
    change: { value: number; type: "increase" | "decrease"; period: string };
  };
}

export interface ChartData {
  workOrdersLastWeek: Array<{ label: string; value: number }>;
  propertyTypes: Array<{ label: string; value: number; color: string }>;
  revenueMonthly: Array<{ label: string; value: number }>;
  maintenanceByCategory: Array<{ label: string; value: number }>;
}

// Fetch dashboard statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await fetch('/api/dashboard/stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return mock data as fallback
    return {
      totalProperties: {
        value: 156,
        change: { value: 8.2, type: "increase", period: "vs last month" }
      },
      activeWorkOrders: {
        value: 42,
        change: { value: 12.5, type: "decrease", period: "vs last month" }  
      },
      monthlyRevenue: {
        value: "450,000",
        currency: "SAR",
        change: { value: 15.3, type: "increase", period: "vs last month" }
      },
      occupancyRate: {
        value: 94.2,
        change: { value: 2.1, type: "increase", period: "vs last month" }
      },
      maintenanceCosts: {
        value: "85,500",
        currency: "SAR", 
        change: { value: 5.8, type: "decrease", period: "vs last month" }
      },
      tenantSatisfaction: {
        value: 4.6,
        maxValue: 5,
        change: { value: 8.2, type: "increase", period: "vs last month" }
      }
    };
  }
}

// Fetch dashboard chart data
export async function getDashboardCharts(): Promise<ChartData> {
  try {
    const response = await fetch('/api/dashboard/charts');
    if (!response.ok) throw new Error('Failed to fetch chart data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard charts:', error);
    // Return mock data as fallback
    return {
      workOrdersLastWeek: [
        { label: "Mon", value: 8 },
        { label: "Tue", value: 12 },
        { label: "Wed", value: 6 },
        { label: "Thu", value: 15 },
        { label: "Fri", value: 9 },
        { label: "Sat", value: 4 },
        { label: "Sun", value: 3 }
      ],
      propertyTypes: [
        { label: "Residential", value: 78, color: "#0078D4" },
        { label: "Commercial", value: 45, color: "#F6851F" },
        { label: "Industrial", value: 23, color: "#00A859" },
        { label: "Mixed Use", value: 10, color: "#FFB400" }
      ],
      revenueMonthly: [
        { label: "Jan", value: 420000 },
        { label: "Feb", value: 445000 },
        { label: "Mar", value: 438000 },
        { label: "Apr", value: 465000 },
        { label: "May", value: 450000 }
      ],
      maintenanceByCategory: [
        { label: "Plumbing", value: 18 },
        { label: "Electrical", value: 12 },
        { label: "HVAC", value: 8 },
        { label: "General", value: 15 },
        { label: "Landscaping", value: 6 }
      ]
    };
  }
}

// Role-based dashboard configuration
export function getDashboardConfig(userRole: string) {
  const baseConfig = {
    showKPIs: true,
    showCharts: true,
    showQuickActions: true,
    showActivities: true
  };

  switch (userRole) {
    case 'super_admin':
      return {
        ...baseConfig,
        kpis: ['totalProperties', 'activeWorkOrders', 'monthlyRevenue', 'occupancyRate', 'maintenanceCosts', 'tenantSatisfaction'],
        charts: ['workOrdersLastWeek', 'propertyTypes', 'revenueMonthly', 'maintenanceByCategory'],
        quickActions: ['create-work-order', 'add-property', 'process-payment', 'schedule-inspection']
      };
    
    case 'admin':
      return {
        ...baseConfig,
        kpis: ['totalProperties', 'activeWorkOrders', 'monthlyRevenue', 'occupancyRate'],
        charts: ['workOrdersLastWeek', 'propertyTypes', 'maintenanceByCategory'],
        quickActions: ['create-work-order', 'add-property', 'schedule-inspection']
      };
    
    case 'property_manager':
      return {
        ...baseConfig,
        kpis: ['activeWorkOrders', 'occupancyRate', 'maintenanceCosts', 'tenantSatisfaction'],
        charts: ['workOrdersLastWeek', 'maintenanceByCategory'],
        quickActions: ['create-work-order', 'schedule-inspection']
      };
    
    case 'tenant':
      return {
        showKPIs: false,
        showCharts: false,
        showQuickActions: true,
        showActivities: true,
        quickActions: ['create-work-order']
      };
    
    default:
      return {
        ...baseConfig,
        kpis: ['activeWorkOrders', 'occupancyRate'],
        charts: ['workOrdersLastWeek'],
        quickActions: ['create-work-order']
      };
  }
}