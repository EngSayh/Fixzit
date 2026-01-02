"use client";

import React, { useMemo } from "react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useProperties } from "@/hooks/fm/useProperties";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Upload, RefreshCw, FolderOpen } from "@/components/ui/icons";
import { useSession } from "next-auth/react";
import { useFMPermissions } from "@/hooks/fm/useFMPermissions";
import { SubmoduleKey } from "@/domain/fm/fm-lite";

// Document management - will be linked to properties
// ROADMAP: Implement dedicated /api/fm/documents endpoint for full document management
// See ISSUES_REGISTER.md for tracking. Currently shows documents from property attachments.

export default function PropertiesDocumentsPage() {
  const { t } = useTranslation();
  const { status: sessionStatus } = useSession();
  const fmPermissions = useFMPermissions();
  const { hasOrgContext, guard, supportBanner } = useFmOrgGuard({
    moduleId: "properties",
  });
  const { properties, isLoading, error, refresh } = useProperties("?limit=100");

  const canAccessDocuments = fmPermissions.canAccessModule(
    SubmoduleKey.PROP_DOCUMENTS
  );
  const canManageDocuments =
    canAccessDocuments && fmPermissions.canManageProperties();

  // Calculate document stats based on properties
  const stats = useMemo(() => {
    const totalProperties = properties.length;
    return {
      totalDocuments: 0, // Would come from document API
      propertiesWithDocs: 0,
      expiringSoon: 0,
      expired: 0,
      totalProperties,
    };
  }, [properties]);

  if (!hasOrgContext) {
    return guard;
  }

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="properties" />
        <div className="rounded-xl border border-border bg-card/30 p-6 space-y-3 animate-pulse">
          <div className="h-4 w-44 rounded-md bg-muted" />
          <div className="h-4 w-64 rounded-md bg-muted" />
          <div className="h-3 w-72 rounded-md bg-muted/60" />
        </div>
      </div>
    );
  }

  if (!canAccessDocuments) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="properties" />
        {supportBanner}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t(
                "fm.properties.documents.planGate.title",
                "Document management is not available on your plan"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground">
              {t(
                "fm.properties.documents.planGate.body",
                "Upgrade your subscription to upload, track expiry dates, and automate compliance alerts."
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="properties" />
      {supportBanner}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("fm.properties.documents.title", "Property Documents")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "fm.properties.documents.subtitle",
              "Manage property documents, certificates, and legal files"
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh()} aria-label={t("common.refresh", "Refresh documents")} title={t("common.refresh", "Refresh documents")}>
            <RefreshCw className="me-2 h-4 w-4" />
            {t("common.refresh", "Refresh")}
          </Button>
          {canManageDocuments ? (
            <Button aria-label={t("fm.properties.documents.upload", "Upload Document")} title={t("fm.properties.documents.upload", "Upload Document")}>
              <Upload className="me-2 h-4 w-4" />
              {t("fm.properties.documents.upload", "Upload Document")}
            </Button>
          ) : null}
        </div>
      </div>
      {!canManageDocuments ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "fm.properties.documents.viewOnly",
            "You have view-only access. Contact an admin to manage documents."
          )}
        </p>
      ) : null}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fm.properties.documents.stats.total", "Total Documents")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? "—" : stats.totalDocuments}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("fm.properties.documents.stats.acrossProperties", "Across {{count}} properties", { count: stats.totalProperties })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fm.properties.documents.stats.active", "Active Documents")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {isLoading ? "—" : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fm.properties.documents.stats.expiring", "Expiring Soon")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {isLoading ? "—" : stats.expiringSoon}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fm.properties.documents.stats.expired", "Expired")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {isLoading ? "—" : stats.expired}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          {canManageDocuments ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("fm.properties.documents.uploadArea.title", "Upload Documents")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("fm.properties.documents.uploadArea.description", "Drag and drop files here or click to browse")}
              </p>
              <Button aria-label={t("fm.properties.documents.uploadArea.button", "Choose files to upload")} title={t("fm.properties.documents.uploadArea.button", "Choose files to upload")}>
                {t("fm.properties.documents.uploadArea.button", "Choose Files")}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                {t("fm.properties.documents.uploadArea.hint", "Supports PDF, DOC, JPG up to 10MB each")}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center text-muted-foreground">
              {t(
                "fm.properties.documents.uploadArea.readOnly",
                "Document upload is restricted to admin/staff roles."
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Properties with Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t("fm.properties.documents.byProperty.title", "Documents by Property")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              "fm.properties.documents.byProperty.subtitle",
              "Select a property to view and manage its documents"
            )}
          </p>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/60 bg-destructive/5 p-4 text-destructive">
              <p className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t("fm.properties.documents.error", "Unable to load properties.")}
              </p>
              <Button
                size="sm"
                className="mt-2"
                variant="outline"
                onClick={() => refresh()}
                aria-label={t("common.retry", "Retry loading documents")}
                title={t("common.retry", "Retry loading documents")}
              >
                {t("common.retry", "Retry")}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("common.loading", "Loading...")}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {t(
                  "fm.properties.documents.empty",
                  "No properties found. Create properties first to manage their documents."
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map((property) => (
                <div
                  key={property._id}
                  className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {property.type || "—"} • {property.address?.city || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("fm.properties.documents.noDocuments", "No documents")}
                    </Badge>
                    {canManageDocuments ? (
                      <Button variant="outline" size="sm" aria-label={t("fm.properties.documents.addDocument", "Add document to property")} title={t("fm.properties.documents.addDocument", "Add document to property")}>
                        <Upload className="h-4 w-4 me-1" />
                        {t("fm.properties.documents.addDocument", "Add")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="font-semibold mb-2">
              {t("fm.properties.documents.comingSoon.title", "Full Document Management Coming Soon")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t(
                "fm.properties.documents.comingSoon.description",
                "Document uploads, version control, expiry tracking, and automated compliance alerts will be available in the next release."
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
