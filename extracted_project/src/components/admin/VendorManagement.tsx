'use client';

import { useState, useEffect } from 'react';
import { Users, Star, DollarSign, Calendar, Phone, Mail, MapPin, Search, Plus, Filter, Award, TrendingUp } from 'lucide-react';

interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  taxNumber?: string;
  businessLicense?: string;
  description: string;
  specialties: string[];
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  establishedYear?: number;
  employeeCount?: number;
  rating: number;
  totalProjects: number;
  completedProjects: number;
  onTimeDelivery: number;
  qualityScore: number;
  contractValue: number;
  lastContractDate?: string;
  status: string;
  preferredVendor: boolean;
  certifications: string[];
  insuranceExpiry?: string;
  paymentTerms: string;
}

interface VendorPerformance {
  vendorId: string;
  vendorName: string;
  period: string;
  projectsCompleted: number;
  averageRating: number;
  onTimePercentage: number;
  budgetCompliance: number;
  totalValue: number;
  clientSatisfaction: number;
  issuesReported: number;
  responseTime: number; // hours
}

interface VendorContract {
  id: string;
  vendorId: string;
  vendorName: string;
  contractNumber: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  value: number;
  status: string;
  contractType: string;
  paymentSchedule: string;
  deliverables: string[];
  lastPaymentDate?: string;
  completionPercentage: number;
}

export default function VendorManagement({ orgId }: { orgId: string }) {
  const [activeView, setActiveView] = useState('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [performance, setPerformance] = useState<VendorPerformance[]>([]);
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchVendorData();
  }, [orgId]);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API
      const [vendorsResponse, performanceResponse, contractsResponse] = await Promise.all([
        fetch(`/api/admin/vendors?orgId=${orgId}`),
        fetch(`/api/admin/vendor-performance?orgId=${orgId}`),
        fetch(`/api/admin/vendor-contracts?orgId=${orgId}`)
      ]);

      let vendorsData: Vendor[] = [];
      let performanceData: VendorPerformance[] = [];
      let contractsData: VendorContract[] = [];

      if (vendorsResponse.ok) {
        vendorsData = await vendorsResponse.json();
      } else {
        // Fallback data for demo
        vendorsData = [
          {
            id: '1',
            userId: 'vendor-user-1',
            businessName: 'Al Rashid Construction LLC',
            businessType: 'company',
            taxNumber: '310123456789',
            businessLicense: 'BL-2020-001',
            description: 'Premier construction and renovation services specializing in commercial and residential projects',
            specialties: ['Construction', 'Renovation', 'Plumbing', 'Electrical'],
            contactPerson: 'Ahmed Al-Rashid',
            phone: '+966 11 234 5678',
            email: 'ahmed@alrashidconstruction.com',
            address: 'Riyadh, Saudi Arabia',
            website: 'www.alrashidconstruction.com',
            establishedYear: 2015,
            employeeCount: 45,
            rating: 4.7,
            totalProjects: 127,
            completedProjects: 119,
            onTimeDelivery: 92.5,
            qualityScore: 4.6,
            contractValue: 2850000,
            lastContractDate: '2024-11-15',
            status: 'active',
            preferredVendor: true,
            certifications: ['ISO 9001', 'OSHA Certified', 'Saudi Building Code Certified'],
            insuranceExpiry: '2025-06-30',
            paymentTerms: '30 days'
          },
          {
            id: '2',
            userId: 'vendor-user-2',
            businessName: 'TechFlow Systems',
            businessType: 'company',
            taxNumber: '310987654321',
            businessLicense: 'BL-2019-015',
            description: 'Advanced HVAC, electrical, and smart building automation solutions',
            specialties: ['HVAC', 'Electrical', 'Smart Systems', 'Automation'],
            contactPerson: 'Sarah Mitchell',
            phone: '+966 12 345 6789',
            email: 'sarah@techflowsystems.com',
            address: 'Jeddah, Saudi Arabia',
            website: 'www.techflowsystems.com',
            establishedYear: 2018,
            employeeCount: 28,
            rating: 4.8,
            totalProjects: 89,
            completedProjects: 84,
            onTimeDelivery: 94.4,
            qualityScore: 4.7,
            contractValue: 1950000,
            lastContractDate: '2024-12-01',
            status: 'active',
            preferredVendor: true,
            certifications: ['HVAC Excellence', 'Smart Home Certified', 'Energy Star Partner'],
            insuranceExpiry: '2025-03-15',
            paymentTerms: '15 days'
          },
          {
            id: '3',
            userId: 'vendor-user-3',
            businessName: 'Gulf Security Solutions',
            businessType: 'company',
            taxNumber: '310555666777',
            businessLicense: 'BL-2021-008',
            description: 'Comprehensive security systems installation and monitoring services',
            specialties: ['Security Systems', 'CCTV', 'Access Control', 'Alarm Systems'],
            contactPerson: 'Mohammed Rashid',
            phone: '+966 13 456 7890',
            email: 'mohammed@gulfsecurity.com',
            address: 'Dammam, Saudi Arabia',
            establishedYear: 2020,
            employeeCount: 22,
            rating: 4.5,
            totalProjects: 65,
            completedProjects: 61,
            onTimeDelivery: 89.2,
            qualityScore: 4.4,
            contractValue: 1250000,
            lastContractDate: '2024-10-20',
            status: 'active',
            preferredVendor: false,
            certifications: ['Security Industry Certified', 'Fire Safety Systems'],
            insuranceExpiry: '2025-12-31',
            paymentTerms: '30 days'
          },
          {
            id: '4',
            userId: 'vendor-user-4',
            businessName: 'Green Landscapes Co',
            businessType: 'company',
            taxNumber: '310111222333',
            businessLicense: 'BL-2017-025',
            description: 'Professional landscaping, irrigation, and grounds maintenance services',
            specialties: ['Landscaping', 'Irrigation', 'Maintenance', 'Garden Design'],
            contactPerson: 'Ali Mahmoud',
            phone: '+966 14 567 8901',
            email: 'ali@greenlandscapes.com',
            address: 'Mecca, Saudi Arabia',
            establishedYear: 2017,
            employeeCount: 35,
            rating: 4.3,
            totalProjects: 156,
            completedProjects: 148,
            onTimeDelivery: 87.8,
            qualityScore: 4.2,
            contractValue: 890000,
            lastContractDate: '2024-09-30',
            status: 'active',
            preferredVendor: false,
            certifications: ['Certified Landscape Professional', 'Irrigation Association'],
            insuranceExpiry: '2025-08-15',
            paymentTerms: '45 days'
          },
          {
            id: '5',
            userId: 'vendor-user-5',
            businessName: 'CleanTech Services',
            businessType: 'company',
            taxNumber: '310444555666',
            businessLicense: 'BL-2022-012',
            description: 'Professional cleaning and facility maintenance services for commercial properties',
            specialties: ['Cleaning', 'Facility Maintenance', 'Waste Management', 'Sanitization'],
            contactPerson: 'Fatima Al-Zahra',
            phone: '+966 11 678 9012',
            email: 'fatima@cleantechservices.com',
            address: 'Riyadh, Saudi Arabia',
            establishedYear: 2022,
            employeeCount: 68,
            rating: 4.6,
            totalProjects: 203,
            completedProjects: 195,
            onTimeDelivery: 96.1,
            qualityScore: 4.5,
            contractValue: 1450000,
            lastContractDate: '2024-11-30',
            status: 'active',
            preferredVendor: true,
            certifications: ['Green Cleaning Certified', 'OSHA Safety Standards'],
            insuranceExpiry: '2025-10-31',
            paymentTerms: '30 days'
          }
        ];
      }

      if (performanceResponse.ok) {
        performanceData = await performanceResponse.json();
      } else {
        // Fallback data for demo
        performanceData = [
          {
            vendorId: '1',
            vendorName: 'Al Rashid Construction LLC',
            period: '2024 Q4',
            projectsCompleted: 8,
            averageRating: 4.7,
            onTimePercentage: 92.5,
            budgetCompliance: 98.2,
            totalValue: 425000,
            clientSatisfaction: 4.6,
            issuesReported: 2,
            responseTime: 4.2
          },
          {
            vendorId: '2',
            vendorName: 'TechFlow Systems',
            period: '2024 Q4',
            projectsCompleted: 6,
            averageRating: 4.8,
            onTimePercentage: 94.4,
            budgetCompliance: 96.8,
            totalValue: 380000,
            clientSatisfaction: 4.7,
            issuesReported: 1,
            responseTime: 2.8
          },
          {
            vendorId: '5',
            vendorName: 'CleanTech Services',
            period: '2024 Q4',
            projectsCompleted: 24,
            averageRating: 4.6,
            onTimePercentage: 96.1,
            budgetCompliance: 99.1,
            totalValue: 145000,
            clientSatisfaction: 4.5,
            issuesReported: 3,
            responseTime: 1.5
          }
        ];
      }

      if (contractsResponse.ok) {
        contractsData = await contractsResponse.json();
      } else {
        // Fallback data for demo
        contractsData = [
          {
            id: '1',
            vendorId: '1',
            vendorName: 'Al Rashid Construction LLC',
            contractNumber: 'CNT-2024-001',
            title: 'Tower A Lobby Renovation',
            description: 'Complete renovation of Tower A lobby including flooring, lighting, and reception area',
            startDate: '2024-11-01',
            endDate: '2024-12-31',
            value: 125000,
            status: 'active',
            contractType: 'fixed_price',
            paymentSchedule: 'milestone',
            deliverables: ['Design approval', 'Material procurement', 'Construction work', 'Final inspection'],
            lastPaymentDate: '2024-11-15',
            completionPercentage: 65
          },
          {
            id: '2',
            vendorId: '2',
            vendorName: 'TechFlow Systems',
            contractNumber: 'CNT-2024-002',
            title: 'HVAC System Upgrade - Building B',
            description: 'Upgrade and modernization of HVAC systems in Building B with smart controls',
            startDate: '2024-10-15',
            endDate: '2024-12-20',
            value: 89000,
            status: 'active',
            contractType: 'time_and_materials',
            paymentSchedule: 'monthly',
            deliverables: ['System assessment', 'Equipment installation', 'Testing and commissioning', 'Training'],
            lastPaymentDate: '2024-11-30',
            completionPercentage: 80
          },
          {
            id: '3',
            vendorId: '5',
            vendorName: 'CleanTech Services',
            contractNumber: 'CNT-2024-003',
            title: 'Annual Facility Maintenance',
            description: 'Comprehensive cleaning and maintenance services for all properties',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            value: 240000,
            status: 'active',
            contractType: 'service_agreement',
            paymentSchedule: 'monthly',
            deliverables: ['Daily cleaning', 'Monthly deep cleaning', 'Quarterly maintenance', 'Emergency services'],
            lastPaymentDate: '2024-11-30',
            completionPercentage: 92
          }
        ];
      }

      setVendors(vendorsData);
      setPerformance(performanceData);
      setContracts(contractsData);
      
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const specialtyOptions = [
    { value: 'all', label: 'All Specialties' },
    { value: 'Construction', label: 'Construction' },
    { value: 'HVAC', label: 'HVAC' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'Plumbing', label: 'Plumbing' },
    { value: 'Security Systems', label: 'Security Systems' },
    { value: 'Cleaning', label: 'Cleaning' },
    { value: 'Landscaping', label: 'Landscaping' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-50 border-green-200',
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      suspended: 'text-orange-600 bg-orange-50 border-orange-200',
      inactive: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getContractStatusColor = (status: string) => {
    const colors = {
      active: 'text-blue-600 bg-blue-50 border-blue-200',
      completed: 'text-green-600 bg-green-50 border-green-200',
      cancelled: 'text-red-600 bg-red-50 border-red-200',
      draft: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' }} />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
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

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = selectedSpecialty === 'all' || vendor.specialties.includes(selectedSpecialty);
    const matchesStatus = selectedStatus === 'all' || vendor.status === selectedStatus;
    return matchesSearch && matchesSpecialty && matchesStatus;
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
            <h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2>
            <p className="text-gray-600">Supplier database and performance tracking</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Vendor Evaluation
            </button>
            <button className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#004d86] transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveView('vendors')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'vendors'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Vendor Directory ({vendors.length})
          </button>
          <button
            onClick={() => setActiveView('performance')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'performance'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Performance ({performance.length})
          </button>
          <button
            onClick={() => setActiveView('contracts')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'contracts'
                ? 'bg-white text-[#0061A8] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Contracts ({contracts.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              {specialtyOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
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
      {activeView === 'vendors' && (
        <div className="space-y-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <Users className="w-6 h-6 text-[#0061A8] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vendor.businessName}</h3>
                      <p className="text-sm text-gray-600">
                        {vendor.contactPerson} • Established {vendor.establishedYear}
                      </p>
                    </div>
                    {vendor.preferredVendor && (
                      <Award className="w-5 h-5 text-yellow-500 ml-2" title="Preferred Vendor" />
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-4">{vendor.description}</p>
                  
                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {vendor.specialties.map((specialty, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {specialty}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{vendor.phone}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <span>{vendor.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{vendor.address}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{vendor.employeeCount} employees</span>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <div className="flex mr-1">{getRatingStars(vendor.rating)}</div>
                      <span className="font-medium ml-1">{vendor.rating.toFixed(1)}</span>
                    </div>
                    <span>Projects: <strong>{vendor.completedProjects}/{vendor.totalProjects}</strong></span>
                    <span>On-time: <strong>{vendor.onTimeDelivery}%</strong></span>
                    <span>Quality: <strong>{vendor.qualityScore}/5</strong></span>
                  </div>

                  {/* Contract Value and Payment Terms */}
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>Total Contract Value: <strong>{formatCurrency(vendor.contractValue)}</strong></span>
                    <span>Payment Terms: <strong>{vendor.paymentTerms}</strong></span>
                    {vendor.lastContractDate && (
                      <span>Last Contract: <strong>{formatDate(vendor.lastContractDate)}</strong></span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(vendor.status)}`}>
                    {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                  </span>
                  
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {vendor.businessType.charAt(0).toUpperCase() + vendor.businessType.slice(1)}
                  </span>
                  
                  {/* Certifications */}
                  {vendor.certifications.length > 0 && (
                    <div className="text-right text-xs text-gray-600 max-w-48">
                      <div className="font-medium mb-1">Certifications:</div>
                      {vendor.certifications.slice(0, 2).map((cert, index) => (
                        <div key={index}>{cert}</div>
                      ))}
                      {vendor.certifications.length > 2 && (
                        <div className="text-blue-600">+{vendor.certifications.length - 2} more</div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex space-x-2 mt-3">
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="View Details">
                      <Users className="w-4 h-4" />
                    </button>
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Performance Report">
                      <TrendingUp className="w-4 h-4" />
                    </button>
                    <button className="text-[#0061A8] hover:text-[#004d86] p-2 hover:bg-blue-50 rounded transition-colors" title="Rate Vendor">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredVendors.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
              <p className="text-gray-600">No vendors match your current search criteria.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'performance' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Performance Reports</h3>
            <p className="text-gray-600">Quarterly performance metrics and KPIs</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor & Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value & Compliance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performance.map((report) => (
                  <tr key={`${report.vendorId}-${report.period}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TrendingUp className="w-5 h-5 text-[#0061A8] mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{report.vendorName}</div>
                          <div className="text-sm text-gray-500">{report.period}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div className="font-medium">{report.projectsCompleted} completed</div>
                        <div>{report.onTimePercentage}% on-time</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="flex items-center mb-1">
                          <div className="flex mr-1">{getRatingStars(report.averageRating)}</div>
                          <span className="text-gray-900 ml-1">{report.averageRating.toFixed(1)}</span>
                        </div>
                        <div className="text-gray-500">Satisfaction: {report.clientSatisfaction.toFixed(1)}/5</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div className="font-medium text-gray-900">{formatCurrency(report.totalValue)}</div>
                        <div>Budget: {report.budgetCompliance}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{report.responseTime.toFixed(1)}h avg response</div>
                        <div className="text-red-600">{report.issuesReported} issues</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'contracts' && (
        <div className="space-y-4">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <DollarSign className="w-6 h-6 text-[#0061A8] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{contract.title}</h3>
                      <p className="text-sm text-gray-600">
                        {contract.contractNumber} • {contract.vendorName}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{contract.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Start Date:</span>
                      <div>{formatDate(contract.startDate)}</div>
                    </div>
                    <div>
                      <span className="font-medium">End Date:</span>
                      <div>{formatDate(contract.endDate)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Contract Value:</span>
                      <div className="font-semibold text-gray-900">{formatCurrency(contract.value)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Payment Schedule:</span>
                      <div className="capitalize">{contract.paymentSchedule}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm text-gray-600">{contract.completionPercentage}% complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${contract.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Deliverables:</h4>
                    <div className="flex flex-wrap gap-2">
                      {contract.deliverables.map((deliverable, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {deliverable}
                        </span>
                      ))}
                    </div>
                  </div>

                  {contract.lastPaymentDate && (
                    <div className="text-sm text-gray-600">
                      Last Payment: <strong>{formatDate(contract.lastPaymentDate)}</strong>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getContractStatusColor(contract.status)}`}>
                    {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                  </span>
                  
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {contract.contractType.replace('_', ' ').charAt(0).toUpperCase() + contract.contractType.replace('_', ' ').slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {contracts.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
              <p className="text-gray-600">No vendor contracts are currently active.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}