/**
 * Profile Tab component for User Detail page
 * @module app/superadmin/users/[id]/components/ProfileTab
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  Settings,
  Shield,
  CheckCircle,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { UserDetail } from "./types";
import { STATUS_COLORS } from "./types";

interface ProfileTabProps {
  user: UserDetail;
  formatDate: (date?: string) => string;
  formatDateTime: (date?: string) => string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  PENDING: <Clock className="h-3 w-3" />,
  INACTIVE: <Clock className="h-3 w-3" />,
  SUSPENDED: <Clock className="h-3 w-3" />,
};

export function ProfileTab({ user, formatDate, formatDateTime }: ProfileTabProps) {
  const { t } = useI18n();

  const getUserRole = () => user?.professional?.role || user?.role || "—";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("user.personal.title", "Personal Information")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t("user.personal.firstName", "First Name")}</Label>
              <p className="font-medium">{user.personal?.firstName || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.personal.lastName", "Last Name")}</Label>
              <p className="font-medium">{user.personal?.lastName || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.personal.email", "Email")}</Label>
              <p className="font-medium flex items-center gap-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {user.email}
                {user.emailVerified && (
                  <span title="Verified">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.personal.phone", "Phone")}</Label>
              <p className="font-medium flex items-center gap-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {user.personal?.phone || "—"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.userType", "User Type")}</Label>
              <Badge 
                variant="outline" 
                className={
                  user.userType === "company"
                    ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                    : user.userType === "individual"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : "bg-muted text-muted-foreground border-input"
                }
              >
                {user.userType === "company" ? (
                  <><Building2 className="h-3 w-3 me-1" />Company</>
                ) : user.userType === "individual" ? (
                  <>Individual</>
                ) : (
                  <>—</>
                )}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.userId", "User ID")}</Label>
              <p className="font-mono text-sm">{user.code || user._id.slice(-8)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("user.professional.title", "Professional Information")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t("user.professional.role", "Role")}</Label>
              <Badge variant="outline">{getUserRole()}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.professional.subRole", "Sub-Role")}</Label>
              <p className="font-medium">{user.professional?.subRole || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.professional.department", "Department")}</Label>
              <p className="font-medium">{user.professional?.department || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.professional.title", "Title")}</Label>
              <p className="font-medium">{user.professional?.title || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.organization", "Organization")}</Label>
              <p className="font-medium flex items-center gap-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {user.orgName || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("user.account.title", "Account Information")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t("user.account.status", "Status")}</Label>
              <Badge
                variant="outline"
                className={`${STATUS_COLORS[user.status] || ""} flex items-center gap-1 w-fit`}
              >
                {STATUS_ICONS[user.status]}
                {user.status}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.account.mfa", "MFA Enabled")}</Label>
              <Badge variant={user.mfaEnabled ? "default" : "secondary"}>
                {user.mfaEnabled ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.account.createdAt", "Created")}</Label>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(user.createdAt)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.account.lastLogin", "Last Login")}</Label>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {user.lastLogin ? formatDateTime(user.lastLogin) : "Never"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.account.loginCount", "Login Count")}</Label>
              <p className="font-medium">{user.loginCount ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.account.failedLogins", "Failed Login Attempts")}</Label>
              <p className={`font-medium ${(user.failedLoginAttempts ?? 0) > 0 ? "text-red-400" : ""}`}>
                {user.failedLoginAttempts ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("user.security.title", "Security Information")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t("user.security.superAdmin", "Super Admin")}</Label>
              <Badge 
                variant={user.isSuperAdmin ? "default" : "secondary"} 
                className={user.isSuperAdmin ? "bg-yellow-500/20 text-yellow-400" : ""}
              >
                {user.isSuperAdmin ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("user.security.emailVerified", "Email Verified")}</Label>
              <Badge variant={user.emailVerified ? "default" : "secondary"}>
                {user.emailVerified ? (
                  <><CheckCircle className="h-3 w-3 me-1" />Verified</>
                ) : "Not Verified"}
              </Badge>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">{t("user.security.fullId", "Full User ID")}</Label>
              <p className="font-mono text-xs text-muted-foreground break-all">{user._id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
