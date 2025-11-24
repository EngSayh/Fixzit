"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { BarChart, HardDriveDownload, Layers, Workflow } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type AssetFormValues = {
  name: string;
  category: string;
  serial: string;
  value: string;
  propertyId: string;
  notes: string;
  attachments: FileList | null;
};

export default function CreateAssetRecordPage() {
  const { hasOrgContext, guard, supportBanner, orgId } = useFmOrgGuard({
    moduleId: "administration",
  });
  const auto = useAutoTranslator("fm.administration.assets.new");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    defaultValues: {
      name: "",
      category: "",
      serial: "",
      value: "",
      propertyId: "",
      notes: "",
      attachments: null,
    },
  });
  const watchedAttachments = watch("attachments");

  const onSubmit = async (values: AssetFormValues) => {
    setServerError(null);
    let toastId: string | number | undefined;
    try {
      const numericValue = values.value ? Number(values.value) : undefined;
      if (numericValue !== undefined && Number.isNaN(numericValue)) {
        throw new Error(
          auto("Book value must be a valid number.", "form.validation.value"),
        );
      }

      const payload = {
        name: values.name,
        type: (values.category || "OTHER").toUpperCase(),
        category: values.category || "GENERAL",
        serialNumber: values.serial || undefined,
        propertyId: values.propertyId,
        status: "ACTIVE",
        tags: ["administration", "asset"],
        description: values.notes,
        ownership: {
          type: "OWNED",
        },
        details: {
          totalArea: undefined,
        },
        bookValue: numericValue,
      };

      const formData = new FormData();
      formData.append("metadata", JSON.stringify(payload));

      const attachments = values.attachments
        ? Array.from(values.attachments)
        : [];
      const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
      attachments.forEach((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            auto(
              "Attachments must be smaller than 15MB.",
              "form.validation.attachmentSize",
            ),
          );
        }
        formData.append("attachments", file);
      });

      toastId = toast.loading(auto("Saving asset...", "toast.saving"));
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          ...(orgId && { "x-tenant-id": orgId }),
        } as HeadersInit,
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to create asset");
      }

      toast.success(auto("Asset saved successfully.", "form.success"), {
        id: toastId,
      });
      reset();
    } catch (_error) {
      const message =
        _error instanceof Error ? _error.message : "Request failed";
      setServerError(message);
      if (toastId) {
        toast.error(message, { id: toastId });
      } else {
        toast.error(message);
      }
    }
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="administration" />
      {supportBanner}

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {auto("Asset register", "header.kicker")}
        </p>
        <h1 className="text-3xl font-semibold">
          {auto("Add a new enterprise asset", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Feed both finance and facilities teams with the metadata they need.",
            "header.subtitle",
          )}
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        encType="multipart/form-data"
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>{auto("Asset profile", "form.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{auto("Asset name", "form.name")}</Label>
                <Input
                  id="name"
                  placeholder="Backup Generator - HQ"
                  disabled={isSubmitting}
                  {...register("name", {
                    required: auto(
                      "Asset name is required.",
                      "form.validation.name",
                    ),
                  })}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">
                  {auto("Category", "form.category")}
                </Label>
                <Input
                  id="category"
                  placeholder="Power / MEP"
                  disabled={isSubmitting}
                  {...register("category")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial">
                  {auto("Serial / asset tag", "form.serial")}
                </Label>
                <Input
                  id="serial"
                  disabled={isSubmitting}
                  {...register("serial")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">
                  {auto("Book value (SAR)", "form.value")}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  disabled={isSubmitting}
                  {...register("value", {
                    validate: (val) =>
                      !val ||
                      !Number.isNaN(Number(val)) ||
                      auto("Value must be a number.", "form.validation.value"),
                  })}
                />
                {errors.value && (
                  <p className="text-sm text-destructive">
                    {errors.value.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="property">
                  {auto("Property ID", "form.property")}
                </Label>
                <Input
                  id="property"
                  placeholder="PROP-123"
                  disabled={isSubmitting}
                  {...register("propertyId", {
                    required: auto(
                      "Property ID is required.",
                      "form.validation.property",
                    ),
                  })}
                />
                {errors.propertyId && (
                  <p className="text-sm text-destructive">
                    {errors.propertyId.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">
                {auto("Notes & maintenance context", "form.notes")}
              </Label>
              <Textarea
                id="notes"
                rows={4}
                disabled={isSubmitting}
                placeholder={auto(
                  "Include warranty, vendor, and contact info",
                  "form.notes.placeholder",
                )}
                {...register("notes")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachments">
                {auto("Attach documents", "form.attach")}
              </Label>
              <Input
                id="attachments"
                type="file"
                multiple
                disabled={isSubmitting}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                {...register("attachments")}
              />
              {watchedAttachments && watchedAttachments.length > 0 && (
                <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                  {Array.from(watchedAttachments).map((file) => (
                    <li key={`${file.name}-${file.lastModified}`}>
                      {file.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                <HardDriveDownload className="me-2 h-4 w-4" />
                {auto("Upload from drive", "form.attach.drive")}
              </Button>
              <Button type="button" disabled={isSubmitting}>
                <Layers className="me-2 h-4 w-4" />
                {auto("Add to asset hierarchy", "form.hierarchy")}
              </Button>
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 border-dashed border-border/70">
          <CardHeader>
            <CardTitle>{auto("Analytics hooks", "analytics.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <BarChart className="h-4 w-4" />
              {auto("Feed depreciation schedules", "analytics.depreciation")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <Workflow className="h-4 w-4" />
              {auto("Sync to CMMS work orders", "analytics.cmms")}
            </span>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => reset()}
          >
            {auto("Reset form", "actions.reset")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? auto("Submitting...", "actions.submitting")
              : auto("Save asset", "actions.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
