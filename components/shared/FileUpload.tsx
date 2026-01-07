/**
 * FileUpload - Drag & drop file upload with preview
 * 
 * @description Handles document uploads for contracts, property images,
 * ownership deeds, and other file attachments.
 * 
 * @features
 * - Drag and drop support
 * - Multiple file selection
 * - File type validation
 * - Size limit enforcement
 * - Image preview thumbnails
 * - Progress indicator
 * - RTL-first layout
 */
"use client";

import React, { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, FileText, Image as ImageIcon, AlertCircle, Check } from "@/components/ui/icons";

// ============================================================================
// TYPES
// ============================================================================

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  url?: string;
  thumbnail?: string;
}

export interface FileUploadProps {
  /** Accepted file types (e.g., "image/*,.pdf") */
  accept?: string;
  /** Maximum file size in bytes (default: 10MB) */
  maxSize?: number;
  /** Maximum number of files (default: 10) */
  maxFiles?: number;
  /** Allow multiple files */
  multiple?: boolean;
  /** Current uploaded files */
  files?: UploadedFile[];
  /** Callback when files are added */
  onFilesAdd?: (files: File[]) => void;
  /** Callback when a file is removed */
  onFileRemove?: (fileId: string) => void;
  /** Upload handler (returns URL) */
  onUpload?: (file: File) => Promise<{ url: string; thumbnail?: string }>;
  /** Current locale */
  locale?: "ar" | "en";
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Show file list */
  showFileList?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const generateId = (): string => {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function FileUpload({
  accept = "image/*,.pdf,.doc,.docx",
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  multiple = true,
  files: externalFiles,
  onFilesAdd,
  onFileRemove,
  onUpload,
  locale = "ar",
  disabled = false,
  className,
  label,
  helpText,
  showFileList = true,
}: FileUploadProps) {
  const isRTL = locale === "ar";
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalFiles, setInternalFiles] = useState<UploadedFile[]>([]);

  const files = externalFiles ?? internalFiles;
  const setFiles = externalFiles ? undefined : setInternalFiles;

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return isRTL
        ? `حجم الملف يتجاوز ${formatFileSize(maxSize)}`
        : `File size exceeds ${formatFileSize(maxSize)}`;
    }
    return null;
  };

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const newFiles = Array.from(fileList);
      
      if (files.length + newFiles.length > maxFiles) {
        // Trim to max files
        newFiles.splice(maxFiles - files.length);
      }

      // Create upload entries
      const uploadEntries: UploadedFile[] = newFiles.map((file) => ({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "pending" as const,
        error: validateFile(file) ?? undefined,
      }));

      // Set initial files
      if (setFiles) {
        setFiles((prev) => [...prev, ...uploadEntries]);
      }
      onFilesAdd?.(newFiles);

      // Upload files if handler provided
      if (onUpload) {
        for (const entry of uploadEntries) {
          if (entry.error) continue;

          try {
            // Update to uploading
            if (setFiles) {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === entry.id ? { ...f, status: "uploading", progress: 50 } : f
                )
              );
            }

            const result = await onUpload(entry.file);

            // Update to success
            if (setFiles) {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === entry.id
                    ? { ...f, status: "success", progress: 100, url: result.url, thumbnail: result.thumbnail }
                    : f
                )
              );
            }
          } catch (err) {
            // Update to error
            if (setFiles) {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === entry.id
                    ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
                    : f
                )
              );
            }
          }
        }
      }
    },
    [files.length, maxFiles, maxSize, onFilesAdd, onUpload, setFiles, isRTL]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleRemove = (fileId: string) => {
    if (setFiles) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }
    onFileRemove?.(fileId);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-neutral-500" />;
  };

  return (
    <div className={cn("w-full", className)} dir={isRTL ? "rtl" : "ltr"}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragOver
            ? "border-primary-500 bg-primary-50"
            : "border-neutral-200 hover:border-primary-300 hover:bg-neutral-50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <Upload className={cn("w-10 h-10 mx-auto mb-3", isDragOver ? "text-primary-500" : "text-neutral-400")} />

        <p className="text-sm font-medium text-neutral-700">
          {isRTL ? "اسحب الملفات هنا أو" : "Drag files here or"}{" "}
          <span className="text-primary-500">{isRTL ? "تصفح" : "browse"}</span>
        </p>

        {helpText && (
          <p className="text-xs text-neutral-500 mt-2">{helpText}</p>
        )}

        <p className="text-xs text-neutral-400 mt-1">
          {isRTL
            ? `الحد الأقصى: ${formatFileSize(maxSize)} لكل ملف`
            : `Max: ${formatFileSize(maxSize)} per file`}
        </p>
      </div>

      {/* File list */}
      {showFileList && files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                file.status === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-neutral-200 bg-white"
              )}
            >
              {/* Thumbnail or icon */}
              {file.thumbnail ? (
                <img
                  src={file.thumbnail}
                  alt={file.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                getFileIcon(file.type)
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatFileSize(file.size)}
                </p>

                {/* Progress bar */}
                {file.status === "uploading" && (
                  <div className="mt-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Error message */}
                {file.error && (
                  <p className="text-xs text-red-600 mt-1">{file.error}</p>
                )}
              </div>

              {/* Status icon */}
              {file.status === "success" && (
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              {file.status === "error" && (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(file.id);
                }}
                className="p-1 hover:bg-neutral-100 rounded flex-shrink-0"
                aria-label={isRTL ? "إزالة" : "Remove"}
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FileUpload;
