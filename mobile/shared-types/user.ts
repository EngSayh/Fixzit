/**
 * @fileoverview Shared User Types for Mobile
 * @module mobile/shared-types/user
 */

/**
 * User profile
 */
export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
  locale: "en" | "ar";
  timezone?: string;
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * Technician profile (extends user)
 */
export interface TechnicianProfile extends UserProfile {
  specializations: string[];
  certifications?: string[];
  rating?: number;
  completedJobs?: number;
  averageResponseTime?: number; // minutes
  availability?: TechnicianAvailability;
}

/**
 * Technician availability
 */
export interface TechnicianAvailability {
  isAvailable: boolean;
  nextAvailableAt?: string;
  workingHours?: {
    start: string; // HH:mm
    end: string;
    timezone: string;
  };
  daysOff?: number[]; // 0-6 (Sunday-Saturday)
}

/**
 * Technician schedule item
 */
export interface TechnicianScheduleItem {
  id: string;
  workOrderId: string;
  workOrderNumber: string;
  title: string;
  priority: string;
  propertyAddress: string;
  unitNumber?: string;
  scheduledAt: string;
  estimatedDuration?: number; // minutes
  status: string;
}

/**
 * Daily schedule
 */
export interface TechnicianDailySchedule {
  date: string;
  items: TechnicianScheduleItem[];
  totalJobs: number;
  completedJobs: number;
}

/**
 * Tenant profile (extends user)
 */
export interface TenantProfile extends UserProfile {
  unitId?: string;
  unitNumber?: string;
  propertyId?: string;
  propertyName?: string;
  leaseStart?: string;
  leaseEnd?: string;
  rentAmount?: number;
  rentCurrency?: string;
  rentDueDay?: number;
}

/**
 * Owner profile (extends user)
 */
export interface OwnerProfile extends UserProfile {
  propertiesCount?: number;
  unitsCount?: number;
  occupancyRate?: number;
  totalRevenue?: number;
  revenueCurrency?: string;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  push: boolean;
  sms: boolean;
  email: boolean;
  workOrderUpdates: boolean;
  paymentReminders: boolean;
  maintenanceAlerts: boolean;
  promotions: boolean;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
    timezone: string;
  };
}

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: "en" | "ar";
  timezone?: string;
  notificationPreferences?: Partial<NotificationPreferences>;
}

/**
 * Update avatar request
 */
export interface UpdateAvatarRequest {
  avatar: string; // base64 or URL
}
