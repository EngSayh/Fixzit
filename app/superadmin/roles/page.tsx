"use client";

/**
 * Superadmin Roles & Permissions
 * Dynamic RBAC configuration view with search, filtering, comparison, and export
 * 
 * @module app/superadmin/roles/page
 * 
 * Features:
 * - Dynamic data fetch from /api/superadmin/roles with CANONICAL_ROLES fallback
 * - Search/filter by role name or description
 * - Category filter tabs
 * - Expandable permissions view (no truncation)
 * - Side-by-side role comparison
 * - CSV export for compliance/audit
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { 
  Shield, 
  CheckCircle, 
  Users, 
  Building2, 
  Wrench,
  Search,
  Download,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileJson,
  Star,
  Lock,
  GitCompare,
  Copy,
  Eye,
  EyeOff,
  Package,
  Clock,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CANONICAL_ROLES } from "@/types/user";
import { toast } from "sonner";

// Role interface for API response and local data
interface RoleData {
  _id?: string;
  name: string;
  slug?: string;
  description: string;
  category: string;
  permissions: string[];
  permissionCount?: number;
  wildcard?: boolean;
  systemReserved?: boolean;
  level?: number;
}

// Canonical role mismatch info
interface CanonicalMismatch {
  roleName: string;
  status: "missing" | "extra" | "permission_diff";
  details: string;
}

// Permission with module grouping
interface GroupedPermission {
  module: string;
  permissions: string[];
}

// Role change history entry
interface RoleHistoryEntry {
  id: string;
  action: string;
  roleName: string;
  userId: string;
  timestamp: string;
  details: Record<string, unknown>;
  success: boolean;
  ipAddress?: string;
}

// Canonical slug to category mapping for reliable categorization
const SLUG_CATEGORY_MAP: Record<string, string> = {
  super_admin: "Administrative",
  corporate_admin: "Administrative",
  admin: "Administrative",
  manager: "Administrative",
  fm_manager: "FM",
  property_manager: "FM",
  technician: "FM",
  team_member: "Staff",
  finance: "Staff",
  finance_officer: "Staff",
  hr: "Staff",
  hr_officer: "Staff",
  procurement: "Staff",
  support_agent: "Staff",
  operations_manager: "Staff",
  souq_admin: "Staff",
  marketplace_moderator: "Staff",
  owner: "External",
  tenant: "External",
  vendor: "External",
  auditor: "External",
  corporate_owner: "External",
};

// Fallback role data using CANONICAL_ROLES
const FALLBACK_ROLES: RoleData[] = [
  { name: "SUPER_ADMIN", description: "Full system access", category: "Administrative", permissions: ["*"], wildcard: true, systemReserved: true },
  { name: "CORPORATE_ADMIN", description: "Full org access", category: "Administrative", permissions: ["*"], wildcard: true },
  { name: "ADMIN", description: "Organization admin", category: "Administrative", permissions: ["dashboard", "workOrders", "properties", "finance", "hr", "administration"] },
  { name: "MANAGER", description: "Department manager", category: "Administrative", permissions: ["dashboard", "workOrders", "properties", "hr", "support", "reports"] },
  { name: "FM_MANAGER", description: "Facility management lead", category: "FM", permissions: ["dashboard", "workOrders", "properties", "hr", "support", "reports"] },
  { name: "PROPERTY_MANAGER", description: "Property operations", category: "FM", permissions: ["dashboard", "properties", "workOrders", "crm", "support", "reports"] },
  { name: "TECHNICIAN", description: "Field technician", category: "FM", permissions: ["dashboard", "workOrders", "support"] },
  { name: "TEAM_MEMBER", description: "General staff", category: "Staff", permissions: ["dashboard", "workOrders", "support", "reports"] },
  { name: "FINANCE", description: "Finance module access", category: "Staff", permissions: ["dashboard", "finance", "reports", "support"] },
  { name: "FINANCE_OFFICER", description: "Finance operations", category: "Staff", permissions: ["dashboard", "finance", "invoices", "payments", "reports"] },
  { name: "HR", description: "HR module access", category: "Staff", permissions: ["dashboard", "hr", "support", "reports"] },
  { name: "HR_OFFICER", description: "HR operations", category: "Staff", permissions: ["dashboard", "hr", "employees", "attendance", "payroll", "reports"] },
  { name: "PROCUREMENT", description: "Procurement access", category: "Staff", permissions: ["dashboard", "marketplace", "support", "reports"] },
  { name: "SUPPORT_AGENT", description: "Support desk", category: "Staff", permissions: ["dashboard", "support", "tickets", "reports"] },
  { name: "OPERATIONS_MANAGER", description: "Operations oversight", category: "Staff", permissions: ["dashboard", "workOrders", "properties", "reports", "analytics"] },
  { name: "SOUQ_ADMIN", description: "Marketplace admin", category: "Staff", permissions: ["dashboard", "marketplace", "vendors", "products", "orders", "reports"] },
  { name: "MARKETPLACE_MODERATOR", description: "Content moderation", category: "Staff", permissions: ["dashboard", "marketplace", "reviews", "claims", "moderation"] },
  { name: "OWNER", description: "Property owner", category: "External", permissions: ["dashboard", "properties", "support", "reports"] },
  { name: "TENANT", description: "Property tenant", category: "External", permissions: ["dashboard", "properties", "support", "reports"] },
  { name: "VENDOR", description: "Marketplace vendor", category: "External", permissions: ["dashboard", "marketplace", "support"] },
  { name: "AUDITOR", description: "Read-only audit access", category: "External", permissions: ["dashboard", "reports", "audit-logs"] },
  { name: "CORPORATE_OWNER", description: "Corporate property owner", category: "External", permissions: ["dashboard", "properties", "finance", "reports"] },
];

const CATEGORIES = ["All", "Administrative", "FM", "Staff", "External"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Administrative: <Shield className="h-4 w-4" />,
  FM: <Wrench className="h-4 w-4" />,
  Staff: <Users className="h-4 w-4" />,
  External: <Building2 className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  Administrative: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  FM: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Staff: "bg-green-500/20 text-green-400 border-green-500/30",
  External: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function SuperadminRolesPage() {
  const { t } = useI18n();

  // State
  const [roles, setRoles] = useState<RoleData[]>(FALLBACK_ROLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category>("All");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedRolesForCompare, setSelectedRolesForCompare] = useState<[string | null, string | null]>([null, null]);
  const [dataSource, setDataSource] = useState<"api" | "fallback">("fallback");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showOnlyWildcard, setShowOnlyWildcard] = useState(false);
  const [showOnlySystemReserved, setShowOnlySystemReserved] = useState(false);
  const [canonicalDiffDialogOpen, setCanonicalDiffDialogOpen] = useState(false);
  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<RoleData | null>(null);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Infer category from role slug or name (slug-based is more reliable)
  const inferCategory = useCallback((role: { slug?: string; name: string }): string => {
    // Try slug first (more reliable)
    if (role.slug) {
      const slugLower = role.slug.toLowerCase();
      if (SLUG_CATEGORY_MAP[slugLower]) {
        return SLUG_CATEGORY_MAP[slugLower];
      }
    }
    // Fallback to name-based inference
    const nameLower = role.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (SLUG_CATEGORY_MAP[nameLower]) {
      return SLUG_CATEGORY_MAP[nameLower];
    }
    // Check patterns in name
    if (/admin|manager/i.test(role.name) && !/fm_|property_|operations_/i.test(role.name)) {
      return "Administrative";
    }
    if (/fm_|property_|technician/i.test(role.name)) {
      return "FM";
    }
    if (/owner|tenant|vendor|auditor/i.test(role.name)) {
      return "External";
    }
    return "Staff";
  }, []);

  // Normalize permission to string (handles ObjectId case)
  const normalizePermission = useCallback((perm: unknown): string => {
    if (typeof perm === "string") return perm;
    if (perm && typeof perm === "object" && "key" in perm) {
      return String((perm as { key: string }).key);
    }
    return String(perm);
  }, []);

  // Fetch roles from API
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/superadmin/roles", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
        // Map API roles with normalized permissions
        const mappedRoles = data.roles.map((role: RoleData & { permissions?: unknown[] }) => {
          const normalizedPermissions = Array.isArray(role.permissions)
            ? role.permissions.map(normalizePermission)
            : [];
          
          // For wildcard roles with no explicit permissions, show "*"
          const displayPermissions = role.wildcard && normalizedPermissions.length === 0
            ? ["*"]
            : normalizedPermissions;

          return {
            ...role,
            category: role.category || inferCategory(role),
            permissions: displayPermissions,
            permissionCount: role.permissionCount ?? displayPermissions.length,
          };
        });
        setRoles(mappedRoles);
        setDataSource("api");
        setLastUpdated(data.fetchedAt || new Date().toISOString());
      } else {
        // API returned empty or no roles, use fallback
        setRoles(FALLBACK_ROLES);
        setDataSource("fallback");
        setLastUpdated(null);
      }
    } catch (_err) {
      // API failed, use fallback data
      setRoles(FALLBACK_ROLES);
      setDataSource("fallback");
      setLastUpdated(null);
      setError("Using cached role definitions (API unavailable)");
    } finally {
      setLoading(false);
    }
  }, [inferCategory, normalizePermission]);

  // Fetch role change history
  const fetchRoleHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/superadmin/roles/history?limit=50", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoleHistory(data.history || []);
      } else if (response.status === 401) {
        setHistoryError("Unauthorized - superadmin access required");
        setRoleHistory([]);
      } else {
        setHistoryError(`Failed to load history (HTTP ${response.status})`);
        setRoleHistory([]);
      }
    } catch (_err) {
      // Show error instead of silently failing
      setHistoryError("Unable to fetch role history - network error");
      setRoleHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Filtered roles with safe search handling for ObjectIds
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      // Category filter
      if (categoryFilter !== "All" && role.category !== categoryFilter) {
        return false;
      }
      // Wildcard filter
      if (showOnlyWildcard && !role.wildcard) {
        return false;
      }
      // System reserved filter
      if (showOnlySystemReserved && !role.systemReserved) {
        return false;
      }
      // Search filter with safe string handling
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = role.name.toLowerCase().includes(query);
        const descMatch = role.description.toLowerCase().includes(query);
        // Safe permission search - ensure each permission is a string
        const permMatch = Array.isArray(role.permissions) && role.permissions.some((p) => {
          const permStr = typeof p === "string" ? p : String(p);
          return permStr.toLowerCase().includes(query);
        });
        return nameMatch || descMatch || permMatch;
      }
      return true;
    });
  }, [roles, categoryFilter, searchQuery, showOnlyWildcard, showOnlySystemReserved]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      if (cat === "All") {
        counts[cat] = roles.length;
      } else {
        counts[cat] = roles.filter((r) => r.category === cat).length;
      }
    }
    return counts;
  }, [roles]);

  // Wildcard and system reserved counts
  const wildcardCount = useMemo(() => roles.filter(r => r.wildcard).length, [roles]);
  const systemReservedCount = useMemo(() => roles.filter(r => r.systemReserved).length, [roles]);

  // Toggle row expansion
  const toggleRowExpansion = (roleName: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(roleName)) {
        next.delete(roleName);
      } else {
        next.add(roleName);
      }
      return next;
    });
  };

  // Export to CSV with normalized permissions
  const exportToCSV = useCallback(() => {
    const headers = ["Role", "Slug", "Category", "Description", "Permission Count", "Permissions", "Wildcard", "System Reserved"];
    const rows = roles.map((role) => {
      const permStrings = role.permissions.map(p => typeof p === "string" ? p : String(p));
      return [
        role.name,
        role.slug || "",
        role.category,
        `"${role.description.replace(/"/g, '""')}"`,
        String(role.permissionCount ?? permStrings.length),
        `"${permStrings.join(", ")}"`,
      role.wildcard ? "Yes" : "No",
      role.systemReserved ? "Yes" : "No",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fixzit-roles-matrix-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(t("superadmin.roles.csvExportSuccess", "Roles matrix exported to CSV"));
  }, [roles, t]);

  // Export to JSON for audits
  const exportToJSON = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      dataSource,
      lastUpdated,
      totalRoles: roles.length,
      roles: roles.map((role) => ({
        name: role.name,
        slug: role.slug,
        category: role.category,
        description: role.description,
        permissions: role.permissions.map(p => typeof p === "string" ? p : String(p)),
        permissionCount: role.permissionCount ?? role.permissions.length,
        wildcard: role.wildcard || false,
        systemReserved: role.systemReserved || false,
        level: role.level,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fixzit-roles-audit-${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(t("superadmin.roles.jsonExportSuccess", "Roles exported to JSON for audit"));
  }, [roles, dataSource, lastUpdated, t]);

  // Get role by name for comparison
  const getRoleByName = (name: string | null): RoleData | undefined => {
    if (!name) return undefined;
    return roles.find((r) => r.name === name);
  };

  // Group permissions by module
  const groupPermissionsByModule = useCallback((permissions: string[]): GroupedPermission[] => {
    const grouped: Record<string, string[]> = {};
    
    permissions.forEach((perm) => {
      const permStr = typeof perm === "string" ? perm : String(perm);
      // Extract module from permission key (e.g., "finance:read" -> "finance")
      const permModule = permStr.includes(":") 
        ? permStr.split(":")[0] 
        : permStr.includes(".") 
          ? permStr.split(".")[0]
          : "general";
      
      if (!grouped[permModule]) {
        grouped[permModule] = [];
      }
      grouped[permModule].push(permStr);
    });
    
    return Object.entries(grouped)
      .map(([mod, perms]) => ({ module: mod, permissions: perms.sort() }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, []);

  // Calculate canonical role mismatches
  const canonicalMismatches = useMemo((): CanonicalMismatch[] => {
    const mismatches: CanonicalMismatch[] = [];
    const canonicalNames = new Set<string>(CANONICAL_ROLES as readonly string[]);
    const currentNames = new Set(roles.map(r => r.name));
    
    // Find roles in canonical that are missing from current
    CANONICAL_ROLES.forEach((canonicalRole) => {
      if (!currentNames.has(canonicalRole)) {
        mismatches.push({
          roleName: canonicalRole,
          status: "missing",
          details: "Defined in CANONICAL_ROLES but not found in database",
        });
      }
    });
    
    // Find roles in current that are not in canonical
    roles.forEach((role) => {
      if (!canonicalNames.has(role.name)) {
        mismatches.push({
          roleName: role.name,
          status: "extra",
          details: "Found in database but not defined in CANONICAL_ROLES",
        });
      }
    });
    
    return mismatches;
  }, [roles]);

  // Copy to clipboard helper
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t("common.copied", `${label} copied to clipboard`));
    }).catch(() => {
      toast.error(t("common.copyFailed", "Failed to copy to clipboard"));
    });
  }, [t]);

  // Normalize permissions to string set for comparison
  const normalizePermissions = useCallback((role: RoleData | undefined): Set<string> => {
    if (!role) return new Set();
    const perms = new Set<string>();
    if (role.wildcard) perms.add("*");
    role.permissions.forEach((p) => {
      const permStr = typeof p === "string" ? p : String(p);
      perms.add(permStr);
    });
    return perms;
  }, []);

  // Get all unique permissions for comparison
  const getAllPermissions = useCallback((role1: RoleData | undefined, role2: RoleData | undefined): string[] => {
    const perms1 = normalizePermissions(role1);
    const perms2 = normalizePermissions(role2);
    const allPerms = new Set([...perms1, ...perms2]);
    return Array.from(allPerms).sort();
  }, [normalizePermissions]);

  // Check if role has permission
  const roleHasPermission = useCallback((role: RoleData | undefined, perm: string): boolean => {
    if (!role) return false;
    if (role.wildcard) return true;
    const perms = normalizePermissions(role);
    return perms.has(perm) || perms.has("*");
  }, [normalizePermissions]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("superadmin.nav.roles", "Roles & Permissions")}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 flex-wrap">
            RBAC role matrix ({roles.length} roles)
            {dataSource === "api" && (
              <Badge variant="outline" className="text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 me-1" aria-hidden="true" />
                Live
              </Badge>
            )}
            {dataSource === "fallback" && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                Cached
              </Badge>
            )}
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                • Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompareDialogOpen(true)}
            className="gap-2"
            aria-label={t("superadmin.roles.compareRoles", "Compare two roles")}
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            {t("superadmin.roles.compare", "Compare")}
          </Button>
          <Button
            variant={canonicalMismatches.length > 0 ? "destructive" : "outline"}
            size="sm"
            onClick={() => setCanonicalDiffDialogOpen(true)}
            className="gap-2"
            aria-label={t("superadmin.roles.diffCanonical", "Compare with canonical roles")}
          >
            <GitCompare className="h-4 w-4" aria-hidden="true" />
            {t("superadmin.roles.diffCanonical", "Diff")}
            {canonicalMismatches.length > 0 && (
              <Badge variant="secondary" className="ms-1">{canonicalMismatches.length}</Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="gap-2"
            aria-label={t("superadmin.roles.exportCsv", "Export roles to CSV")}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("superadmin.roles.csv", "CSV")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJSON}
            className="gap-2"
            aria-label={t("superadmin.roles.exportJson", "Export roles to JSON")}
          >
            <FileJson className="h-4 w-4" aria-hidden="true" />
            {t("superadmin.roles.json", "JSON")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setHistoryDialogOpen(true);
              fetchRoleHistory();
            }}
            className="gap-2"
            aria-label={t("superadmin.roles.viewHistory", "View role change history")}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t("superadmin.roles.history", "History")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRoles}
            disabled={loading}
            className="gap-2"
            aria-label={t("common.refresh", "Refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-3 flex items-center gap-2" role="alert">
          <AlertCircle className="h-4 w-4 text-yellow-400" aria-hidden="true" />
          <span className="text-sm text-yellow-300">{error}</span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder={t("superadmin.roles.searchPlaceholder", "Search roles by name, description, or permission...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
            aria-label={t("superadmin.roles.searchLabel", "Search roles")}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t("common.clearSearch", "Clear search")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        
        {/* Category tabs */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              className="gap-1"
              aria-pressed={categoryFilter === cat}
            >
              {cat !== "All" && CATEGORY_ICONS[cat]}
              {cat} ({categoryCounts[cat]})
            </Button>
          ))}
        </div>
      </div>

      {/* Special Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={showOnlyWildcard ? "default" : "outline"}
          size="sm"
          onClick={() => setShowOnlyWildcard(!showOnlyWildcard)}
          className="gap-1"
          aria-pressed={showOnlyWildcard}
        >
          <Star className="h-4 w-4" aria-hidden="true" />
          {t("superadmin.roles.wildcardRoles", "Wildcard")} ({wildcardCount})
        </Button>
        <Button
          variant={showOnlySystemReserved ? "default" : "outline"}
          size="sm"
          onClick={() => setShowOnlySystemReserved(!showOnlySystemReserved)}
          className="gap-1"
          aria-pressed={showOnlySystemReserved}
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          {t("superadmin.roles.systemReserved", "System Reserved")} ({systemReservedCount})
        </Button>
      </div>

      {/* Role Categories Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["Administrative", "FM", "Staff", "External"] as const).map((category) => (
          <Card 
            key={category} 
            className={`cursor-pointer transition-all ${categoryFilter === category ? "ring-2 ring-primary" : ""}`}
            onClick={() => setCategoryFilter(categoryFilter === category ? "All" : category)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setCategoryFilter(categoryFilter === category ? "All" : category)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${CATEGORY_COLORS[category]}`}>
                  {CATEGORY_ICONS[category]}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{category}</p>
                  <p className="text-xl font-bold text-foreground">{categoryCounts[category]} roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Definitions
            {loading && <Loader2 className="h-4 w-4 animate-spin ms-2" />}
          </CardTitle>
          <CardDescription>
            {filteredRoles.length === roles.length
              ? `Showing all ${roles.length} roles`
              : `Showing ${filteredRoles.length} of ${roles.length} roles`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>{t("superadmin.roles.role", "Role")}</TableHead>
                <TableHead>{t("superadmin.roles.category", "Category")}</TableHead>
                <TableHead>{t("superadmin.roles.description", "Description")}</TableHead>
                <TableHead>{t("superadmin.roles.permissionCount", "Permissions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t("superadmin.roles.noResults", "No roles match your search criteria")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => {
                  const isExpanded = expandedRows.has(role.name);
                  const hasMany = role.permissions.length > 4;
                  const permCount = role.permissionCount ?? role.permissions.length;
                  
                  return (
                    <TableRow 
                      key={role.name} 
                      className="group cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRoleForDetail(role)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedRoleForDetail(role)}
                      aria-label={t("superadmin.roles.viewDetails", `View details for ${role.name}`)}
                    >
                      <TableCell>
                        {hasMany && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(role.name);
                            }}
                            className="p-1 hover:bg-muted rounded"
                            aria-label={isExpanded 
                              ? t("superadmin.roles.collapsePermissions", `Collapse permissions for ${role.name}`)
                              : t("superadmin.roles.expandPermissions", `Expand permissions for ${role.name}`)
                            }
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{role.name}</span>
                          {(role.permissions.includes("*") || role.wildcard) && (
                            <span title={t("superadmin.roles.fullAccess", "Full Access")}>
                              <Star className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                            </span>
                          )}
                          {role.systemReserved && (
                            <Badge variant="outline" className="text-xs" title={t("superadmin.roles.systemReservedTooltip", "Protected from modification")}>
                              <Lock className="h-3 w-3 me-1" aria-hidden="true" />
                              {t("superadmin.roles.system", "System")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CATEGORY_COLORS[role.category]}>
                          {CATEGORY_ICONS[role.category]}
                          <span className="ms-1">{role.category}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{role.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(isExpanded ? role.permissions : role.permissions.slice(0, 4)).map((perm) => {
                            const permStr = typeof perm === "string" ? perm : String(perm);
                            return (
                              <Badge key={permStr} variant="outline" className="text-xs">
                                {permStr}
                              </Badge>
                            );
                          })}
                          {!isExpanded && hasMany && (
                            <Badge 
                              variant="outline" 
                              className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                              onClick={() => toggleRowExpansion(role.name)}
                              role="button"
                              aria-label={t("superadmin.roles.showMorePermissions", `Show ${permCount - 4} more permissions`)}
                            >
                              +{permCount - 4} {t("superadmin.roles.more", "more")}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ms-2">
                            ({permCount} {t("superadmin.roles.total", "total")})
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="bg-blue-950/30 border-blue-800/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-blue-300 font-medium">{t("superadmin.roles.rbacConfig", "RBAC Configuration")}</p>
              <p className="text-sm text-blue-400/80 mt-1">
                {t("superadmin.roles.rbacNote", 
                  `Roles are sourced from /api/superadmin/roles (primary) with fallback to types/user.ts. ${CANONICAL_ROLES.length} canonical roles are defined in the system.`
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Comparison Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-labelledby="compare-dialog-title">
          <DialogHeader>
            <DialogTitle id="compare-dialog-title" className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
              {t("superadmin.roles.compareRoles", "Compare Roles")}
            </DialogTitle>
            <DialogDescription>
              {t("superadmin.roles.compareDescription", "Select two roles to compare their permissions side-by-side")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Role 1 selector */}
            <div>
              <label htmlFor="compare-role-1" className="text-sm font-medium mb-2 block">
                {t("superadmin.roles.firstRole", "First Role")}
              </label>
              <select
                id="compare-role-1"
                value={selectedRolesForCompare[0] || ""}
                onChange={(e) => setSelectedRolesForCompare([e.target.value || null, selectedRolesForCompare[1]])}
                className="w-full p-2 rounded-md border bg-background text-foreground"
                aria-label={t("superadmin.roles.selectFirstRole", "Select first role for comparison")}
              >
                <option value="">{t("superadmin.roles.selectRole", "Select a role...")}</option>
                {roles.map((role) => (
                  <option key={role.name} value={role.name} disabled={role.name === selectedRolesForCompare[1]}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Role 2 selector */}
            <div>
              <label htmlFor="compare-role-2" className="text-sm font-medium mb-2 block">
                {t("superadmin.roles.secondRole", "Second Role")}
              </label>
              <select
                id="compare-role-2"
                value={selectedRolesForCompare[1] || ""}
                onChange={(e) => setSelectedRolesForCompare([selectedRolesForCompare[0], e.target.value || null])}
                className="w-full p-2 rounded-md border bg-background text-foreground"
                aria-label={t("superadmin.roles.selectSecondRole", "Select second role for comparison")}
              >
                <option value="">{t("superadmin.roles.selectRole", "Select a role...")}</option>
                {roles.map((role) => (
                  <option key={role.name} value={role.name} disabled={role.name === selectedRolesForCompare[0]}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Show only differences toggle */}
          {selectedRolesForCompare[0] && selectedRolesForCompare[1] && (
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant={showOnlyDifferences ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyDifferences(!showOnlyDifferences)}
                className="gap-2"
                aria-pressed={showOnlyDifferences}
              >
                {showOnlyDifferences ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
                {showOnlyDifferences 
                  ? t("superadmin.roles.showingDifferences", "Showing differences only")
                  : t("superadmin.roles.showAllPermissions", "Show differences only")
                }
              </Button>
            </div>
          )}

          {/* Comparison table */}
          {selectedRolesForCompare[0] && selectedRolesForCompare[1] && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("superadmin.roles.permission", "Permission")}</TableHead>
                    <TableHead className="text-center">{selectedRolesForCompare[0]}</TableHead>
                    <TableHead className="text-center">{selectedRolesForCompare[1]}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getAllPermissions(
                    getRoleByName(selectedRolesForCompare[0]),
                    getRoleByName(selectedRolesForCompare[1])
                  ).filter((perm) => {
                    if (!showOnlyDifferences) return true;
                    const role1 = getRoleByName(selectedRolesForCompare[0]);
                    const role2 = getRoleByName(selectedRolesForCompare[1]);
                    const hasRole1 = roleHasPermission(role1, perm);
                    const hasRole2 = roleHasPermission(role2, perm);
                    return hasRole1 !== hasRole2;
                  }).map((perm) => {
                    const role1 = getRoleByName(selectedRolesForCompare[0]);
                    const role2 = getRoleByName(selectedRolesForCompare[1]);
                    const hasRole1 = roleHasPermission(role1, perm);
                    const hasRole2 = roleHasPermission(role2, perm);
                    const permStr = typeof perm === "string" ? perm : String(perm);
                    
                    return (
                      <TableRow key={permStr}>
                        <TableCell className="font-mono text-sm">{permStr}</TableCell>
                        <TableCell className="text-center">
                          {hasRole1 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 inline" aria-label={t("superadmin.roles.hasPermission", "Has permission")} />
                          ) : (
                            <X className="h-5 w-5 text-red-500/50 inline" aria-label={t("superadmin.roles.noPermission", "Does not have permission")} />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasRole2 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 inline" aria-label={t("superadmin.roles.hasPermission", "Has permission")} />
                          ) : (
                            <X className="h-5 w-5 text-red-500/50 inline" aria-label={t("superadmin.roles.noPermission", "Does not have permission")} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Canonical Diff Dialog */}
      <Dialog open={canonicalDiffDialogOpen} onOpenChange={setCanonicalDiffDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-labelledby="canonical-diff-title">
          <DialogHeader>
            <DialogTitle id="canonical-diff-title" className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" aria-hidden="true" />
              {t("superadmin.roles.canonicalDiff", "Canonical Role Comparison")}
            </DialogTitle>
            <DialogDescription>
              {t("superadmin.roles.canonicalDiffDescription", "Compare database roles against the canonical role definitions in types/user.ts")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {canonicalMismatches.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-950/30 border border-green-800/50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-400" aria-hidden="true" />
                <div>
                  <p className="text-green-300 font-medium">{t("superadmin.roles.allSynced", "All Roles Synced")}</p>
                  <p className="text-sm text-green-400/80">
                    {t("superadmin.roles.allSyncedDesc", "All database roles match the canonical role definitions.")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 bg-yellow-950/30 border border-yellow-800/50 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                  <div>
                    <p className="text-yellow-300 font-medium">
                      {t("superadmin.roles.mismatchesFound", `${canonicalMismatches.length} Mismatch(es) Found`)}
                    </p>
                    <p className="text-sm text-yellow-400/80">
                      {t("superadmin.roles.mismatchesDesc", "Review the differences between database and canonical roles.")}
                    </p>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("superadmin.roles.roleName", "Role Name")}</TableHead>
                      <TableHead>{t("superadmin.roles.status", "Status")}</TableHead>
                      <TableHead>{t("superadmin.roles.details", "Details")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {canonicalMismatches.map((mismatch) => (
                      <TableRow key={mismatch.roleName}>
                        <TableCell className="font-mono">{mismatch.roleName}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={mismatch.status === "missing" ? "destructive" : mismatch.status === "extra" ? "secondary" : "outline"}
                          >
                            {mismatch.status === "missing" && t("superadmin.roles.missing", "Missing")}
                            {mismatch.status === "extra" && t("superadmin.roles.extra", "Extra")}
                            {mismatch.status === "permission_diff" && t("superadmin.roles.permDiff", "Permission Diff")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{mismatch.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
            
            <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded">
              <p>{t("superadmin.roles.canonicalCount", `Canonical roles: ${CANONICAL_ROLES.length}`)}</p>
              <p>{t("superadmin.roles.databaseCount", `Database roles: ${roles.length}`)}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Detail Dialog */}
      <Dialog open={!!selectedRoleForDetail} onOpenChange={(open) => !open && setSelectedRoleForDetail(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" aria-labelledby="role-detail-title">
          {selectedRoleForDetail && (
            <>
              <DialogHeader>
                <DialogTitle id="role-detail-title" className="flex items-center gap-2">
                  <span className="font-mono">{selectedRoleForDetail.name}</span>
                  {selectedRoleForDetail.wildcard && (
                    <Star className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                  )}
                  {selectedRoleForDetail.systemReserved && (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="h-3 w-3 me-1" aria-hidden="true" />
                      {t("superadmin.roles.system", "System")}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>{selectedRoleForDetail.description}</DialogDescription>
              </DialogHeader>
              
              <div className="mt-6 space-y-6">
                {/* Role Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("superadmin.roles.category", "Category")}</span>
                    <Badge variant="outline" className={CATEGORY_COLORS[selectedRoleForDetail.category]}>
                      {CATEGORY_ICONS[selectedRoleForDetail.category]}
                      <span className="ms-1">{selectedRoleForDetail.category}</span>
                    </Badge>
                  </div>
                  
                  {selectedRoleForDetail.slug && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t("superadmin.roles.slug", "Slug")}</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{selectedRoleForDetail.slug}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedRoleForDetail.slug || "", "Slug")}
                          aria-label={t("common.copy", "Copy")}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {selectedRoleForDetail.level !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t("superadmin.roles.level", "Level")}</span>
                      <span className="font-mono">{selectedRoleForDetail.level}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("superadmin.roles.permissionCount", "Permissions")}</span>
                    <span className="font-mono">{selectedRoleForDetail.permissionCount ?? selectedRoleForDetail.permissions.length}</span>
                  </div>
                </div>
                
                {/* Permissions by Module */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" aria-hidden="true" />
                    {t("superadmin.roles.permissionsByModule", "Permissions by Module")}
                  </h4>
                  
                  {selectedRoleForDetail.wildcard && (
                    <div className="p-3 bg-yellow-950/30 border border-yellow-800/50 rounded-lg mb-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        <span className="text-yellow-300 font-medium">{t("superadmin.roles.fullAccess", "Full Access")}</span>
                      </div>
                      <p className="text-sm text-yellow-400/80 mt-1">
                        {t("superadmin.roles.fullAccessDesc", "This role has wildcard (*) access to all permissions.")}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {groupPermissionsByModule(selectedRoleForDetail.permissions).map(({ module: mod, permissions }) => (
                      <div key={mod} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium capitalize">{mod}</h5>
                          <span className="text-xs text-muted-foreground">{permissions.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {permissions.map((perm) => (
                            <Badge 
                              key={perm} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-muted"
                              onClick={() => copyToClipboard(perm, "Permission")}
                              title={t("common.clickToCopy", "Click to copy")}
                            >
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="pt-4 border-t space-y-2">
                  <h4 className="text-sm font-medium mb-3">{t("superadmin.roles.quickActions", "Quick Actions")}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => copyToClipboard(selectedRoleForDetail.name, "Role name")}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {t("superadmin.roles.copyRoleName", "Copy Role Name")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => copyToClipboard(JSON.stringify(selectedRoleForDetail.permissions), "Permissions")}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {t("superadmin.roles.copyPermissions", "Copy All Permissions")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setSelectedRolesForCompare([selectedRoleForDetail.name, null]);
                      setCompareDialogOpen(true);
                      setSelectedRoleForDetail(null);
                    }}
                  >
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                    {t("superadmin.roles.compareWithAnother", "Compare with Another Role")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Change History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-labelledby="history-dialog-title">
          <DialogHeader>
            <DialogTitle id="history-dialog-title" className="flex items-center gap-2">
              <Clock className="h-5 w-5" aria-hidden="true" />
              {t("superadmin.roles.roleHistory", "Role Change History")}
            </DialogTitle>
            <DialogDescription>
              {t("superadmin.roles.historyDescription", "View recent changes to roles and permissions")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                <span className="ms-2 text-muted-foreground">{t("common.loading", "Loading...")}</span>
              </div>
            ) : historyError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-destructive/70 mb-3" aria-hidden="true" />
                <p className="text-destructive">{historyError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => fetchRoleHistory()}
                >
                  <RefreshCw className="h-4 w-4 me-2" aria-hidden="true" />
                  {t("common.retry", "Retry")}
                </Button>
              </div>
            ) : roleHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
                <p className="text-muted-foreground">{t("superadmin.roles.noHistory", "No role changes recorded yet")}</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {t("superadmin.roles.noHistoryDesc", "Changes to roles will appear here once audit logging is active.")}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("superadmin.roles.action", "Action")}</TableHead>
                    <TableHead>{t("superadmin.roles.roleName", "Role")}</TableHead>
                    <TableHead>{t("superadmin.roles.timestamp", "Time")}</TableHead>
                    <TableHead>{t("superadmin.roles.status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {entry.action.replace("role.", "")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{entry.roleName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {entry.success ? (
                          <Badge variant="outline" className="text-green-400 border-green-500/30">
                            <CheckCircle className="h-3 w-3 me-1" aria-hidden="true" />
                            {t("common.success", "Success")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 me-1" aria-hidden="true" />
                            {t("common.failed", "Failed")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
