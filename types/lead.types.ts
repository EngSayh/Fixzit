/**
 * Lead & CRM Types
 * @module types/lead
 * @description Lead capture, tracking, and CRM functionality for Fixzit Souq Phase 2
 */

import type { ObjectId } from "mongodb";

// ============================================================================
// Lead Core Types
// ============================================================================

export type LeadPriority = "low" | "normal" | "high";
export type LeadStatus = "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost" | "archived";
export type LeadSource = "platform" | "referral" | "walk_in" | "phone" | "website" | "social" | "other";
export type ActivityType = "note" | "call" | "email" | "meeting" | "sms" | "whatsapp" | "status_change" | "assignment";

export interface ILead {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  created_by: ObjectId | string;
  assigned_to?: ObjectId | string;
  
  // Contact Info
  name: string;
  phone: string; // Saudi format: 05XXXXXXXX
  email?: string;
  
  // Source Tracking
  source: LeadSource;
  source_details?: string;
  linked_listing_id?: ObjectId | string;
  
  // Lead Details
  priority: LeadPriority;
  status: LeadStatus;
  property_interest?: string; // Type of property they're looking for
  budget_min?: number;
  budget_max?: number;
  preferred_locations?: string[];
  notes?: string;
  next_step?: string;
  
  // Reminder
  reminder_enabled: boolean;
  reminder_datetime?: Date;
  
  // Activity Tracking
  last_contacted_at?: Date;
  total_activities: number;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface ILeadActivity {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  lead_id: ObjectId | string;
  user_id: ObjectId | string;
  type: ActivityType;
  description: string;
  description_ar?: string;
  old_value?: unknown;
  new_value?: unknown;
  duration_minutes?: number; // For calls/meetings
  outcome?: string;
  created_at: Date;
}

// ============================================================================
// API Request/Response DTOs
// ============================================================================

export interface CreateLeadRequest {
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  source_details?: string;
  linked_listing_id?: string;
  priority?: LeadPriority;
  property_interest?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_locations?: string[];
  notes?: string;
  next_step?: string;
  reminder_enabled?: boolean;
  reminder_datetime?: string; // ISO date string
}

export interface UpdateLeadRequest {
  name?: string;
  phone?: string;
  email?: string;
  assigned_to?: string;
  priority?: LeadPriority;
  status?: LeadStatus;
  property_interest?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_locations?: string[];
  notes?: string;
  next_step?: string;
  reminder_enabled?: boolean;
  reminder_datetime?: string;
}

export interface LeadFilters {
  status?: LeadStatus | LeadStatus[];
  priority?: LeadPriority | LeadPriority[];
  source?: LeadSource;
  assigned_to?: string;
  search?: string; // Search by name, phone, email
  reminder_due?: boolean; // Leads with pending reminders
  created_after?: Date;
  created_before?: Date;
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "updated_at" | "last_contacted_at" | "priority";
  sort_order?: "asc" | "desc";
}

export interface LeadListResponse {
  leads: ILead[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  stats: {
    total_new: number;
    total_contacted: number;
    total_qualified: number;
    total_won: number;
    total_lost: number;
  };
}

export interface LeadDetailResponse {
  lead: ILead;
  activities: ILeadActivity[];
  linked_listing?: {
    id: string;
    title: string;
    price: number;
    type: string;
  };
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateActivityRequest {
  type: ActivityType;
  description: string;
  duration_minutes?: number;
  outcome?: string;
}

export interface CreateActivityResponse {
  activity: ILeadActivity;
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface LeadCardProps {
  lead: ILead;
  onClick?: () => void;
  onCall?: () => void;
  onArchive?: () => void;
  onAssign?: () => void;
  showActions?: boolean;
  className?: string;
}

export interface LeadFormProps {
  initialData?: Partial<CreateLeadRequest>;
  onSubmit: (data: CreateLeadRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  listings?: Array<{ id: string; title: string }>;
}

export interface LeadListProps {
  leads: ILead[];
  filters: LeadFilters;
  onFilterChange: (filters: LeadFilters) => void;
  onLeadClick: (lead: ILead) => void;
  isLoading?: boolean;
  className?: string;
}

export interface LeadActivityTimelineProps {
  activities: ILeadActivity[];
  onAddActivity?: () => void;
  className?: string;
}

// ============================================================================
// Lead Status Configuration
// ============================================================================

export const LEAD_STATUS_CONFIG: Record<LeadStatus, {
  label: string;
  label_ar: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  new: {
    label: "New",
    label_ar: "جديد",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: "sparkles",
  },
  contacted: {
    label: "Contacted",
    label_ar: "تم التواصل",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: "phone",
  },
  qualified: {
    label: "Qualified",
    label_ar: "مؤهل",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: "check-badge",
  },
  negotiating: {
    label: "Negotiating",
    label_ar: "مفاوضات",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: "chat-bubble-left-right",
  },
  won: {
    label: "Won",
    label_ar: "تم الفوز",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: "trophy",
  },
  lost: {
    label: "Lost",
    label_ar: "خسارة",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: "x-circle",
  },
  archived: {
    label: "Archived",
    label_ar: "مؤرشف",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: "archive-box",
  },
};

export const LEAD_PRIORITY_CONFIG: Record<LeadPriority, {
  label: string;
  label_ar: string;
  color: string;
  bgColor: string;
}> = {
  low: {
    label: "Low",
    label_ar: "قليلة",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  normal: {
    label: "Normal",
    label_ar: "عادية",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  high: {
    label: "High",
    label_ar: "عالية",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

export const LEAD_SOURCE_CONFIG: Record<LeadSource, {
  label: string;
  label_ar: string;
  icon: string;
}> = {
  platform: {
    label: "Platform",
    label_ar: "المنصة",
    icon: "globe-alt",
  },
  referral: {
    label: "Referral",
    label_ar: "إحالة",
    icon: "users",
  },
  walk_in: {
    label: "Walk-in",
    label_ar: "زيارة مباشرة",
    icon: "building-office",
  },
  phone: {
    label: "Phone",
    label_ar: "هاتف",
    icon: "phone",
  },
  website: {
    label: "Website",
    label_ar: "الموقع",
    icon: "computer-desktop",
  },
  social: {
    label: "Social Media",
    label_ar: "وسائل التواصل",
    icon: "share",
  },
  other: {
    label: "Other",
    label_ar: "أخرى",
    icon: "ellipsis-horizontal",
  },
};
