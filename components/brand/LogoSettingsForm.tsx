"use client";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { toast } from "sonner";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

export interface LogoSettingsFormProps {
  scope: "tenant" | "platform";
  currentLogoUrl?: string | null;
  onSuccess?: () => void;
}

/**
 * Shared Logo Settings Form
 * Handles both tenant-scoped and platform-scoped logo uploads
 * Features:
 * - File upload with drag & drop
 * - Image preview
 * - File validation (type, size)
 * - Current logo display
 * - Replace logo functionality
 */
export function LogoSettingsForm({
  scope,
  currentLogoUrl: initialLogoUrl,
  onSuccess,
}: LogoSettingsFormProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
    initialLogoUrl || null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setCurrentLogoUrl(initialLogoUrl || null);
  }, [initialLogoUrl]);

  const apiEndpoint =
    scope === "platform"
      ? "/api/superadmin/settings/logo"
      : "/api/admin/logo/upload";

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        t(
          "admin.logo.invalidType",
          "Invalid file type. Please upload PNG, JPEG, SVG, or WebP",
        ),
      );
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(
        t("admin.logo.fileTooLarge", "File too large. Maximum size: 5MB"),
      );
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(
        t("admin.logo.noFileSelected", "Please select a file to upload"),
      );
      return;
    }

    setUploading(true);
    const toastId = toast.loading(
      t("admin.logo.uploading", "Uploading logo..."),
    );

    try {
      const formData = new FormData();
      formData.append("logo", selectedFile);

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentLogoUrl(data.data.logoUrl || data.logoUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        toast.success(
          t("admin.logo.uploadSuccess", "Logo uploaded successfully"),
          { id: toastId },
        );

        if (onSuccess) {
          onSuccess();
        } else {
          // Trigger a page reload after 1 second to show new logo
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        const error = await response.text();
        toast.error(
          `${t("admin.logo.uploadFailed", "Upload failed")}: ${error}`,
          { id: toastId },
        );
      }
    } catch (error) {
      logger.error("Logo upload error", {
        error,
        fileName: selectedFile?.name,
        scope,
      });
      toast.error(
        t("admin.logo.uploadNetworkError", "Network error while uploading"),
        { id: toastId },
      );
    } finally {
      setUploading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Logo */}
      {currentLogoUrl && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.logo.currentLogo", "Current Logo")}
          </h2>
          <div className="flex items-center justify-center bg-muted/30 rounded-xl p-8 border border-border">
            <Image
              src={currentLogoUrl}
              alt={t("admin.logo.currentLogoAlt", "Current logo")}
              width={200}
              height={80}
              className="object-contain max-h-20"
            />
          </div>
        </div>
      )}

      {/* Upload New Logo */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t(
            "admin.logo.uploadNew",
            currentLogoUrl ? "Replace Logo" : "Upload Logo",
          )}
        </h2>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/20"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-full max-w-sm">
                <Image
                  src={previewUrl}
                  alt={t("admin.logo.preview", "Logo preview")}
                  width={400}
                  height={160}
                  className="object-contain rounded-lg max-h-40"
                />
                <button
                  onClick={handleCancel}
                  className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background transition-colors"
                  aria-label={t("admin.logo.cancel", "Cancel")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedFile?.name} ({(selectedFile!.size / 1024).toFixed(1)}{" "}
                KB)
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3 text-center">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t(
                    "admin.logo.dropZoneTitle",
                    "Drag and drop logo file here",
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("admin.logo.dropZoneSubtitle", "or click to browse")}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("admin.logo.browseFiles", "Browse Files")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t(
                  "admin.logo.fileRequirements",
                  "PNG, JPEG, SVG, or WebP • Max 5MB",
                )}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {selectedFile && (
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={uploading}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading
                ? t("admin.logo.uploading", "Uploading...")
                : t("admin.logo.upload", "Upload Logo")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
