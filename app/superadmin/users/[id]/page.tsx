"use client";

/**
 * Superadmin User Detail Page
 * Advanced user information with activity logs, errors, and audit trail
 * Supports investigation for individual users or organizations
 * 
 * @module app/superadmin/users/[id]/page
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import {
  User,
  ArrowLeft,
  RefreshCw,
  Building2,
  Shield,
  Mail,
  Phone,
  Calendar,
  Clock,
  Globe,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Settings,
  LogIn,
  MousePointer,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  AlertTriangle,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { type UserRoleType } from "@/types/user";
import { RBAC_MODULES, RBAC_ROLE_PERMISSIONS } from "@/config/rbac.matrix";

// Types
interface UserDetail {
  _id: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
  role?: string;
  professional?: {
    role?: string;
    subRole?: string;
    department?: string;
    title?: string;
  };
  personal?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  };
  employment?: {
    orgId?: string;
    position?: string;
    hireDate?: string;
  };
  orgId?: string;
  orgName?: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  code?: string;
  userType?: "individual" | "company";
  loginCount?: number;
  failedLoginAttempts?: number;
  mfaEnabled?: boolean;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;
}

interface AuditLogEntry {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;
  context?: {
    method?: string;
    endpoint?: string;
    ipAddress?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
  };
  changes?: Array<{
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  result?: {
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    duration?: number;
  };
  metadata?: {
    reason?: string;
    comment?: string;
    source?: string;
    tags?: string[];
  };
}

interface ErrorLogEntry {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  timestamp: string;
  context?: {
    endpoint?: string;
    method?: string;
    ipAddress?: string;
  };
  result: {
    success: false;
    errorCode?: string;
    errorMessage?: string;
    duration?: number;
  };
}

interface ActivityStats {
  totalActions: number;
  todayActions: number;
  errorCount: number;
  lastActiveDate?: string;
  topActions: Array<{ action: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  INACTIVE: "bg-muted text-muted-foreground border-input",
  SUSPENDED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  PENDING: <Clock className="h-3 w-3" />,
  INACTIVE: <XCircle className="h-3 w-3" />,
  SUSPENDED: <AlertCircle className="h-3 w-3" />,
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LOGIN: LogIn,
  LOGOUT: LogIn,
  CREATE: FileText,
  UPDATE: Settings,
  DELETE: XCircle,
  READ: Eye,
  NAVIGATE: MousePointer,
  EXPORT: Download,
  IMPORT: Download,
};

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export default function SuperadminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const userId = (params?.id as string) || "";

  // State
  const [user, setUser] = useState<UserDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [_stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Pagination
  const [auditPagination, setAuditPagination] = useState<Pagination | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [errorPage, _setErrorPage] = useState(1);

  // Filters
  const [auditSearch, setAuditSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("30d");

  // Dialog
  const [logDetailDialogOpen, setLogDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Fetch user details
  const fetchUser = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/superadmin/users/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("User not found");
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load user";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch audit logs for user
  const fetchAuditLogs = useCallback(async () => {
    if (!userId) return;

    try {
      setLogsLoading(true);

      const params = new URLSearchParams({
        page: String(auditPage),
        limit: "20",
        dateRange: dateRangeFilter,
      });

      if (auditSearch) params.set("search", auditSearch);
      if (actionFilter !== "all") params.set("action", actionFilter);

      const response = await fetch(`/api/superadmin/users/${userId}/audit-logs?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
        setAuditPagination(data.pagination || null);
        setStats(data.stats || null);
      } else {
        // Fallback with empty data
        setAuditLogs([]);
        setAuditPagination(null);
      }
    } catch {
      // Silent fail, show empty
      setAuditLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [userId, auditPage, auditSearch, actionFilter, dateRangeFilter]);

  // Fetch error logs for user
  const fetchErrorLogs = useCallback(async () => {
    if (!userId) return;

    try {
      const params = new URLSearchParams({
        page: String(errorPage),
        limit: "20",
        errorsOnly: "true",
        dateRange: dateRangeFilter,
      });

      const response = await fetch(`/api/superadmin/users/${userId}/audit-logs?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setErrorLogs(data.logs || []);
      } else {
        setErrorLogs([]);
      }
    } catch {
      setErrorLogs([]);
    }
  }, [userId, errorPage, dateRangeFilter]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (activeTab === "activity" || activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  useEffect(() => {
    if (activeTab === "errors") {
      fetchErrorLogs();
    }
  }, [activeTab, fetchErrorLogs]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t("time.justNow", "Just now");
    if (diffMins < 60) return t("time.minutesAgo", `${diffMins}m ago`);
    if (diffHours < 24) return t("time.hoursAgo", `${diffHours}h ago`);
    if (diffDays < 7) return t("time.daysAgo", `${diffDays}d ago`);
    return formatDate(dateStr);
  };

  const getUserName = () => {
    if (!user) return "—";
    const first = user.personal?.firstName || "";
    const last = user.personal?.lastName || "";
    return (first + " " + last).trim() || user.email.split("@")[0];
  };

  const getUserRole = () => {
    return user?.professional?.role || user?.role || "—";
  };

  // Get module access badges for user based on their role
  const getModuleAccessList = () => {
    if (!user) return [];
    const role = (user.professional?.role || user.role || "") as UserRoleType;
    const permissions = RBAC_ROLE_PERMISSIONS[role];
    
    if (!permissions) return [];
    
    return RBAC_MODULES.filter(mod => {
      const perm = permissions[mod.id];
      return perm && (perm.view || perm.create || perm.edit || perm.delete);
    }).map(mod => ({
      ...mod,
      permissions: permissions[mod.id],
    }));
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action.toUpperCase()] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const getDeviceIcon = (device?: string) => {
    const Icon = DEVICE_ICONS[(device || "desktop").toLowerCase()] || Monitor;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/superadmin/users")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 me-2" />
          {t("common.back", "Back to Users")}
        </Button>
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-400 mb-4">{error || "User not found"}</p>
            <Button variant="outline" onClick={fetchUser}>
              {t("common.tryAgain", "Try Again")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/superadmin/users")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 me-2" />
            {t("common.back", "Back")}
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {getUserName()}
              {user.isSuperAdmin && (
                <span title="Super Admin">
                  <Shield className="h-5 w-5 text-yellow-500" />
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUser}
            className="border-input text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            {t("common.refresh", "Refresh")}
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("user.status", "Status")}</p>
                <Badge
                  variant="outline"
                  className={`${STATUS_COLORS[user.status] || ""} mt-1 flex items-center gap-1 w-fit`}
                >
                  {STATUS_ICONS[user.status]}
                  {user.status}
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("user.organization", "Organization")}</p>
                <p className="font-medium mt-1 flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {user.orgName || "—"}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("user.lastLogin", "Last Login")}</p>
                <p className="font-medium mt-1">
                  {user.lastLogin ? formatRelativeTime(user.lastLogin) : "Never"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("user.role", "Role")}</p>
                <Badge variant="outline" className="mt-1">
                  {getUserRole()}
                </Badge>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="profile" className="data-[state=active]:bg-card">
            <User className="h-4 w-4 me-2" />
            {t("user.tabs.profile", "Profile")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-card">
            <Activity className="h-4 w-4 me-2" />
            {t("user.tabs.activity", "Activity Log")}
          </TabsTrigger>
          <TabsTrigger value="errors" className="data-[state=active]:bg-card">
            <AlertTriangle className="h-4 w-4 me-2" />
            {t("user.tabs.errors", "Errors")}
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-card">
            <FileText className="h-4 w-4 me-2" />
            {t("user.tabs.audit", "Audit Trail")}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-card">
            <Shield className="h-4 w-4 me-2" />
            {t("user.tabs.permissions", "Permissions")}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
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
                      className={user.userType === "company" 
                        ? "bg-purple-500/20 text-purple-400 border-purple-500/30" 
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }
                    >
                      {user.userType === "company" ? (
                        <><Building2 className="h-3 w-3 me-1" />Company</>
                      ) : (
                        <>Individual</>
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
                    <Badge variant={user.isSuperAdmin ? "default" : "secondary"} className={user.isSuperAdmin ? "bg-yellow-500/20 text-yellow-400" : ""}>
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
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {t("user.activity.title", "Activity Log")}
                  </CardTitle>
                  <CardDescription>
                    {t("user.activity.description", "View all user actions and page visits")}
                  </CardDescription>
                </div>
                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("common.search", "Search...")}
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="ps-10 w-48 bg-muted border-input"
                    />
                  </div>
                  <Select
                    value={actionFilter}
                    onValueChange={setActionFilter}
                    placeholder="Action"
                    className="w-36 bg-muted border-input"
                  >
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="READ">Read</SelectItem>
                  </Select>
                  <Select
                    value={dateRangeFilter}
                    onValueChange={setDateRangeFilter}
                    placeholder="Date Range"
                    className="w-36 bg-muted border-input"
                  >
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("user.activity.noLogs", "No activity logs found")}</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">{t("user.activity.action", "Action")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("user.activity.entity", "Entity")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("user.activity.context", "Context")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("user.activity.status", "Status")}</TableHead>
                        <TableHead className="text-muted-foreground">{t("user.activity.timestamp", "Timestamp")}</TableHead>
                        <TableHead className="text-muted-foreground text-end">{t("common.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log._id} className="border-border hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span className="font-medium">{log.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{log.entityType}</span>
                              {log.entityName && (
                                <span className="text-xs text-muted-foreground">{log.entityName}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              {log.context?.endpoint && (
                                <span className="font-mono text-xs">{log.context.method} {log.context.endpoint}</span>
                              )}
                              {log.context?.ipAddress && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {log.context.ipAddress}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={log.result?.success !== false
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                              }
                            >
                              {log.result?.success !== false ? (
                                <><CheckCircle className="h-3 w-3 me-1" />Success</>
                              ) : (
                                <><XCircle className="h-3 w-3 me-1" />Error</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatRelativeTime(log.timestamp)}
                            </span>
                          </TableCell>
                          <TableCell className="text-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLog(log);
                                setLogDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {auditPagination && auditPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {auditPagination.page} of {auditPagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!auditPagination.hasPrev}
                          onClick={() => setAuditPage((p) => p - 1)}
                          className="border-input"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t("pagination.previous", "Previous")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!auditPagination.hasNext}
                          onClick={() => setAuditPage((p) => p + 1)}
                          className="border-input"
                        >
                          {t("pagination.next", "Next")}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="mt-6">
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
              {errorLogs.length === 0 ? (
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
                    {errorLogs.map((log) => (
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
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("user.audit.title", "Audit Trail")}
              </CardTitle>
              <CardDescription>
                {t("user.audit.description", "Complete audit trail of all changes and actions")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("user.audit.noLogs", "No audit records found")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div
                      key={log._id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedLog(log);
                        setLogDetailDialogOpen(true);
                      }}
                    >
                      <div className={`p-2 rounded-full ${log.result?.success !== false ? "bg-green-500/20" : "bg-red-500/20"}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-xs">{log.entityType}</Badge>
                          {log.entityName && (
                            <span className="text-sm text-muted-foreground truncate">— {log.entityName}</span>
                          )}
                        </div>
                        {log.changes && log.changes.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Changed: {log.changes.map(c => c.field).join(", ")}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(log.timestamp)}
                          </span>
                          {log.context?.ipAddress && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {log.context.ipAddress}
                            </span>
                          )}
                          {log.context?.device && (
                            <span className="flex items-center gap-1">
                              {getDeviceIcon(log.context.device)}
                              {log.context.device}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={log.result?.success !== false
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {log.result?.success !== false ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("user.permissions.title", "Module Permissions")}
              </CardTitle>
              <CardDescription>
                {t("user.permissions.description", `Permissions for role: ${getUserRole()}`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-start px-4 py-2 font-medium text-muted-foreground">{t("permissions.module", "Module")}</th>
                      <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("permissions.view", "View")}</th>
                      <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("permissions.create", "Create")}</th>
                      <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("permissions.edit", "Edit")}</th>
                      <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("permissions.delete", "Delete")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getModuleAccessList().map((module) => (
                      <tr key={module.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{module.label}</p>
                            <p className="text-xs text-muted-foreground">{module.description}</p>
                          </div>
                        </td>
                        <td className="text-center px-2 py-2">
                          {module.permissions?.view ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="text-center px-2 py-2">
                          {module.permissions?.create ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="text-center px-2 py-2">
                          {module.permissions?.edit ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="text-center px-2 py-2">
                          {module.permissions?.delete ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                    {getModuleAccessList().length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {t("permissions.noAccess", "No module permissions for this role")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={logDetailDialogOpen} onOpenChange={setLogDetailDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getActionIcon(selectedLog.action)}
              {t("user.logDetail.title", "Log Details")}
            </DialogTitle>
            <DialogDescription>
              {t("user.logDetail.description", "Complete information about this action")}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Action Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity Type</Label>
                  <p className="font-medium">{selectedLog.entityType}</p>
                </div>
                {selectedLog.entityId && (
                  <div>
                    <Label className="text-muted-foreground">Entity ID</Label>
                    <p className="font-mono text-sm">{selectedLog.entityId}</p>
                  </div>
                )}
                {selectedLog.entityName && (
                  <div>
                    <Label className="text-muted-foreground">Entity Name</Label>
                    <p className="font-medium">{selectedLog.entityName}</p>
                  </div>
                )}
              </div>

              {/* Timestamp and Result */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">{formatDateTime(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Result</Label>
                  <Badge
                    variant="outline"
                    className={selectedLog.result?.success !== false
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                    }
                  >
                    {selectedLog.result?.success !== false ? "Success" : "Failed"}
                  </Badge>
                </div>
                {selectedLog.result?.duration && (
                  <div>
                    <Label className="text-muted-foreground">Duration</Label>
                    <p className="font-medium">{selectedLog.result.duration}ms</p>
                  </div>
                )}
              </div>

              {/* Context */}
              {selectedLog.context && (
                <div className="pt-4 border-t border-border">
                  <Label className="text-muted-foreground mb-2 block">Context</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedLog.context.method && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Method:</span>
                        <Badge variant="outline">{selectedLog.context.method}</Badge>
                      </div>
                    )}
                    {selectedLog.context.endpoint && (
                      <div className="flex items-center gap-2 col-span-2">
                        <span className="text-muted-foreground">Endpoint:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{selectedLog.context.endpoint}</code>
                      </div>
                    )}
                    {selectedLog.context.ipAddress && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedLog.context.ipAddress}</span>
                      </div>
                    )}
                    {selectedLog.context.browser && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Browser:</span>
                        <span>{selectedLog.context.browser}</span>
                      </div>
                    )}
                    {selectedLog.context.os && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">OS:</span>
                        <span>{selectedLog.context.os}</span>
                      </div>
                    )}
                    {selectedLog.context.device && (
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(selectedLog.context.device)}
                        <span>{selectedLog.context.device}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Changes */}
              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <Label className="text-muted-foreground mb-2 block">Changes</Label>
                  <div className="space-y-2">
                    {selectedLog.changes.map((change, idx) => (
                      <div key={idx} className="bg-muted/50 p-3 rounded-lg">
                        <p className="font-medium text-sm">{change.field}</p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Before:</span>
                            <pre className="mt-1 bg-red-500/10 p-2 rounded overflow-x-auto">
                              {JSON.stringify(change.oldValue, null, 2) || "null"}
                            </pre>
                          </div>
                          <div>
                            <span className="text-muted-foreground">After:</span>
                            <pre className="mt-1 bg-green-500/10 p-2 rounded overflow-x-auto">
                              {JSON.stringify(change.newValue, null, 2) || "null"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedLog.result?.success === false && (
                <div className="pt-4 border-t border-border">
                  <Label className="text-muted-foreground mb-2 block">Error Details</Label>
                  <div className="bg-red-500/10 p-3 rounded-lg">
                    {selectedLog.result.errorCode && (
                      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 mb-2">
                        {selectedLog.result.errorCode}
                      </Badge>
                    )}
                    <p className="text-sm">{selectedLog.result.errorMessage || "Unknown error"}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div className="pt-4 border-t border-border">
                  <Label className="text-muted-foreground mb-2 block">Metadata</Label>
                  <div className="text-sm space-y-1">
                    {selectedLog.metadata.reason && (
                      <p><span className="text-muted-foreground">Reason:</span> {selectedLog.metadata.reason}</p>
                    )}
                    {selectedLog.metadata.source && (
                      <p><span className="text-muted-foreground">Source:</span> {selectedLog.metadata.source}</p>
                    )}
                    {selectedLog.metadata.tags && selectedLog.metadata.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Tags:</span>
                        {selectedLog.metadata.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogDetailDialogOpen(false)}
              className="border-input"
            >
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
