"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CardGridSkeleton } from "@/components/skeletons";
import { logger } from "@/lib/logger";
import {
  FileText,
  Plus,
  Search,
  DollarSign,
  MapPin,
  Eye,
  Send,
  Clock,
  Shield,
  Package,
  Wrench,
  Building2,
} from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";
import { FormOfflineBanner } from "@/components/common/FormOfflineBanner";

interface RFQItem {
  id: string;
  code?: string;
  title?: string;
  type?: string;
  status?: string;
  category?: string;
  description?: string;
  deadline?: string;
  budget?: {
    estimated?: number;
    currency?: string;
  };
  bidding?: {
    anonymous?: boolean;
    targetBids?: number;
  };
  compliance?: {
    cityBounded?: boolean;
  };
  timeline?: {
    bidDeadline?: string;
  };
  location?: {
    city?: string;
    radius?: number;
  };
  bids?: unknown[];
}

export default function RFQsPage() {
  return (
    <FmGuardedPage moduleId="rfqs">
      {({ orgId, supportBanner }) => (
        <RFQsContent orgId={orgId} supportBanner={supportBanner} />
      )}
    </FmGuardedPage>
  );
}

type RFQsContentProps = {
  orgId: string;
  supportBanner?: ReactNode | null;
};

function RFQsContent({ orgId, supportBanner }: RFQsContentProps) {
  const auto = useAutoTranslator("fm.rfqs");
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const fetcher = (url: string) =>
    fetch(url, {
      headers: { "x-tenant-id": orgId },
    })
      .then((r) => r.json())
      .catch((error) => {
        logger.error("FM RFQs fetch error", error);
        throw error;
      });

  const { data, mutate, isLoading } = useSWR(
    orgId
      ? [
          `/api/rfqs?search=${encodeURIComponent(search)}&status=${statusFilter}&category=${categoryFilter}`,
          orgId,
        ]
      : null,
    ([url]) => fetcher(url),
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  const rfqs = data?.items || [];

  return (
    <div className="space-y-6">
      {supportBanner}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {auto("RFQs & Bidding", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "City-bounded procurement with 3-bid collection",
              "header.subtitle",
            )}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700" aria-label={auto("Create a new RFQ", "actions.newRfqLabel")}>
              <Plus className="w-4 h-4 me-2" />
              {auto("New RFQ", "actions.newRfq")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {auto("Create Request for Quotation", "actions.createTitle")}
              </DialogTitle>
            </DialogHeader>
            <CreateRFQForm
              orgId={orgId}
              onCreated={() => {
                mutate();
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={auto(
                    "Search RFQs...",
                    "filters.searchPlaceholder",
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder={auto("Status", "filters.status")}
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              <SelectItem value="">
                {auto("All Status", "filters.allStatus")}
              </SelectItem>
              <SelectItem value="DRAFT">
                {auto("Draft", "filters.statusOptions.draft")}
              </SelectItem>
              <SelectItem value="PUBLISHED">
                {auto("Published", "filters.statusOptions.published")}
              </SelectItem>
              <SelectItem value="BIDDING">
                {auto("Bidding", "filters.statusOptions.bidding")}
              </SelectItem>
              <SelectItem value="CLOSED">
                {auto("Closed", "filters.statusOptions.closed")}
              </SelectItem>
              <SelectItem value="AWARDED">
                {auto("Awarded", "filters.statusOptions.awarded")}
              </SelectItem>
              <SelectItem value="CANCELLED">
                {auto("Cancelled", "filters.statusOptions.cancelled")}
              </SelectItem>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder={auto("Category", "filters.category")}
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              <SelectItem value="">
                {auto("All Categories", "filters.allCategories")}
              </SelectItem>
              <SelectItem value="Construction">
                {auto("Construction", "filters.categories.construction")}
              </SelectItem>
              <SelectItem value="Maintenance">
                {auto("Maintenance", "filters.categories.maintenance")}
              </SelectItem>
              <SelectItem value="Supplies">
                {auto("Supplies", "filters.categories.supplies")}
              </SelectItem>
              <SelectItem value="Services">
                {auto("Services", "filters.categories.services")}
              </SelectItem>
              <SelectItem value="Equipment">
                {auto("Equipment", "filters.categories.equipment")}
              </SelectItem>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* RFQs Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(rfqs as RFQItem[]).map((rfq) => (
              <RFQCard
                key={rfq.id}
                rfq={rfq}
                orgId={orgId}
                onUpdated={mutate}
              />
            ))}
          </div>

          {/* Empty State */}
          {rfqs.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {auto("No RFQs Found", "empty.title")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {auto(
                    "Get started by creating your first request for quotation.",
                    "empty.subtitle",
                  )}
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                  aria-label={auto("Create your first RFQ", "actions.createLabel")}
                >
                  <Plus className="w-4 h-4 me-2" />
                  {auto("Create RFQ", "actions.create")}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function RFQCard({
  rfq,
  orgId,
  onUpdated,
}: {
  rfq: RFQItem;
  orgId?: string;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const auto = useAutoTranslator("fm.rfqs.card");

  const handlePublish = async () => {
    if (
      !confirm(
        auto(
          'Publish RFQ "{{title}}"? This will make it visible to vendors.',
          "confirm.publish",
        ).replace("{{title}}", rfq.title || ""),
      )
    ) {
      return;
    }
    if (!orgId)
      return toast.error(auto("Organization ID missing", "errors.noOrg"));

    const toastId = toast.loading(
      auto("Publishing RFQ...", "toast.publishing"),
    );
    try {
      const res = await fetch(`/api/rfqs/${rfq.id}/publish`, {
        method: "POST",
        headers: { "x-tenant-id": orgId, "Content-Type": "application/json" },
      });
      if (!res.ok)
        throw new Error(auto("Failed to publish RFQ", "toast.publishFailed"));
      toast.success(
        auto("RFQ published successfully", "toast.publishSuccess"),
        { id: toastId },
      );
      onUpdated();
    } catch (_error) {
      toast.error(
        _error instanceof Error
          ? _error.message
          : auto("Failed to publish RFQ", "toast.publishFailed"),
        { id: toastId },
      );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "construction":
        return <Building2 className="w-5 h-5" />;
      case "maintenance":
        return <Wrench className="w-5 h-5" />;
      case "supplies":
        return <Package className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-muted text-foreground";
      case "PUBLISHED":
        return "bg-primary/10 text-primary-foreground";
      case "BIDDING":
        return "bg-warning/10 text-warning-foreground";
      case "CLOSED":
        return "bg-warning/10 text-warning";
      case "AWARDED":
        return "bg-success/10 text-success-foreground";
      case "CANCELLED":
        return "bg-destructive/10 text-destructive-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const daysRemaining = rfq.timeline?.bidDeadline
    ? Math.ceil(
        (new Date(rfq.timeline.bidDeadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const bidProgress = rfq.bidding?.targetBids
    ? Math.min(((rfq.bids?.length || 0) / rfq.bidding.targetBids) * 100, 100)
    : 0;

  const statusKey = (rfq.status || "").toLowerCase();
  const statusLabel = statusKey
    ? auto(statusKey.replace("_", " "), `status.${statusKey}`)
    : auto("Unknown", "status.unknown");

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(rfq.category || "")}
            <div className="flex-1">
              <CardTitle className="text-lg">{rfq.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{rfq.code}</p>
            </div>
          </div>
          <Badge className={getStatusColor(rfq.status || "")}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {rfq.description}
        </p>

        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 me-1" />
          <span>{rfq.location?.city}</span>
          {rfq.location?.radius && (
            <span className="ms-2">
              •{" "}
              {auto("{{radius}}km radius", "location.radius").replace(
                "{{radius}}",
                String(rfq.location.radius),
              )}
            </span>
          )}
        </div>

        {/* Bid Collection Progress */}
        {rfq.status === "BIDDING" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {auto("Bid Collection", "progress.title")}
              </span>
              <span className="font-medium">
                {auto("{{current}}/{{target}} bids", "progress.count")
                  .replace("{{current}}", String(rfq.bids?.length || 0))
                  .replace("{{target}}", String(rfq.bidding?.targetBids || 3))}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all"
                style={{ width: `${bidProgress}%` }}
              />
            </div>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="w-4 h-4 me-1" />
              {auto("Deadline", "card.deadline")}
            </div>
            <p className="font-medium mt-1">
              {daysRemaining !== null
                ? daysRemaining > 0
                  ? auto("{{days}} days left", "card.daysLeft").replace(
                      "{{days}}",
                      String(daysRemaining),
                    )
                  : auto("Closed", "card.closed")
                : auto("No deadline", "card.noDeadline")}
            </p>
          </div>
          <div>
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="w-4 h-4 me-1" />
              {auto("Budget", "card.budget")}
            </div>
            <p className="font-medium mt-1">
              {(rfq.budget?.estimated?.toLocaleString() ||
                auto("N/A", "card.notAvailable")) +
                " " +
                (rfq.budget?.currency || "SAR")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3 text-sm">
            {rfq.bidding?.anonymous && (
              <div className="flex items-center text-muted-foreground">
                <Shield className="w-4 h-4 me-1" />
                <span>{auto("Anonymous", "badges.anonymous")}</span>
              </div>
            )}
            {rfq.compliance?.cityBounded && (
              <div className="flex items-center text-muted-foreground">
                <MapPin className="w-4 h-4 me-1" />
                <span>{auto("City Only", "badges.cityOnly")}</span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/fm/rfqs/${rfq.id}`)}
              aria-label={auto("View RFQ details", "card.viewLabel")}
            >
              <Eye className="w-4 h-4" />
            </Button>
            {rfq.status === "DRAFT" && (
              <Button variant="ghost" size="sm" onClick={handlePublish} aria-label={auto("Publish RFQ", "card.publishLabel")}>
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateRFQForm({
  onCreated,
  orgId,
}: {
  onCreated: () => void;
  orgId: string;
}) {
  const auto = useAutoTranslator("fm.rfqs.form");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    type: "WORKS",
    location: {
      city: "Riyadh",
      region: "Riyadh",
      address: "",
      radius: 20,
      nationalAddress: "",
    },
    projectId: "",
    specifications: [] as string[],
    timeline: {
      bidDeadline: "", // ✅ HYDRATION FIX: Initialize empty
      startDate: "", // ✅ HYDRATION FIX: Initialize empty
      completionDate: "", // ✅ HYDRATION FIX: Initialize empty
    },
    budget: {
      estimated: 0,
      currency: "SAR",
    },
    requirements: {
      qualifications: [] as string[],
      experience: "",
      insurance: {
        required: true,
        minimum: 1000000,
      },
      licenses: [] as string[],
      references: 3,
    },
    bidding: {
      anonymous: true,
      targetBids: 3,
      bidLeveling: true,
      alternates: false,
      validity: 30,
    },
    compliance: {
      cityBounded: true,
      insuranceRequired: true,
      licenseRequired: true,
      backgroundCheck: false,
    },
    tags: [] as string[],
  });

  // ✅ HYDRATION FIX: Set default dates after client hydration
  useEffect(() => {
    if (!formData.timeline.bidDeadline) {
      setFormData((prev) => ({
        ...prev,
        timeline: {
          ...prev.timeline,
          bidDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          completionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
      }));
    }
  }, [formData.timeline.bidDeadline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error(auto("No organization ID found", "form.errors.noOrg"));
      return;
    }

    const toastId = toast.loading(
      auto("Creating RFQ...", "form.toast.creating"),
    );

    try {
      const response = await fetch("/api/rfqs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(auto("RFQ created successfully", "form.toast.success"), {
          id: toastId,
        });
        onCreated();
      } else {
        const error = await response.json();
        toast.error(
          auto("Failed to create RFQ: {{error}}", "form.toast.failed").replace(
            "{{error}}",
            error.error || auto("Unknown error", "form.toast.unknown"),
          ),
          { id: toastId },
        );
      }
    } catch (_error) {
      logger.error("Error creating RFQ:", _error);
      toast.error(
        auto("Error creating RFQ. Please try again.", "form.toast.error"),
        { id: toastId },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormOfflineBanner formType="rfq" className="mb-2" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("RFQ Title *", "form.labels.title")}
          </label>
          <Input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Category *", "form.labels.category")}
          </label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
            placeholder={auto(
              "Select category",
              "form.placeholders.category",
            )}
            className="w-full bg-muted border-input text-foreground"
          >
            <SelectItem value="Construction">
              {auto("Construction", "form.categories.construction")}
            </SelectItem>
            <SelectItem value="Maintenance">
              {auto("Maintenance", "form.categories.maintenance")}
            </SelectItem>
            <SelectItem value="Supplies">
              {auto("Supplies", "form.categories.supplies")}
            </SelectItem>
            <SelectItem value="Services">
              {auto("Services", "form.categories.services")}
            </SelectItem>
            <SelectItem value="Equipment">
              {auto("Equipment", "form.categories.equipment")}
            </SelectItem>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {auto("Description *", "form.labels.description")}
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("City *", "form.labels.city")}
          </label>
          <Input
            value={formData.location.city}
            onChange={(e) =>
              setFormData({
                ...formData,
                location: { ...formData.location, city: e.target.value },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Service Radius (km)", "form.labels.radius")}
          </label>
          <Input
            type="number"
            value={formData.location.radius}
            onChange={(e) =>
              setFormData({
                ...formData,
                location: {
                  ...formData.location,
                  radius: Number(e.target.value),
                },
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Target Bids", "form.labels.targetBids")}
          </label>
          <Input
            type="number"
            value={formData.bidding.targetBids}
            onChange={(e) =>
              setFormData({
                ...formData,
                bidding: {
                  ...formData.bidding,
                  targetBids: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Bid Deadline *", "form.labels.bidDeadline")}
          </label>
          <Input
            type="date"
            value={formData.timeline.bidDeadline}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeline: { ...formData.timeline, bidDeadline: e.target.value },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Start Date *", "form.labels.startDate")}
          </label>
          <Input
            type="date"
            value={formData.timeline.startDate}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeline: { ...formData.timeline, startDate: e.target.value },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Completion Date *", "form.labels.completionDate")}
          </label>
          <Input
            type="date"
            value={formData.timeline.completionDate}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeline: {
                  ...formData.timeline,
                  completionDate: e.target.value,
                },
              })
            }
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {auto("Estimated Budget *", "form.labels.estimatedBudget")}
        </label>
        <Input
          type="number"
          value={formData.budget.estimated}
          onChange={(e) =>
            setFormData({
              ...formData,
              budget: { ...formData.budget, estimated: Number(e.target.value) },
            })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {auto("Compliance Requirements", "form.labels.compliance")}
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.compliance.cityBounded}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  compliance: {
                    ...formData.compliance,
                    cityBounded: e.target.checked,
                  },
                })
              }
              className="me-2"
            />
            {auto("City Bounded", "form.compliance.cityBounded")}
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.compliance.insuranceRequired}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  compliance: {
                    ...formData.compliance,
                    insuranceRequired: e.target.checked,
                  },
                })
              }
              className="me-2"
            />
            {auto("Insurance Required", "form.compliance.insurance")}
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.bidding.anonymous}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bidding: { ...formData.bidding, anonymous: e.target.checked },
                })
              }
              className="me-2"
            />
            {auto("Anonymous Bidding", "form.compliance.anonymous")}
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700" aria-label={auto("Submit and create RFQ", "form.actions.submitLabel")}>
          {auto("Create RFQ", "form.actions.submit")}
        </Button>
      </div>
    </form>
  );
}
