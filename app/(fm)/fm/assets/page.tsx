"use client";

import { useState, type ReactNode } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CardGridSkeleton } from "@/components/skeletons";
import {
  Building2,
  Plus,
  Search,
  Settings,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "@/components/ui/icons";
import ClientDate from "@/components/ClientDate";

import { logger } from "@/lib/logger";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import {
  ASSET_TYPES,
  ASSET_STATUSES,
  ASSET_CRITICALITY_LEVELS,
  ASSET_TYPE_LABELS,
  ASSET_STATUS_LABELS,
  ASSET_CRITICALITY_LABELS,
} from "@/lib/constants/asset-constants";
import {
  CreateAssetSchema,
  UpdateAssetSchema,
  createAssetFormDefaults,
  type CreateAssetInput,
  type UpdateAssetInput,
} from "@/lib/validations/asset-schemas";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";
interface MaintenanceRecord {
  date?: string;
}

interface AssetItem {
  id: string;
  name?: string;
  code?: string;
  type?: string;
  category?: string;
  status?: string;
  criticality?: string;
  location?: {
    building?: string;
    floor?: string;
    room?: string;
  };
  maintenanceHistory?: MaintenanceRecord[];
}

export default function AssetsPage() {
  return (
    <FmGuardedPage moduleId="assets">
      {({ orgId, supportBanner }) => (
        <AssetsPageContent orgId={orgId} supportBanner={supportBanner} />
      )}
    </FmGuardedPage>
  );
}

type AssetsPageContentProps = {
  orgId: string;
  supportBanner?: ReactNode;
};

function AssetsPageContent({ orgId, supportBanner }: AssetsPageContentProps) {
  const { data: session } = useSession();
  const auto = useAutoTranslator("fm.assets");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Fetcher with dynamic tenant ID from session
  const fetcher = (url: string) => {
    if (!orgId) return Promise.reject(new Error("No organization ID"));
    return fetch(url, {
      headers: { "x-tenant-id": orgId },
    })
      .then((r) => r.json())
      .catch((error) => {
        logger.error("FM assets fetch error", error);
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId
      ? [
          `/api/assets?search=${encodeURIComponent(search)}&type=${typeFilter}&status=${statusFilter}`,
          orgId,
        ]
      : null,
    ([url]) => fetcher(url),
  );

  const assets = data?.items || [];

  // Show loading state if no session yet
  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  return (
    <div className="space-y-6">
      {supportBanner}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {auto("Asset Management", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Equipment registry and predictive maintenance",
              "header.subtitle",
            )}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" aria-label={auto("Add a new asset", "actions.newAssetLabel")}>
              <Plus className="w-4 h-4 me-2" />
              {auto("New Asset", "actions.newAsset")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{auto("Add New Asset", "dialog.title")}</DialogTitle>
            </DialogHeader>
            <CreateAssetForm
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
                    "Search assets...",
                    "filters.searchPlaceholder",
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
              placeholder={auto("Asset Type", "filters.type")}
              className="w-48"
            >
              <SelectTrigger>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  {auto("All Types", "filters.allTypes")}
                </SelectItem>
                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {auto(ASSET_TYPE_LABELS[type].en, ASSET_TYPE_LABELS[type].tKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder={auto("Status", "filters.status")}
              className="w-48"
            >
              <SelectTrigger>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  {auto("All Status", "filters.allStatus")}
                </SelectItem>
                {ASSET_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {auto(ASSET_STATUS_LABELS[status].en, ASSET_STATUS_LABELS[status].tKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(assets as AssetItem[]).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                orgId={orgId}
                onUpdated={mutate}
              />
            ))}
          </div>

          {/* Empty State */}
          {assets.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {auto("No Assets Found", "empty.title")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {auto(
                    "Get started by adding your first asset to the registry.",
                    "empty.subtitle",
                  )}
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                  aria-label={auto("Add your first asset", "actions.addAssetLabel")}
                >
                  <Plus className="w-4 h-4 me-2" />
                  {auto("Add Asset", "actions.addAsset")}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  onUpdated,
  orgId,
}: {
  asset: AssetItem;
  onUpdated: () => void;
  orgId: string;
}) {
  const auto = useAutoTranslator("fm.assets");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleView = () => {
    setViewDialogOpen(true);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleDelete = async () => {
    const toastId = toast.loading(
      auto("Deleting {{name}}...", "toast.deleting").replace(
        "{{name}}",
        asset.name ?? "",
      ),
    );

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": orgId },
      });

      if (response.ok) {
        toast.success(
          auto("Asset deleted successfully", "toast.deleteSuccess"),
          { id: toastId },
        );
        onUpdated();
      } else {
        const error = await response.json();
        toast.error(
          auto(
            "Failed to delete asset: {{error}}",
            "toast.deleteFailed",
          ).replace(
            "{{error}}",
            error.error || auto("Unknown error", "toast.unknown"),
          ),
          { id: toastId },
        );
      }
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      logger.error("Delete error:", error);
      toast.error(
        auto("Error deleting asset. Please try again.", "toast.deleteError"),
        { id: toastId },
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "MAINTENANCE":
        return <AlertTriangle className="w-4 h-4 text-accent" />;
      case "OUT_OF_SERVICE":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Settings className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-success/10 text-success-foreground";
      case "MAINTENANCE":
        return "bg-warning/10 text-warning-foreground";
      case "OUT_OF_SERVICE":
        return "bg-destructive/10 text-destructive-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{asset.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{asset.code}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(asset.status || "")}
            <Badge className={getStatusColor(asset.status || "")}>
              {asset.status && ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS]
                ? auto(
                    ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS].en,
                    ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS].tKey
                  )
                : ""}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {auto("Type:", "card.type")}
            </span>
            <span className="text-sm font-medium">{asset.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {auto("Category:", "card.category")}
            </span>
            <span className="text-sm font-medium">{asset.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {auto("Criticality:", "card.criticality")}
            </span>
            <Badge
              variant="outline"
              className={
                asset.criticality === "CRITICAL"
                  ? "border-destructive/30 text-destructive"
                  : asset.criticality === "HIGH"
                    ? "border-warning text-warning"
                    : asset.criticality === "MEDIUM"
                      ? "border-warning text-warning"
                      : "border-border text-foreground"
              }
            >
              {asset.criticality}
            </Badge>
          </div>
          {asset.location && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {auto("Location:", "card.location")}
              </span>
              <span className="text-sm font-medium">
                {asset.location.building && `${asset.location.building}`}
                {asset.location.floor &&
                  `, ${auto("Floor {{floor}}", "card.floor").replace(
                    "{{floor}}",
                    asset.location.floor ?? "",
                  )}`}
                {asset.location.room &&
                  `, ${auto("Room {{room}}", "card.room").replace(
                    "{{room}}",
                    asset.location.room ?? "",
                  )}`}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {auto("Last Maintenance:", "card.lastMaintenance")}{" "}
            {asset.maintenanceHistory &&
            asset.maintenanceHistory.length > 0 &&
            asset.maintenanceHistory[asset.maintenanceHistory.length - 1]
              .date ? (
              <ClientDate
                date={
                  asset.maintenanceHistory[asset.maintenanceHistory.length - 1]
                    .date as string
                }
                format="date-only"
              />
            ) : (
              auto("Never", "card.never")
            )}
          </span>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleView}
              aria-label={auto("View asset {{name}}", "card.actions.viewLabel").replace("{{name}}", asset.name || "")}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleEdit}
              aria-label={auto("Edit asset {{name}}", "card.actions.editLabel").replace("{{name}}", asset.name || "")}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label={auto("Delete asset {{name}}", "card.actions.deleteLabel").replace("{{name}}", asset.name || "")}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{asset.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{auto("Code", "card.view.code")}</p>
                  <p className="font-medium">{asset.code || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{auto("Type", "card.view.type")}</p>
                  <p className="font-medium">{asset.type || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{auto("Category", "card.view.category")}</p>
                  <p className="font-medium">{asset.category || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{auto("Status", "card.view.status")}</p>
                  <Badge className={getStatusColor(asset.status || "")}>
                    {asset.status && ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS]
                      ? auto(
                          ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS].en,
                          ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS].tKey
                        )
                      : "-"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{auto("Criticality", "card.view.criticality")}</p>
                  <p className="font-medium">{asset.criticality || "-"}</p>
                </div>
                {asset.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">{auto("Location", "card.view.location")}</p>
                    <p className="font-medium">
                      {asset.location.building}{asset.location.floor ? `, ${auto("Floor {{floor}}", "view.floor").replace("{{floor}}", asset.location.floor)}` : ""}{asset.location.room ? `, ${auto("Room {{room}}", "view.room").replace("{{room}}", asset.location.room)}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{auto("Edit Asset", "card.edit.title")}</DialogTitle>
            </DialogHeader>
            <EditAssetForm
              asset={asset}
              orgId={orgId}
              onUpdated={() => {
                onUpdated();
                setEditDialogOpen(false);
              }}
              onCancel={() => setEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function CreateAssetForm({
  onCreated,
  orgId,
}: {
  onCreated: () => void;
  orgId: string;
}) {
  const auto = useAutoTranslator("fm.assets.form");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateAssetInput>({
    resolver: zodResolver(CreateAssetSchema),
    defaultValues: createAssetFormDefaults,
  });

  const onSubmit = async (data: CreateAssetInput) => {
    const toastId = toast.loading(auto("Creating asset...", "loading"));

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(auto("Asset created successfully", "success"), {
          id: toastId,
        });
        reset();
        onCreated();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || auto("Unknown error", "unknown");
        toast.error(
          auto("Failed to create asset: {{error}}", "failed").replace(
            "{{error}}",
            errorMessage,
          ),
          { id: toastId },
        );
      }
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      logger.error("Error creating asset:", error);
      toast.error(auto("Error creating asset. Please try again.", "error"), {
        id: toastId,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            {auto("Asset Name *", "form.labels.name")}
          </label>
          <Input
            id="name"
            {...register("name")}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-1">
            {auto("Type *", "form.labels.type")}
          </label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                placeholder={auto("Select type", "form.placeholders.type")}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectTrigger
                  id="type"
                  aria-invalid={!!errors.type}
                  aria-describedby={errors.type ? "type-error" : undefined}
                >
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {auto(ASSET_TYPE_LABELS[type].en, ASSET_TYPE_LABELS[type].tKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p id="type-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.type.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          {auto("Description", "form.labels.description")}
        </label>
        <Textarea
          id="description"
          {...register("description")}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "description-error" : undefined}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p id="description-error" className="text-sm text-destructive mt-1" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            {auto("Category *", "form.labels.category")}
          </label>
          <Input
            id="category"
            {...register("category")}
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? "category-error" : undefined}
            disabled={isSubmitting}
          />
          {errors.category && (
            <p id="category-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.category.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="propertyId" className="block text-sm font-medium mb-1">
            {auto("Property *", "form.labels.property")}
          </label>
          <Input
            id="propertyId"
            {...register("propertyId")}
            aria-invalid={!!errors.propertyId}
            aria-describedby={errors.propertyId ? "propertyId-error" : undefined}
            disabled={isSubmitting}
          />
          {errors.propertyId && (
            <p id="propertyId-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.propertyId.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="manufacturer" className="block text-sm font-medium mb-1">
            {auto("Manufacturer", "form.labels.manufacturer")}
          </label>
          <Input
            id="manufacturer"
            {...register("manufacturer")}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium mb-1">
            {auto("Model", "form.labels.model")}
          </label>
          <Input
            id="model"
            {...register("model")}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="serialNumber" className="block text-sm font-medium mb-1">
            {auto("Serial Number", "form.labels.serial")}
          </label>
          <Input
            id="serialNumber"
            {...register("serialNumber")}
            aria-invalid={!!errors.serialNumber}
            aria-describedby={errors.serialNumber ? "serial-error" : undefined}
            disabled={isSubmitting}
          />
          {errors.serialNumber && (
            <p id="serial-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.serialNumber.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium mb-1">
          {auto("Status", "form.labels.status")}
        </label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isSubmitting}
              placeholder={auto("Select status", "form.placeholders.status")}
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              <SelectTrigger id="status">
              </SelectTrigger>
              <SelectContent>
                {ASSET_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {auto(ASSET_STATUS_LABELS[status].en, ASSET_STATUS_LABELS[status].tKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <label htmlFor="criticality" className="block text-sm font-medium mb-1">
          {auto("Criticality", "form.labels.criticality")}
        </label>
        <Controller
          name="criticality"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isSubmitting}
              placeholder={auto(
                "Select criticality",
                "form.placeholders.criticality",
              )}
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              <SelectTrigger id="criticality">
              </SelectTrigger>
              <SelectContent>
                {ASSET_CRITICALITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {auto(ASSET_CRITICALITY_LABELS[level].en, ASSET_CRITICALITY_LABELS[level].tKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting} aria-label={auto("Submit new asset form", "form.actions.submitAria")}>
          {isSubmitting ? auto("Creating...", "form.actions.creating") : auto("Create Asset", "form.actions.submit")}
        </Button>
      </div>
    </form>
  );
}

function EditAssetForm({
  asset,
  onUpdated,
  onCancel,
  orgId,
}: {
  asset: AssetItem;
  onUpdated: () => void;
  onCancel: () => void;
  orgId: string;
}) {
  const auto = useAutoTranslator("fm.assets.form");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateAssetInput>({
    resolver: zodResolver(UpdateAssetSchema),
    defaultValues: {
      name: asset.name || "",
      type: (asset.type as UpdateAssetInput["type"]) || "OTHER",
      category: asset.category || "",
      status: (asset.status as UpdateAssetInput["status"]) || "ACTIVE",
      criticality: (asset.criticality as UpdateAssetInput["criticality"]) || "MEDIUM",
    },
  });

  const onSubmit = async (data: UpdateAssetInput) => {
    const toastId = toast.loading(auto("Updating asset...", "edit.loading"));

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(auto("Asset updated successfully", "edit.success"), {
          id: toastId,
        });
        onUpdated();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || auto("Unknown error", "toast.unknown");
        toast.error(
          auto("Failed to update asset: {{error}}", "edit.failed").replace(
            "{{error}}",
            errorMessage,
          ),
          { id: toastId },
        );
      }
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error));
      logger.error("Error updating asset:", error);
      toast.error(auto("Error updating asset. Please try again.", "edit.error"), {
        id: toastId,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="edit-name" className="block text-sm font-medium mb-1">
          {auto("Asset Name *", "form.labels.name")}
        </label>
        <Input
          id="edit-name"
          {...register("name")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "edit-name-error" : undefined}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p id="edit-name-error" className="text-sm text-destructive mt-1" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-type" className="block text-sm font-medium mb-1">
            {auto("Type *", "form.labels.type")}
          </label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                placeholder={auto("Select type", "form.placeholders.type")}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectTrigger
                  id="edit-type"
                  aria-invalid={!!errors.type}
                  aria-describedby={errors.type ? "edit-type-error" : undefined}
                >
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {auto(ASSET_TYPE_LABELS[type].en, ASSET_TYPE_LABELS[type].tKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p id="edit-type-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.type.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="edit-category" className="block text-sm font-medium mb-1">
            {auto("Category *", "form.labels.category")}
          </label>
          <Input
            id="edit-category"
            {...register("category")}
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? "edit-category-error" : undefined}
            disabled={isSubmitting}
          />
          {errors.category && (
            <p id="edit-category-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-status" className="block text-sm font-medium mb-1">
            {auto("Status", "form.labels.status")}
          </label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                placeholder={auto("Select status", "form.placeholders.status")}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectTrigger id="edit-status">
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {auto(ASSET_STATUS_LABELS[status].en, ASSET_STATUS_LABELS[status].tKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label htmlFor="edit-criticality" className="block text-sm font-medium mb-1">
            {auto("Criticality", "form.labels.criticality")}
          </label>
          <Controller
            name="criticality"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
                placeholder={auto("Select criticality", "form.placeholders.criticality")}
                className="w-full sm:w-40 bg-muted border-input text-foreground"
              >
                <SelectTrigger id="edit-criticality">
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CRITICALITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {auto(ASSET_CRITICALITY_LABELS[level].en, ASSET_CRITICALITY_LABELS[level].tKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} aria-label={auto("Cancel editing", "form.actions.cancelAria")}>
          {auto("Cancel", "form.actions.cancel")}
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting} aria-label={auto("Save asset changes", "form.actions.saveAria")}>
          {isSubmitting ? auto("Saving...", "form.actions.saving") : auto("Save Changes", "form.actions.save")}
        </Button>
      </div>
    </form>
  );
}
