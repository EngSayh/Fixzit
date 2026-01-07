/**
 * Log Detail Dialog component for User Detail page
 * @module app/superadmin/users/[id]/components/LogDetailDialog
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  Clock,
  Shield,
  Globe,
  Monitor,
  CheckCircle,
  XCircle,
  FileText,
  Copy,
} from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { AuditLogEntry } from "./types";

interface LogDetailDialogProps {
  log: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatDateTime: (date?: string) => string;
}

export function LogDetailDialog({
  log,
  open,
  onOpenChange,
  formatDateTime,
}: LogDetailDialogProps) {
  const { t } = useI18n();

  if (!log) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("common.copied", "Copied to clipboard"));
    } catch {
      toast.error(t("common.copyFailed", "Failed to copy"));
    }
  };

  const copyLogAsJson = () => {
    copyToClipboard(JSON.stringify(log, null, 2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("user.logDetail.title", "Log Details")}
          </DialogTitle>
          <DialogDescription>
            {t("user.logDetail.description", "Detailed information about this audit log entry")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={
                  log.result?.success
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }
              >
                {log.result?.success ? (
                  <CheckCircle className="h-3 w-3 me-1" />
                ) : (
                  <XCircle className="h-3 w-3 me-1" />
                )}
                {log.result?.success
                  ? t("user.logDetail.success", "Success")
                  : t("user.logDetail.failed", "Failed")}
              </Badge>
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                {log.action.toUpperCase()}
              </Badge>
              <span className="text-muted-foreground">{log.entityType}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyLogAsJson}
              className="border-border"
            >
              <Copy className="h-4 w-4 me-1" />
              {t("user.logDetail.copyJson", "Copy JSON")}
            </Button>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Timestamp */}
            <Card className="bg-muted/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  {t("user.logDetail.timestamp", "Timestamp")}
                </div>
                <p className="font-medium">{formatDateTime(log.timestamp)}</p>
              </CardContent>
            </Card>

            {/* IP Address */}
            <Card className="bg-muted/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Globe className="h-4 w-4" />
                  {t("user.logDetail.ipAddress", "IP Address")}
                </div>
                <p className="font-medium font-mono">
                  {log.ipAddress || log.context?.ipAddress || t("user.logDetail.unknown", "Unknown")}
                </p>
              </CardContent>
            </Card>

            {/* User Agent */}
            {(log.userAgent || log.context?.userAgent) && (
              <Card className="bg-muted/50 border-border sm:col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Monitor className="h-4 w-4" />
                    {t("user.logDetail.userAgent", "User Agent")}
                  </div>
                  <p className="font-mono text-sm break-all">{log.userAgent || log.context?.userAgent}</p>
                </CardContent>
              </Card>
            )}

            {/* Entity ID */}
            {log.entityId && (
              <Card className="bg-muted/50 border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Shield className="h-4 w-4" />
                    {t("user.logDetail.entityId", "Entity ID")}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm truncate">{log.entityId}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(log.entityId || "")}
                      className="shrink-0 h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Log ID */}
            <Card className="bg-muted/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  {t("user.logDetail.logId", "Log ID")}
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm truncate">{log._id}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(log._id)}
                    className="shrink-0 h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Details (if failed) */}
          {log.result && !log.result.success && log.result.errorMessage && (
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-red-400 mb-2">
                  <XCircle className="h-4 w-4" />
                  {t("user.logDetail.errorDetails", "Error Details")}
                </div>
                {log.result.errorCode && (
                  <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 mb-2">
                    {log.result.errorCode}
                  </Badge>
                )}
                <p className="text-sm">{log.result.errorMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Changes (if available) */}
          {log.changes && Object.keys(log.changes).length > 0 && (
            <Card className="bg-muted/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {t("user.logDetail.changes", "Changes")}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(log.changes, null, 2))}
                    className="h-6"
                  >
                    <Copy className="h-3 w-3 me-1" />
                    {t("common.copy", "Copy")}
                  </Button>
                </div>
                <pre className="bg-background p-3 rounded-md text-xs font-mono overflow-auto max-h-48">
                  {JSON.stringify(log.changes, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
