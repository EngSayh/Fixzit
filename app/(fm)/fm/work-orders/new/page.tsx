"use client";

import React from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { WorkOrderAttachments } from "@/components/fm/WorkOrderAttachments";
import { useState } from "react";
import type { WorkOrderAttachment } from "@/components/fm/WorkOrderAttachments";
import { WORK_ORDERS_MODULE_ID } from "@/config/navigation/constants";
import { FormOfflineBanner } from "@/components/common/FormOfflineBanner";

export default function NewWorkOrderPage() {
  const { t } = useTranslation();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({
    moduleId: WORK_ORDERS_MODULE_ID,
  });
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([]);
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId={WORK_ORDERS_MODULE_ID} />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.org.supportContext", "Support context: {{name}}", {
            name: supportOrg.name,
          })}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("workOrders.new.title", "New Work Order")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "workOrders.new.subtitle",
              "Create a new work order for maintenance or services",
            )}
          </p>
        </div>

      {/* P118: Offline banner for long-lived form */}
      <FormOfflineBanner
        formType="work-order"
        hasUnsavedChanges={Boolean(title || description || propertyId)}
        draftSavingEnabled={false}
      />
        <div className="flex gap-2">
          <button
            className="btn-primary"
            onClick={async () => {
              setCreating(true);
              setError(null);
              try {
                if (!propertyId || !title) {
                  throw new Error(
                    t(
                      "workOrders.new.requiredFields",
                      "Title and property are required",
                    ),
                  );
                }
                // NOTE: Attachments are NOT sent here. They're uploaded AFTER WO creation
                // via WorkOrderAttachments component which PATCHes the WO once files are uploaded to S3.
                const res = await fetch("/api/work-orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: title || "New Work Order",
                    priority,
                    description: description || undefined,
                    propertyId: propertyId || undefined,
                    unitNumber: unitNumber || undefined,
                    status: "SUBMITTED",
                    // attachments deliberately omitted - uploaded separately after WO exists
                  }),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json?.data?._id) {
                  throw new Error(json?.error || "Failed to create work order");
                }
                setWorkOrderId(json.data._id as string);
                setSuccess(true);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to create work order",
                );
              } finally {
                setCreating(false);
              }
            }}
            disabled={creating || !title || !propertyId}
          >
            {creating
              ? t("common.saving", "Saving...")
              : t("workOrders.board.createWO", "Create Work Order")}
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">{t("common.error", "Error")}</p>
          <p>{error}</p>
        </div>
      )}
      {success && workOrderId && (
        <div className="rounded-lg border border-success bg-success/10 px-4 py-3 text-sm text-success-dark">
          <p className="font-medium">
            {t("workOrders.new.success", "Work order created successfully!")}
          </p>
          <p className="mt-1">
            {t("workOrders.new.woNumber", "Work Order ID:")}{" "}
            <span className="font-mono font-semibold">{workOrderId}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(
              "workOrders.new.uploadHint",
              "You can now upload attachments using the panel on the right.",
            )}
          </p>
        </div>
      )}
      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("workOrders.new.basicInfo", "Basic Information")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("workOrders.title", "Work Order Title")} *
                </label>
                <input
                  type="text"
                  placeholder={t(
                    "workOrders.new.titlePlaceholder",
                    "Enter work order title...",
                  )}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("workOrders.priority", "Priority")} *
                </label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="CRITICAL">
                    {t("workOrders.priority.p1", "P1 - Critical")}
                  </option>
                  <option value="HIGH">
                    {t("workOrders.priority.p2", "P2 - High")}
                  </option>
                  <option value="MEDIUM">
                    {t("workOrders.priority.p3", "P3 - Medium")}
                  </option>
                  <option value="LOW">
                    {t("workOrders.priority.p4", "P4 - Low")}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("workOrders.new.propertyLocation", "Property & Location")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("common.property", "Property")} *
                </label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                >
                  <option value="">
                    {t("common.selectProperty", "Select Property")}
                  </option>
                  <option value="tower-a">Tower A</option>
                  <option value="tower-b">Tower B</option>
                  <option value="villa-9">Villa 9</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("common.location", "Unit/Location")}
                </label>
                <input
                  type="text"
                  placeholder={t(
                    "workOrders.new.locationPlaceholder",
                    "Unit number or specific location...",
                  )}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("common.description", "Description")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("common.description", "Work Description")} *
              </label>
              <textarea
                rows={4}
                placeholder={t(
                  "workOrders.new.descriptionPlaceholder",
                  "Describe the work that needs to be done...",
                )}
                className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t(
                "workOrders.new.assignmentScheduling",
                "Assignment & Scheduling",
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("workOrders.assignTo", "Assign To")}
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="">
                    {t("workOrders.selectTechnician", "Select Technician")}
                  </option>
                  <option value="tech-1">Ahmed Al-Rashid</option>
                  <option value="tech-2">Mohammed Al-Saud</option>
                  <option value="tech-3">Omar Al-Fahad</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("common.dueDate", "Due Date")}
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("workOrders.attachments", "Attachments")}
            </h3>
            <WorkOrderAttachments
              workOrderId={workOrderId ?? undefined}
              onChange={setAttachments}
              draftCreator={async () => {
                if (workOrderId || draftSaving) return workOrderId || undefined;
                setDraftSaving(true);
                setError(null);
                try {
                  const res = await fetch("/api/work-orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: title || "Untitled Work Order",
                      priority,
                      description: description || "Draft work order",
                      propertyId: propertyId || undefined,
                      unitNumber: unitNumber || undefined,
                      status: "DRAFT",
                    }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok || !json?.data?._id) {
                    throw new Error(
                      json?.error || "Failed to save draft work order",
                    );
                  }
                  setWorkOrderId(json.data._id as string);
                  return json.data._id as string;
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to save draft work order",
                  );
                  return undefined;
                } finally {
                  setDraftSaving(false);
                }
              }}
            />
            {attachments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {t(
                  "workOrders.attachmentsCount",
                  "{{count}} attachment(s) ready for submission",
                  {
                    count: attachments.length,
                  },
                )}
              </p>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("workOrders.quickActions", "Quick Actions")}
            </h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-start">
                📋 {t("workOrders.createFromTemplate", "Create from Template")}
              </button>
              <button className="w-full btn-ghost text-start">
                📞 {t("workOrders.emergencyContact", "Emergency Contact")}
              </button>
              <button className="w-full btn-ghost text-start">
                📊 {t("workOrders.costCalculator", "Cost Calculator")}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("workOrders.recentActivity", "Recent Activity")}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[hsl(var(--success)) / 0.2] rounded-full"></div>
                <span className="text-muted-foreground">
                  {t("workOrders.formAutoSaved", "Form auto-saved")}
                </span>
                <span className="text-muted-foreground ms-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary/20 rounded-full"></div>
                <span className="text-muted-foreground">
                  {t("workOrders.propertySelected", "Property selected")}
                </span>
                <span className="text-muted-foreground ms-auto">5m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
