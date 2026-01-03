"use client";

/**
 * SuperAdmin Theme Settings Form
 * 
 * Comprehensive color palette control for SuperAdmins.
 * Uses the /api/superadmin/theme endpoint and useColorTheme hook.
 * 
 * @module components/superadmin/settings/ThemeSettingsForm
 * @compliance Ejar.sa Design System (Saudi Platforms Code)
 * @agent [AGENT-001-A]
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, AlertCircle, CheckCircle2, Palette } from "@/components/ui/icons";
import { SaveButton } from "@/components/ui/action-button";
import { useColorTheme, DEFAULT_THEME, ThemeColors } from "@/providers/ThemeProvider";

/**
 * Color input component with label and preview
 */
function ColorField({
  id,
  label,
  value,
  onChange,
  description,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-10 p-1 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/**
 * Color section with title
 */
function ColorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

export function ThemeSettingsForm() {
  const { theme, isLoading: themeLoading, updateTheme, resetTheme } = useColorTheme();
  const [formData, setFormData] = useState<ThemeColors>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync form data with theme context
  useEffect(() => {
    if (!themeLoading && theme) {
      setFormData(theme);
      setLoading(false);
    }
  }, [theme, themeLoading]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(theme);
    setHasChanges(changed);
  }, [formData, theme]);

  const updateField = useCallback((field: keyof ThemeColors, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Validate all colors are valid hex
      for (const [key, value] of Object.entries(formData)) {
        if (typeof value === "string" && value.startsWith("#")) {
          if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
            throw new Error(`Invalid color for ${key}: ${value}`);
          }
        }
      }

      const success = await updateTheme(formData);
      if (success) {
        setSuccess("Theme saved successfully! Changes applied across all pages.");
      } else {
        throw new Error("Failed to save theme");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save theme");
    } finally {
      setSaving(false);
    }
  }, [formData, updateTheme]);

  const handleReset = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const success = await resetTheme();
      if (success) {
        setFormData(DEFAULT_THEME);
        setSuccess("Theme reset to Ejar.sa defaults");
      } else {
        throw new Error("Failed to reset theme");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset theme");
    } finally {
      setSaving(false);
    }
  }, [resetTheme]);

  if (loading || themeLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading theme settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-[var(--theme-primary)]" />
          <div>
            <CardTitle>Theme Colors</CardTitle>
            <CardDescription>
              Customize the platform color palette. Changes apply immediately across all pages.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-green-500 bg-green-50 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Primary Colors */}
        <ColorSection title="Primary Colors (Brand Green)">
          <ColorField
            id="primary"
            label="Primary"
            value={formData.primary}
            onChange={(v) => updateField("primary", v)}
            description="Main brand color (buttons, links)"
          />
          <ColorField
            id="primaryHover"
            label="Primary Hover"
            value={formData.primaryHover}
            onChange={(v) => updateField("primaryHover", v)}
            description="Hover state for primary elements"
          />
          <ColorField
            id="primaryActive"
            label="Primary Active"
            value={formData.primaryActive}
            onChange={(v) => updateField("primaryActive", v)}
            description="Active/pressed state"
          />
          <ColorField
            id="primaryLight"
            label="Primary Light"
            value={formData.primaryLight}
            onChange={(v) => updateField("primaryLight", v)}
            description="Light tint for backgrounds"
          />
        </ColorSection>

        {/* Secondary Colors */}
        <ColorSection title="Secondary Colors (Gold Accent)">
          <ColorField
            id="secondary"
            label="Secondary"
            value={formData.secondary}
            onChange={(v) => updateField("secondary", v)}
            description="Accent color (badges, highlights)"
          />
          <ColorField
            id="secondaryHover"
            label="Secondary Hover"
            value={formData.secondaryHover}
            onChange={(v) => updateField("secondaryHover", v)}
            description="Hover state for secondary"
          />
        </ColorSection>

        {/* Semantic Colors */}
        <ColorSection title="Semantic Colors">
          <ColorField
            id="success"
            label="Success"
            value={formData.success}
            onChange={(v) => updateField("success", v)}
            description="Success states, confirmations"
          />
          <ColorField
            id="successLight"
            label="Success Light"
            value={formData.successLight}
            onChange={(v) => updateField("successLight", v)}
          />
          <ColorField
            id="warning"
            label="Warning"
            value={formData.warning}
            onChange={(v) => updateField("warning", v)}
            description="Warnings, attention needed"
          />
          <ColorField
            id="warningLight"
            label="Warning Light"
            value={formData.warningLight}
            onChange={(v) => updateField("warningLight", v)}
          />
          <ColorField
            id="error"
            label="Error"
            value={formData.error}
            onChange={(v) => updateField("error", v)}
            description="Errors, destructive actions"
          />
          <ColorField
            id="errorLight"
            label="Error Light"
            value={formData.errorLight}
            onChange={(v) => updateField("errorLight", v)}
          />
          <ColorField
            id="info"
            label="Info"
            value={formData.info}
            onChange={(v) => updateField("info", v)}
            description="Informational messages"
          />
          <ColorField
            id="infoLight"
            label="Info Light"
            value={formData.infoLight}
            onChange={(v) => updateField("infoLight", v)}
          />
        </ColorSection>

        {/* Special Colors */}
        <ColorSection title="Layout Colors">
          <ColorField
            id="sidebarBg"
            label="Sidebar Background"
            value={formData.sidebarBg}
            onChange={(v) => updateField("sidebarBg", v)}
            description="Left navigation sidebar"
          />
          <ColorField
            id="headerBg"
            label="Header Background"
            value={formData.headerBg}
            onChange={(v) => updateField("headerBg", v)}
            description="Top bar/header"
          />
          <ColorField
            id="footerBg"
            label="Footer Background"
            value={formData.footerBg}
            onChange={(v) => updateField("footerBg", v)}
            description="Page footer"
          />
        </ColorSection>

        {/* Brand Colors */}
        <ColorSection title="Additional Brand Colors">
          <ColorField
            id="lavender"
            label="Lavender"
            value={formData.lavender}
            onChange={(v) => updateField("lavender", v)}
            description="Alternative accent"
          />
          <ColorField
            id="saudiGreen"
            label="Saudi Green"
            value={formData.saudiGreen}
            onChange={(v) => updateField("saudiGreen", v)}
            description="Official Saudi Arabia green"
          />
        </ColorSection>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <SaveButton
            onAction={handleSave}
            disabled={!hasChanges || saving}
            className="min-w-[120px]"
            label={saving ? "Saving..." : "Save Theme"}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          {hasChanges && (
            <span className="text-sm text-amber-600">
              You have unsaved changes
            </span>
          )}
        </div>

        {/* Preview */}
        <div className="pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-white font-medium"
                style={{ backgroundColor: formData.primary }}
              >
                Primary Button
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-neutral-900 font-medium"
                style={{ backgroundColor: formData.secondary }}
              >
                Secondary Button
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: formData.success }}
              >
                Success
              </span>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: formData.warning }}
              >
                Warning
              </span>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: formData.error }}
              >
                Error
              </span>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: formData.info }}
              >
                Info
              </span>
            </div>
            <div className="flex gap-2">
              <div
                className="w-20 h-16 rounded-md flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: formData.sidebarBg }}
              >
                Sidebar
              </div>
              <div
                className="w-20 h-16 rounded-md flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: formData.headerBg }}
              >
                Header
              </div>
              <div
                className="w-20 h-16 rounded-md flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: formData.footerBg }}
              >
                Footer
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
