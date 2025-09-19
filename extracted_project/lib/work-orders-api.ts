import api from './api';
import { WorkOrder, WorkOrderFilters, WorkOrderFormData, WorkOrderStats, WorkOrderStatus } from '../types/work-orders';

export const workOrdersApi = {
  // Get all work orders with filtering
  async getWorkOrders(filters: WorkOrderFilters = {}, page = 1, limit = 20) {
    const params = new URLSearchParams();
    
    // Add orgId (required)
    params.append('orgId', 'demo-org-id'); // This should come from auth context
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    // Add filters
    if (filters.status?.length) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters.priority?.length) {
      filters.priority.forEach(priority => params.append('priority', priority));
    }
    if (filters.category?.length) {
      filters.category.forEach(category => params.append('category', category));
    }
    if (filters.propertyId) params.append('propertyId', filters.propertyId);
    if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const response = await api.get(`/work-orders?${params.toString()}`);
    return response.data;
  },

  // Get single work order
  async getWorkOrder(id: string) {
    const response = await api.get(`/work-orders/${id}?orgId=demo-org-id`);
    return response.data;
  },

  // Create work order
  async createWorkOrder(data: WorkOrderFormData) {
    const formData = new FormData();
    
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('priority', data.priority);
    formData.append('createdBy', 'current-user-id'); // This should come from auth context
    formData.append('orgId', 'demo-org-id'); // This should come from auth context
    
    if (data.propertyId) formData.append('propertyId', data.propertyId);
    if (data.unitId) formData.append('unitId', data.unitId);
    if (data.dueDate) formData.append('dueDate', data.dueDate);
    if (data.estimatedHours) formData.append('estimatedHours', data.estimatedHours.toString());
    if (data.estimatedCost) formData.append('estimatedCost', data.estimatedCost.toString());
    
    // Add photos
    if (data.photos) {
      data.photos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });
    }

    const response = await api.post('/work-orders', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update work order
  async updateWorkOrder(id: string, data: Partial<WorkOrder>) {
    const response = await api.put(`/work-orders/${id}`, {
      ...data,
      orgId: 'demo-org-id'
    });
    return response.data;
  },

  // Delete work order
  async deleteWorkOrder(id: string) {
    const response = await api.delete(`/work-orders/${id}?orgId=demo-org-id`);
    return response.data;
  },

  // Get work order statistics
  async getStats(): Promise<WorkOrderStats> {
    const response = await api.get('/work-orders/stats?orgId=demo-org-id');
    return response.data.overview;
  },

  // Quick status update
  async updateStatus(id: string, status: string) {
    return this.updateWorkOrder(id, { status: status as WorkOrderStatus });
  },

  // Assign work order
  async assignWorkOrder(id: string, assignedTo: string) {
    return this.updateWorkOrder(id, { assignedTo, status: 'assigned' });
  }
};

export default workOrdersApi;