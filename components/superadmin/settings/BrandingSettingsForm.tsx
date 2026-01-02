"use client";

/**
 * @fileoverview Superadmin Branding Settings Form
 * @description UI for managing platform-wide branding (logo, colors, name)
 * @module components/superadmin/settings/BrandingSettingsForm
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandLogo } from "@/components/brand";
import { Upload, RotateCcw, AlertCircle, CheckCircle2 } from "@/components/ui/icons";
import { SaveButton } from "@/components/ui/action-button";
import { logger } from "@/lib/logger";

interface BrandingData {
  logoUrl: string;
  brandName: string;
  brandColor: string;
  faviconUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export function BrandingSettingsForm() {
  const { t: _t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<BrandingData>({
    logoUrl: "/img/fixzit-logo.png",
    brandName: "Fixzit Enterprise",
    brandColor: "#25935F", // Ejar primary-500
  });
  const [lastAudit, setLastAudit] = useState<{ updatedAt?: string; updatedBy?: string } | null>(null);

  const [originalData, setOriginalData] = useState<BrandingData>(formData);

  // Fetch current branding settings
  useEffect(() => {
    async function fetchBranding() {
      try {
        const response = await fetch("/api/superadmin/branding");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(message);
        }
        const result = await response.json();
        if (!result.data) {
          // Use defaults if no data returned
          setLoading(false);
          return;
        }
        const data: BrandingData = {
          logoUrl: result.data.logoUrl || "/img/fixzit-logo.png",
          brandName: result.data.brandName || "Fixzit Enterprise",
          brandColor: result.data.brandColor || "#25935F", // Ejar primary-500
          faviconUrl: result.data.faviconUrl,
          updatedAt: result.data.updatedAt,
          updatedBy: result.data.updatedBy,
        };
        setFormData(data);
        setOriginalData(data);
        setLastAudit({ updatedAt: data.updatedAt, updatedBy: data.updatedBy });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error("Failed to load branding settings", { 
          error: errorMessage,
          errorType: err instanceof Error ? err.name : typeof err,
        });
        // Don't show error for 401 (expected when not logged in as superadmin)
        if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
          logger.info("Branding settings require superadmin session");
        } else {
          setError(`Failed to load branding settings: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setSuccess(null);

    // Validate hex color
    if (!/^#[0-9A-Fa-f]{6}$/.test(formData.brandColor)) {
      throw new Error("Brand color must be a valid hex code (e.g., #25935F)");
    }

    const response = await fetch("/api/superadmin/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logoUrl: formData.logoUrl,
        brandName: formData.brandName,
        brandColor: formData.brandColor,
        faviconUrl: formData.faviconUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save branding settings");
    }

    const result = await response.json();
    const updatedData: BrandingData = {
      logoUrl: result.data.logoUrl,
      brandName: result.data.brandName,
      brandColor: result.data.brandColor,
      faviconUrl: result.data.faviconUrl,
      updatedAt: result.data.updatedAt,
      updatedBy: result.data.updatedBy,
    };
    
    setFormData(updatedData);
    setOriginalData(updatedData);
    setLastAudit({ updatedAt: updatedData.updatedAt, updatedBy: updatedData.updatedBy });
    setSuccess("Branding settings saved successfully!");
    
    // Force reload to show updated logo (cache bust)
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, [formData]);

  const handleSaveError = useCallback((err: Error) => {
    logger.error("Failed to save branding", { error: err });
    setError(err.message || "Failed to save branding settings");
  }, []);

  const handleReset = () => {
    setFormData(originalData);
    setError(null);
    setSuccess(null);
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          <p className="text-slate-400">Loading branding settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Logo Preview */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Current Logo</CardTitle>
          <CardDescription>Preview of the current platform logo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 bg-slate-800 rounded-lg">
            <BrandLogo size="2xl" logoUrl={formData.logoUrl} />
          </div>
          {formData.updatedAt && formData.updatedBy && (
            <p className="text-xs text-slate-500 mt-4">
              Last updated: {new Date(formData.updatedAt).toLocaleString()} by {formData.updatedBy}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Live Preview of Pending Changes */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Live Preview</CardTitle>
          <CardDescription>Unsaved changes are reflected immediately</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-xl p-6 flex items-center gap-4 shadow-inner"
            style={{ background: `${formData.brandColor}1A`, border: `1px solid ${formData.brandColor}` }}
          >
            <BrandLogo size="lg" fetchOrgLogo={false} logoUrl={formData.logoUrl} className="rounded-lg bg-white/80 p-2" />
            <div>
              <p className="text-xl font-semibold text-white">{formData.brandName}</p>
              <p className="text-xs text-slate-400">
                Primary color: <span className="font-mono">{formData.brandColor}</span>
              </p>
            </div>
          </div>
          {JSON.stringify(formData) !== JSON.stringify(originalData) && (
            <p className="mt-3 text-xs text-amber-300">
              You have unsaved changes. Click Save to publish and record an audit entry.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Audit Trail</CardTitle>
          <CardDescription>Latest branding publish events</CardDescription>
        </CardHeader>
        <CardContent>
          {lastAudit?.updatedAt ? (
            <ul className="text-sm text-slate-200 space-y-2">
              <li className="flex items-center justify-between">
                <span>Last published by</span>
                <span className="font-semibold">{lastAudit.updatedBy || "system"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Published at</span>
                <span className="font-mono text-slate-300">
                  {new Date(lastAudit.updatedAt).toLocaleString()}
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">No audit entries yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Branding Settings Form */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Branding Settings</CardTitle>
          <CardDescription>
            Configure platform-wide branding including logo, name, and colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alerts */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-950 border-green-800 text-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl" className="text-slate-200">
              Logo URL
            </Label>
            <Input
              id="logoUrl"
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">
              Enter a publicly accessible URL to your logo image (PNG, SVG, WebP, or JPEG)
            </p>
          </div>

          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="brandName" className="text-slate-200">
              Brand Name
            </Label>
            <Input
              id="brandName"
              type="text"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              placeholder="Fixzit Enterprise"
              className="bg-slate-800 border-slate-700 text-white"
              maxLength={100}
            />
          </div>

          {/* Brand Color */}
          <div className="space-y-2">
            <Label htmlFor="brandColor" className="text-slate-200">
              Primary Brand Color
            </Label>
            <div className="flex gap-2">
              <Input
                id="brandColor"
                type="text"
                value={formData.brandColor}
                onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                placeholder="#25935F"
                className="bg-slate-800 border-slate-700 text-white"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
              <div
                className="w-12 h-10 rounded border border-slate-700"
                style={{ backgroundColor: formData.brandColor }}
                title={formData.brandColor}
              />
            </div>
            <p className="text-xs text-slate-500">
              Hex color code (e.g., #25935F)
            </p>
          </div>

          {/* Favicon URL (optional) */}
          <div className="space-y-2">
            <Label htmlFor="faviconUrl" className="text-slate-200">
              Favicon URL <span className="text-slate-500">(optional)</span>
            </Label>
            <Input
              id="faviconUrl"
              type="url"
              value={formData.faviconUrl || ""}
              onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
              placeholder="https://example.com/favicon.ico"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <SaveButton
              onAction={handleSave}
              onActionError={handleSaveError}
              disabled={!isDirty}
              label="Save Changes"
              className="bg-[var(--color-status-info)] hover:bg-[var(--color-status-info)]/90 text-white"
            />
            <Button
              onClick={handleReset}
              disabled={!isDirty}
              variant="outline"
              className="border-slate-700 text-slate-200"
              aria-label="Reset branding settings to saved values"
            >
              <RotateCcw className="w-4 h-4 me-2" />
              Reset
            </Button>
          </div>

          {/* Upload Note */}
          <Alert className="bg-slate-800 border-slate-700">
            <Upload className="h-4 w-4 text-slate-400" />
            <AlertDescription className="text-slate-400">
              <strong className="text-slate-200">Note:</strong> Logo upload via file picker
              will be implemented in Phase 2. For now, upload your logo to cloud storage
              (S3, Cloudinary, Vercel Blob) and paste the public URL above.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
