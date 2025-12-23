"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "@/components/ui/icons";
import { logger } from "@/lib/logger";

interface LeaveType {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isPaid: boolean;
  annualEntitlementDays?: number;
  createdAt?: string;
}

export default function HrSettingsPage() {
  const { t } = useTranslation();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    isPaid: true,
    annualEntitlementDays: "",
  });

  useEffect(() => {
    void loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    const updating = leaveTypes.length > 0;
    try {
      if (updating) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await fetch("/api/hr/leave-types");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load leave types");
      }
      setLeaveTypes(
        Array.isArray(payload.leaveTypes) ? payload.leaveTypes : [],
      );
    } catch (error) {
      logger.error("Failed to load leave types", { error });
      toast.error(
        t("hr.settings.leaveTypes.error.load", "Unable to load leave types."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error(
        t(
          "hr.settings.leaveTypes.form.validation",
          "Code and name are required.",
        ),
      );
      return;
    }
    setCreating(true);
    const toastId = toast.loading(
      t("hr.settings.leaveTypes.form.creating", "Creating leave type..."),
    );
    try {
      const body = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isPaid: form.isPaid,
        annualEntitlementDays: form.annualEntitlementDays
          ? Number(form.annualEntitlementDays)
          : undefined,
      };
      const response = await fetch("/api/hr/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create leave type");
      }
      toast.success(
        t("hr.settings.leaveTypes.form.success", "Leave type created"),
        { id: toastId },
      );
      setForm({
        code: "",
        name: "",
        description: "",
        isPaid: true,
        annualEntitlementDays: "",
      });
      await loadLeaveTypes();
    } catch (error) {
      logger.error("Failed to create leave type", { error });
      toast.error(
        t("hr.settings.leaveTypes.form.error", "Unable to create leave type."),
        {
          id: toastId,
        },
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            {t("hr.settings.title", "HR Settings")}
          </h2>
          <p className="text-muted-foreground">
            {t(
              "hr.settings.subtitle",
              "Manage leave types, quotas, and approval defaults.",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void loadLeaveTypes()}
          disabled={refreshing}
        >
          {refreshing && <Loader2 className="h-4 w-4 animate-spin me-2" />}
          {!refreshing && <RefreshCw className="h-4 w-4 me-2" />}{" "}
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("hr.settings.leaveTypes.title", "Leave Types")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mb-2 text-primary" />
                <p>{t("common.loading", "Loading...")}</p>
              </div>
            ) : leaveTypes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {t(
                  "hr.settings.leaveTypes.empty",
                  "No leave types configured yet.",
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {leaveTypes.map((type) => (
                  <div
                    key={type._id}
                    className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {type.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {type.description || t("common.notAvailable", "N/A")}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("hr.settings.leaveTypes.code", "Code")}: {type.code}
                        {typeof type.annualEntitlementDays === "number" && (
                          <span className="ms-3">
                            {t(
                              "hr.settings.leaveTypes.entitlement",
                              "Entitlement",
                            )}
                            : {type.annualEntitlementDays}{" "}
                            {t("hr.leave.form.leaveTypeDaysSuffix", "d")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <Badge variant={type.isPaid ? "default" : "secondary"}>
                        {type.isPaid
                          ? t("hr.settings.leaveTypes.badge.paid", "Paid")
                          : t("hr.settings.leaveTypes.badge.unpaid", "Unpaid")}
                      </Badge>
                      {type.createdAt ? (
                        <p className="text-xs text-muted-foreground">
                          {t("hr.settings.leaveTypes.created", "Created")}:{" "}
                          {new Date(type.createdAt).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("hr.settings.leaveTypes.form.title", "Add Leave Type")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="code">
                  {t("hr.settings.leaveTypes.form.code", "Code")}
                </Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="ANNUAL"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">
                  {t("hr.settings.leaveTypes.form.name", "Name")}
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t(
                    "hr.settings.leaveTypes.form.namePlaceholder",
                    "Annual leave",
                  )}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">
                  {t(
                    "hr.settings.leaveTypes.form.description",
                    "Description (optional)",
                  )}
                </Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="entitlement">
                  {t(
                    "hr.settings.leaveTypes.form.entitlement",
                    "Annual entitlement (days)",
                  )}
                </Label>
                <Input
                  id="entitlement"
                  type="number"
                  min={0}
                  value={form.annualEntitlementDays}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      annualEntitlementDays: e.target.value,
                    }))
                  }
                  placeholder="30"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <p className="font-medium text-sm">
                    {t("hr.settings.leaveTypes.form.isPaid", "Paid leave")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "hr.settings.leaveTypes.form.isPaidHelper",
                      "Paid leave deducts from payroll balances.",
                    )}
                  </p>
                </div>
                <Switch
                  checked={form.isPaid}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isPaid: checked }))
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t("hr.settings.leaveTypes.form.submit", "Save leave type")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
