/**
 * LeadCard - Property lead display card
 * 
 * @description Displays a property inquiry lead with contact info,
 * property details, status, and quick actions.
 * 
 * @features
 * - Lead status indicator
 * - Priority badge
 * - Contact information
 * - Property thumbnail
 * - Quick call/WhatsApp actions
 * - Assignment indicator
 * - RTL-first layout
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Phone,
  MessageCircle,
  Mail,
  Clock,
  User,
  Home,
  MoreVertical,
  Star,
  type LucideIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// TYPES
// ============================================================================

export type LeadStatus = "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";
export type LeadPriority = "high" | "medium" | "low";
export type LeadSource = "website" | "whatsapp" | "phone" | "referral" | "walk_in";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  property_id?: string;
  property_title?: string;
  property_image?: string;
  assigned_to?: {
    id: string;
    name: string;
    avatar?: string;
  };
  notes?: string;
  reminder_at?: string;
  created_at: string;
  last_activity_at?: string;
}

export interface LeadCardProps {
  /** Lead data */
  lead: Lead;
  /** Current locale */
  locale?: "ar" | "en";
  /** Callback when call is clicked */
  onCall?: (lead: Lead) => void;
  /** Callback when WhatsApp is clicked */
  onWhatsApp?: (lead: Lead) => void;
  /** Callback when email is clicked */
  onEmail?: (lead: Lead) => void;
  /** Callback when view details is clicked */
  onViewDetails?: (lead: Lead) => void;
  /** Callback when status change is requested */
  onStatusChange?: (lead: Lead, newStatus: LeadStatus) => void;
  /** Callback when assign is clicked */
  onAssign?: (lead: Lead) => void;
  /** Card variant */
  variant?: "default" | "compact" | "expanded";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<LeadStatus, {
  label: string;
  labelAr: string;
  color: string;
  bgColor: string;
}> = {
  new: {
    label: "New",
    labelAr: "جديد",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  contacted: {
    label: "Contacted",
    labelAr: "تم التواصل",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  qualified: {
    label: "Qualified",
    labelAr: "مؤهل",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  negotiating: {
    label: "Negotiating",
    labelAr: "قيد التفاوض",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  won: {
    label: "Won",
    labelAr: "نجح",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  lost: {
    label: "Lost",
    labelAr: "خسر",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

const PRIORITY_CONFIG: Record<LeadPriority, {
  label: string;
  labelAr: string;
  color: string;
}> = {
  high: { label: "High", labelAr: "عالي", color: "text-red-600" },
  medium: { label: "Medium", labelAr: "متوسط", color: "text-amber-600" },
  low: { label: "Low", labelAr: "منخفض", color: "text-green-600" },
};

const SOURCE_ICONS: Record<LeadSource, LucideIcon> = {
  website: Home,
  whatsapp: MessageCircle,
  phone: Phone,
  referral: User,
  walk_in: User,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadCard({
  lead,
  locale = "ar",
  onCall,
  onWhatsApp,
  onEmail,
  onViewDetails,
  onStatusChange,
  onAssign,
  variant = "default",
  className,
}: LeadCardProps) {
  const isRTL = locale === "ar";
  const statusConfig = STATUS_CONFIG[lead.status];
  const _priorityConfig = PRIORITY_CONFIG[lead.priority];
  const SourceIcon: LucideIcon = SOURCE_ICONS[lead.source] ?? User;

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return isRTL ? `قبل ${diffMins} دقيقة` : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return isRTL ? `قبل ${diffHours} ساعة` : `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return isRTL ? `قبل ${diffDays} يوم` : `${diffDays}d ago`;
    }
    return date.toLocaleDateString(isRTL ? "ar-SA" : "en-SA");
  };

  const hasReminder = lead.reminder_at && new Date(lead.reminder_at) > new Date();

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border hover:bg-neutral-50 transition-colors cursor-pointer",
          className
        )}
        dir={isRTL ? "rtl" : "ltr"}
        onClick={() => onViewDetails?.(lead)}
      >
        {/* Status dot */}
        <div className={cn("w-2 h-2 rounded-full", statusConfig.bgColor.replace("bg-", "bg-").replace("-100", "-500"))} />
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-800 truncate">{lead.name}</p>
          <p className="text-sm text-neutral-500 truncate">{lead.phone}</p>
        </div>

        {/* Priority star */}
        {lead.priority === "high" && (
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        )}

        {/* Time */}
        <span className="text-xs text-neutral-400">
          {formatDate(lead.created_at)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-white overflow-hidden",
        lead.priority === "high" && "border-l-4 border-l-red-500 rtl:border-l-0 rtl:border-r-4 rtl:border-r-red-500",
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="p-4 pb-3 flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Avatar/Source */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            statusConfig.bgColor
          )}>
            <SourceIcon className={`w-5 h-5 ${statusConfig.color}`} />
          </div>

          {/* Name & Contact */}
          <div>
            <h3 className="font-semibold text-neutral-800">{lead.name}</h3>
            <p className="text-sm text-neutral-500">{lead.phone}</p>
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? "start" : "end"} className="bg-muted border-input">
            <DropdownMenuItem onClick={() => onViewDetails?.(lead)}>
              {isRTL ? "عرض التفاصيل" : "View Details"}
            </DropdownMenuItem>
            {onAssign && (
              <DropdownMenuItem onClick={() => onAssign(lead)}>
                {isRTL ? "تعيين إلى" : "Assign to"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onStatusChange && (
              <>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  status !== lead.status && (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange(lead, status as LeadStatus)}
                    >
                      <span className={cn("w-2 h-2 rounded-full me-2", config.bgColor.replace("-100", "-500"))} />
                      {isRTL ? config.labelAr : config.label}
                    </DropdownMenuItem>
                  )
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Property (if linked) */}
      {lead.property_title && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50">
            {lead.property_image && (
              <img
                src={lead.property_image}
                alt=""
                className="w-12 h-12 rounded object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-700 truncate">
                {lead.property_title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes preview */}
      {lead.notes && variant === "expanded" && (
        <div className="px-4 pb-3">
          <p className="text-sm text-neutral-600 line-clamp-2">{lead.notes}</p>
        </div>
      )}

      {/* Meta & Status */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn(statusConfig.bgColor, statusConfig.color)}>
            {isRTL ? statusConfig.labelAr : statusConfig.label}
          </Badge>
          {lead.priority === "high" && (
            <Badge variant="destructive" className="text-xs">
              {isRTL ? "أولوية عالية" : "High Priority"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <Clock className="w-3 h-3" />
          {formatDate(lead.created_at)}
        </div>
      </div>

      {/* Reminder indicator */}
      {hasReminder && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {isRTL ? "تذكير:" : "Reminder:"}{" "}
              {new Date(lead.reminder_at!).toLocaleDateString(isRTL ? "ar-SA" : "en-SA")}
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex border-t">
        {onCall && (
          <button
            onClick={() => onCall(lead)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors border-e"
          >
            <Phone className="w-4 h-4" />
            {isRTL ? "اتصال" : "Call"}
          </button>
        )}
        {onWhatsApp && (
          <button
            onClick={() => onWhatsApp(lead)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors border-e"
          >
            <MessageCircle className="w-4 h-4" />
            {isRTL ? "واتساب" : "WhatsApp"}
          </button>
        )}
        {onEmail && lead.email && (
          <button
            onClick={() => onEmail(lead)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {isRTL ? "بريد" : "Email"}
          </button>
        )}
      </div>
    </div>
  );
}

export default LeadCard;
