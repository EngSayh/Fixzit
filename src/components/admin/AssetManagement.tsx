'use client';

import { useState, useEffect } from 'react';
import { Package, MapPin, Calendar, DollarSign, Wrench, BarChart3, Search, Plus, Filter, QrCode } from 'lucide-react';

interface Asset {
  id: string;
  assetNumber: string;
  name: string;
  description: string;
  category: string;
  categoryName: string;
  status: string;
  condition: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  location: string;
  assignedTo: string;
  assigneeName: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  warrantyExpiry?: string;
  propertyName?: string;
  photos: string[];
}

interface AssetCategory {
  id: string;
  name: string;
  description: string;
  assetCount: number;
  totalValue: number;
}

interface MaintenanceRecord {
  id: string;
  assetNumber: string;
  assetName: string;
  type: string;
  title: string;
  scheduledDate: string;
  completedDate?: string;
  cost: number;
  status: string;
  performedBy?: string;
  vendorName?: string;
}

export default function AssetManagement({ orgId }: { orgId: string }) {
  const [activeView, setActiveView] = useState('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchAssetData();
  }, [orgId]);

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API
      const [assetsResponse, categoriesResponse, maintenanceResponse] = await Promise.all([
        fetch(`/api/admin/assets?orgId=${orgId}`),
        fetch(`/api/admin/asset-categories?orgId=${orgId}`),
        fetch(`/api/admin/asset-maintenance?orgId=${orgId}`)
      ]);

      let assetsData: Asset[] = [];
      let categoriesData: AssetCategory[] = [];
      let maintenanceData: MaintenanceRecord[] = [];

      if (assetsResponse.ok) {
        assetsData = await assetsResponse.json();
      } else {
        // Fallback data for demo
        assetsData = [
          {
            id: '1',
            assetNumber: 'AST-001',
            name: 'HVAC System - Central Unit',
            description: 'Main HVAC system for Tower A, includes heating, ventilation, and air conditioning',
            category: 'hvac',
            categoryName: 'HVAC & Climate Control',
            status: 'active',
            condition: 'good',
            serialNumber: 'HVAC-2023-001',
            manufacturer: 'Carrier',
            model: 'WeatherExpert 48TCED',
            purchaseDate: '2023-03-15',
            purchasePrice: 45000,
            currentValue: 38250,
            location: 'Tower A - Roof',
            assignedTo: 'user-001',
            assigneeName: 'Ahmed Al-Hassan',
            lastMaintenance: '2024-09-15',
            nextMaintenance: '2024-12-15',
            warrantyExpiry: '2026-03-15',
            propertyName: 'Downtown Business Complex',
            photos: []
          },
          {
            id: '2',
            assetNumber: 'AST-002',
            name: 'Generator - Backup Power',
            description: 'Emergency backup generator for power outages',
            category: 'electrical',
            categoryName: 'Electrical Systems',
            status: 'active',
            condition: 'excellent',
            serialNumber: 'GEN-2024-002',
            manufacturer: 'Caterpillar',
            model: 'C15 ACERT',
            purchaseDate: '2024-01-20',
            purchasePrice: 75000,
            currentValue: 71250,
            location: 'Generator Room - Basement',
            assignedTo: 'user-002',
            assigneeName: 'Mohammed Rashid',
            lastMaintenance: '2024-11-01',
            nextMaintenance: '2024-12-01',
            warrantyExpiry: '2027-01-20',
            propertyName: 'Downtown Business Complex',
            photos: []
          },
          {
            id: '3',
            assetNumber: 'AST-003',
            name: 'Elevator - Passenger',
            description: 'Main passenger elevator serving floors 1-15',
            category: 'elevator',
            categoryName: 'Elevators & Escalators',
            status: 'maintenance',
            condition: 'fair',
            serialNumber: 'ELV-2022-003',
            manufacturer: 'Otis',
            model: 'GeN2 Premier',
            purchaseDate: '2022-08-10',
            purchasePrice: 125000,
            currentValue: 93750,
            location: 'Tower A - Elevator Shaft 1',
            assignedTo: 'user-003',
            assigneeName: 'Ali Mahmoud',
            lastMaintenance: '2024-12-10',
            nextMaintenance: '2024-12-20',
            warrantyExpiry: '2025-08-10',
            propertyName: 'Downtown Business Complex',
            photos: []
          },
          {
            id: '4',
            assetNumber: 'AST-004',
            name: 'Security System - CCTV',
            description: 'Comprehensive CCTV surveillance system with 32 cameras',
            category: 'security',
            categoryName: 'Security Systems',
            status: 'active',
            condition: 'good',
            serialNumber: 'SEC-2023-004',
            manufacturer: 'Hikvision',
            model: 'DS-7732NXI-I4',
            purchaseDate: '2023-05-12',
            purchasePrice: 28000,
            currentValue: 22400,
            location: 'Security Room - Ground Floor',
            assignedTo: 'user-004',
            assigneeName: 'Fatima Al-Zahra',
            lastMaintenance: '2024-10-15',
            nextMaintenance: '2025-01-15',
            warrantyExpiry: '2026-05-12',
            propertyName: 'Downtown Business Complex',
            photos: []
          },
          {
            id: '5',
            assetNumber: 'AST-005',
            name: 'Fire Suppression System',
            description: 'Automated fire suppression system with sprinklers and alarms',
            category: 'safety',
            categoryName: 'Fire & Safety',
            status: 'active',
            condition: 'excellent',
            serialNumber: 'FIRE-2024-005',
            manufacturer: 'SimplexGrinnell',
            model: 'TrueAlarm Series',
            purchaseDate: '2024-02-28',
            purchasePrice: 55000,
            currentValue: 52250,
            location: 'Throughout Building',
            assignedTo: 'user-005',
            assigneeName: 'Sarah Mitchell',
            lastMaintenance: '2024-11-20',
            nextMaintenance: '2025-02-20',
            warrantyExpiry: '2029-02-28',
            propertyName: 'Downtown Business Complex',
            photos: []
          }
        ];
      }

      if (categoriesResponse.ok) {
        categoriesData = await categoriesResponse.json();
      } else {
        // Fallback data for demo
        categoriesData = [
          {
            id: '1',
            name: 'HVAC & Climate Control',
            description: 'Heating, ventilation, and air conditioning systems',
            assetCount: 15,
            totalValue: 675000
          },
          {
            id: '2',
            name: 'Electrical Systems',
            description: 'Electrical panels, generators, and power distribution',
            assetCount: 28,
            totalValue: 485000
          },
          {
            id: '3',
            name: 'Elevators & Escalators',
            description: 'Vertical transportation systems',
            assetCount: 8,
            totalValue: 950000
          },
          {
            id: '4',
            name: 'Security Systems',
            description: 'CCTV, access control, and alarm systems',
            assetCount: 22,
            totalValue: 320000
          },
          {
            id: '5',
            name: 'Fire & Safety',
            description: 'Fire suppression, alarms, and safety equipment',
            assetCount: 35,
            totalValue: 425000
          },
          {
            id: '6',
            name: 'IT & Communications',
            description: 'Network infrastructure, servers, and communication systems',
            assetCount: 45,
            totalValue: 275000
          }
        ];
      }

      if (maintenanceResponse.ok) {
        maintenanceData = await maintenanceResponse.json();
      } else {
        // Fallback data for demo
        maintenanceData = [
          {
            id: '1',
            assetNumber: 'AST-001',
            assetName: 'HVAC System - Central Unit',
            type: 'preventive',
            title: 'Quarterly HVAC Maintenance',
            scheduledDate: '2024-12-15',
            cost: 2500,
            status: 'scheduled',
            performedBy: 'Ahmed Al-Hassan',
            vendorName: 'Climate Control Services'
          },
          {
            id: '2',
            assetNumber: 'AST-002',
            assetName: 'Generator - Backup Power',
            type: 'preventive',
            title: 'Monthly Generator Service',
            scheduledDate: '2024-12-01',
            completedDate: '2024-12-01',
            cost: 800,
            status: 'completed',
            performedBy: 'Mohammed Rashid',
            vendorName: 'Power Systems Inc'
          },
          {
            id: '3',
            assetNumber: 'AST-003',
            assetName: 'Elevator - Passenger',
            type: 'corrective',
            title: 'Door Sensor Repair',
            scheduledDate: '2024-12-10',
            completedDate: '2024-12-12',
            cost: 1200,
            status: 'completed',
            performedBy: 'Ali Mahmoud',
            vendorName: 'Otis Service'
          },
          {
            id: '4',
            assetNumber: 'AST-004',
            assetName: 'Security System - CCTV',
            type: 'preventive',
            title: 'Camera System Health Check',
            scheduledDate: '2025-01-15',
            cost: 450,
            status: 'scheduled',
            performedBy: 'Fatima Al-Zahra',
            vendorName: 'Security Solutions LLC'
          }
        ];
      }

      setAssets(assetsData);
      setCategories(categoriesData);
      setMaintenanceRecords(maintenanceData);
      
    } catch (error) {
      console.error('Error fetching asset data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'disposed', label: 'Disposed' }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-50 border-green-200',
      maintenance: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      inactive: 'text-gray-600 bg-gray-50 border-gray-200',
      disposed: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      excellent: 'text-green-600 bg-green-50',
      good: 'text-blue-600 bg-blue-50',
      fair: 'text-yellow-600 bg-yellow-50',
      poor: 'text-orange-600 bg-orange-50',
      damaged: 'text-red-600 bg-red-50'
    };
    return colors[condition as keyof typeof colors] || colors.good;
  };

  const getMaintenanceStatusColor = (status: string) => {
    const colors = {
      scheduled: 'text-blue-600 bg-blue-50 border-blue-200',
      in_progress: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      completed: 'text-green-600 bg-green-50 border-green-200',
      cancelled: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateDepreciation = (asset: Asset) => {
    const purchaseDate = new Date(asset.purchaseDate);
    const today = new Date();
    const yearsOwned = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const depreciationRate = 0.15; // 15% per year
    const depreciatedValue = asset.purchasePrice * Math.pow(1 - depreciationRate, yearsOwned);
    return Math.max(depreciatedValue, asset.purchasePrice * 0.1); // Minimum 10% of original value
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Asset Management</h2>
            <p className="text-gray-600">Asset register and inventory control</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <QrCode className="w-4 h-4 mr-2" />
              Generate QR Codes
            </button>
            <button className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveView('assets')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'assets'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Asset Register ({assets.length})
          </button>
          <button
            onClick={() => setActiveView('categories')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'categories'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveView('maintenance')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'maintenance'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Maintenance ({maintenanceRecords.length})
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'analytics'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'assets' && (
        <div className="space-y-4">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <Package className="w-6 h-6 text-[#0061A8] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                      <p className="text-sm text-gray-600">
                        {asset.assetNumber} • {asset.manufacturer} {asset.model}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{asset.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{asset.location}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Purchased: {formatDate(asset.purchaseDate)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span>Value: {formatCurrency(asset.currentValue)}</span>
                    </div>
                    {asset.nextMaintenance && (
                      <div className="flex items-center text-gray-600">
                        <Wrench className="w-4 h-4 mr-2" />
                        <span>Next Service: {formatDate(asset.nextMaintenance)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Assigned to: <strong>{asset.assigneeName}</strong></span>
                    {asset.serialNumber && (
                      <span>S/N: <strong>{asset.serialNumber}</strong></span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(asset.condition)}`}>
                      {asset.condition.charAt(0).toUpperCase() + asset.condition.slice(1)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(asset.status)}`}>
                      {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                    </span>
                  </div>
                  
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {asset.categoryName}
                  </span>
                  
                  <div className="flex space-x-2 mt-3">
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="View Details">
                      <Package className="w-4 h-4" />
                    </button>
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Schedule Maintenance">
                      <Wrench className="w-4 h-4" />
                    </button>
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Generate QR Code">
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredAssets.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
              <p className="text-gray-600">No assets match your current search criteria.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-[#0061A8] bg-opacity-10 rounded-lg flex items-center justify-center mr-4">
                    <Package className="w-6 h-6 text-[#0061A8]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.assetCount} assets</p>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{category.description}</p>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(category.totalValue)}</p>
                </div>
                <button className="text-[#0061A8] hover:text-[#004d86] font-medium text-sm">
                  View Assets →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'maintenance' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedule</h3>
            <p className="text-gray-600">Asset maintenance history and upcoming services</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset & Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maintenanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Wrench className="w-5 h-5 text-[#0061A8] mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.title}</div>
                          <div className="text-sm text-gray-500">{record.assetName} • {record.assetNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.type === 'preventive' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>Scheduled: {formatDate(record.scheduledDate)}</div>
                        {record.completedDate && (
                          <div>Completed: {formatDate(record.completedDate)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(record.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMaintenanceStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.vendorName || record.performedBy || 'Internal'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="space-y-6">
          {/* Asset Value Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Asset Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 font-semibold">Total Assets</p>
                    <p className="text-2xl font-bold text-blue-800">{assets.length}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 font-semibold">Total Value</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(assets.reduce((sum, asset) => sum + asset.currentValue, 0))}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 font-semibold">Under Maintenance</p>
                    <p className="text-2xl font-bold text-yellow-800">
                      {assets.filter(a => a.status === 'maintenance').length}
                    </p>
                  </div>
                  <Wrench className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 font-semibold">Categories</p>
                    <p className="text-2xl font-bold text-purple-800">{categories.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Asset Condition Distribution */}
            <div className="border-t pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Asset Condition Distribution</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {['excellent', 'good', 'fair', 'poor', 'damaged'].map((condition) => {
                  const count = assets.filter(a => a.condition === condition).length;
                  const percentage = assets.length ? Math.round((count / assets.length) * 100) : 0;
                  return (
                    <div key={condition} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className={`text-2xl font-bold ${getConditionColor(condition).split(' ')[0]}`}>
                        {count}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">{condition}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}