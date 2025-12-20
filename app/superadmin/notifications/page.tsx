"use client";

/**
 * Superadmin Notifications Management
 * Configure system-wide notifications
 * 
 * @module app/superadmin/notifications/page
 */

import { Bell } from "lucide-react";
import { PlannedFeature } from "@/components/superadmin/PlannedFeature";

export default function SuperadminNotificationsPage() {
  return (
    <PlannedFeature
      title="Notifications"
      description="Configure system-wide notifications and alert settings"
      icon={<Bell className="h-6 w-6" />}
      status="planned"
      plannedRelease="Q1 2026"
      features={[
        "System-wide notification templates",
        "Email, SMS, and push notification channels",
        "Notification scheduling and batching",
        "User preference management",
        "Delivery tracking and analytics",
      ]}
    />
  );
}
