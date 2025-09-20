'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';
import { GlassCard, GlassButton, GlassInput, AnimatedKPI } from '../../../src/components/theme';
import api from '../../../lib/api';
import { formatCurrency, formatPercentage } from '../../../lib/finances-api';

// Arabic/RTL localization utilities
const formatNumberRTL = (value: number, isRTL: boolean, decimals: number = 0) => {
  return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

const formatCurrencyRTL = (value: number, isRTL: boolean) => {
  return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency: isRTL ? 'SAR' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatDateRTL = (dateString: string, isRTL: boolean) => {
  return new Intl.DateTimeFormat(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateString));
};

const formatDateTimeRTL = (dateString: string, isRTL: boolean) => {
  return new Intl.DateTimeFormat(isRTL ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};
import { 
  Plus, Building2, MapPin, Globe, Loader2, Wrench, Filter, Download, Archive, 
  Search, Grid, List, TrendingUp, DollarSign, Home, Users, MoreHorizontal, 
  Eye, Edit, Trash2, CheckSquare, AlertTriangle, Calendar, Settings, X, ArrowUpDown
} from 'lucide-react';
import PropertyOverview from '../../../src/components/properties/PropertyOverview';
import PropertyUnits from '../../../src/components/properties/PropertyUnits';
import PropertyTenants from '../../../src/components/properties/PropertyTenants';
import PropertyDocuments from '../../../src/components/properties/PropertyDocuments';
import PropertyMaintenance from '../../../src/components/properties/PropertyMaintenance';
import PropertyFinancials from '../../../src/components/properties/PropertyFinancials';

// Enhanced Types
type PropertyStatus = 'active' | 'maintenance' | 'vacant' | 'archived';
type PropertyType = 'residential' | 'commercial' | 'mixed' | 'industrial';
type ViewMode = 'grid' | 'list';

type Property = {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  type?: PropertyType;
  status?: PropertyStatus;
  totalUnits?: number;
  occupiedUnits?: number;
  occupancyRate?: number;
  monthlyRevenue?: number;
  yearlyRevenue?: number;
  totalExpenses?: number;
  netIncome?: number;
  profitMargin?: number;
  maintenanceRequests?: number;
  lastInspectionDate?: string;
  managerId?: string;
  managerName?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PropertyFilters = {
  search: string;
  status: PropertyStatus[];
  type: PropertyType[];
  city: string;
  occupancyRange: [number, number];
  revenueRange: [number, number];
};

type PropertyKPIs = {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  avgOccupancyRate: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  avgProfitMargin: number;
  maintenanceRequests: number;
  monthlyGrowth: number;
};

type BulkAction = 'export' | 'archive' | 'activate' | 'assign_manager' | 'schedule_inspection';
type SortOption = 'name' | 'occupancy' | 'revenue' | 'status' | 'created_at' | 'last_updated';
type SortDirection = 'asc' | 'desc';

// Configuration based on user role
const getPropertyDashboardConfig = (userRole: string) => {
  switch (userRole) {
    case 'super_admin':
    case 'admin':
      return {
        showKPIs: true,
        kpis: ['totalProperties', 'totalUnits', 'avgOccupancyRate', 'totalRevenue', 'netIncome', 'maintenanceRequests'],
        actions: ['add', 'bulk_export', 'bulk_archive', 'assign_manager', 'schedule_inspection'],
        filters: ['search', 'status', 'type', 'city', 'occupancy', 'revenue']
      };
    case 'property_manager':
      return {
        showKPIs: true,
        kpis: ['totalProperties', 'totalUnits', 'avgOccupancyRate', 'maintenanceRequests'],
        actions: ['add', 'bulk_export', 'schedule_inspection'],
        filters: ['search', 'status', 'occupancy']
      };
    default:
      return {
        showKPIs: false,
        kpis: [],
        actions: ['add'],
        filters: ['search']
      };
  }
};

export default function PropertiesPage() {
  const { t, isRTL } = useTranslation();
  const [items, setItems] = useState<Property[]>([]);
  const [filteredItems, setFilteredItems] = useState<Property[]>([]);
  const [kpis, setKpis] = useState<PropertyKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [userRole, setUserRole] = useState('admin');
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Filter state
  const [filters, setFilters] = useState<PropertyFilters>({
    search: '',
    status: [],
    type: [],
    city: '',
    occupancyRange: [0, 100],
    revenueRange: [0, 1000000]
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Polling refs
  const intervalRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  // Property Detail Modal
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');

  // Get dashboard configuration
  const config = useMemo(() => getPropertyDashboardConfig(userRole), [userRole]);

  // Real-time polling with visibility controls
  const startPolling = (fn: () => void) => {
    stopPolling();
    fn(); // Run immediately
    intervalRef.current = window.setInterval(() => {
      if (!document.hidden) fn();
    }, 3 * 60 * 1000); // Poll every 3 minutes
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  async function loadProperties() {
    try {
      setError('');
      setLoading(true);

      // Abort previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const [propertiesResponse, kpisResponse, sessionResponse] = await Promise.all([
        fetch('/api/properties', { signal: controller.signal }),
        fetch('/api/properties/kpis', { signal: controller.signal }),
        fetch('/api/auth/session', { signal: controller.signal, cache: 'no-store' })
      ]);

      if (controller.signal.aborted) return;

      if (propertiesResponse.ok) {
        const data = await propertiesResponse.json();
        setItems(data.data || data);
      }
      
      if (kpisResponse.ok) {
        const kpisData = await kpisResponse.json();
        setKpis(kpisData);
      }
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData?.user?.role) setUserRole(sessionData.user.role);
      }
      
      setLastUpdated(new Date().toISOString());
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setError(error?.message || t('failedToLoadProperties') || 'Failed to load properties');
      }
    } finally {
      setLoading(false);
    }
  }

  // Advanced filtering and sorting logic
  useEffect(() => {
    let filtered = items.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = (
          item.name.toLowerCase().includes(searchLower) ||
          item.address.toLowerCase().includes(searchLower) ||
          item.city?.toLowerCase().includes(searchLower) ||
          item.id.toLowerCase().includes(searchLower) ||
          item.managerName?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.status.length > 0 && item.status) {
        if (!filters.status.includes(item.status)) return false;
      }
      
      // Type filter
      if (filters.type.length > 0 && item.type) {
        if (!filters.type.includes(item.type)) return false;
      }
      
      // City filter
      if (filters.city && item.city !== filters.city) {
        return false;
      }
      
      // Occupancy range filter
      if (item.occupancyRate !== undefined) {
        if (item.occupancyRate < filters.occupancyRange[0] || item.occupancyRate > filters.occupancyRange[1]) {
          return false;
        }
      }
      
      // Revenue range filter
      if (item.monthlyRevenue !== undefined) {
        if (item.monthlyRevenue < filters.revenueRange[0] || item.monthlyRevenue > filters.revenueRange[1]) {
          return false;
        }
      }
      
      return true;
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'occupancy':
          aValue = a.occupancyRate || 0;
          bValue = b.occupancyRate || 0;
          break;
        case 'revenue':
          aValue = a.monthlyRevenue || 0;
          bValue = b.monthlyRevenue || 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'created_at':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'last_updated':
          aValue = new Date(a.updatedAt || 0).getTime();
          bValue = new Date(b.updatedAt || 0).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredItems(filtered);
  }, [items, filters, sortBy, sortDirection]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
      setShowBulkActions(true);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: BulkAction) => {
    if (selectedIds.size === 0) return;
    
    try {
      await api.post('/properties/bulk', {
        action,
        propertyIds: Array.from(selectedIds)
      });
      
      // Refresh data
      loadProperties();
      setSelectedIds(new Set());
      setShowBulkActions(false);
    } catch (error: any) {
      setError(error?.response?.data?.error || t('bulkActionFailed') || 'Bulk action failed');
    }
  };

  const exportProperties = async () => {
    try {
      const response = await fetch('/api/properties/export', { method: 'GET' });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Properties_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(t('exportFailed') || 'Export failed');
    }
  };

  // Effects
  useEffect(() => {
    let mounted = true;

    // Visibility-aware polling
    const onVis = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling(loadProperties);
      }
    };

    startPolling(loadProperties);
    document.addEventListener('visibilitychange', onVis);

    // Real-time updates
    let unsubscribe: (() => void) | null = null;
    if (typeof window !== 'undefined') {
      import('../../../lib/realtime').then(({ subscribeToPropertyUpdates }) => {
        unsubscribe = subscribeToPropertyUpdates((data) => {
          console.log('Property update received:', data);
          if (mounted) loadProperties();
        });
      }).catch(() => {
        console.log('Realtime module not available');
      });
    }

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVis);
      stopPolling();
      abortRef.current?.abort();
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handlePropertyCreated = (newProperty: Property) => {
    // Optimistically update the list with the new property
    setItems(prevItems => [...prevItems, newProperty]);
    setIsModalOpen(false);
    loadProperties(); // Refresh to get updated KPIs
  };

  // Status configuration
  const statusConfig = {
    active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: '🟢' },
    maintenance: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800', icon: '🔧' },
    vacant: { label: 'Vacant', color: 'bg-gray-100 text-gray-800', icon: '🏢' },
    archived: { label: 'Archived', color: 'bg-red-100 text-red-800', icon: '📦' }
  };

  const typeConfig = {
    residential: { label: 'Residential', color: 'bg-blue-100 text-blue-800', icon: '🏠' },
    commercial: { label: 'Commercial', color: 'bg-purple-100 text-purple-800', icon: '🏢' },
    mixed: { label: 'Mixed Use', color: 'bg-indigo-100 text-indigo-800', icon: '🏗️' },
    industrial: { label: 'Industrial', color: 'bg-orange-100 text-orange-800', icon: '🏭' }
  };

  // KPI Components
  const renderKPIs = () => {
    if (!config.showKPIs || !kpis) return null;

    const kpiComponents = {
      totalProperties: (
        <AnimatedKPI
          key="totalProperties"
          title={t('totalProperties') || 'Total Properties'}
          value={kpis.totalProperties}
          icon={<Building2 />}
          color="primary"
          trend={kpis.monthlyGrowth > 0 ? 'up' : kpis.monthlyGrowth < 0 ? 'down' : 'neutral'}
          trendValue={Math.abs(kpis.monthlyGrowth)}
        />
      ),
      totalUnits: (
        <AnimatedKPI
          key="totalUnits"
          title={t('totalUnits') || 'Total Units'}
          value={kpis.totalUnits}
          icon={<Home />}
          color="accent"
        />
      ),
      avgOccupancyRate: (
        <AnimatedKPI
          key="avgOccupancyRate"
          title={t('avgOccupancy') || 'Avg Occupancy'}
          value={kpis.avgOccupancyRate}
          suffix="%"
          icon={<Users />}
          color="success"
          trend={kpis.avgOccupancyRate > 75 ? 'up' : kpis.avgOccupancyRate < 60 ? 'down' : 'neutral'}
        />
      ),
      totalRevenue: (
        <AnimatedKPI
          key="totalRevenue"
          title={t('totalRevenue') || 'Total Revenue'}
          value={kpis.totalRevenue}
          prefix="SAR "
          icon={<DollarSign />}
          color="primary"
          trend="up"
        />
      ),
      netIncome: (
        <AnimatedKPI
          key="netIncome"
          title={t('netIncome') || 'Net Income'}
          value={kpis.netIncome}
          prefix="SAR "
          icon={<TrendingUp />}
          color="success"
        />
      ),
      maintenanceRequests: (
        <AnimatedKPI
          key="maintenanceRequests"
          title={t('pendingMaintenance') || 'Pending Maintenance'}
          value={kpis.maintenanceRequests}
          icon={<AlertTriangle />}
          color={kpis.maintenanceRequests > 10 ? 'warning' : 'primary'}
        />
      )
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {config.kpis.map((kpiKey: keyof typeof kpiComponents) => kpiComponents[kpiKey])}
      </div>
    );
  };

  // Filter Panel Component
  const renderFilterPanel = () => (
    <GlassCard className={`p-6 mb-6 ${showFilters ? '' : 'hidden'}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('advancedFilters') || 'Advanced Filters'}</h3>
          <GlassButton
            onClick={() => setShowFilters(false)}
            variant="ghost"
            size="sm"
            icon={<X size={16} />}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('status') || 'Status'}</label>
            <div className="space-y-2">
              {Object.entries(statusConfig).map(([key, config]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(key as PropertyStatus)}
                    onChange={(e) => {
                      const newStatus = e.target.checked
                        ? [...filters.status, key as PropertyStatus]
                        : filters.status.filter(s => s !== key);
                      setFilters(prev => ({ ...prev, status: newStatus }));
                    }}
                    className="rounded"
                  />
                  <span className={`px-2 py-1 rounded text-xs ${config.color}`}>
                    {config.icon} {config.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('type') || 'Type'}</label>
            <div className="space-y-2">
              {Object.entries(typeConfig).map(([key, config]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.type.includes(key as PropertyType)}
                    onChange={(e) => {
                      const newType = e.target.checked
                        ? [...filters.type, key as PropertyType]
                        : filters.type.filter(t => t !== key);
                      setFilters(prev => ({ ...prev, type: newType }));
                    }}
                    className="rounded"
                  />
                  <span className={`px-2 py-1 rounded text-xs ${config.color}`}>
                    {config.icon} {config.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('city') || 'City'}</label>
            <select
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
              className="w-full input-glass"
            >
              <option value="">{t('allCities') || 'All Cities'}</option>
              {Array.from(new Set(items.map(p => p.city).filter(Boolean))).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <GlassButton
            onClick={() => setFilters({
              search: '',
              status: [],
              type: [],
              city: '',
              occupancyRange: [0, 100],
              revenueRange: [0, 1000000]
            })}
            variant="secondary"
          >
            {t('clearFilters') || 'Clear Filters'}
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );

  // Bulk Actions Bar
  const renderBulkActions = () => {
    if (!showBulkActions || selectedIds.size === 0) return null;

    return (
      <GlassCard className="p-4 mb-6 border-brand-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} {t('propertiesSelected') || 'properties selected'}
            </span>
            <GlassButton
              onClick={selectAll}
              variant="ghost"
              size="sm"
            >
              {selectedIds.size === filteredItems.length 
                ? t('deselectAll') || 'Deselect All'
                : t('selectAll') || 'Select All'
              }
            </GlassButton>
          </div>
          
          <div className="flex items-center gap-2">
            {config.actions.includes('bulk_export') && (
              <GlassButton
                onClick={() => handleBulkAction('export')}
                size="sm"
                icon={<Download size={16} />}
              >
                {t('export') || 'Export'}
              </GlassButton>
            )}
            {config.actions.includes('bulk_archive') && (
              <GlassButton
                onClick={() => handleBulkAction('archive')}
                size="sm"
                icon={<Archive size={16} />}
                variant="secondary"
              >
                {t('archive') || 'Archive'}
              </GlassButton>
            )}
            {config.actions.includes('schedule_inspection') && (
              <GlassButton
                onClick={() => handleBulkAction('schedule_inspection')}
                size="sm"
                icon={<Calendar size={16} />}
              >
                {t('scheduleInspection') || 'Schedule Inspection'}
              </GlassButton>
            )}
          </div>
        </div>
      </GlassCard>
    );
  };

  // Grid View Component
  const renderGridView = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredItems.map(p => (
        <div key={p.id} className="relative">
          <GlassCard className="p-6 hover:shadow-lg transition-all duration-200 group">
            {/* Selection Checkbox */}
            <div className="absolute top-3 left-3 z-10">
              <input
                type="checkbox"
                checked={selectedIds.has(p.id)}
                onChange={() => toggleSelection(p.id)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
            </div>

            <Link href={`/properties/${p.id}`} className="block">
              <div className={`${isRTL ? 'text-right' : 'text-left'} pt-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-brand-600 transition-colors">
                      {p.name}
                    </h3>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <p className="flex items-center gap-2">
                        <MapPin size={16} className="opacity-60" />
                        {p.address}
                      </p>
                      {(p.city || p.state || p.country) && (
                        <p className="flex items-center gap-2">
                          <Globe size={16} className="opacity-60" />
                          {[p.city, p.state, p.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {p.status && (
                      <span className={`px-2 py-1 rounded text-xs ${statusConfig[p.status].color}`}>
                        {statusConfig[p.status].icon} {statusConfig[p.status].label}
                      </span>
                    )}
                    {p.type && (
                      <span className={`px-2 py-1 rounded text-xs ${typeConfig[p.type].color}`}>
                        {typeConfig[p.type].icon} {typeConfig[p.type].label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Property Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {p.totalUnits && (
                    <div className="text-center p-3 rounded-lg bg-brand-50/50 dark:bg-brand-900/20">
                      <p className="text-2xl font-bold text-[#0061A8]">{p.totalUnits}</p>
                      <p className="text-xs opacity-70">{t('totalUnits') || 'Total Units'}</p>
                    </div>
                  )}
                  {p.occupancyRate !== undefined && (
                    <div className="text-center p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20">
                      <p className="text-2xl font-bold text-[#16A34A]">{formatNumberRTL(p.occupancyRate, isRTL, 0)}%</p>
                      <p className="text-xs opacity-70">{t('occupancy') || 'Occupancy'}</p>
                    </div>
                  )}
                </div>

                {/* Performance Metrics */}
                {(p.monthlyRevenue || p.netIncome) && (
                  <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-brand-50/50 to-indigo-50/50 dark:from-brand-900/20 dark:to-indigo-900/20">
                    {p.monthlyRevenue && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm opacity-70">{t('monthlyRevenue') || 'Monthly Revenue'}</span>
                        <span className="text-lg font-bold text-[#0061A8]">
                          {isRTL ? formatCurrencyRTL(p.monthlyRevenue, true) : formatCurrency(p.monthlyRevenue)}
                        </span>
                      </div>
                    )}
                    {p.netIncome !== undefined && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm opacity-70">{t('netIncome') || 'Net Income'}</span>
                        <span className="text-sm font-medium text-green-600">
                          {isRTL ? formatCurrencyRTL(p.netIncome, true) : formatCurrency(p.netIncome)}
                        </span>
                      </div>
                    )}
                    {p.profitMargin !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm opacity-70">{t('profitMargin') || 'Profit Margin'}</span>
                        <span className="text-sm font-medium">
                          {formatPercentage(p.profitMargin)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>

            {/* Action Buttons */}
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Link href={`/work-orders/new?propertyId=${p.id}`} className="flex-1">
                <GlassButton
                  size="sm"
                  className="w-full border-[#00A859]/30 hover:bg-[#00A859]/10 dark:hover:bg-[#00A859]/20"
                >
                  <Wrench size={16} className="text-[#00A859]" />
                  <span className="text-[#00A859]">{t('newWorkOrder') || 'New Work Order'}</span>
                </GlassButton>
              </Link>
              <GlassButton 
                onClick={() => {
                  setSelectedProperty(p);
                  setShowDetailModal(true);
                  setDetailTab('overview');
                }}
                size="sm" 
                className="w-full flex-1"
              >
                <Eye size={16} />
                {t('viewDetails') || 'View Details'}
              </GlassButton>
            </div>

            {/* Additional Info */}
            <div className="mt-3 pt-3 border-t border-white/20 dark:border-white/10 flex items-center justify-between text-xs opacity-50">
              <span>
                {p.managerName && `${t('manager') || 'Manager'}: ${p.managerName}`}
              </span>
              <span>
                {p.createdAt && new Date(p.createdAt).toLocaleDateString()}
              </span>
            </div>
          </GlassCard>
        </div>
      ))}
    </div>
  );

  // List View Component  
  const renderListView = () => (
    <GlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/10 dark:bg-black/10">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                />
              </th>
              <th className="p-3 text-left font-medium">{t('property') || 'Property'}</th>
              <th className="p-3 text-left font-medium">{t('type') || 'Type'}</th>
              <th className="p-3 text-left font-medium">{t('status') || 'Status'}</th>
              <th className="p-3 text-left font-medium">{t('occupancy') || 'Occupancy'}</th>
              <th className="p-3 text-left font-medium">{t('revenue') || 'Revenue'}</th>
              <th className="p-3 text-left font-medium">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(p => (
              <tr key={p.id} className="border-t border-white/10 dark:border-white/5 hover:bg-white/5">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelection(p.id)}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </td>
                <td className="p-3">
                  <div>
                    <button 
                      onClick={() => {
                        setSelectedProperty(p);
                        setShowDetailModal(true);
                        setDetailTab('overview');
                      }}
                      className="font-medium hover:text-brand-600 text-left"
                    >
                      {p.name}
                    </button>
                    <p className="text-sm opacity-70">{p.address}</p>
                    {p.city && <p className="text-xs opacity-50">{p.city}</p>}
                  </div>
                </td>
                <td className="p-3">
                  {p.type && (
                    <span className={`px-2 py-1 rounded text-xs ${typeConfig[p.type].color}`}>
                      {typeConfig[p.type].icon} {typeConfig[p.type].label}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {p.status && (
                    <span className={`px-2 py-1 rounded text-xs ${statusConfig[p.status].color}`}>
                      {statusConfig[p.status].icon} {statusConfig[p.status].label}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {p.occupancyRate !== undefined && (
                    <div>
                      <span className="font-medium">{Math.round(p.occupancyRate)}%</span>
                      {p.totalUnits && p.occupiedUnits && (
                        <p className="text-xs opacity-70">
                          {p.occupiedUnits}/{p.totalUnits} {t('units') || 'units'}
                        </p>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {p.monthlyRevenue && (
                    <div>
                      <span className="font-medium text-[#0061A8]">
                        {formatCurrency(p.monthlyRevenue)}
                      </span>
                      {p.profitMargin !== undefined && (
                        <p className="text-xs opacity-70">
                          {formatPercentage(p.profitMargin)} {t('margin') || 'margin'}
                        </p>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <GlassButton 
                      onClick={() => {
                        setSelectedProperty(p);
                        setShowDetailModal(true);
                        setDetailTab('overview');
                      }}
                      size="sm" 
                      variant="ghost" 
                      icon={<Eye size={16} />} 
                    />
                    <Link href={`/properties/${p.id}/edit`}>
                      <GlassButton size="sm" variant="ghost" icon={<Edit size={16} />} />
                    </Link>
                    <GlassButton size="sm" variant="ghost" icon={<MoreHorizontal size={16} />} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass bg-white/50 dark:bg-slate-900/40 rounded-2xl p-6 border border-white/30 dark:border-white/10 shadow-glass animate-pulse">
              <div className="space-y-4">
                <div className="h-6 bg-slate-200/60 rounded w-2/3"></div>
                <div className="h-4 bg-slate-200/40 rounded w-full"></div>
                <div className="h-4 bg-slate-200/40 rounded w-1/2"></div>
                <div className="flex justify-between">
                  <div className="h-8 bg-slate-200/40 rounded w-16"></div>
                  <div className="h-8 bg-slate-200/40 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (filteredItems.length === 0) {
      if (items.length === 0) {
        return (
          <GlassCard className="p-12 text-center">
            <div className="text-8xl mb-6 opacity-20">
              <Building2 size={64} className="mx-auto text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold opacity-70 mb-2">
              {t('noPropertiesYet') || 'No properties yet'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('startByAddingFirstProperty') || 'Start by adding your first property to begin portfolio management'}
            </p>
            {config.actions.includes('add') && (
              <GlassButton
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-[#0061A8] to-indigo-500 text-white"
              >
                <Plus size={20} />
                {t('addYourFirstProperty') || 'Add Your First Property'}
              </GlassButton>
            )}
          </GlassCard>
        );
      } else {
        return (
          <GlassCard className="p-12 text-center">
            <div className="text-6xl mb-6 opacity-20">
              <Search size={48} className="mx-auto text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold opacity-70 mb-2">
              {t('noMatchingProperties') || 'No matching properties'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('tryAdjustingFilters') || 'Try adjusting your filters or search terms'}
            </p>
            <GlassButton
              onClick={() => setFilters({
                search: '',
                status: [],
                type: [],
                city: '',
                occupancyRange: [0, 100],
                revenueRange: [0, 1000000]
              })}
            >
              {t('clearFilters') || 'Clear Filters'}
            </GlassButton>
          </GlassCard>
        );
      }
    }

    return viewMode === 'grid' ? renderGridView() : renderListView();
  };

  // Format last updated time
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return '';
    return new Intl.DateTimeFormat(isRTL ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(lastUpdated));
  }, [lastUpdated, isRTL]);

  return (
    <main className={`p-6 max-w-7xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className={`text-3xl font-bold bg-gradient-to-r from-[#0061A8] to-indigo-500 bg-clip-text text-transparent ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('propertiesManagement') || 'Properties Management'}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-slate-600 dark:text-slate-400">
              {filteredItems.length} {items.length !== filteredItems.length ? `of ${items.length} ` : ''}{t('propertiesCount') || 'properties'} • {t('managePropertyPortfolio') || 'Manage your property portfolio'}
            </p>
            {lastUpdatedLabel && (
              <span className="text-xs opacity-50">
                {t('lastUpdated') || 'Last updated'}: {lastUpdatedLabel}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {config.actions.includes('bulk_export') && (
            <GlassButton
              onClick={exportProperties}
              variant="secondary"
              icon={<Download size={16} />}
            >
              {t('export') || 'Export'}
            </GlassButton>
          )}
          {config.actions.includes('add') && (
            <GlassButton
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#0061A8] to-indigo-500 text-white"
            >
              <Plus size={20} />
              {t('addProperty') || 'Add Property'}
            </GlassButton>
          )}
        </div>
      </div>

      {/* KPIs Dashboard */}
      {renderKPIs()}

      {/* Controls Bar */}
      <GlassCard className="p-4 mb-6">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <GlassInput
                placeholder={t('searchProperties') || 'Search properties...'}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-64"
                variant="search"
              />
            </div>
            
            {/* Filter Toggle */}
            <GlassButton
              onClick={() => setShowFilters(!showFilters)}
              variant="secondary"
              icon={<Filter size={16} />}
            >
              {t('filters') || 'Filters'}
              {(filters.status.length + filters.type.length + (filters.city ? 1 : 0)) > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-brand-500 text-white rounded-full text-xs">
                  {filters.status.length + filters.type.length + (filters.city ? 1 : 0)}
                </span>
              )}
            </GlassButton>
            
            {/* Sort */}
            <select
              value={`${sortBy}_${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('_');
                setSortBy(field as SortOption);
                setSortDirection(direction as SortDirection);
              }}
              className="input-glass text-sm"
            >
              <option value="created_at_desc">{t('newestFirst') || 'Newest First'}</option>
              <option value="created_at_asc">{t('oldestFirst') || 'Oldest First'}</option>
              <option value="name_asc">{t('nameAZ') || 'Name A-Z'}</option>
              <option value="name_desc">{t('nameZA') || 'Name Z-A'}</option>
              <option value="occupancy_desc">{t('highestOccupancy') || 'Highest Occupancy'}</option>
              <option value="occupancy_asc">{t('lowestOccupancy') || 'Lowest Occupancy'}</option>
              <option value="revenue_desc">{t('highestRevenue') || 'Highest Revenue'}</option>
              <option value="revenue_asc">{t('lowestRevenue') || 'Lowest Revenue'}</option>
            </select>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <GlassButton
              onClick={() => setViewMode('grid')}
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              icon={<Grid size={16} />}
            />
            <GlassButton
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              icon={<List size={16} />}
            />
          </div>
        </div>
      </GlassCard>

      {/* Filters Panel */}
      {renderFilterPanel()}

      {/* Bulk Actions */}
      {renderBulkActions()}

      {/* Error Display */}
      {error && (
        <GlassCard className="mb-4 p-4 border-rose-200 bg-rose-50/50">
          <p className="text-sm text-rose-600">{error}</p>
        </GlassCard>
      )}

      {/* Content */}
      {renderContent()}

      {/* Create Property Modal */}
      {isModalOpen && (
        <CreateProperty 
          onClose={() => setIsModalOpen(false)} 
          onCreated={handlePropertyCreated} 
        />
      )}
    </main>
  );
}

// Enhanced Create Property Modal
function CreateProperty({ onClose, onCreated }: { onClose: () => void; onCreated: (property: Property) => void }) {
  const { t, isRTL } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'SA',
    type: 'residential' as PropertyType,
    totalUnits: '',
    rentAmount: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      setError(t('propertyNameAndAddressRequired') || 'Property name and address are required');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/properties', {
        ...formData,
        totalUnits: formData.totalUnits ? parseInt(formData.totalUnits) : undefined,
        rentAmount: formData.rentAmount ? parseFloat(formData.rentAmount) : undefined
      });
      onCreated(response.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || t('createFailed') || 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50 p-4">
      <GlassCard className="w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#0061A8] to-indigo-500 bg-clip-text text-transparent">
            {t('addNewProperty') || 'Add New Property'}
          </h2>
          <GlassButton onClick={onClose} variant="ghost" size="sm" icon={<X size={20} />} />
        </div>

        {error && (
          <GlassCard className="mb-6 p-4 border-rose-200 bg-rose-50/50">
            <p className="text-sm text-rose-600">{error}</p>
          </GlassCard>
        )}

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">
                {t('propertyName') || 'Property Name'} *
              </label>
              <GlassInput
                placeholder={t('propertyNamePlaceholder') || 'e.g. Central Business Tower'}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">
                {t('propertyType') || 'Property Type'}
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full input-glass"
              >
                <option value="residential">{t('residential') || 'Residential'}</option>
                <option value="commercial">{t('commercial') || 'Commercial'}</option>
                <option value="mixed">{t('mixedUse') || 'Mixed Use'}</option>
                <option value="industrial">{t('industrial') || 'Industrial'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">
              {t('address') || 'Address'} *
            </label>
            <GlassInput
              placeholder={t('fullPropertyAddress') || 'Full property address'}
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">
                {t('city') || 'City'}
              </label>
              <GlassInput
                placeholder={t('cityPlaceholder') || 'e.g. Riyadh'}
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">
                {t('stateRegion') || 'State/Region'}
              </label>
              <GlassInput
                placeholder={t('stateRegionPlaceholder') || 'e.g. Riyadh Region'}
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">
                {t('country') || 'Country'}
              </label>
              <select
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full input-glass"
              >
                <option value="SA">{t('saudiArabia') || 'Saudi Arabia'}</option>
                <option value="AE">{t('unitedArabEmirates') || 'UAE'}</option>
                <option value="QA">{t('qatar') || 'Qatar'}</option>
                <option value="KW">{t('kuwait') || 'Kuwait'}</option>
                <option value="BH">{t('bahrain') || 'Bahrain'}</option>
              </select>
            </div>
          </div>

          {/* Financial Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">
                {t('totalUnits') || 'Total Units'}
              </label>
              <GlassInput
                type="number"
                placeholder="e.g. 24"
                value={formData.totalUnits}
                onChange={(e) => handleInputChange('totalUnits', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">
                {t('averageRent') || 'Average Rent (SAR)'}
              </label>
              <GlassInput
                type="number"
                placeholder="e.g. 3500"
                value={formData.rentAmount}
                onChange={(e) => handleInputChange('rentAmount', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className={`mt-8 flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <GlassButton
            onClick={onClose}
            className="flex-1 py-3"
            variant="secondary"
            disabled={submitting}
          >
            {t('cancel') || 'Cancel'}
          </GlassButton>
          <GlassButton
            onClick={submit}
            className="flex-1 py-3 bg-gradient-to-r from-[#0061A8] to-indigo-500 text-white"
            disabled={submitting}
            loading={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('creating') || 'Creating...'}
              </>
            ) : (
              <>
                <Plus size={20} />
                {t('createProperty') || 'Create Property'}
              </>
            )}
          </GlassButton>
        </div>
      </GlassCard>
      
      {/* Property Detail Modal */}
      {showDetailModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">{selectedProperty.name}</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedProperty(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Property Detail Tabs */}
            <div className="border-b">
              <nav className="flex gap-6 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'units', label: 'Units', icon: '🏠' },
                  { id: 'tenants', label: 'Tenants', icon: '👥' },
                  { id: 'documents', label: 'Documents', icon: '📁' },
                  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
                  { id: 'financials', label: 'Financials', icon: '💰' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={`py-4 px-1 border-b-2 transition-colors ${
                      detailTab === tab.id
                        ? 'border-[#0061A8] text-[#0061A8]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {detailTab === 'overview' && <PropertyOverview property={selectedProperty} />}
              {detailTab === 'units' && <PropertyUnits propertyId={selectedProperty.id} />}
              {detailTab === 'tenants' && <PropertyTenants propertyId={selectedProperty.id} />}
              {detailTab === 'documents' && <PropertyDocuments propertyId={selectedProperty.id} />}
              {detailTab === 'maintenance' && <PropertyMaintenance propertyId={selectedProperty.id} />}
              {detailTab === 'financials' && <PropertyFinancials propertyId={selectedProperty.id} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}