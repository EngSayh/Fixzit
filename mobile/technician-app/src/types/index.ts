/**
 * @fileoverview Type definitions for Technician Mobile App
 * @module technician-app/types
 * 
 * Re-exports shared types from mobile/shared-types
 * Plus mobile-specific navigation and state types
 */

// Re-export shared types
export * from '../../../shared-types';

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  WorkOrderDetail: { workOrderId: string };
  InspectionForm: { inspectionId: string; workOrderId: string };
  PhotoCapture: { workOrderId: string; inspectionId?: string };
  Settings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Schedule: undefined;
  WorkOrders: undefined;
  Profile: undefined;
};

// App state types
export interface AppState {
  isOnline: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  pendingUploads: number;
  lastSyncAt?: string;
}

// Auth state
export interface AuthState {
  user: import('../../../shared-types').MobileUser | null;
  tokens: import('../../../shared-types').AuthTokens | null;
  isLoading: boolean;
  error?: string;
}
