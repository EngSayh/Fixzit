/**
 * HR Service - Unified service for human resources management
 */

import { apiClient } from './api-client';
import { PaginatedResponse, PaginationParams } from '../types/api';

// HR Types (simplified for this example)
export interface Employee {
  id: string;
  employeeNumber: string;
  department: string;
  position: string;
  status: string;
  salary: number;
  hireDate: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    lastLoginAt?: string;
  };
  manager?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  metrics: {
    attendanceRate: number;
    totalSubordinates: number;
    pendingLeaves: number;
    lastCheckIn?: string;
    monthlyHours: number;
  };
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  employeeCount: number;
  budget?: number;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  totalHours?: number;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'work_from_home';
  notes?: string;
}

export class HrService {
  private static instance: HrService;

  public static getInstance(): HrService {
    if (!HrService.instance) {
      HrService.instance = new HrService();
    }
    return HrService.instance;
  }

  // ==================== EMPLOYEES ====================

  /**
   * Get employees with filtering and pagination
   */
  async getEmployees(params: PaginationParams & {
    department?: string;
    status?: string;
    position?: string;
    managerId?: string;
  } = {}): Promise<{
    employees: Employee[];
    departments: string[];
    summary: {
      totalEmployees: number;
      activeEmployees: number;
      departmentCount: number;
      averageAttendance: number;
    };
    pagination?: any;
  }> {
    const response = await apiClient.get<PaginatedResponse<Employee>>('/hr/employees', params);
    
    // Get additional summary data
    const [departments, summary] = await Promise.all([
      this.getDepartments(),
      this.getEmployeeSummary()
    ]);

    return {
      employees: response.data,
      departments: departments.map(d => d.name),
      summary,
      pagination: response.pagination
    };
  }

  /**
   * Get single employee by ID
   */
  async getEmployee(id: string): Promise<Employee> {
    return apiClient.get(`/hr/employees/${id}`);
  }

  /**
   * Create new employee
   */
  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    return apiClient.post('/hr/employees', data);
  }

  /**
   * Update employee
   */
  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    return apiClient.put(`/hr/employees/${id}`, data);
  }

  /**
   * Delete employee
   */
  async deleteEmployee(id: string): Promise<void> {
    return apiClient.delete(`/hr/employees/${id}`);
  }

  // ==================== DEPARTMENTS ====================

  /**
   * Get all departments
   */
  async getDepartments(): Promise<Department[]> {
    return apiClient.get('/hr/departments');
  }

  /**
   * Create new department
   */
  async createDepartment(data: Partial<Department>): Promise<Department> {
    return apiClient.post('/hr/departments', data);
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, data: Partial<Department>): Promise<Department> {
    return apiClient.put(`/hr/departments/${id}`, data);
  }

  // ==================== ATTENDANCE ====================

  /**
   * Get attendance records
   */
  async getAttendance(params: {
    employeeId?: string;
    department?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<AttendanceRecord>> {
    return apiClient.get('/hr/attendance', params);
  }

  /**
   * Record attendance check-in
   */
  async checkIn(employeeId: string, location?: { lat: number; lng: number }): Promise<AttendanceRecord> {
    return apiClient.post('/hr/attendance/checkin', { employeeId, location });
  }

  /**
   * Record attendance check-out
   */
  async checkOut(employeeId: string, location?: { lat: number; lng: number }): Promise<AttendanceRecord> {
    return apiClient.post('/hr/attendance/checkout', { employeeId, location });
  }

  // ==================== LEAVE REQUESTS ====================

  /**
   * Get leave requests
   */
  async getLeaveRequests(params: {
    employeeId?: string;
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<any>> {
    return apiClient.get('/hr/leave-requests', params);
  }

  /**
   * Submit leave request
   */
  async submitLeaveRequest(data: {
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachments?: string[];
  }): Promise<any> {
    return apiClient.post('/hr/leave-requests', data);
  }

  /**
   * Approve/Reject leave request
   */
  async updateLeaveRequest(id: string, data: {
    status: 'approved' | 'rejected';
    notes?: string;
  }): Promise<any> {
    return apiClient.patch(`/hr/leave-requests/${id}`, data);
  }

  // ==================== PAYROLL ====================

  /**
   * Get payroll records
   */
  async getPayroll(params: {
    employeeId?: string;
    period?: string;
    year?: number;
    month?: number;
  } = {}): Promise<any[]> {
    return apiClient.get('/hr/payroll', params);
  }

  /**
   * Generate payroll for period
   */
  async generatePayroll(data: {
    period: string;
    employeeIds?: string[];
    includeDeductions?: boolean;
  }): Promise<{ payrollId: string; status: string }> {
    return apiClient.post('/hr/payroll/generate', data);
  }

  // ==================== STATISTICS ====================

  /**
   * Get employee summary statistics
   */
  async getEmployeeSummary(): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    departmentCount: number;
    averageAttendance: number;
  }> {
    return apiClient.get('/hr/employees/summary');
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(params: {
    period?: 'week' | 'month' | 'quarter';
    departmentId?: string;
  } = {}): Promise<{
    attendanceRate: number;
    onTimeRate: number;
    absenteeRate: number;
    trends: Array<{ date: string; present: number; absent: number; late: number }>;
  }> {
    return apiClient.get('/hr/attendance/stats', params);
  }

  // ==================== REPORTS ====================

  /**
   * Generate HR report
   */
  async generateReport(params: {
    type: 'attendance' | 'payroll' | 'performance' | 'headcount';
    format: 'pdf' | 'excel' | 'csv';
    dateFrom?: string;
    dateTo?: string;
    filters?: Record<string, any>;
  }): Promise<{ reportId: string; downloadUrl?: string }> {
    return apiClient.post('/hr/reports', params);
  }

  // ==================== EMPLOYEE SERVICES ====================

  /**
   * Get employee services (for HR service catalog)
   */
  async getServices(): Promise<any[]> {
    return apiClient.get('/hr/services');
  }

  /**
   * Submit service request
   */
  async submitServiceRequest(data: {
    serviceId: string;
    employeeId: string;
    details: Record<string, any>;
    attachments?: string[];
  }): Promise<any> {
    return apiClient.post('/hr/services/requests', data);
  }
}

// Export singleton instance
export const hrService = HrService.getInstance();