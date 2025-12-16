"use client";

import { useState } from "react";
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
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CardGridSkeleton } from "@/components/skeletons";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Home,
  Building,
  Factory,
  Map,
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

import { logger } from "@/lib/logger";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
interface PropertyUnit {
  status?: string;
}

interface PropertyItem {
  id: string;
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  address?: {
    city?: string;
    region?: string;
  };
  details?: {
    totalArea?: number;
    occupancyRate?: number;
  };
  financial?: {
    monthlyRent?: number;
  };
  units?: PropertyUnit[];
}

export default function PropertiesPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "properties",
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error("No organization ID"));
    }
    return fetch(url)
      .then((r) => r.json())
      .catch((error) => {
        logger.error("FM properties fetch error", error);
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId
      ? [
          `/api/fm/properties?search=${encodeURIComponent(search)}&type=${typeFilter}`,
          orgId,
        ]
      : null,
    ([url]) => fetcher(url),
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  const properties = data?.items || [];

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="properties" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.properties.support.activeOrg", "Support context: {{name}}", {
            name: supportOrg.name,
          })}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t("fm.properties.title", "Property Management")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "fm.properties.subtitle",
              "Real estate portfolio and tenant management",
            )}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-success hover:bg-success/90">
              <Plus className="w-4 h-4 me-2" />
              {t("fm.properties.newProperty", "New Property")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {t("fm.properties.addProperty", "Add New Property")}
              </DialogTitle>
            </DialogHeader>
            <CreatePropertyForm
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
                  placeholder={t(
                    "fm.properties.searchProperties",
                    "Search properties...",
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
              placeholder={t("fm.properties.propertyType", "Property Type")}
              className="w-48"
            >
              <SelectContent>
                <SelectItem value="">
                  {t("fm.properties.allTypes", "All Types")}
                </SelectItem>
                <SelectItem value="RESIDENTIAL">
                  {t("fm.properties.residential", "Residential")}
                </SelectItem>
                <SelectItem value="COMMERCIAL">
                  {t("fm.properties.commercial", "Commercial")}
                </SelectItem>
                <SelectItem value="INDUSTRIAL">
                  {t("fm.properties.industrial", "Industrial")}
                </SelectItem>
                <SelectItem value="MIXED_USE">
                  {t("fm.properties.mixedUse", "Mixed Use")}
                </SelectItem>
                <SelectItem value="LAND">
                  {t("fm.properties.land", "Land")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              {t("fm.properties.viewMap", "View Map")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(properties as PropertyItem[]).map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                orgId={orgId}
                onUpdated={mutate}
              />
            ))}
          </div>

          {/* Empty State */}
          {properties.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t("fm.properties.noProperties", "No Properties Found")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t(
                    "fm.properties.noPropertiesText",
                    "Get started by adding your first property to the portfolio.",
                  )}
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-success hover:bg-success/90"
                >
                  <Plus className="w-4 h-4 me-2" />
                  {t("fm.properties.addProperty", "Add Property")}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function PropertyCard({
  property,
  orgId,
  onUpdated,
}: {
  property: PropertyItem;
  orgId?: string;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleDelete = async () => {
    const confirmMessage = t(
      "fm.properties.confirmDelete",
      'Delete property "{{name}}"? This cannot be undone.',
    ).replace("{{name}}", property.name || "");
    if (!confirm(confirmMessage)) return;
    if (!orgId)
      return toast.error(
        t("fm.errors.orgIdMissing", "Organization ID missing from session"),
      );

    const toastId = toast.loading(
      t("fm.properties.toast.deleting", "Deleting property..."),
    );
    try {
      const res = await fetch(`/api/fm/properties/${property.id}`, {
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
            : t(
                "fm.properties.errors.deleteUnknown",
                "Failed to delete property",
              );
        throw new Error(message);
      }
      toast.success(
        t("fm.properties.toast.deleteSuccess", "Property deleted successfully"),
        { id: toastId },
      );
      onUpdated();
    } catch (_error) {
      const message =
        _error instanceof Error
          ? _error.message
          : t(
              "fm.properties.errors.deleteUnknown",
              "Failed to delete property",
            );
      toast.error(
        t(
          "fm.properties.toast.deleteFailed",
          "Failed to delete property: {{message}}",
        ).replace("{{message}}", message),
        { id: toastId },
      );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "RESIDENTIAL":
        return <Home className="w-5 h-5" />;
      case "COMMERCIAL":
        return <Building className="w-5 h-5" />;
      case "INDUSTRIAL":
        return <Factory className="w-5 h-5" />;
      default:
        return <Building2 className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "RESIDENTIAL":
        return "bg-primary/10 text-primary-foreground";
      case "COMMERCIAL":
        return "bg-success/10 text-success-foreground";
      case "INDUSTRIAL":
        return "bg-warning/10 text-warning";
      case "MIXED_USE":
        return "bg-secondary/10 text-secondary";
      case "LAND":
        return "bg-warning/10 text-warning-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "RESIDENTIAL":
        return t("fm.properties.residential", "Residential");
      case "COMMERCIAL":
        return t("fm.properties.commercial", "Commercial");
      case "INDUSTRIAL":
        return t("fm.properties.industrial", "Industrial");
      case "MIXED_USE":
        return t("fm.properties.mixedUse", "Mixed Use");
      case "LAND":
        return t("fm.properties.land", "Land");
      default:
        return type?.toLowerCase() || "";
    }
  };

  const occupancyRate = property.details?.occupancyRate || 0;
  const totalUnits = property.units?.length || 0;
  const occupiedUnits =
    property.units?.filter((u) => u.status === "OCCUPIED").length || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(property.type || "")}
            <div className="flex-1">
              <CardTitle className="text-lg">{property.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{property.code}</p>
            </div>
          </div>
          <Badge className={getTypeColor(property.type || "")}>
            {getTypeLabel(property.type || "")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 me-1" />
          <span>
            {property.address?.city}, {property.address?.region}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {t("fm.properties.totalArea", "Total Area")}:
            </span>
            <span className="text-sm font-medium">
              {property.details?.totalArea || t("common.na", "N/A")} sqm
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {t("fm.properties.units", "Units")}:
            </span>
            <span className="text-sm font-medium">
              {totalUnits} {t("fm.properties.units", "units")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {t("fm.properties.occupancy", "Occupancy")}:
            </span>
            <span className="text-sm font-medium">{occupancyRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {t("fm.properties.monthlyRent", "Monthly Rent")}:
            </span>
            <span className="text-sm font-medium">
              {property.financial?.monthlyRent?.toLocaleString() ||
                t("common.na", "N/A")}{" "}
              SAR
            </span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {t("fm.properties.status", "Status")}:
            </span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                property.status === "INACTIVE" 
                  ? "bg-destructive/20" 
                  : property.status === "MAINTENANCE" 
                    ? "bg-warning/20"
                    : "bg-success/20"
              }`}></div>
              <span className="text-sm font-medium">
                {property.status 
                  ? t(`fm.properties.status.${property.status.toLowerCase()}`, property.status)
                  : t("fm.properties.active", "Active")}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {t("fm.properties.tenants", "Tenants")}:
            </span>
            <span className="text-sm font-medium">
              {occupiedUnits}/{totalUnits}
            </span>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/fm/properties/${property.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/fm/properties/${property.id}/edit`)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive/90"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CreatePropertyForm({
  onCreated,
  orgId,
}: {
  onCreated: () => void;
  orgId: string;
}) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    subtype: "",
    address: {
      street: "",
      city: "",
      region: "",
      postalCode: "",
      coordinates: { lat: 24.7136, lng: 46.6753 }, // Default to Riyadh
      nationalAddress: "",
      district: "",
    },
    details: {
      totalArea: 0,
      builtArea: 0,
      bedrooms: 0,
      bathrooms: 0,
      floors: 0,
      parkingSpaces: 0,
      yearBuilt: new Date().getFullYear(),
      occupancyRate: 0,
    },
    ownership: {
      type: "OWNED",
      owner: {
        name: "",
        contact: "",
        id: "",
      },
      lease: {
        startDate: "",
        endDate: "",
        monthlyRent: 0,
        landlord: "",
      },
    },
    features: {
      amenities: [] as string[],
      utilities: {
        electricity: "",
        water: "",
        gas: "",
        internet: "",
      },
      accessibility: {
        elevator: false,
        ramp: false,
        parking: false,
      },
    },
    tags: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error(
        t(
          "fm.errors.noOrgSession",
          "Error: No organization ID found in session",
        ),
      );
      return;
    }

    const toastId = toast.loading(
      t("fm.properties.toast.creating", "Creating property..."),
    );

    try {
      const response = await fetch("/api/fm/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          t(
            "fm.properties.toast.createSuccess",
            "Property created successfully",
          ),
          { id: toastId },
        );
        onCreated();
      } else {
        const error = await response.json().catch(() => ({}));
        const message =
          error &&
          typeof error === "object" &&
          "error" in error &&
          typeof error.error === "string"
            ? error.error
            : t("fm.properties.errors.unknown", "Unknown error");
        toast.error(
          t(
            "fm.properties.toast.createFailed",
            "Failed to create property: {{message}}",
          ).replace("{{message}}", message),
          { id: toastId },
        );
      }
    } catch (_error) {
      logger.error("Error creating property:", _error);
      toast.error(
        t(
          "fm.properties.toast.createUnknown",
          "Error creating property. Please try again.",
        ),
        { id: toastId },
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-96 overflow-y-auto"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.propertyName", "Property Name")} *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.type", "Type")} *
          </label>
          <Select
            value={formData.type}
            onValueChange={(val) => setFormData({ ...formData, type: val })}
            placeholder={t("fm.properties.selectType", "Select type")}
          >
            <SelectContent>
              <SelectItem value="RESIDENTIAL">
                {t("fm.properties.residential", "Residential")}
              </SelectItem>
              <SelectItem value="COMMERCIAL">
                {t("fm.properties.commercial", "Commercial")}
              </SelectItem>
              <SelectItem value="INDUSTRIAL">
                {t("fm.properties.industrial", "Industrial")}
              </SelectItem>
              <SelectItem value="MIXED_USE">
                {t("fm.properties.mixedUse", "Mixed Use")}
              </SelectItem>
              <SelectItem value="LAND">
                {t("fm.properties.land", "Land")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t("fm.properties.description", "Description")}
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.streetAddress", "Street Address")} *
          </label>
          <Input
            value={formData.address.street}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, street: e.target.value },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.city", "City")} *
          </label>
          <Input
            value={formData.address.city}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, city: e.target.value },
              })
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.region", "Region")} *
          </label>
          <Input
            value={formData.address.region}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, region: e.target.value },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.postalCode", "Postal Code")}
          </label>
          <Input
            value={formData.address.postalCode}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, postalCode: e.target.value },
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.totalArea", "Total Area")} (sqm)
          </label>
          <Input
            type="number"
            value={formData.details.totalArea}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  totalArea: Number(e.target.value),
                },
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.builtArea", "Built Area")} (sqm)
          </label>
          <Input
            type="number"
            value={formData.details.builtArea}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  builtArea: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.bedrooms", "Bedrooms")}
          </label>
          <Input
            type="number"
            value={formData.details.bedrooms}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  bedrooms: Number(e.target.value),
                },
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.bathrooms", "Bathrooms")}
          </label>
          <Input
            type="number"
            value={formData.details.bathrooms}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  bathrooms: Number(e.target.value),
                },
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.floors", "Floors")}
          </label>
          <Input
            type="number"
            value={formData.details.floors}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  floors: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-success hover:bg-success/90">
          {t("fm.properties.createProperty", "Create Property")}
        </Button>
      </div>
    </form>
  );
}
