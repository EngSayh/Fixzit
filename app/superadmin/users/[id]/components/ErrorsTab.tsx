/**
 * Errors Tab component for User Detail page
 * @module app/superadmin/users/[id]/components/ErrorsTab
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ErrorLogEntry } from "./types";

interface ErrorsTabProps {
  logs: ErrorLogEntry[];
  formatDateTime: (date?: string) => string;
}

export function ErrorsTab({ logs, formatDateTime }: ErrorsTabProps) {
  const { t } = useI18n();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          {t("user.errors.title", "Error Log")}
        </CardTitle>
        <CardDescription>
          {t("user.errors.description", "View failed operations and error messages")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
            <p className="text-muted-foreground">{t("user.errors.noErrors", "No errors found for this user")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">{t("user.errors.action", "Action")}</TableHead>
                <TableHead className="text-muted-foreground">{t("user.errors.entity", "Entity")}</TableHead>
                <TableHead className="text-muted-foreground">{t("user.errors.error", "Error")}</TableHead>
                <TableHead className="text-muted-foreground">{t("user.errors.timestamp", "Timestamp")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log._id} className="border-border hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="font-medium">{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {log.result.errorCode && (
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 w-fit mb-1">
                          {log.result.errorCode}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {log.result.errorMessage || "Unknown error"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
