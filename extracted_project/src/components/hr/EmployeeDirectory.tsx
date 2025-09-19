'use client';

import { useState, useEffect } from 'react';
import { User, Calendar, Phone, Mail, MapPin, Star, Clock, Users } from 'lucide-react';
import { hrService } from '../../lib/services/hr-service';
import type { Employee } from '../../lib/services/hr-service';
import { ApiError } from '../../lib/services/api-client';

interface EmployeeDirectoryProps {
  orgId: string;
  className?: string;
}

export default function EmployeeDirectory({ orgId, className = "" }: EmployeeDirectoryProps) {
  // State with proper typing
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [summary, setSummary] = useState<{
    totalEmployees: number;
    activeEmployees: number;
    departmentCount: number;
    averageAttendance: number;
  }>({
    totalEmployees: 0,
    activeEmployees: 0,
    departmentCount: 0,
    averageAttendance: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch employees using unified service
  const fetchEmployees = async () => {
    try {
      setError(null);
      setLoading(true);

      const params: any = {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        department: selectedDepartment || undefined,
        status: selectedStatus || undefined
      };

      const response = await hrService.getEmployees(params);
      
      setEmployees(response.employees);
      setDepartments(response.departments);
      setSummary(response.summary);
      
      // Handle pagination if available
      if (response.pagination) {
        setTotalPages(response.pagination.pages);
      }

    } catch (error: any) {
      console.error('Error fetching employees:', error);
      
      if (error instanceof ApiError) {
        if (error.isUnauthorized) {
          setError('You do not have permission to view employee directory');
        } else if (error.isTimeout) {
          setError('Request timed out. Please try again.');
        } else if (error.isServerError) {
          setError('Server error occurred. Please try again later.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to load employee data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchEmployees();
  }, [orgId, selectedDepartment, selectedStatus, searchTerm, currentPage]);

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1); // Reset to first page on search
      } else {
        fetchEmployees();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Handle refresh
  const handleRefresh = () => {
    fetchEmployees();
  };

  // Handle employee selection
  const handleEmployeeClick = (employee: Employee) => {
    // Open employee detail modal or navigate to employee detail page
    console.log('Selected employee:', employee);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
          
          {/* Summary cards loading */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>

          {/* Filters loading */}
          <div className="flex gap-4 mb-6">
            <div className="h-10 bg-gray-200 rounded w-64"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>

          {/* Employee list loading */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Directory</h2>
          <p className="text-gray-600">Manage and view employee information</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Employees</p>
                <p className="text-2xl font-bold text-blue-900">{summary.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Active Employees</p>
                <p className="text-2xl font-bold text-green-900">{summary.activeEmployees}</p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Departments</p>
                <p className="text-2xl font-bold text-orange-900">{summary.departmentCount}</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg. Attendance</p>
                <p className="text-2xl font-bold text-purple-900">{summary.averageAttendance}%</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* Employee List */}
      <div className="p-6">
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No employees found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employee) => (
              <div
                key={employee.id}
                onClick={() => handleEmployeeClick(employee)}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {employee.user.avatar ? (
                      <img
                        src={employee.user.avatar}
                        alt={`${employee.user.firstName} ${employee.user.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Employee Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {employee.user.firstName} {employee.user.lastName}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span>{employee.position}</span>
                      <span>•</span>
                      <span>{employee.department}</span>
                      <span>•</span>
                      <span>#{employee.employeeNumber}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{employee.user.email}</span>
                      </div>
                      {employee.user.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{employee.user.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Hired: {formatDate(employee.hireDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm text-gray-600 mb-2">
                      Attendance: {employee.metrics.attendanceRate}%
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Hours: {employee.metrics.monthlyHours}
                    </div>
                    {employee.metrics.totalSubordinates > 0 && (
                      <div className="text-sm text-gray-600">
                        Reports: {employee.metrics.totalSubordinates}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}