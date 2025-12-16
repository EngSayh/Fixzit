"use client";
import { logger } from "@/lib/logger";

import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import GoogleMap from "@/components/GoogleMap";
import { CardGridSkeleton } from "@/components/skeletons";
import {
  Building2,
  MapPin,
  DollarSign,
  Users,
  Home,
  Wrench,
  Shield,
  ChevronLeft,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import ClientDate from "@/components/ClientDate";
import { useTranslation } from "@/contexts/TranslationContext";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";
import type { ReactNode } from "react";

interface MaintenanceIssue {
  resolved?: boolean;
  severity?: string;
  description?: string;
}

interface PropertyUnit {
  unitNumber?: string;
  type?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  status?: string;
  tenant?: {
    name?: string;
  };
}

export default function PropertyDetailsPage() {
  return (
    <FmGuardedPage moduleId="properties">
      {({ orgId, supportBanner }) => (
        <PropertyDetailsContent orgId={orgId} supportBanner={supportBanner} />
      )}
    </FmGuardedPage>
  );
}

type PropertyDetailsContentProps = {
  orgId: string;
  supportBanner?: ReactNode | null;
};

function PropertyDetailsContent({
  orgId,
  supportBanner,
}: PropertyDetailsContentProps) {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const propertyId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const handleDelete = async () => {
    const confirmMessage = t(
      "fm.properties.detail.actions.confirmDelete",
      'Delete property "{{name}}"? This cannot be undone.',
    ).replace("{{name}}", property?.name ?? "");

    if (!confirm(confirmMessage)) {
      return;
    }
    if (!orgId) {
      toast.error(
        t("fm.properties.detail.errors.noOrgId", "Organization ID missing"),
      );
      return;
    }

    if (!params?.id) {
      toast.error(
        t("fm.properties.detail.errors.noPropertyId", "Property ID missing"),
      );
      return;
    }

    const toastId = toast.loading(
      t("fm.properties.detail.toasts.deleting", "Deleting property..."),
    );
    try {
      const res = await fetch(`/api/fm/properties/${params.id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": orgId },
      });
      if (!res.ok) throw new Error("Failed to delete property");
      toast.success(
        t(
          "fm.properties.detail.toasts.success",
          "Property deleted successfully",
        ),
        { id: toastId },
      );
      router.push("/fm/properties");
    } catch (_error) {
      const message =
        _error instanceof Error ? _error.message : "Failed to delete property";
      const failureMessage = t(
        "fm.properties.detail.toasts.failure",
        "Failed to delete property: {{message}}",
      ).replace("{{message}}", message);
      toast.error(failureMessage, { id: toastId });
    }
  };

  const fetcher = (url: string) => {
    return fetch(url, {
      headers: { "x-tenant-id": orgId },
    })
      .then((r) => r.json())
      .catch((error) => {
        logger.error("FM property detail fetch error", error);
        throw error;
      });
  };

  const {
    data: property,
    error,
    isLoading,
  } = useSWR(
    orgId && params?.id ? [`/api/fm/properties/${params.id}`, orgId] : null,
    ([url]) => fetcher(url),
  );

  if (!session) return <CardGridSkeleton count={3} />;
  if (error)
    return (
      <div>
        {t("fm.properties.detail.errors.loadFailed", "Failed to load property")}
      </div>
    );
  if (isLoading || !property) return <CardGridSkeleton count={3} />;

  return (
    <div className="space-y-6">
      {supportBanner}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/fm/properties">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 me-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{property.name}</h1>
            <p className="text-muted-foreground">{property.code}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              if (propertyId) {
                router.push(`/fm/properties/${propertyId}/edit`);
              }
            }}
          >
            <Edit className="w-4 h-4 me-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 me-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 me-2" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{property.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subtype</p>
                  <p className="font-medium">{property.subtype || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Area</p>
                  <p className="font-medium">
                    {property.details?.totalArea || "N/A"} sqm
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Built Area</p>
                  <p className="font-medium">
                    {property.details?.builtArea || "N/A"} sqm
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year Built</p>
                  <p className="font-medium">
                    {property.details?.yearBuilt || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Floors</p>
                  <p className="font-medium">
                    {property.details?.floors || "N/A"}
                  </p>
                </div>
              </div>

              {property.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm">{property.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Location Card with Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 me-2" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{property.address?.street}</p>
                <p className="text-sm text-muted-foreground">
                  {property.address?.district &&
                    `${property.address.district}, `}
                  {property.address?.city}, {property.address?.region}
                </p>
                {property.address?.postalCode && (
                  <p className="text-sm text-muted-foreground">
                    Postal Code: {property.address.postalCode}
                  </p>
                )}
                {property.address?.nationalAddress && (
                  <p className="text-sm text-muted-foreground">
                    National Address: {property.address.nationalAddress}
                  </p>
                )}
              </div>

              {property.address?.coordinates && (
                <GoogleMap
                  center={{
                    lat: property.address.coordinates.lat,
                    lng: property.address.coordinates.lng,
                  }}
                  markers={[
                    {
                      position: {
                        lat: property.address.coordinates.lat,
                        lng: property.address.coordinates.lng,
                      },
                      title: property.name,
                      info: property.address.street,
                    },
                  ]}
                  height="300px"
                />
              )}
            </CardContent>
          </Card>

          {/* Units */}
          {property.units && property.units.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="w-5 h-5 me-2" />
                  Units ({property.units.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(property.units as PropertyUnit[]).map((unit, idx) => (
                    <div
                      key={unit.unitNumber || `unit-${idx}`}
                      className="flex items-center justify-between p-3 bg-muted rounded-2xl"
                    >
                      <div>
                        <p className="font-medium">{unit.unitNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {unit.type} • {unit.area} sqm • {unit.bedrooms}BR/
                          {unit.bathrooms}BA
                        </p>
                      </div>
                      <div className="text-end">
                        <Badge
                          className={
                            unit.status === "OCCUPIED"
                              ? "bg-success/10 text-success-foreground"
                              : unit.status === "VACANT"
                                ? "bg-warning/10 text-warning-foreground"
                                : "bg-muted text-foreground"
                          }
                        >
                          {unit.status}
                        </Badge>
                        {unit.tenant?.name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {unit.tenant.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 me-2" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Purchase Price
                </span>
                <span className="font-medium">
                  {property.financial?.purchasePrice?.toLocaleString() || "N/A"}{" "}
                  SAR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Current Value
                </span>
                <span className="font-medium">
                  {property.financial?.currentValue?.toLocaleString() || "N/A"}{" "}
                  SAR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Monthly Rent
                </span>
                <span className="font-medium">
                  {property.financial?.monthlyRent?.toLocaleString() || "N/A"}{" "}
                  SAR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Annual Yield
                </span>
                <span className="font-medium">
                  {property.financial?.annualYield || "N/A"}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ownership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 me-2" />
                Ownership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {property.ownership?.type || "N/A"}
                </p>
              </div>
              {property.ownership?.owner && (
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">{property.ownership.owner.name}</p>
                  {property.ownership.owner.contact && (
                    <p className="text-sm text-muted-foreground">
                      {property.ownership.owner.contact}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 me-2" />
                Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {property.compliance?.buildingPermit && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">
                    Building Permit: {property.compliance.buildingPermit}
                  </span>
                </div>
              )}
              {property.compliance?.occupancyCertificate && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">Occupancy Certificate</span>
                </div>
              )}
              {property.compliance?.insurance?.policyNumber && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">
                    Insurance: {property.compliance.insurance.provider}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="w-5 h-5 me-2" />
                Maintenance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Last Inspection</p>
                <p className="font-medium">
                  {property.maintenance?.lastInspection ? (
                    <ClientDate
                      date={property.maintenance.lastInspection}
                      format="date-only"
                    />
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Inspection</p>
                <p className="font-medium">
                  {property.maintenance?.nextInspection ? (
                    <ClientDate
                      date={property.maintenance.nextInspection}
                      format="date-only"
                    />
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
              {property.maintenance?.issues &&
                property.maintenance.issues.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Open Issues
                    </p>
                    {(property.maintenance.issues as MaintenanceIssue[])
                      .filter((issue) => !issue.resolved)
                      .map((issue, idx) => (
                        <div
                          key={`issue-${property.id}-${idx}`}
                          className="flex items-center space-x-2 text-sm"
                        >
                          <AlertCircle
                            className={`w-4 h-4 ${
                              issue.severity === "HIGH"
                                ? "text-destructive"
                                : issue.severity === "MEDIUM"
                                  ? "text-warning"
                                  : "text-muted-foreground"
                            }`}
                          />
                          <span>{issue.description}</span>
                        </div>
                      ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
