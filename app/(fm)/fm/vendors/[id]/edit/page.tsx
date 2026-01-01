"use client";
import { logger } from "@/lib/logger";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

import { useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { CardGridSkeleton } from "@/components/skeletons";
import { ChevronLeft, Save } from "@/components/ui/icons";
import Link from "next/link";
import {
  UpdateVendorSchema,
  type UpdateVendorInput,
} from "@/lib/validations/forms";
import { z } from "zod";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

// ✅ FIX 1: Helper to convert empty strings to undefined for optional fields
const getOptionalString = (value: string | File | null): string | undefined => {
  const str = typeof value === "string" ? value : null;
  return str && str.trim() ? str : undefined;
};

// ✅ FIX 2: Safe date formatter to prevent crashes on invalid dates
const toInputDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return ""; // Check for invalid date
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

interface Vendor {
  id: string;
  code: string;
  name: string;
  type: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" | "BLACKLISTED";
  contact?: {
    primary?: {
      name?: string;
      email?: string;
      phone?: string;
      mobile?: string;
    };
    address?: {
      street?: string;
      city?: string;
      region?: string;
      postalCode?: string;
    };
  };
  business?: {
    specializations?: string[];
    crNumber?: string;
    taxNumber?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    insuranceExpiry?: string;
    description?: string;
  };
}

export default function EditVendorPage() {
  const params = useParams();
  const vendorId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { data: session } = useSession();
  const auto = useAutoTranslator("fm.vendors.edit");
  const { hasOrgContext, orgId, guard, supportBanner } = useFmOrgGuard({
    moduleId: "vendors",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ FIX 3: Handle HTTP errors properly to prevent crash on 404/500
  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(
        new Error(auto("No organization ID", "errors.noOrg")),
      );
    }
    return fetch(url, {
      headers: { "x-tenant-id": orgId },
    })
      .then(async (r) => {
        if (!r.ok) {
          const errorData = await r
            .json()
            .catch(() => ({ message: "Failed to fetch vendor" }));
          throw new Error(errorData.message || `Error ${r.status}`);
        }
        return r.json();
      })
      .catch((error) => {
        logger.error("FM vendor edit fetch error", error);
        throw error;
      });
  };

  const {
    data: vendor,
    error,
    isLoading,
  } = useSWR<Vendor>(
    orgId && vendorId ? `/api/vendors/${vendorId}` : null,
    fetcher,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId)
      return toast.error(auto("Organization ID missing", "errors.noOrg"));
    if (!vendorId)
      return toast.error(auto("Vendor ID missing", "errors.noVendor"));

    setIsSaving(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const specializationsStr = getOptionalString(
      formData.get("specializations"),
    );
    const specializations = specializationsStr
      ? specializationsStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    // ✅ FIX 4: Use getOptionalString for all optional fields to match validation schema
    const data: Partial<UpdateVendorInput> = {
      id: vendorId,
      name: formData.get("name")?.toString() || "", // Required field
      code: getOptionalString(formData.get("code")),
      type: getOptionalString(formData.get("type")),
      status: formData.get("status")?.toString() as
        | "PENDING"
        | "APPROVED"
        | "SUSPENDED"
        | "REJECTED"
        | "BLACKLISTED",
      contact: {
        primary: {
          name: formData.get("contactName")?.toString() || "", // Required field
          email: getOptionalString(formData.get("contactEmail")),
          phone: getOptionalString(formData.get("contactPhone")),
          mobile: getOptionalString(formData.get("contactMobile")),
        },
        address: {
          street: getOptionalString(formData.get("addressStreet")),
          city: getOptionalString(formData.get("addressCity")),
          region: getOptionalString(formData.get("addressRegion")),
          postalCode: getOptionalString(formData.get("addressPostalCode")),
        },
      },
      business: {
        specializations,
        crNumber: getOptionalString(formData.get("crNumber")),
        taxNumber: getOptionalString(formData.get("taxNumber")),
        licenseNumber: getOptionalString(formData.get("licenseNumber")),
        licenseExpiry: getOptionalString(formData.get("licenseExpiry")),
        insuranceExpiry: getOptionalString(formData.get("insuranceExpiry")),
        description: getOptionalString(formData.get("businessDescription")),
      },
    };

    try {
      // Validate with Zod
      UpdateVendorSchema.parse(data);

      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update vendor");
      }

      toast.success(auto("Vendor updated successfully", "toast.success"));
      router.push(`/fm/vendors/${vendorId}`);
    } catch (_error) {
      if (_error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        _error.issues.forEach((err: z.ZodIssue) => {
          if (err.path.length > 0) {
            fieldErrors[err.path.join(".")] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error(auto("Please fix validation errors", "toast.validation"));
      } else {
        toast.error(
          _error instanceof Error
            ? _error.message
            : auto("Failed to update vendor", "toast.error"),
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) return <CardGridSkeleton count={1} />;
  if (!hasOrgContext || !orgId) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="vendors" />
        {supportBanner}
        {guard}
      </div>
    );
  }
  if (!vendorId) {
    return (
      <div className="text-destructive">
        {auto("Vendor ID missing", "errors.noVendor")}
      </div>
    );
  }
  if (error)
    return (
      <div className="text-destructive">
        {auto("Failed to load vendor", "errors.loadFailed")}
      </div>
    );
  if (isLoading || !vendor) return <CardGridSkeleton count={1} />;

  return (
    <div className="p-6 space-y-6">
      <ModuleViewTabs moduleId="vendors" />
      {supportBanner}
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={vendorId ? `/fm/vendors/${vendorId}` : "/fm/vendors"}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={auto("Back to vendor details", "common.back")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {auto("Edit Vendor", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto("Update vendor information", "header.subtitle")}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{auto("Basic Information", "card.basic")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Vendor Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {auto("Vendor Name *", "form.labels.name")}
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={vendor.name}
                placeholder={auto(
                  "Enter vendor name",
                  "form.placeholders.name",
                )}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Vendor Code */}
            <div className="space-y-2">
              <Label htmlFor="code">
                {auto("Vendor Code *", "form.labels.code")}
              </Label>
              <Input
                id="code"
                name="code"
                defaultValue={vendor.code}
                placeholder={auto("e.g., VEN-001", "form.placeholders.code")}
                required
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

            {/* Type & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">
                  {auto("Type *", "form.labels.type")}
                </Label>
                <Input
                  id="type"
                  name="type"
                  defaultValue={vendor.type}
                  placeholder={auto(
                    "e.g., Contractor, Supplier",
                    "form.placeholders.type",
                  )}
                  required
                />
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">
                  {auto("Status *", "form.labels.status")}
                </Label>
                <Select name="status" defaultValue={vendor.status}>
                  <SelectContent>
                    <SelectItem value="PENDING">
                      {auto("Pending", "form.status.pending")}
                    </SelectItem>
                    <SelectItem value="APPROVED">
                      {auto("Approved", "form.status.approved")}
                    </SelectItem>
                    <SelectItem value="SUSPENDED">
                      {auto("Suspended", "form.status.suspended")}
                    </SelectItem>
                    <SelectItem value="REJECTED">
                      {auto("Rejected", "form.status.rejected")}
                    </SelectItem>
                    <SelectItem value="BLACKLISTED">
                      {auto("Blacklisted", "form.status.blacklisted")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{auto("Contact Information", "card.contact")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName">
                {auto("Contact Person Name", "form.labels.contactName")}
              </Label>
              <Input
                id="contactName"
                name="contactName"
                defaultValue={vendor.contact?.primary?.name || ""}
                placeholder={auto(
                  "Enter contact person name",
                  "form.placeholders.contactName",
                )}
              />
              {errors["contact.primary.name"] && (
                <p className="text-sm text-destructive">
                  {errors["contact.primary.name"]}
                </p>
              )}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">{auto("Email", "form.labels.email")}</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  defaultValue={vendor.contact?.primary?.email || ""}
                  placeholder="email@example.com"
                />
                {errors["contact.primary.email"] && (
                  <p className="text-sm text-destructive">
                    {errors["contact.primary.email"]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">
                  {auto("Phone", "form.labels.contactPhone")}
                </Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  defaultValue={vendor.contact?.primary?.phone || ""}
                  placeholder={auto(
                    "+966XXXXXXXXX",
                    "form.placeholders.contactPhone",
                  )}
                />
                {errors["contact.primary.phone"] && (
                  <p className="text-sm text-destructive">
                    {errors["contact.primary.phone"]}
                  </p>
                )}
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="contactMobile">
                {auto("Mobile", "form.labels.contactMobile")}
              </Label>
              <Input
                id="contactMobile"
                name="contactMobile"
                defaultValue={vendor.contact?.primary?.mobile || ""}
                placeholder={auto(
                  "+966XXXXXXXXX",
                  "form.placeholders.contactMobile",
                )}
              />
              {errors["contact.primary.mobile"] && (
                <p className="text-sm text-destructive">
                  {errors["contact.primary.mobile"]}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {auto("Address", "form.section.address")}
              </h3>

              <div className="space-y-2">
                <Label htmlFor="addressStreet">
                  {auto("Street", "form.labels.street")}
                </Label>
                <Input
                  id="addressStreet"
                  name="addressStreet"
                  defaultValue={vendor.contact?.address?.street || ""}
                  placeholder={auto(
                    "Street address",
                    "form.placeholders.street",
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressCity">
                    {auto("City", "form.labels.city")}
                  </Label>
                  <Input
                    id="addressCity"
                    name="addressCity"
                    defaultValue={vendor.contact?.address?.city || ""}
                    placeholder={auto("City", "form.placeholders.city")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressRegion">
                    {auto("Region", "form.labels.region")}
                  </Label>
                  <Input
                    id="addressRegion"
                    name="addressRegion"
                    defaultValue={vendor.contact?.address?.region || ""}
                    placeholder={auto("Region", "form.placeholders.region")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressPostalCode">
                    {auto("Postal Code", "form.labels.postalCode")}
                  </Label>
                  <Input
                    id="addressPostalCode"
                    name="addressPostalCode"
                    defaultValue={vendor.contact?.address?.postalCode || ""}
                    placeholder={auto("12345", "form.placeholders.postalCode")}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {auto("Business Information", "card.business")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Specializations */}
            <div className="space-y-2">
              <Label htmlFor="specializations">
                {auto("Specializations", "form.labels.specializations")}
              </Label>
              <Input
                id="specializations"
                name="specializations"
                defaultValue={
                  vendor.business?.specializations?.join(", ") || ""
                }
                placeholder={auto(
                  "e.g., Electrical, Plumbing, HVAC (comma-separated)",
                  "form.placeholders.specializations",
                )}
              />
              <p className="text-sm text-muted-foreground">
                {auto(
                  "Enter multiple specializations separated by commas",
                  "form.helpers.specializations",
                )}
              </p>
            </div>

            {/* CR Number & Tax Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="crNumber">
                  {auto("CR Number", "form.labels.crNumber")}
                </Label>
                <Input
                  id="crNumber"
                  name="crNumber"
                  defaultValue={vendor.business?.crNumber || ""}
                  placeholder={auto(
                    "Commercial Registration Number",
                    "form.placeholders.crNumber",
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxNumber">
                  {auto("Tax Number", "form.labels.taxNumber")}
                </Label>
                <Input
                  id="taxNumber"
                  name="taxNumber"
                  defaultValue={vendor.business?.taxNumber || ""}
                  placeholder={auto(
                    "Tax Registration Number",
                    "form.placeholders.taxNumber",
                  )}
                />
              </div>
            </div>

            {/* License */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">
                  {auto("License Number", "form.labels.licenseNumber")}
                </Label>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  defaultValue={vendor.business?.licenseNumber || ""}
                  placeholder={auto(
                    "License Number",
                    "form.placeholders.licenseNumber",
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseExpiry">
                  {auto("License Expiry", "form.labels.licenseExpiry")}
                </Label>
                <Input
                  id="licenseExpiry"
                  name="licenseExpiry"
                  type="date"
                  defaultValue={toInputDate(vendor.business?.licenseExpiry)}
                />
              </div>
            </div>

            {/* Insurance Expiry */}
            <div className="space-y-2">
              <Label htmlFor="insuranceExpiry">
                {auto("Insurance Expiry", "form.labels.insuranceExpiry")}
              </Label>
              <Input
                id="insuranceExpiry"
                name="insuranceExpiry"
                type="date"
                defaultValue={toInputDate(vendor.business?.insuranceExpiry)}
              />
            </div>

            {/* Business Description */}
            <div className="space-y-2">
              <Label htmlFor="businessDescription">
                {auto(
                  "Business Description",
                  "form.labels.businessDescription",
                )}
              </Label>
              <Textarea
                id="businessDescription"
                name="businessDescription"
                defaultValue={vendor.business?.description || ""}
                placeholder={auto(
                  "Describe the vendor's business, services, and capabilities...",
                  "form.placeholders.businessDescription",
                )}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href={vendorId ? `/fm/vendors/${vendorId}` : "/fm/vendors"}>
            <Button type="button" variant="outline" aria-label={auto("Cancel", "actions.cancelAria")}>
              {auto("Cancel", "actions.cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving} aria-label={auto("Save Changes", "actions.saveAria")}>
            <Save className="h-4 w-4 me-2" />
            {isSaving
              ? auto("Saving...", "actions.saving")
              : auto("Save Changes", "actions.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
