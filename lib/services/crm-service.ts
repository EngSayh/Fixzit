/**
 * CRM Service - Unified service for customer relationship management
 */

import { apiClient } from './api-client';
import { Contact, Lead, Deal, Interaction, CrmTask, CrmPipeline } from '../types/crm';
import { PaginatedResponse, PaginationParams } from '../types/api';

export class CrmService {
  private static instance: CrmService;

  public static getInstance(): CrmService {
    if (!CrmService.instance) {
      CrmService.instance = new CrmService();
    }
    return CrmService.instance;
  }

  // ==================== CONTACTS ====================
  
  /**
   * Get contacts with filtering and pagination
   */
  async getContacts(params: PaginationParams & {
    type?: string;
    status?: string;
    assignedTo?: string;
    tags?: string[];
    company?: string;
  } = {}): Promise<PaginatedResponse<Contact>> {
    return apiClient.get('/crm/contacts', params);
  }

  /**
   * Get single contact by ID
   */
  async getContact(id: string, include?: string[]): Promise<Contact> {
    const params = include ? { include: include.join(',') } : {};
    return apiClient.get(`/crm/contacts/${id}`, params);
  }

  /**
   * Create new contact
   */
  async createContact(data: Partial<Contact>): Promise<Contact> {
    return apiClient.post('/crm/contacts', data);
  }

  /**
   * Update contact
   */
  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    return apiClient.put(`/crm/contacts/${id}`, data);
  }

  /**
   * Delete contact
   */
  async deleteContact(id: string): Promise<void> {
    return apiClient.delete(`/crm/contacts/${id}`);
  }

  /**
   * Merge contacts
   */
  async mergeContacts(primaryId: string, duplicateIds: string[]): Promise<Contact> {
    return apiClient.post(`/crm/contacts/${primaryId}/merge`, { duplicateIds });
  }

  // ==================== LEADS ====================

  /**
   * Get leads with filtering and pagination
   */
  async getLeads(params: PaginationParams & {
    status?: string;
    source?: string;
    assignedTo?: string;
    score?: { min?: number; max?: number };
    temperature?: string;
  } = {}): Promise<PaginatedResponse<Lead>> {
    return apiClient.get('/crm/leads', params);
  }

  /**
   * Get single lead by ID
   */
  async getLead(id: string, include?: string[]): Promise<Lead> {
    const params = include ? { include: include.join(',') } : {};
    return apiClient.get(`/crm/leads/${id}`, params);
  }

  /**
   * Create new lead
   */
  async createLead(data: Partial<Lead>): Promise<Lead> {
    return apiClient.post('/crm/leads', data);
  }

  /**
   * Update lead
   */
  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    return apiClient.put(`/crm/leads/${id}`, data);
  }

  /**
   * Convert lead to contact
   */
  async convertLead(id: string, data: {
    createContact: boolean;
    createDeal?: boolean;
    dealData?: Partial<Deal>;
    notes?: string;
  }): Promise<{ contact?: Contact; deal?: Deal }> {
    return apiClient.post(`/crm/leads/${id}/convert`, data);
  }

  /**
   * Update lead score
   */
  async updateLeadScore(id: string, score: number, reason?: string): Promise<Lead> {
    return apiClient.patch(`/crm/leads/${id}/score`, { score, reason });
  }

  // ==================== DEALS ====================

  /**
   * Get deals with filtering and pagination
   */
  async getDeals(params: PaginationParams & {
    stage?: string;
    status?: string;
    ownerId?: string;
    contactId?: string;
    probability?: { min?: number; max?: number };
    value?: { min?: number; max?: number };
    expectedClose?: { from?: string; to?: string };
  } = {}): Promise<PaginatedResponse<Deal>> {
    return apiClient.get('/crm/deals', params);
  }

  /**
   * Get single deal by ID
   */
  async getDeal(id: string, include?: string[]): Promise<Deal> {
    const params = include ? { include: include.join(',') } : {};
    return apiClient.get(`/crm/deals/${id}`, params);
  }

  /**
   * Create new deal
   */
  async createDeal(data: Partial<Deal>): Promise<Deal> {
    return apiClient.post('/crm/deals', data);
  }

  /**
   * Update deal
   */
  async updateDeal(id: string, data: Partial<Deal>): Promise<Deal> {
    return apiClient.put(`/crm/deals/${id}`, data);
  }

  /**
   * Move deal to different stage
   */
  async moveDeal(id: string, stage: string, notes?: string): Promise<Deal> {
    return apiClient.patch(`/crm/deals/${id}/move`, { stage, notes });
  }

  /**
   * Close deal
   */
  async closeDeal(id: string, data: {
    status: 'won' | 'lost';
    reason?: string;
    competitorName?: string;
    notes?: string;
  }): Promise<Deal> {
    return apiClient.patch(`/crm/deals/${id}/close`, data);
  }

  // ==================== INTERACTIONS ====================

  /**
   * Get interactions with filtering
   */
  async getInteractions(params: PaginationParams & {
    type?: string;
    contactId?: string;
    leadId?: string;
    dealId?: string;
    performedBy?: string;
    dateRange?: { from: string; to: string };
  } = {}): Promise<PaginatedResponse<Interaction>> {
    return apiClient.get('/crm/interactions', params);
  }

  /**
   * Create new interaction
   */
  async createInteraction(data: Partial<Interaction>): Promise<Interaction> {
    return apiClient.post('/crm/interactions', data);
  }

  /**
   * Update interaction
   */
  async updateInteraction(id: string, data: Partial<Interaction>): Promise<Interaction> {
    return apiClient.put(`/crm/interactions/${id}`, data);
  }

  // ==================== TASKS ====================

  /**
   * Get CRM tasks
   */
  async getTasks(params: PaginationParams & {
    status?: string;
    type?: string;
    assignedTo?: string;
    contactId?: string;
    dealId?: string;
    dueDate?: { from?: string; to?: string };
    overdue?: boolean;
  } = {}): Promise<PaginatedResponse<CrmTask>> {
    return apiClient.get('/crm/tasks', params);
  }

  /**
   * Create new task
   */
  async createTask(data: Partial<CrmTask>): Promise<CrmTask> {
    return apiClient.post('/crm/tasks', data);
  }

  /**
   * Update task
   */
  async updateTask(id: string, data: Partial<CrmTask>): Promise<CrmTask> {
    return apiClient.put(`/crm/tasks/${id}`, data);
  }

  /**
   * Complete task
   */
  async completeTask(id: string, notes?: string): Promise<CrmTask> {
    return apiClient.patch(`/crm/tasks/${id}/complete`, { notes });
  }

  // ==================== PIPELINE ====================

  /**
   * Get pipelines
   */
  async getPipelines(): Promise<CrmPipeline[]> {
    return apiClient.get('/crm/pipelines');
  }

  /**
   * Get pipeline analytics
   */
  async getPipelineAnalytics(pipelineId?: string, dateRange?: { from: string; to: string }): Promise<{
    totalValue: number;
    averageDealSize: number;
    winRate: number;
    averageSalesCycle: number;
    conversionRates: Record<string, number>;
    stageAnalysis: Array<{
      stage: string;
      dealCount: number;
      totalValue: number;
      averageTimeInStage: number;
    }>;
  }> {
    const params: any = {};
    if (pipelineId) params.pipelineId = pipelineId;
    if (dateRange) {
      params.dateFrom = dateRange.from;
      params.dateTo = dateRange.to;
    }
    return apiClient.get('/crm/pipeline-analytics', params);
  }

  // ==================== STATISTICS ====================

  /**
   * Get CRM statistics
   */
  async getStats(dateRange?: { from: string; to: string }): Promise<{
    totalContacts: number;
    totalLeads: number;
    totalDeals: number;
    totalRevenue: number;
    conversionRate: number;
    averageDealSize: number;
    winRate: number;
    activitiesCount: number;
    topSources: Array<{ source: string; count: number }>;
    topPerformers: Array<{ userId: string; name: string; dealsWon: number; revenue: number }>;
  }> {
    const params = dateRange ? {
      dateFrom: dateRange.from,
      dateTo: dateRange.to
    } : {};
    return apiClient.get('/crm/stats', params);
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update contacts
   */
  async bulkUpdateContacts(contactIds: string[], updates: Partial<Contact>): Promise<void> {
    return apiClient.patch('/crm/contacts/bulk', { contactIds, updates });
  }

  /**
   * Bulk assign contacts
   */
  async bulkAssignContacts(contactIds: string[], assignedTo: string): Promise<void> {
    return apiClient.patch('/crm/contacts/bulk-assign', { contactIds, assignedTo });
  }

  /**
   * Bulk delete contacts
   */
  async bulkDeleteContacts(contactIds: string[]): Promise<void> {
    return apiClient.delete('/crm/contacts/bulk', { contactIds });
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Import contacts from CSV
   */
  async importContacts(file: File, mappings: Record<string, string>): Promise<{
    importId: string;
    status: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mappings', JSON.stringify(mappings));
    
    // Special handling for file upload
    const response = await fetch('/api/crm/contacts/import', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Import failed');
    }
    
    return response.json();
  }

  /**
   * Get import status
   */
  async getImportStatus(importId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    totalRecords: number;
    processedRecords: number;
    errors: any[];
  }> {
    return apiClient.get(`/crm/imports/${importId}/status`);
  }

  /**
   * Export contacts
   */
  async exportContacts(params: {
    format: 'csv' | 'excel';
    filters?: Record<string, any>;
    fields?: string[];
  }): Promise<{ downloadUrl: string }> {
    return apiClient.post('/crm/contacts/export', params);
  }
}

// Export singleton instance
export const crmService = CrmService.getInstance();