/**
 * Service Categories for Fixzit
 * Exhaustive categories from "Collected service list.docx"
 * Used for marketplace filters, pricing rules, and RBAC scoping
 */

// eslint-disable-next-line no-unused-vars
export enum ServiceCategory {
  CORE_PROPERTY_MANAGEMENT_SERVICES = 'CORE_PROPERTY_MANAGEMENT_SERVICES',
  SPECIALIZED_PROPERTY_MANAGEMENT_SERVICES = 'SPECIALIZED_PROPERTY_MANAGEMENT_SERVICES',
  ADDITIONAL_SERVICES = 'ADDITIONAL_SERVICES',
  CATEGORIZATION_BY_TYPE = 'CATEGORIZATION_BY_TYPE',
  BY_PROPERTY_TYPE = 'BY_PROPERTY_TYPE',
  BY_SERVICE_FOCUS = 'BY_SERVICE_FOCUS',
  BY_CLIENT_TYPE = 'BY_CLIENT_TYPE',
  EXAMPLE_LARGE_REAL_ESTATE_FIRM = 'EXAMPLE_LARGE_REAL_ESTATE_FIRM',
}

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  [ServiceCategory.CORE_PROPERTY_MANAGEMENT_SERVICES]: 'Core Property Management Services',
  [ServiceCategory.SPECIALIZED_PROPERTY_MANAGEMENT_SERVICES]: 'Specialized Property Management Services',
  [ServiceCategory.ADDITIONAL_SERVICES]: 'Additional Services (may vary by provider)',
  [ServiceCategory.CATEGORIZATION_BY_TYPE]: 'Categorization by Type',
  [ServiceCategory.BY_PROPERTY_TYPE]: 'By Property Type',
  [ServiceCategory.BY_SERVICE_FOCUS]: 'By Service Focus',
  [ServiceCategory.BY_CLIENT_TYPE]: 'By Client Type',
  [ServiceCategory.EXAMPLE_LARGE_REAL_ESTATE_FIRM]: 'Example: Large Real Estate Firm',
};

/**
 * Get human-readable label for a service category
 */
export function getServiceCategoryLabel(category: ServiceCategory): string {
  return SERVICE_CATEGORY_LABELS[category];
}

/**
 * Get all service categories as array
 */
export function getAllServiceCategories(): ServiceCategory[] {
  return Object.values(ServiceCategory);
}

/**
 * Check if a string is a valid service category
 */
export function isValidServiceCategory(value: string): value is ServiceCategory {
  return Object.values(ServiceCategory).includes(value as ServiceCategory);
}
