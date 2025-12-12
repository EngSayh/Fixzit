"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { Building, Share } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type AccountFormValues = {
  company: string;
  segment: string;
  revenue: string;
  employees: string;
  notes: string;
};

export default function CreateCrmAccountPage() {
  const { hasOrgContext, guard, supportBanner, orgId } = useFmOrgGuard({
    moduleId: "crm",
  });
  const auto = useAutoTranslator("fm.crm.accounts.new");
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    defaultValues: {
      company: "",
      segment: "",
      revenue: "",
      employees: "",
      notes: "",
    },
  });
  const [shareLoading, setShareLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const onSubmit = async (values: AccountFormValues) => {
    if (!orgId) {
      toast.error(auto("Select an organization first.", "form.orgRequired"));
      return;
    }
    setActionError(null);
    try {
      const response = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify({
          orgId,
          type: "ACCOUNT",
          company: values.company.trim(),
          segment: values.segment.trim(),
          revenue: values.revenue ? Number(values.revenue) : undefined,
          employees: values.employees ? Number(values.employees) : undefined,
          notes: values.notes.trim(),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to create account");
      }
      toast.success(auto("Account captured successfully.", "actions.success"));
      reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setActionError(message);
      toast.error(message);
    }
  };

  const shareWithSuccessTeam = async () => {
    setActionError(null);
    const valid = await trigger();
    if (!valid) {
      setActionError(
        auto(
          "Please resolve validation errors before sharing.",
          "actions.share.validation",
        ),
      );
      return;
    }
    setShareLoading(true);
    try {
      const values = getValues();
      const payload = {
        company: values.company.trim(),
        segment: values.segment.trim(),
        revenue: values.revenue ? Number(values.revenue) : undefined,
        employees: values.employees ? Number(values.employees) : undefined,
        notes: values.notes.trim(),
      };
      if (!orgId) {
        toast.error(auto("Select an organization first.", "form.orgRequired"));
        setShareLoading(false);
        return;
      }
      const response = await fetch("/api/crm/accounts/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body?.error ??
            auto("Unable to share account.", "actions.share.error"),
        );
      }
      toast.success(
        auto("Shared with the success team.", "actions.share.success"),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Unable to share account.", "actions.share.error");
      setActionError(message);
      toast.error(message);
    } finally {
      setShareLoading(false);
    }
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="crm" />
      {supportBanner}

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {auto("Accounts", "header.kicker")}
        </p>
        <h1 className="text-3xl font-semibold">
          {auto("Add a strategic account", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Designed for key-account managers to capture structured data fast.",
            "header.subtitle",
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{auto("Company profile", "form.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {auto("Company name", "form.name")}
                </Label>
                <Input
                  id="name"
                  placeholder="New Horizons Development"
                  disabled={isSubmitting || shareLoading}
                  {...register("company", {
                    required: auto(
                      "Company name is required.",
                      "form.validation",
                    ),
                  })}
                />
                {errors.company && (
                  <p className="text-sm text-destructive">
                    {errors.company.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment">
                  {auto("Segment", "form.segment")}
                </Label>
                <Input
                  id="segment"
                  placeholder="Enterprise / Mid-market / SMB"
                  disabled={isSubmitting || shareLoading}
                  {...register("segment")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annual">
                  {auto("Annual revenue (SAR)", "form.revenue")}
                </Label>
                <Input
                  id="annual"
                  type="number"
                  placeholder="12500000"
                  min="0"
                  disabled={isSubmitting || shareLoading}
                  {...register("revenue", {
                    validate: (value) =>
                      !value ||
                      Number(value) >= 0 ||
                      auto(
                        "Revenue cannot be negative.",
                        "form.validation.revenue",
                      ),
                  })}
                />
                {errors.revenue && (
                  <p className="text-sm text-destructive">
                    {errors.revenue.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employees">
                  {auto("Employees", "form.employees")}
                </Label>
                <Input
                  id="employees"
                  type="number"
                  placeholder="850"
                  min="0"
                  disabled={isSubmitting || shareLoading}
                  {...register("employees", {
                    validate: (value) =>
                      !value ||
                      Number.isInteger(Number(value)) ||
                      auto(
                        "Use a whole number for employees.",
                        "form.validation.employees",
                      ),
                  })}
                />
                {errors.employees && (
                  <p className="text-sm text-destructive">
                    {errors.employees.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{auto("Notes", "form.notes")}</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder={auto(
                  "Key initiatives, buying cycle, etc.",
                  "form.notes.placeholder",
                )}
                disabled={isSubmitting || shareLoading}
                {...register("notes")}
              />
            </div>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={shareWithSuccessTeam}
            disabled={isSubmitting || shareLoading}
          >
            <Share className="me-2 h-4 w-4" />
            {shareLoading
              ? auto("Sharing...", "actions.share.loading")
              : auto("Share with success team", "actions.share")}
          </Button>
          <Button type="submit" disabled={isSubmitting || shareLoading}>
            <Building className="me-2 h-4 w-4" />
            {isSubmitting
              ? auto("Submitting...", "actions.submitting")
              : auto("Create account", "actions.create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
