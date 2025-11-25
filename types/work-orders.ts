// Core work order types - removed dependency on missing lib file

export type WorkOrderStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "open"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "closed";

export type WorkOrderPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent"
  | "emergency";

export type WorkOrderCategory =
  | "general"
  | "maintenance"
  | "plumbing"
  | "electrical"
  | "hvac"
  | "cleaning"
  | "security"
  | "landscaping"
  | "inspection"
  | "it"
  | "other";

export interface WorkOrderUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface WorkOrderPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type?: "before" | "after" | "attachment";
  caption?: string;
  uploadedAt?: string;
}

export interface WorkOrderComment {
  id: string;
  workOrderId: string;
  comment: string;
  type: "comment" | "internal";
  createdAt: string;
  user?: WorkOrderUser;
}

export interface WorkOrderTimeline {
  id: string;
  workOrderId: string;
  action:
    | "created"
    | "assigned"
    | "status_changed"
    | "comment_added"
    | "photo_uploaded"
    | "priority_changed"
    | "completed"
    | "closed"
    | "reopened"
    | "updated"
    | string;
  description?: string;
  performedAt: string;
  user?: WorkOrderUser;
  metadata?: Record<string, unknown>;
}

export interface WorkOrderProperty {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface WorkOrderUnit {
  id: string;
  unitNumber?: string;
  floor?: string | number;
  property?: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber?: string;
  woNumber?: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  category: WorkOrderCategory;
  property?: WorkOrderProperty | null;
  unit?: WorkOrderUnit | null;
  creator?: WorkOrderUser | null;
  assignee?: WorkOrderUser | null;
  timeline?: WorkOrderTimeline[];
  comments?: WorkOrderComment[];
  photos?: WorkOrderPhoto[];
  dueDate?: string;
  estimatedHours?: number;
  estimatedCost?: number;
  actualHours?: number;
  actualCost?: number;
  completedAt?: string;
}

export interface WorkOrderFormData {
  title: string;
  description: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  propertyId?: string;
  unitId?: string;
  dueDate?: string;
  estimatedHours?: number;
  estimatedCost?: number;
  assignedTo?: string;
  photos: File[];
  tags?: string[];
}

export interface WorkOrderFilters {
  search?: string;
  status?: WorkOrderStatus[];
  priority?: WorkOrderPriority[];
  category?: WorkOrderCategory[];
  propertyId?: string;
  assignedTo?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

export interface WorkOrderStats {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  onHold: number;
  assigned: number;
  emergency: number;
  overdue: number;
  draft?: number;
}

export const CATEGORY_CONFIG: Record<
  WorkOrderCategory,
  { label: string; icon: string; color: string; description: string }
> = {
  general: {
    label: "General",
    icon: "🛠️",
    color: "bg-gray-100 text-gray-800",
    description: "General upkeep and non-specialized work orders",
  },
  maintenance: {
    label: "Maintenance",
    icon: "⚙️",
    color: "bg-blue-100 text-blue-800",
    description: "Preventive or scheduled maintenance tasks",
  },
  plumbing: {
    label: "Plumbing",
    icon: "🚿",
    color: "bg-cyan-100 text-cyan-800",
    description: "Pipes, fixtures, and water related issues",
  },
  electrical: {
    label: "Electrical",
    icon: "⚡",
    color: "bg-yellow-100 text-yellow-800",
    description: "Power outages, wiring, and electrical systems",
  },
  hvac: {
    label: "HVAC",
    icon: "❄️",
    color: "bg-indigo-100 text-indigo-800",
    description: "Heating, ventilation, and air conditioning",
  },
  cleaning: {
    label: "Cleaning",
    icon: "🧹",
    color: "bg-green-100 text-green-800",
    description: "Housekeeping and janitorial services",
  },
  security: {
    label: "Security",
    icon: "🛡️",
    color: "bg-purple-100 text-purple-800",
    description: "Security systems and access control",
  },
  landscaping: {
    label: "Landscaping",
    icon: "🌿",
    color: "bg-emerald-100 text-emerald-800",
    description: "Gardens, irrigation, and exterior areas",
  },
  inspection: {
    label: "Inspection",
    icon: "📋",
    color: "bg-orange-100 text-orange-800",
    description: "Routine or compliance inspections",
  },
  it: {
    label: "IT & Networking",
    icon: "💻",
    color: "bg-pink-100 text-pink-800",
    description: "Technology, networking, and smart building systems",
  },
  other: {
    label: "Other",
    icon: "📦",
    color: "bg-gray-100 text-gray-800",
    description: "Tasks that do not fit the predefined categories",
  },
};

export const PRIORITY_CONFIG: Record<
  WorkOrderPriority,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  low: {
    label: "Low",
    icon: "🟢",
    color: "text-emerald-800",
    bgColor: "bg-emerald-100",
    description: "Non-urgent tasks with flexible scheduling",
  },
  medium: {
    label: "Medium",
    icon: "🔵",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    description: "Standard work orders requiring timely completion",
  },
  high: {
    label: "High",
    icon: "🟠",
    color: "text-orange-800",
    bgColor: "bg-orange-100",
    description: "Important issues affecting operations",
  },
  urgent: {
    label: "Urgent",
    icon: "🔴",
    color: "text-red-800",
    bgColor: "bg-red-100",
    description: "Needs immediate attention to prevent escalation",
  },
  emergency: {
    label: "Emergency",
    icon: "🚨",
    color: "text-red-900",
    bgColor: "bg-red-200",
    description: "Critical issues impacting safety or critical services",
  },
};

export const STATUS_CONFIG: Record<
  WorkOrderStatus,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  draft: {
    label: "Draft",
    icon: "📝",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    description: "Work order drafted but not yet submitted",
  },
  submitted: {
    label: "Submitted",
    icon: "📨",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    description: "Submitted for review or approval",
  },
  approved: {
    label: "Approved",
    icon: "✅",
    color: "text-emerald-800",
    bgColor: "bg-emerald-100",
    description: "Approved and ready for scheduling",
  },
  open: {
    label: "Open",
    icon: "🔓",
    color: "text-orange-800",
    bgColor: "bg-orange-100",
    description: "Awaiting assignment or planning",
  },
  assigned: {
    label: "Assigned",
    icon: "👤",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
    description: "Assigned to a technician or team",
  },
  in_progress: {
    label: "In Progress",
    icon: "⚡",
    color: "text-blue-900",
    bgColor: "bg-blue-100",
    description: "Work is currently in progress",
  },
  on_hold: {
    label: "On Hold",
    icon: "⏸️",
    color: "text-amber-800",
    bgColor: "bg-amber-100",
    description: "Paused awaiting parts, approvals, or dependencies",
  },
  completed: {
    label: "Completed",
    icon: "✅",
    color: "text-green-800",
    bgColor: "bg-green-100",
    description: "Work has been completed and pending closure",
  },
  cancelled: {
    label: "Cancelled",
    icon: "❌",
    color: "text-red-800",
    bgColor: "bg-red-100",
    description: "Work order cancelled and will not proceed",
  },
  closed: {
    label: "Closed",
    icon: "🔒",
    color: "text-gray-800",
    bgColor: "bg-gray-100",
    description: "Work order closed and archived",
  },
};

export const SORT_OPTIONS = [
  { value: "created_at", label: "Newest first" },
  { value: "updated_at", label: "Recently updated" },
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due date" },
  { value: "status", label: "Status" },
  { value: "work_order_number", label: "Work order number" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const VIEW_MODES = ["grid", "table", "kanban"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

// Additional types can be added here as needed
