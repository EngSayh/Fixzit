/**
 * LeadTimeline - Lead activity timeline
 * 
 * @description Displays the activity history for a lead including
 * calls, emails, notes, status changes, and reminders.
 * 
 * @features
 * - Activity type icons
 * - Relative time display
 * - User attribution
 * - Add activity action
 * - RTL-first layout
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Phone,
  Mail,
  MessageCircle,
  MessageSquare,
  FileText,
  UserCheck,
  Clock,
  RefreshCw,
  Calendar,
  CheckCircle,
  Plus,
  type LucideIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType = 
  | "call"
  | "email"
  | "whatsapp"
  | "note"
  | "meeting"
  | "status_change"
  | "assignment"
  | "reminder_set"
  | "reminder_completed"
  | "document";

export interface LeadActivity {
  id: string;
  type: ActivityType;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  metadata?: Record<string, unknown>;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  created_at: string;
}

export interface LeadTimelineProps {
  /** Lead ID */
  leadId: string;
  /** List of activities */
  activities: LeadActivity[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback to add new activity */
  onAddActivity?: () => void;
  /** Current locale */
  locale?: "ar" | "en";
  /** Custom class name */
  className?: string;
  /** Max items to show (with "show more" option) */
  maxItems?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}> = {
  call: {
    icon: Phone,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  email: {
    icon: Mail,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  whatsapp: {
    icon: MessageCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  note: {
    icon: FileText,
    color: "text-neutral-600",
    bgColor: "bg-neutral-100",
  },
  meeting: {
    icon: Calendar,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  status_change: {
    icon: RefreshCw,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  assignment: {
    icon: UserCheck,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  reminder_set: {
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  reminder_completed: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  document: {
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadTimeline({
  leadId: _leadId,
  activities,
  isLoading = false,
  onAddActivity,
  locale = "ar",
  className,
  maxItems = 10,
}: LeadTimelineProps) {
  const isRTL = locale === "ar";
  const [showAll, setShowAll] = React.useState(false);

  const visibleActivities = showAll ? activities : activities.slice(0, maxItems);
  const hasMore = activities.length > maxItems;

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return isRTL ? "الآن" : "just now";
    }
    if (diffMins < 60) {
      return isRTL ? `قبل ${diffMins} دقيقة` : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return isRTL ? `قبل ${diffHours} ساعة` : `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return isRTL ? `قبل ${diffDays} يوم` : `${diffDays}d ago`;
    }
    return date.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)} dir={isRTL ? "rtl" : "ltr"}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-neutral-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-1/3" />
              <div className="h-3 bg-neutral-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("", className)} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-neutral-800">
          {isRTL ? "سجل النشاط" : "Activity Log"}
        </h3>
        {onAddActivity && (
          <Button variant="outline" size="sm" onClick={onAddActivity}>
            <Plus className="w-4 h-4 me-1" />
            {isRTL ? "إضافة" : "Add"}
          </Button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">
            {isRTL ? "لا يوجد نشاط بعد" : "No activity yet"}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className={cn(
            "absolute top-0 bottom-0 w-0.5 bg-neutral-200",
            isRTL ? "right-4" : "left-4"
          )} />

          {/* Activities */}
          <ul className="space-y-4">
            {visibleActivities.map((activity) => {
              const config = ACTIVITY_CONFIG[activity.type] ?? {
                icon: MessageSquare as LucideIcon,
                color: "text-neutral-600",
                bgColor: "bg-neutral-100",
              };
              const IconComp = config.icon;
              const title = isRTL && activity.title_ar ? activity.title_ar : activity.title;
              const description = isRTL && activity.description_ar ? activity.description_ar : activity.description;

              return (
                <li key={activity.id} className="relative flex gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 w-8 h-8 rounded-full flex items-center justify-center",
                    config.bgColor
                  )}>
                    <IconComp className={`w-4 h-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-neutral-800">{title}</p>
                      <span className="text-xs text-neutral-400 whitespace-nowrap">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>

                    {description && (
                      <p className="text-sm text-neutral-600 mt-1">{description}</p>
                    )}

                    {/* User attribution */}
                    <div className="flex items-center gap-2 mt-2">
                      {activity.user.avatar ? (
                        <img
                          src={activity.user.avatar}
                          alt={activity.user.name}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-neutral-600">
                            {activity.user.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-neutral-500">
                        {activity.user.name}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Show more */}
          {hasMore && !showAll && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
              >
                {isRTL
                  ? `عرض ${activities.length - maxItems} المزيد`
                  : `Show ${activities.length - maxItems} more`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LeadTimeline;
