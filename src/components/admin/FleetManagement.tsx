'use client';

import { useState, useEffect } from 'react';
import { Car, MapPin, Calendar, DollarSign, Fuel, Wrench, AlertTriangle, CheckCircle, Search, Plus, Filter } from 'lucide-react';

interface Vehicle {
  id: string;
  assetId?: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  color: string;
  fuelType: string;
  mileage: number;
  purchaseDate: string;
  purchasePrice: number;
  registrationExpiry: string;
  insuranceExpiry: string;
  insuranceProvider: string;
  status: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  department?: string;
  location?: string;
  gpsTrackerId?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  averageFuelConsumption?: number;
  monthlyMileage?: number;
}

interface FuelRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  date: string;
  mileage: number;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  fuelType: string;
  station?: string;
  driverName?: string;
}

interface TripRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  driverId: string;
  driverName: string;
  startDate: string;
  endDate?: string;
  startMileage: number;
  endMileage?: number;
  startLocation?: string;
  endLocation?: string;
  purpose: string;
  distance?: number;
  status: string;
}

interface VehicleInspection {
  id: string;
  vehicleId: string;
  vehicleName: string;
  inspectionDate: string;
  inspectionType: string;
  inspectorName: string;
  overallCondition: string;
  passed: boolean;
  nextInspectionDate?: string;
  findings: string[];
  recommendations?: string;
}

export default function FleetManagement({ orgId }: { orgId: string }) {
  const [activeView, setActiveView] = useState('vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    fetchFleetData();
  }, [orgId]);

  const fetchFleetData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API
      const [vehiclesResponse, fuelResponse, tripsResponse, inspectionsResponse] = await Promise.all([
        fetch(`/api/admin/vehicles?orgId=${orgId}`),
        fetch(`/api/admin/fuel-records?orgId=${orgId}`),
        fetch(`/api/admin/trip-records?orgId=${orgId}`),
        fetch(`/api/admin/vehicle-inspections?orgId=${orgId}`)
      ]);

      let vehiclesData: Vehicle[] = [];
      let fuelData: FuelRecord[] = [];
      let tripsData: TripRecord[] = [];
      let inspectionsData: VehicleInspection[] = [];

      if (vehiclesResponse.ok) {
        vehiclesData = await vehiclesResponse.json();
      } else {
        // Fallback data for demo
        vehiclesData = [
          {
            id: '1',
            make: 'Toyota',
            model: 'Hilux',
            year: 2023,
            licensePlate: 'RYD 1234',
            vin: 'JTMHY05V8X4123456',
            color: 'White',
            fuelType: 'diesel',
            mileage: 15420,
            purchaseDate: '2023-03-15',
            purchasePrice: 85000,
            registrationExpiry: '2025-03-15',
            insuranceExpiry: '2025-01-20',
            insuranceProvider: 'Tawuniya Insurance',
            status: 'active',
            assignedDriverId: 'driver-001',
            assignedDriverName: 'Ahmed Al-Hassan',
            department: 'Maintenance',
            location: 'Riyadh Branch',
            lastServiceDate: '2024-10-15',
            nextServiceDate: '2024-12-15',
            averageFuelConsumption: 12.5,
            monthlyMileage: 2850
          },
          {
            id: '2',
            make: 'Ford',
            model: 'Transit',
            year: 2022,
            licensePlate: 'JED 5678',
            vin: 'WF0AXXTTGAHD12345',
            color: 'Blue',
            fuelType: 'gasoline',
            mileage: 28750,
            purchaseDate: '2022-08-20',
            purchasePrice: 95000,
            registrationExpiry: '2024-08-20',
            insuranceExpiry: '2024-12-30',
            insuranceProvider: 'Saudi Re Insurance',
            status: 'active',
            assignedDriverId: 'driver-002',
            assignedDriverName: 'Mohammed Rashid',
            department: 'Operations',
            location: 'Jeddah Branch',
            lastServiceDate: '2024-11-01',
            nextServiceDate: '2025-01-01',
            averageFuelConsumption: 15.2,
            monthlyMileage: 3200
          },
          {
            id: '3',
            make: 'Nissan',
            model: 'Patrol',
            year: 2024,
            licensePlate: 'DMM 9012',
            vin: 'JN1CV6AK5CM123456',
            color: 'Silver',
            fuelType: 'gasoline',
            mileage: 8950,
            purchaseDate: '2024-02-10',
            purchasePrice: 125000,
            registrationExpiry: '2026-02-10',
            insuranceExpiry: '2025-02-10',
            insuranceProvider: 'Walaa Insurance',
            status: 'maintenance',
            assignedDriverId: 'driver-003',
            assignedDriverName: 'Ali Mahmoud',
            department: 'Security',
            location: 'Dammam Branch',
            lastServiceDate: '2024-12-01',
            nextServiceDate: '2024-12-20',
            averageFuelConsumption: 18.5,
            monthlyMileage: 1950
          },
          {
            id: '4',
            make: 'Hyundai',
            model: 'H1',
            year: 2023,
            licensePlate: 'MEC 3456',
            vin: 'KMJWB41BXPU123456',
            color: 'Gray',
            fuelType: 'diesel',
            mileage: 22100,
            purchaseDate: '2023-06-05',
            purchasePrice: 78000,
            registrationExpiry: '2025-06-05',
            insuranceExpiry: '2025-03-15',
            insuranceProvider: 'Al Rajhi Takaful',
            status: 'active',
            assignedDriverId: 'driver-004',
            assignedDriverName: 'Fatima Al-Zahra',
            department: 'Administration',
            location: 'Mecca Branch',
            lastServiceDate: '2024-09-20',
            nextServiceDate: '2024-12-20',
            averageFuelConsumption: 11.8,
            monthlyMileage: 2650
          }
        ];
      }

      if (fuelResponse.ok) {
        fuelData = await fuelResponse.json();
      } else {
        // Fallback data for demo
        fuelData = [
          {
            id: '1',
            vehicleId: '1',
            vehicleName: 'Toyota Hilux',
            licensePlate: 'RYD 1234',
            date: '2024-12-10',
            mileage: 15420,
            liters: 65.0,
            costPerLiter: 2.35,
            totalCost: 152.75,
            fuelType: 'diesel',
            station: 'ARAMCO Station - Riyadh',
            driverName: 'Ahmed Al-Hassan'
          },
          {
            id: '2',
            vehicleId: '2',
            vehicleName: 'Ford Transit',
            licensePlate: 'JED 5678',
            date: '2024-12-08',
            mileage: 28750,
            liters: 70.5,
            costPerLiter: 2.18,
            totalCost: 153.69,
            fuelType: 'gasoline',
            station: 'Petro Rabigh - Jeddah',
            driverName: 'Mohammed Rashid'
          },
          {
            id: '3',
            vehicleId: '1',
            vehicleName: 'Toyota Hilux',
            licensePlate: 'RYD 1234',
            date: '2024-11-25',
            mileage: 15100,
            liters: 68.2,
            costPerLiter: 2.33,
            totalCost: 158.91,
            fuelType: 'diesel',
            station: 'ADNOC Station - Riyadh',
            driverName: 'Ahmed Al-Hassan'
          }
        ];
      }

      if (tripsResponse.ok) {
        tripsData = await tripsResponse.json();
      } else {
        // Fallback data for demo
        tripsData = [
          {
            id: '1',
            vehicleId: '1',
            vehicleName: 'Toyota Hilux',
            licensePlate: 'RYD 1234',
            driverId: 'driver-001',
            driverName: 'Ahmed Al-Hassan',
            startDate: '2024-12-15T08:00:00Z',
            endDate: '2024-12-15T17:30:00Z',
            startMileage: 15400,
            endMileage: 15420,
            startLocation: 'Downtown Complex',
            endLocation: 'North District Properties',
            purpose: 'Property Inspection',
            distance: 20,
            status: 'completed'
          },
          {
            id: '2',
            vehicleId: '2',
            vehicleName: 'Ford Transit',
            licensePlate: 'JED 5678',
            driverId: 'driver-002',
            driverName: 'Mohammed Rashid',
            startDate: '2024-12-15T09:00:00Z',
            startMileage: 28750,
            startLocation: 'Jeddah Office',
            purpose: 'Equipment Delivery',
            status: 'active'
          }
        ];
      }

      if (inspectionsResponse.ok) {
        inspectionsData = await inspectionsResponse.json();
      } else {
        // Fallback data for demo
        inspectionsData = [
          {
            id: '1',
            vehicleId: '1',
            vehicleName: 'Toyota Hilux',
            inspectionDate: '2024-11-01',
            inspectionType: 'safety',
            inspectorName: 'Saudi Technical Inspection',
            overallCondition: 'good',
            passed: true,
            nextInspectionDate: '2025-11-01',
            findings: ['Tire condition acceptable', 'Brakes functioning properly', 'Engine oil level adequate'],
            recommendations: 'Replace air filter within 3 months'
          },
          {
            id: '2',
            vehicleId: '2',
            vehicleName: 'Ford Transit',
            inspectionDate: '2024-10-15',
            inspectionType: 'emissions',
            inspectorName: 'Environmental Compliance Center',
            overallCondition: 'excellent',
            passed: true,
            nextInspectionDate: '2025-10-15',
            findings: ['Emissions within acceptable limits', 'Catalytic converter functioning'],
            recommendations: 'Continue regular maintenance schedule'
          }
        ];
      }

      setVehicles(vehiclesData);
      setFuelRecords(fuelData);
      setTripRecords(tripsData);
      setInspections(inspectionsData);
      
    } catch (error) {
      console.error('Error fetching fleet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'out_of_service', label: 'Out of Service' },
    { value: 'disposed', label: 'Disposed' }
  ];

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Security', label: 'Security' },
    { value: 'Administration', label: 'Administration' }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-50 border-green-200',
      maintenance: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      out_of_service: 'text-red-600 bg-red-50 border-red-200',
      disposed: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      excellent: 'text-green-600 bg-green-50',
      good: 'text-blue-600 bg-blue-50',
      fair: 'text-yellow-600 bg-yellow-50',
      poor: 'text-orange-600 bg-orange-50'
    };
    return colors[condition as keyof typeof colors] || colors.good;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vehicle.assignedDriverName && vehicle.assignedDriverName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = selectedStatus === 'all' || vehicle.status === selectedStatus;
    const matchesDepartment = selectedDepartment === 'all' || vehicle.department === selectedDepartment;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const filteredFuelRecords = fuelRecords.filter(record =>
    record.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.driverName && record.driverName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredTripRecords = tripRecords.filter(record =>
    record.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h2 className="text-2xl font-bold text-gray-900">Fleet Management</h2>
            <p className="text-gray-600">Vehicle tracking and maintenance management</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              GPS Tracking
            </button>
            <button className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveView('vehicles')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'vehicles'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Fleet Overview ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveView('fuel')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'fuel'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Fuel Records ({fuelRecords.length})
          </button>
          <button
            onClick={() => setActiveView('trips')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'trips'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Trip Logs ({tripRecords.length})
          </button>
          <button
            onClick={() => setActiveView('inspections')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'inspections'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Inspections ({inspections.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              {departmentOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'vehicles' && (
        <div className="space-y-4">
          {filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <Car className="w-6 h-6 text-[#0061A8] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {vehicle.licensePlate} • {vehicle.color} • {vehicle.fuelType}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{vehicle.location || 'Location TBD'}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{vehicle.mileage.toLocaleString()} km</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Fuel className="w-4 h-4 mr-2" />
                      <span>{vehicle.averageFuelConsumption || 0}L/100km</span>
                    </div>
                    {vehicle.nextServiceDate && (
                      <div className="flex items-center text-gray-600">
                        <Wrench className="w-4 h-4 mr-2" />
                        <span>Service: {formatDate(vehicle.nextServiceDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>Assigned to: <strong>{vehicle.assignedDriverName || 'Unassigned'}</strong></span>
                    <span>Department: <strong>{vehicle.department || 'General'}</strong></span>
                    <span>VIN: <strong>{vehicle.vin}</strong></span>
                  </div>

                  {/* Insurance & Registration Status */}
                  <div className="flex items-center space-x-4 mt-3 text-sm">
                    <div className={`flex items-center px-2 py-1 rounded ${
                      new Date(vehicle.registrationExpiry) > new Date() 
                        ? 'text-green-600 bg-green-50' 
                        : 'text-red-600 bg-red-50'
                    }`}>
                      <Calendar className="w-3 h-3 mr-1" />
                      Registration: {formatDate(vehicle.registrationExpiry)}
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded ${
                      new Date(vehicle.insuranceExpiry) > new Date() 
                        ? 'text-green-600 bg-green-50' 
                        : 'text-red-600 bg-red-50'
                    }`}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Insurance: {formatDate(vehicle.insuranceExpiry)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                  </span>
                  
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {formatCurrency(vehicle.purchasePrice)}
                  </span>
                  
                  <div className="flex space-x-2 mt-3">
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Track Vehicle">
                      <MapPin className="w-4 h-4" />
                    </button>
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Schedule Service">
                      <Wrench className="w-4 h-4" />
                    </button>
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Add Fuel Record">
                      <Fuel className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredVehicles.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
              <p className="text-gray-600">No vehicles match your current search criteria.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'fuel' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Fuel Records</h3>
            <p className="text-gray-600">Fuel consumption and cost tracking</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle & Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Mileage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fuel Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Station
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFuelRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Fuel className="w-5 h-5 text-[#0061A8] mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.vehicleName}</div>
                          <div className="text-sm text-gray-500">{record.licensePlate} • {record.driverName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{formatDate(record.date)}</div>
                        <div className="font-medium">{record.mileage.toLocaleString()} km</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{record.liters.toFixed(1)} L</div>
                        <div className="capitalize">{record.fuelType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{formatCurrency(record.totalCost)}</div>
                        <div className="text-gray-500">{formatCurrency(record.costPerLiter)}/L</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.station || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'trips' && (
        <div className="space-y-4">
          {filteredTripRecords.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <MapPin className="w-6 h-6 text-[#0061A8] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{trip.purpose}</h3>
                      <p className="text-sm text-gray-600">
                        {trip.vehicleName} • {trip.licensePlate} • {trip.driverName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Start:</span>
                      <div>{formatDate(trip.startDate)}</div>
                      <div>{trip.startLocation}</div>
                    </div>
                    {trip.endDate && (
                      <div>
                        <span className="font-medium">End:</span>
                        <div>{formatDate(trip.endDate)}</div>
                        <div>{trip.endLocation}</div>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Mileage:</span>
                      <div>Start: {trip.startMileage.toLocaleString()} km</div>
                      {trip.endMileage && <div>End: {trip.endMileage.toLocaleString()} km</div>}
                    </div>
                    {trip.distance && (
                      <div>
                        <span className="font-medium">Distance:</span>
                        <div>{trip.distance} km</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trip.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredTripRecords.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trip records found</h3>
              <p className="text-gray-600">No trip records match your current search criteria.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'inspections' && (
        <div className="space-y-4">
          {inspections.map((inspection) => (
            <div key={inspection.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="w-6 h-6 text-[#0061A8] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {inspection.inspectionType.charAt(0).toUpperCase() + inspection.inspectionType.slice(1)} Inspection
                      </h3>
                      <p className="text-sm text-gray-600">
                        {inspection.vehicleName} • {formatDate(inspection.inspectionDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Inspector: <strong>{inspection.inspectorName}</strong>
                    </p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(inspection.overallCondition)}`}>
                        {inspection.overallCondition.charAt(0).toUpperCase() + inspection.overallCondition.slice(1)} Condition
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        inspection.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {inspection.passed ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {inspection.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Inspection Findings:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {inspection.findings.map((finding, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  {inspection.recommendations && (
                    <div className="text-sm">
                      <h4 className="font-medium text-gray-900 mb-1">Recommendations:</h4>
                      <p className="text-gray-600">{inspection.recommendations}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  {inspection.nextInspectionDate && (
                    <div className="text-right text-sm text-gray-600">
                      <div>Next Inspection:</div>
                      <div className="font-medium">{formatDate(inspection.nextInspectionDate)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {inspections.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No inspections found</h3>
              <p className="text-gray-600">No vehicle inspections have been recorded yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}