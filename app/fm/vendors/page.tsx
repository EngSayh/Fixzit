"use client";
import { logger } from "@/lib/logger";

import { useState, type ReactNode } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardGridSkeleton } from "@/components/skeletons";
import {
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";

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
  };
  rating?: number;
  responseTime?: string;
}

const fetcher = async (url: string, orgId: string) => {
  try {
    const res = await fetch(url, {
      headers: { "x-tenant-id": orgId },
    });
    if (!res.ok) throw new Error("Failed to fetch vendors");
    return res.json();
  } catch (_error) {
    logger.error("FM vendors fetch error", _error as Error);
    throw _error;
  }
};

export default function FMVendorsPage() {
  return (
    <FmGuardedPage moduleId="vendor-management">
      {({ orgId, supportBanner }) => (
        <FMVendorsContent orgId={orgId} supportBanner={supportBanner} />
      )}
    </FmGuardedPage>
  );
}

type FMVendorsContentProps = {
  orgId: string;
  supportBanner?: ReactNode | null;
};

function FMVendorsContent({ orgId, supportBanner }: FMVendorsContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch vendors with pagination
  const vendorsUrl = orgId
    ? `/api/vendors?page=${page}&limit=${limit}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""}${statusFilter !== "all" ? `&status=${statusFilter.toUpperCase()}` : ""}`
    : null;

  const {
    data: vendorsData,
    error,
    isLoading,
    mutate,
  } = useSWR(
    vendorsUrl ? [vendorsUrl, orgId] : null,
    ([url, id]: [string, string]) => fetcher(url, id),
  );

  const vendors = vendorsData?.items || [];
  const totalPages = vendorsData?.pages || 1;

  const handleDelete = async (vendorId: string, vendorName: string) => {
    const confirmMessage = t(
      "vendors.confirmDelete",
      'Delete vendor "{{name}}"? This cannot be undone.',
    ).replace("{{name}}", vendorName);
    if (!confirm(confirmMessage)) return;
    if (!orgId)
      return toast.error(
        t("fm.errors.orgIdMissing", "Organization ID missing from session"),
      );

    const toastId = toast.loading(
      t("vendors.toast.deleting", "Deleting vendor..."),
    );
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "DELETE",
        headers: { "x-tenant-id": orgId },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        const message =
          error &&
          typeof error === "object" &&
          "error" in error &&
          typeof error.error === "string"
            ? error.error
            : t("vendors.errors.deleteUnknown", "Failed to delete vendor");
        throw new Error(message);
      }
      toast.success(
        t("vendors.toast.deleteSuccess", "Vendor deleted successfully"),
        { id: toastId },
      );
      mutate();
    } catch (_error) {
      const message =
        _error instanceof Error
          ? _error.message
          : t("vendors.errors.deleteUnknown", "Failed to delete vendor");
      toast.error(
        t(
          "vendors.toast.deleteFailed",
          "Failed to delete vendor: {{message}}",
        ).replace("{{message}}", message),
        { id: toastId },
      );
    }
  };

  const exportVendorsCsv = () => {
    if (vendors.length === 0) {
      return toast(t("vendors.export.empty", "No vendors to export"));
    }
    const rows = [
      ["Code", "Name", "Type", "Status", "Contact", "Email", "Location"],
    ];
    for (const v of vendors) {
      rows.push([
        v.code || "",
        v.name || "",
        v.type || "",
        v.status || "",
        v.contact?.primary?.phone || v.contact?.primary?.mobile || "",
        v.contact?.primary?.email || "",
        v.contact?.address?.city || "",
      ]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendors-export-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      t("vendors.export.success", "Exported {{count}} vendors").replace(
        "{{count}}",
        String(vendors.length),
      ),
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-success/10 text-success-foreground border-success/20";
      case "pending":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "suspended":
        return "bg-warning/10 text-warning border-warning";
      case "rejected":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "blacklisted":
        return "bg-destructive text-destructive-foreground border-destructive";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  // Loading state
  if (!session) return <CardGridSkeleton count={6} />;
  if (isLoading) return <CardGridSkeleton count={6} />;
  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        {t(
          "vendors.errors.loadFailed",
          "Failed to load vendors: {{message}}",
        ).replace("{{message}}", error.message)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="vendors" />
      {supportBanner}
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("nav.vendors", "Vendors")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "vendors.description",
            "Manage your vendor relationships and service providers",
          )}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search", "Search vendors...")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset to page 1 on search
              }}
              className="ps-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("common.all", "All Status")}
              </SelectItem>
              <SelectItem value="approved">
                {t("status.approved", "Approved")}
              </SelectItem>
              <SelectItem value="pending">
                {t("status.pending", "Pending")}
              </SelectItem>
              <SelectItem value="suspended">
                {t("status.suspended", "Suspended")}
              </SelectItem>
              <SelectItem value="rejected">
                {t("status.rejected", "Rejected")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportVendorsCsv}>
            <Download className="h-4 w-4 me-2" />
            {t("common.export", "Export")}
          </Button>
        </div>
      </div>

      {/* Vendors List */}
      {vendors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              {t("vendors.empty.description", "No vendors found")}
            </p>
            <Button onClick={() => router.push("/fm/marketplace/vendors/new")}>
              {t("vendors.empty.cta", "Add First Vendor")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {vendors.map((vendor: Vendor) => (
              <Card
                key={vendor.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {vendor.name}
                        </h3>
                        <Badge className={getStatusColor(vendor.status)}>
                          {vendor.status}
                        </Badge>
                        {vendor.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-warning text-warning" />
                            <span className="text-sm font-medium">
                              {vendor.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {t("vendor.type", "Type")}:
                          </span>
                          {vendor.type?.replace("_", " ")}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {vendor.contact?.address?.city || "N/A"},{" "}
                          {vendor.contact?.address?.region || ""}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {vendor.contact?.primary?.phone ||
                            vendor.contact?.primary?.mobile ||
                            "N/A"}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {vendor.contact?.primary?.email || "N/A"}
                        </div>
                      </div>

                      {vendor.business?.specializations &&
                        vendor.business.specializations.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-foreground mb-2">
                              {t("vendor.services", "Services")}:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {vendor.business.specializations.map(
                                (service) => (
                                  <Badge key={service} variant="outline">
                                    {service}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {t("vendor.code", "Code")}:
                          </span>
                          {vendor.code}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/fm/vendors/${vendor.id}`)
                            }
                          >
                            <Eye className="h-4 w-4 me-2" />
                            {t("common.view", "View")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/fm/vendors/${vendor.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4 me-2" />
                            {t("common.edit", "Edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(vendor.id, vendor.name)}
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t("common.delete", "Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({vendorsData?.total || 0} total
                vendors)
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
