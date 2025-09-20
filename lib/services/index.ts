/**
 * Unified Services Export
 * Single import point for all services to replace scattered API calls
 */

// Core API Client
export { apiClient, ApiError } from './api-client';

// Domain Services
export { dashboardService } from './dashboard-service';
export { crmService } from './crm-service';
export { workOrdersService } from './work-orders-service';

// Service Types
export type { RequestOptions } from './api-client';

/**
 * Legacy API files to be gradually replaced:
 * - lib/dashboard-api.ts → dashboardService
 * - lib/finances-api.ts → financesService (to be created)
 * - lib/properties-api.ts → propertiesService (to be created)
 * - lib/work-orders-api.ts → workOrdersService
 * 
 * Components should import from this index file:
 * import { dashboardService, crmService } from '@/lib/services';
 */

/**
 * Service Factory Pattern - Creates service instances with shared configuration
 */
export class ServiceFactory {
  private static instances: Map<string, any> = new Map();

  static getService<T>(serviceName: string, serviceClass: new () => T): T {
    if (!this.instances.has(serviceName)) {
      this.instances.set(serviceName, new serviceClass());
    }
    return this.instances.get(serviceName);
  }

  static clearInstances(): void {
    this.instances.clear();
  }
}

/**
 * Service Registry - For dynamic service loading
 */
export const getServiceRegistry = () => ({
  dashboard: dashboardService,
  crm: crmService,
  workOrders: workOrdersService,
  // Add more services as they're created
});

export type ServiceNames = keyof typeof serviceRegistry;