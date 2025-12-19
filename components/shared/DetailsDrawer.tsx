/**
 * Details Drawer - Enterprise P1
 * Reusable template for row details with tabs
 * 
 * ✅ Slide-in from right
 * ✅ Tabs: Overview, Activity, Documents, History
 * ✅ Close/navigate actions
 * ✅ Responsive width (40% desktop, 90% mobile)
 */
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, ExternalLink, FileText, Activity, Folder, Clock } from "lucide-react";

type Tab = "overview" | "activity" | "documents" | "history";

export interface DetailsDrawerProps<T = unknown> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  record: T | null;
  onNavigate?: (id: string) => void;
  children?: React.ReactNode;
  tabs?: {
    id: Tab;
    label: string;
    icon: React.ReactNode;
    content: React.ReactNode;
  }[];
  actions?: React.ReactNode;
}

export function DetailsDrawer<T extends { id: string }>({
  open,
  onClose,
  title,
  subtitle,
  record,
  onNavigate,
  children,
  tabs,
  actions,
}: DetailsDrawerProps<T>) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (!open || !record) return null;

  const defaultTabs = [
    {
      id: "overview" as Tab,
      label: "Overview",
      icon: <FileText className="w-4 h-4" />,
      content: children || <div className="p-6 text-muted-foreground">No overview content provided</div>,
    },
    {
      id: "activity" as Tab,
      label: "Activity",
      icon: <Activity className="w-4 h-4" />,
      content: <div className="p-6 text-muted-foreground">Activity log coming soon...</div>,
    },
    {
      id: "documents" as Tab,
      label: "Documents",
      icon: <Folder className="w-4 h-4" />,
      content: <div className="p-6 text-muted-foreground">Documents coming soon...</div>,
    },
    {
      id: "history" as Tab,
      label: "History",
      icon: <Clock className="w-4 h-4" />,
      content: <div className="p-6 text-muted-foreground">Change history coming soon...</div>,
    },
  ];

  const visibleTabs = tabs || defaultTabs;
  const activeContent = visibleTabs.find((t) => t.id === activeTab)?.content;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 end-0 z-50 w-full md:w-[600px] lg:w-[40%] bg-background shadow-xl animate-in slide-in-from-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex-1 min-w-0 me-4">
              <h2 className="text-lg font-semibold truncate">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onNavigate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(record.id)}
                  title="Open in full page"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-0">{activeContent}</div>

        {/* Actions Footer (optional) */}
        {actions && (
          <>
            <Separator className="my-4" />
            <div className="px-6 pb-6 flex gap-2 justify-end">{actions}</div>
          </>
        )}
      </div>
    </>
  );
}

/**
 * Example Usage:
 * 
 * <DetailsDrawer
 *   open={drawerOpen}
 *   onClose={() => setDrawerOpen(false)}
 *   title={record.code}
 *   subtitle={record.title}
 *   record={record}
 *   onNavigate={(id) => router.push(`/fm/work-orders/${id}`)}
 *   actions={
 *     <>
 *       <Button variant="outline">Edit</Button>
 *       <Button>Save Changes</Button>
 *     </>
 *   }
 * >
 *   <div className="p-6 space-y-4">
 *     <div>
 *       <label className="text-sm text-muted-foreground">Status</label>
 *       <Badge>{record.status}</Badge>
 *     </div>
 *     <div>
 *       <label className="text-sm text-muted-foreground">Priority</label>
 *       <Badge>{record.priority}</Badge>
 *     </div>
 *   </div>
 * </DetailsDrawer>
 */
