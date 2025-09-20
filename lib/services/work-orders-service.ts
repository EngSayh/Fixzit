/**
 * Work Orders Service - Replaces lib/work-orders-api.ts with unified API client
 */

import { apiClient } from './api-client';
import { 
  WorkOrder, 
  WorkOrderTemplate, 
  WorkOrderBatch, 
  PreventiveMaintenance, 
  WorkOrderReport,
  WorkOrderSLA 
} from '../types/work-orders';
import { PaginatedResponse, PaginationParams } from '../types/api';

export class WorkOrdersService {
  private static instance: WorkOrdersService;

  public static getInstance(): WorkOrdersService {
    if (!WorkOrdersService.instance) {
      WorkOrdersService.instance = new WorkOrdersService();
    }
    return WorkOrdersService.instance;
  }

  // ==================== WORK ORDERS ====================

  /**
   * Get work orders with filtering and pagination
   */
  async getWorkOrders(params: PaginationParams & {
    status?: string | string[];
    priority?: string | string[];
    category?: string | string[];
    type?: string[];
    assignedTo?: string;
    propertyId?: string;
    requestedBy?: string;
    dateRange?: { from: string; to: string };
    overdue?: boolean;
    tags?: string[];
  } = {}): Promise<PaginatedResponse<WorkOrder>> {
    return apiClient.get('/work-orders', params);
  }

  /**
   * Get single work order by ID
   */
  async getWorkOrder(id: string, include?: string[]): Promise<WorkOrder> {
    const params = include ? { include: include.join(',') } : {};
    return apiClient.get(`/work-orders/${id}`, params);
  }

  /**
   * Create new work order
   */
  async createWorkOrder(data: Partial<WorkOrder>): Promise<WorkOrder> {
    return apiClient.post('/work-orders', data);
  }

  /**
   * Update work order
   */
  async updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<WorkOrder> {
    return apiClient.put(`/work-orders/${id}`, data);
  }

  /**
   * Delete work order
   */
  async deleteWorkOrder(id: string): Promise<void> {
    return apiClient.delete(`/work-orders/${id}`);
  }

  /**
   * Update work order status
   */
  async updateStatus(id: string, status: string, notes?: string): Promise<WorkOrder> {
    return apiClient.patch(`/work-orders/${id}/status`, { status, notes });
  }

  /**
   * Assign work order
   */
  async assignWorkOrder(id: string, assignedTo: string, notes?: string): Promise<WorkOrder> {
    return apiClient.patch(`/work-orders/${id}/assign`, { assignedTo, notes });
  }

  /**
   * Start work order
   */
  async startWorkOrder(id: string): Promise<WorkOrder> {
    return apiClient.patch(`/work-orders/${id}/start`);
  }

  /**
   * Complete work order
   */
  async completeWorkOrder(id: string, data: {
    completionNotes?: string;
    actualCost?: number;
    materials?: any[];
    afterPhotos?: string[];
    qualityRating?: number;
  }): Promise<WorkOrder> {
    return apiClient.patch(`/work-orders/${id}/complete`, data);
  }

  /**
   * Cancel work order
   */
  async cancelWorkOrder(id: string, reason: string): Promise<WorkOrder> {
    return apiClient.patch(`/work-orders/${id}/cancel`, { reason });
  }

  /**
   * Clone work order
   */
  async cloneWorkOrder(id: string, data?: Partial<WorkOrder>): Promise<WorkOrder> {
    return apiClient.post(`/work-orders/${id}/clone`, data);
  }

  // ==================== SCHEDULING ====================

  /**
   * Schedule work order
   */
  async scheduleWorkOrder(id: string, data: {
    scheduledDate: string;
    startTime: string;
    endTime: string;
    assignedTechnicians?: string[];
  }): Promise<WorkOrder> {
    return apiClient.patch(`/work-orders/${id}/schedule`, data);
  }

  /**
   * Get technician availability
   */
  async getTechnicianAvailability(params: {
    technicianIds?: string[];
    date: string;
    duration?: number;
  }): Promise<{
    technician: string;
    available: boolean;
    conflicts: any[];
    availableSlots: Array<{ start: string; end: string }>;
  }[]> {
    return apiClient.get('/work-orders/technician-availability', params);
  }

  /**
   * Get calendar view
   */
  async getCalendarView(params: {
    start: string;
    end: string;
    technicianIds?: string[];
    propertyIds?: string[];
    view: 'month' | 'week' | 'day';
  }): Promise<{
    events: Array<{
      id: string;
      title: string;
      start: string;
      end: string;
      status: string;
      priority: string;
      technician?: string;
      property?: string;
    }>;
  }> {
    return apiClient.get('/work-orders/calendar', params);
  }

  // ==================== TEMPLATES ====================

  /**
   * Get work order templates
   */
  async getTemplates(params: {
    category?: string;
    type?: string;
    active?: boolean;
  } = {}): Promise<WorkOrderTemplate[]> {
    return apiClient.get('/work-orders/templates', params);
  }

  /**
   * Create work order from template
   */
  async createFromTemplate(templateId: string, data: Partial<WorkOrder>): Promise<WorkOrder> {
    return apiClient.post(`/work-orders/templates/${templateId}/create`, data);
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update work orders
   */
  async bulkUpdate(workOrderIds: string[], updates: Partial<WorkOrder>): Promise<void> {
    return apiClient.patch('/work-orders/bulk', { workOrderIds, updates });
  }

  /**
   * Bulk assign work orders
   */
  async bulkAssign(workOrderIds: string[], assignedTo: string): Promise<void> {
    return apiClient.patch('/work-orders/bulk-assign', { workOrderIds, assignedTo });
  }

  /**
   * Bulk status update
   */
  async bulkStatusUpdate(workOrderIds: string[], status: string, notes?: string): Promise<void> {
    return apiClient.patch('/work-orders/bulk-status', { workOrderIds, status, notes });
  }

  /**
   * Create batch work order
   */
  async createBatch(data: {
    name: string;
    description?: string;
    workOrderIds: string[];
    assignedTo?: string;
    scheduledDate?: string;
  }): Promise<WorkOrderBatch> {
    return apiClient.post('/work-orders/batches', data);
  }

  // ==================== PREVENTIVE MAINTENANCE ====================

  /**
   * Get preventive maintenance schedules
   */
  async getPreventiveMaintenance(params?: {
    active?: boolean;
    propertyId?: string;
    category?: string;
    overdue?: boolean;
  }): Promise<PreventiveMaintenance[]> {
    return apiClient.get('/work-orders/preventive', params);
  }

  /**
   * Generate preventive maintenance work orders
   */
  async generatePreventiveMaintenance(pmId: string): Promise<WorkOrder[]> {
    return apiClient.post(`/work-orders/preventive/${pmId}/generate`);
  }

  // ==================== COMMENTS AND UPDATES ====================

  /**
   * Add comment to work order
   */
  async addComment(workOrderId: string, data: {
    content: string;
    isInternal?: boolean;
    attachments?: string[];
  }): Promise<any> {
    return apiClient.post(`/work-orders/${workOrderId}/comments`, data);
  }

  /**
   * Upload attachments
   */
  async uploadAttachments(workOrderId: string, files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    const response = await fetch(`/api/work-orders/${workOrderId}/attachments`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return result.data.fileIds;
  }

  // ==================== REPORTING AND ANALYTICS ====================

  /**
   * Get work order statistics
   */
  async getStats(params?: {
    dateRange?: { from: string; to: string };
    propertyIds?: string[];
    assignedTo?: string[];
    category?: string[];
  }): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    averageCompletionTime: number;
    averageCost: number;
    slaCompliance: number;
    overdue: number;
    trends: {
      created: Array<{ date: string; count: number }>;
      completed: Array<{ date: string; count: number }>;
      cost: Array<{ date: string; amount: number }>;
    };
  }> {
    return apiClient.get('/work-orders/stats', params);
  }

  /**
   * Generate work order report
   */
  async generateReport(params: {
    type: 'summary' | 'detailed' | 'analytics' | 'performance';
    format: 'pdf' | 'excel' | 'csv';
    dateRange: { from: string; to: string };
    filters?: Record<string, any>;
    includeCharts?: boolean;
  }): Promise<{ reportId: string; downloadUrl?: string }> {
    return apiClient.post('/work-orders/reports', params);
  }

  /**
   * Get technician performance
   */
  async getTechnicianPerformance(params: {
    technicianIds?: string[];
    dateRange?: { from: string; to: string };
    metrics?: string[];
  }): Promise<{
    technician: string;
    name: string;
    metrics: {
      totalWorkOrders: number;
      completedWorkOrders: number;
      averageCompletionTime: number;
      qualityRating: number;
      slaCompliance: number;
      utilizationRate: number;
    };
  }[]> {
    return apiClient.get('/work-orders/technician-performance', params);
  }

  // ==================== MOBILE SUPPORT ====================

  /**
   * Get work orders for mobile app (technician view)
   */
  async getMobileWorkOrders(technicianId: string): Promise<WorkOrder[]> {
    return apiClient.get(`/work-orders/mobile/${technicianId}`);
  }

  /**
   * Update work order from mobile
   */
  async updateFromMobile(id: string, data: {
    status?: string;
    notes?: string;
    location?: { lat: number; lng: number };
    photos?: string[];
    timeTracking?: { start?: string; end?: string };
  }): Promise<WorkOrder> {
    return apiClient.patch(`/work-orders/${id}/mobile`, data);
  }

  // ==================== INTEGRATIONS ====================

  /**
   * Sync with external system
   */
  async syncWithExternal(params: {
    system: string;
    direction: 'import' | 'export' | 'bidirectional';
    filters?: Record<string, any>;
  }): Promise<{ syncId: string; status: string }> {
    return apiClient.post('/work-orders/sync', params);
  }

  /**
   * Get integration status
   */
  async getIntegrationStatus(syncId: string): Promise<{
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    results?: {
      imported: number;
      exported: number;
      errors: any[];
    };
  }> {
    return apiClient.get(`/work-orders/sync/${syncId}/status`);
  }
}

// Export singleton instance
export const workOrdersService = WorkOrdersService.getInstance();