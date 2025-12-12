import {
  WorkOrder as FMWorkOrder,
  WorkOrderCategory,
  WorkOrderComment,
  WorkOrderFilters as FMWorkOrderFilters,
  WorkOrderFormData as FMWorkOrderFormData,
  WorkOrderPhoto,
  WorkOrderPriority,
  WorkOrderProperty,
  WorkOrderStats as FMWorkOrderStats,
  WorkOrderStatus,
  WorkOrderTimeline,
  WorkOrderUnit,
  WorkOrderUser,
} from "@/types/fm/work-order";

export type WorkOrder = Pick<
  FMWorkOrder,
  | "id"
  | "_id"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "category"
  | "property"
  | "unit"
  | "requester"
  | "assignee"
  | "timeline"
  | "comments"
  | "photos"
  | "dueDate"
  | "estimatedCost"
  | "actualCost"
  | "completedAt"
  | "workOrderNumber"
  | "woNumber"
> & {
  /** @deprecated Use requester instead */
  creator?: FMWorkOrder["requester"];
  estimatedHours?: number;
  actualHours?: number;
};

export type WorkOrderFormData = Pick<
  FMWorkOrderFormData,
  | "title"
  | "description"
  | "category"
  | "priority"
  | "propertyId"
  | "unitId"
  | "assigneeId"
  | "estimatedCost"
  | "attachments"
> & {
  dueDate?: string;
  estimatedHours?: number;
  photos?: File[];
  tags?: string[];
};

export type WorkOrderFilters = FMWorkOrderFilters & {
  tags?: string[];
};

export type WorkOrderStats = FMWorkOrderStats & {
  draft?: number;
};

export type {
  WorkOrderStatus,
  WorkOrderPriority,
  WorkOrderCategory,
  WorkOrderUser,
  WorkOrderPhoto,
  WorkOrderComment,
  WorkOrderTimeline,
  WorkOrderProperty,
  WorkOrderUnit,
};

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
