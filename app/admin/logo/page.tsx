"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/contexts/TranslationContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { logger } from "@/lib/logger";

/**
 * Logo Upload Admin Page
 * Super Admin only - Upload and manage platform logo
 * Features:
 * - File upload with drag & drop
 * - Image preview
 * - File validation (type, size)
 * - Current logo display
 * - Replace logo functionality
 */
export default function LogoUpload() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Authorization check
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login?callbackUrl=/admin/logo");
      return;
    }

    if (session.user?.role !== "SUPER_ADMIN") {
      toast.error(
        t(
          "admin.logo.accessDenied",
          "Access Denied: SUPER_ADMIN role required",
        ),
      );
      router.push("/dashboard");
      return;
    }
  }, [session, status, router, t]);

  // Load current logo
  useEffect(() => {
    if (session?.user?.role !== "SUPER_ADMIN") return;

    const loadCurrentLogo = async () => {
      try {
        const response = await fetch("/api/admin/logo/upload");

        if (response.ok) {
          const data = await response.json();
          setCurrentLogoUrl(data.logoUrl);
        }
      } catch (error) {
        logger.error("Failed to load current logo", { error });
      } finally {
        setLoading(false);
      }
    };

    loadCurrentLogo();
  }, [session]);

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

      const response = await fetch("/api/admin/logo/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentLogoUrl(data.data.logoUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        toast.success(
          t("admin.logo.uploadSuccess", "Logo uploaded successfully"),
          { id: toastId },
        );

        // Trigger a page reload after 1 second to show new logo in TopBar
        setTimeout(() => window.location.reload(), 1000);
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

  // Don't render if not authorized
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">
          {t("common.loading", "Loading...")}
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.logo.title", "Logo Management")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "admin.logo.subtitle",
            "Upload and manage platform logo (Super Admin only)",
          )}
        </p>
      </div>

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
              className="max-h-20 w-auto object-contain"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t(
              "admin.logo.visibleInTopBar",
              "This logo is visible in the top navigation bar",
            )}
          </p>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {currentLogoUrl
            ? t("admin.logo.replaceLogo", "Replace Logo")
            : t("admin.logo.uploadLogo", "Upload Logo")}
        </h2>

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleInputChange}
            className="hidden"
            id="logo-upload"
          />

          {previewUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Image
                  src={previewUrl}
                  alt={t("admin.logo.previewAlt", "Logo preview")}
                  width={200}
                  height={80}
                  className="max-h-32 w-auto object-contain"
                />
              </div>
              <p className="text-sm text-foreground font-medium">
                {selectedFile?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedFile && `${(selectedFile.size / 1024).toFixed(2)} KB`}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {uploading
                    ? t("admin.logo.uploading", "Uploading...")
                    : t("admin.logo.uploadButton", "Upload")}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={uploading}
                  className="px-6 py-2 bg-muted text-foreground rounded-2xl hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {t("common.cancel", "Cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg
                  className="w-16 h-16 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer text-primary hover:text-primary/80 font-medium"
                >
                  {t("admin.logo.chooseFile", "Choose a file")}
                </label>
                <span className="text-muted-foreground">
                  {" "}
                  {t("admin.logo.orDragDrop", "or drag and drop")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "admin.logo.supportedFormats",
                  "PNG, JPEG, SVG, or WebP (max 5MB)",
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
        <h3 className="font-medium text-sm text-foreground">
          {t("admin.logo.guidelinesTitle", "Logo Guidelines")}
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>
            {t(
              "admin.logo.guideline.formats",
              "Supported formats: PNG, JPEG, SVG, WebP",
            )}
          </li>
          <li>{t("admin.logo.guideline.size", "Maximum file size: 5MB")}</li>
          <li>
            {t(
              "admin.logo.guideline.dimensions",
              "Recommended dimensions: 200x80 pixels (or proportional)",
            )}
          </li>
          <li>
            {t(
              "admin.logo.guideline.transparent",
              "Use PNG with transparent background for best results",
            )}
          </li>
          <li>
            {t(
              "admin.logo.guideline.topbar",
              "Logo will appear in the top navigation bar",
            )}
          </li>
          <li>
            {t(
              "admin.logo.guideline.clickable",
              "Logo will be clickable and link to the landing page",
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
