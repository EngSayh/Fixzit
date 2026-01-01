"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/components/common/OfflineIndicator";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  X,
} from "@/components/ui/icons";

type ScanStatus = "pending" | "clean" | "infected" | "error";

export interface WorkOrderAttachment {
  key: string;
  url: string;
  name: string;
  size: number;
  type?: string;
  scanStatus: ScanStatus;
  mimeVerified?: boolean;
  // Legacy field names for backward compatibility
  fileSize?: number;
}

interface Props {
  workOrderId?: string;
  onChange?: (attachments: WorkOrderAttachment[]) => void;
  initialAttachments?: WorkOrderAttachment[];
  draftCreator?: () => Promise<string | undefined>;
  disabled?: boolean;
}

type UploadingFile = {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "error" | "canceled";
};

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
]);
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "pdf"]);
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB (aligned with API guard)
const EXTENSION_MIME_MAP: Record<string, string[]> = {
  pdf: ["application/pdf", "application/x-pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
};

export function WorkOrderAttachments({
  workOrderId,
  onChange,
  initialAttachments,
  draftCreator,
  disabled = false,
}: Props) {
  const { isOnline } = useOnlineStatus();
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>(() =>
    (initialAttachments || []).map((att) => ({
      ...att,
      scanStatus: att.scanStatus || "pending",
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const uploadControllers = useRef<Record<string, XMLHttpRequest>>({});

  // Sync incoming attachments (edit/detail pages)
  useEffect(() => {
    if (!initialAttachments) return;
    const normalized = initialAttachments.map((att) => ({
      ...att,
      scanStatus: att.scanStatus || "pending",
    }));
    setAttachments((prev) => {
      const currKeys = new Set(prev.map((a) => a.key));
      const nextKeys = new Set(normalized.map((a) => a.key));
      const changed =
        currKeys.size !== nextKeys.size ||
        [...currKeys].some((k) => !nextKeys.has(k));
      return changed ? normalized : prev;
    });
  }, [initialAttachments]);

  // Poll AV scan status for pending items
  useEffect(() => {
    const pending = attachments.filter((att) => att.scanStatus === "pending");
    if (pending.length === 0) return undefined;

    const interval = window.setInterval(async () => {
      const updates = await Promise.all(
        pending.map(async (att) => {
          try {
            const res = await fetch(
              `/api/upload/scan-status?key=${encodeURIComponent(att.key)}`,
            );
            if (!res.ok) return att;
            const json = await res.json().catch(() => ({}));
            const nextStatus =
              typeof json.status === "string"
                ? (json.status as ScanStatus)
                : "pending";
            if (!["pending", "clean", "infected", "error"].includes(nextStatus))
              return att;
            return { ...att, scanStatus: nextStatus };
          } catch {
            return att;
          }
        }),
      );

      setAttachments((curr) => {
        const map = new Map(curr.map((a) => [a.key, a] as const));
        for (const updated of updates) {
          map.set(updated.key, { ...map.get(updated.key), ...updated });
        }
        const next = Array.from(map.values());
        onChange?.(next);
        return next;
      });
    }, 7000);

    return () => window.clearInterval(interval);
  }, [attachments, onChange]);

  const ensureWorkOrderId = async () => {
    if (workOrderId) return workOrderId;
    if (draftCreator) return draftCreator();
    return undefined;
  };

  const validateFiles = (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    const valid: File[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        setError(
          `Unsupported file extension: .${ext || "unknown"} (png, jpg, jpeg, pdf only)`,
        );
        continue;
      }
      if (
        ext &&
        EXTENSION_MIME_MAP[ext] &&
        !EXTENSION_MIME_MAP[ext].includes(file.type)
      ) {
        setError(
          `File type does not match extension (${file.type || "unknown"} for .${ext})`,
        );
        continue;
      }
      if (!ALLOWED_TYPES.has(file.type)) {
        setError(
          `Unsupported file type: ${file.type || "unknown"} (PNG, JPG, PDF only)`,
        );
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(
          `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max 15 MB)`,
        );
        continue;
      }
      valid.push(file);
    }
    return valid;
  };

  const handleCancel = (key: string) => {
    const xhr = uploadControllers.current[key];
    if (xhr) xhr.abort();
    setUploadingFiles((prev) =>
      prev.map((f) => (f.key === key ? { ...f, status: "canceled" } : f)),
    );
    setProgress((prev) => ({ ...prev, [key]: 0 }));
    delete uploadControllers.current[key];
  };

  const verifyMetadata = async (key: string, ext: string | undefined) => {
    try {
      const res = await fetch(
        `/api/upload/verify-metadata?key=${encodeURIComponent(key)}`,
      );
      if (!res.ok) return true;
      const meta = (await res.json().catch(() => ({}))) as {
        contentType?: string;
      };
      const actualMime = meta?.contentType;
      if (actualMime && ext && EXTENSION_MIME_MAP[ext]) {
        return EXTENSION_MIME_MAP[ext].includes(actualMime);
      }
      return true;
    } catch {
      return true;
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!isOnline || disabled) {
      setError("Uploads require an online connection.");
      return;
    }
    const files = validateFiles(fileList);
    if (files.length === 0) return;

    const targetId = await ensureWorkOrderId();
    if (!targetId) {
      setError("Save the work order first to enable attachments.");
      return;
    }

    setUploading(true);
    setError(null);
    const next: WorkOrderAttachment[] = [];

    try {
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const presignRes = await fetch(
          `/api/fm/work-orders/${targetId}/attachments/presign`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              type: file.type || "application/octet-stream",
              size: file.size,
            }),
          },
        );
        if (!presignRes.ok) throw new Error(await presignRes.text());
        const presign = await presignRes.json();
        setUploadingFiles((prev) => [
          ...prev,
          {
            key: presign.key,
            name: file.name,
            size: file.size,
            status: "uploading",
          },
        ]);

        const headers: Record<string, string> = {
          ...(presign.headers || {}),
          "Content-Type": file.type || "application/octet-stream",
        };

        const uploadOnce = () =>
          new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", presign.putUrl);
            uploadControllers.current[presign.key] = xhr;
            Object.entries(headers).forEach(([k, v]) =>
              xhr.setRequestHeader(k, v),
            );
            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable) {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                setProgress((prev) => ({ ...prev, [presign.key]: pct }));
              }
            };
            xhr.onload = () => {
              setProgress((prev) => ({ ...prev, [presign.key]: 100 }));
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed (${xhr.status})`));
            };
            xhr.onerror = () => reject(new Error("Upload failed"));
            xhr.onabort = () => reject(new Error("Upload canceled"));
            xhr.send(file);
          });

        const delays = [0, 400, 1200, 2500];
        let uploaded = false;
        for (let attempt = 0; attempt < delays.length; attempt += 1) {
          if (attempt > 0)
            await new Promise((r) => setTimeout(r, delays[attempt]));
          try {
            await uploadOnce();
            uploaded = true;
            break;
          } catch (err) {
            const canceled =
              err instanceof Error && err.message.includes("canceled");
            if (attempt === delays.length - 1 || canceled) {
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.key === presign.key
                    ? { ...f, status: canceled ? "canceled" : "error" }
                    : f,
                ),
              );
              delete uploadControllers.current[presign.key];
              if (!canceled) {
                throw err instanceof Error ? err : new Error("Upload failed");
              }
              uploaded = false;
              break;
            }
          }
        }

        if (!uploaded) continue;

        const publicUrl = String(presign.putUrl).split("?")[0];
        setUploadingFiles((prev) => prev.filter((f) => f.key !== presign.key));
        delete uploadControllers.current[presign.key];

        let mimeVerified = true;
        if (ext) {
          mimeVerified = await verifyMetadata(presign.key, ext);
        }

        let scanStatus: ScanStatus = "pending";
        try {
          const scanRes = await fetch(
            `/api/upload/scan-status?key=${encodeURIComponent(presign.key)}`,
          );
          if (scanRes.ok) {
            const scanJson = await scanRes.json().catch(() => ({}));
            if (typeof scanJson.status === "string") {
              const normalized = scanJson.status as ScanStatus;
              scanStatus = ["pending", "clean", "infected", "error"].includes(
                normalized,
              )
                ? normalized
                : "pending";
            }
          } else {
            scanStatus = "error";
          }
        } catch (scanErr) {
          const msg =
            scanErr instanceof Error ? scanErr.message : "Scan check failed";
          setError(msg);
          scanStatus = "error";
        }

        next.push({
          key: presign.key,
          url: publicUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          scanStatus,
          mimeVerified,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload attachment",
      );
    } finally {
      setUploading(false);
      setProgress({});
      uploadControllers.current = {};
      setUploadingFiles([]);
    }

    if (next.length) {
      const merged = [...attachments, ...next];
      setAttachments(merged);
      onChange?.(merged);
      if (targetId) {
        try {
          const saveRes = await fetch(`/api/fm/work-orders/${targetId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attachments: merged }),
          });
          if (!saveRes.ok)
            throw new Error("Failed to save attachments to work order");
        } catch (persistErr) {
          setError(
            persistErr instanceof Error
              ? persistErr.message
              : "Could not save attachments",
          );
          setAttachments(attachments);
          onChange?.(attachments);
        }
      }
    }
  };

  const handleRemove = async (key: string) => {
    if (!workOrderId) return;
    if (!confirm("Remove this attachment?")) return;

    const updated = attachments.filter((att) => att.key !== key);
    setAttachments(updated);
    onChange?.(updated);

    try {
      const res = await fetch(`/api/fm/work-orders/${workOrderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments: updated }),
      });
      if (!res.ok) throw new Error("Failed to remove attachment");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove attachment",
      );
      setAttachments(attachments);
      onChange?.(attachments);
    }
  };

  const statusBadge = (status: ScanStatus) => {
    const map: Record<
      ScanStatus,
      { label: string; className: string; icon: React.ReactNode }
    > = {
      pending: {
        label: "Scan pending",
        className: "bg-amber-50 text-amber-700",
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
      },
      clean: {
        label: "Clean",
        className: "bg-emerald-50 text-emerald-700",
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
      infected: {
        label: "Infected",
        className: "bg-red-50 text-red-700",
        icon: <ShieldAlert className="h-4 w-4" />,
      },
      error: {
        label: "Scan error",
        className: "bg-slate-100 text-slate-700",
        icon: <AlertCircle className="h-4 w-4" />,
      },
    };
    const meta = map[status];
    return (
      <Badge variant="outline" className={`gap-1 ${meta.className}`}>
        {meta.icon}
        {meta.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Attachments</Label>
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        )}
        <Input
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || disabled || !isOnline}
          className="max-w-xs"
        />
      </div>
      {!isOnline || disabled ? (
        <div className="text-xs text-muted-foreground">
          Uploads are available when you're back online.
        </div>
      ) : null}
      {error && (
        <div className="text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {uploadingFiles.length > 0 && (
        <div className="space-y-2 rounded border border-border bg-muted/30 p-2 text-xs">
          <div className="font-medium text-foreground">Uploading</div>
          {uploadingFiles.map((file) => (
            <div key={file.key} className="flex items-center gap-2">
              <span className="truncate flex-1">{file.name}</span>
              <span className="text-muted-foreground">
                {progress[file.key] !== undefined
                  ? `${progress[file.key]}%`
                  : "…"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => handleCancel(file.key)}
                aria-label={`Cancel upload for ${file.name}`}
              >
                Cancel
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {attachments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No attachments uploaded yet.
          </p>
        )}
        {attachments.map((att) => (
          <div
            key={att.key}
            className="flex items-center justify-between rounded border border-border p-2"
          >
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{att.name}</p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const bytes = att.size || att.fileSize;
                  if (typeof bytes === "number" && !Number.isNaN(bytes))
                    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
                  return "Size unknown";
                })()}
              </p>
              {progress[att.key] !== undefined && progress[att.key] < 100 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Uploading</span>
                    <span>{progress[att.key]}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded bg-muted">
                    <div
                      className="h-1.5 rounded bg-primary transition-all"
                      style={{ width: `${progress[att.key]}%` }}
                    />
                  </div>
                </div>
              )}
              {att.mimeVerified === false && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  MIME/extension mismatch detected
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(att.scanStatus)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(att.key)}
                disabled={uploading}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove attachment ${att.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
