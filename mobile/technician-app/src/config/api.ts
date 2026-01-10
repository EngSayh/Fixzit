/**
 * @fileoverview API Configuration for Technician Mobile App
 * @module technician-app/config/api
 */

// API Configuration
export const API_CONFIG = {
  // Base URL - will be replaced by environment variable in production
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.fixzit.sa',
  
  // API Version
  VERSION: 'v1',
  
  // Timeouts
  TIMEOUT: 30000, // 30 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/mobile/login',
  REFRESH: '/api/auth/mobile/refresh',
  LOGOUT: '/api/auth/mobile/logout',
  
  // Work Orders
  WORK_ORDERS: '/api/fm/work-orders',
  WORK_ORDER_DETAIL: (id: string) => `/api/fm/work-orders/${id}`,
  WORK_ORDER_STATUS: (id: string) => `/api/fm/work-orders/${id}/status`,
  WORK_ORDER_PHOTOS: (id: string) => `/api/fm/work-orders/${id}/photos`,
  
  // Technician
  TECHNICIAN_SCHEDULE: '/api/fm/technician/schedule',
  TECHNICIAN_PROFILE: '/api/fm/technician/profile',
  TECHNICIAN_AVAILABILITY: '/api/fm/technician/availability',
  
  // Inspections
  INSPECTIONS: '/api/fm/inspections',
  INSPECTION_DETAIL: (id: string) => `/api/fm/inspections/${id}`,
  INSPECTION_SUBMIT: (id: string) => `/api/fm/inspections/${id}/submit`,
  
  // Upload
  UPLOAD_PRESIGNED: '/api/upload/presigned-url',
  
  // Sync
  SYNC_PULL: '/api/mobile/sync/pull',
  SYNC_PUSH: '/api/mobile/sync/push',
};

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  LAST_SYNC: 'lastSync',
  OFFLINE_QUEUE: 'offlineQueue',
};
