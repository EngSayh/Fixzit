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

import { useCallback, useEffect, useMemo, useState } from "react";
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
  wildcard?: boolean;
  systemReserved?: boolean;
  level?: number;
}

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
        // Map API roles to our interface, adding category based on role name if not present
        const mappedRoles = data.roles.map((role: RoleData) => ({
          ...role,
          category: role.category || inferCategory(role.name),
          permissions: role.permissions || (role.wildcard ? ["*"] : []),
        }));
        setRoles(mappedRoles);
        setDataSource("api");
      } else {
        // API returned empty or no roles, use fallback
        setRoles(FALLBACK_ROLES);
        setDataSource("fallback");
      }
    } catch (_err) {
      // API failed, use fallback data
      setRoles(FALLBACK_ROLES);
      setDataSource("fallback");
      setError("Using cached role definitions (API unavailable)");
    } finally {
      setLoading(false);
    }
  }, []);

  // Infer category from role name
  function inferCategory(name: string): string {
    if (["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN", "MANAGER"].includes(name)) {
      return "Administrative";
    }
    if (["FM_MANAGER", "PROPERTY_MANAGER", "TECHNICIAN"].includes(name)) {
      return "FM";
    }
    if (["OWNER", "TENANT", "VENDOR", "AUDITOR", "CORPORATE_OWNER"].includes(name)) {
      return "External";
    }
    return "Staff";
  }

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Filtered roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      // Category filter
      if (categoryFilter !== "All" && role.category !== categoryFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          role.name.toLowerCase().includes(query) ||
          role.description.toLowerCase().includes(query) ||
          role.permissions.some((p) => p.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [roles, categoryFilter, searchQuery]);

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

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = ["Role", "Category", "Description", "Permissions", "Wildcard", "System Reserved"];
    const rows = roles.map((role) => [
      role.name,
      role.category,
      `"${role.description}"`,
      `"${role.permissions.join(", ")}"`,
      role.wildcard ? "Yes" : "No",
      role.systemReserved ? "Yes" : "No",
    ]);

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
    
    toast.success("Roles matrix exported to CSV");
  }, [roles]);

  // Get role by name for comparison
  const getRoleByName = (name: string | null): RoleData | undefined => {
    if (!name) return undefined;
    return roles.find((r) => r.name === name);
  };

  // Get all unique permissions for comparison
  const getAllPermissions = (role1: RoleData | undefined, role2: RoleData | undefined): string[] => {
    const allPerms = new Set<string>();
    role1?.permissions.forEach((p) => allPerms.add(p));
    role2?.permissions.forEach((p) => allPerms.add(p));
    return Array.from(allPerms).sort();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("superadmin.nav.roles", "Roles & Permissions")}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            RBAC role matrix ({roles.length} roles)
            {dataSource === "api" && (
              <Badge variant="outline" className="text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 me-1" />
                Live
              </Badge>
            )}
            {dataSource === "fallback" && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                Cached
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompareDialogOpen(true)}
            className="gap-2"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Compare
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRoles}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-yellow-300">{error}</span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles by name, description, or permission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
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
            >
              {cat !== "All" && CATEGORY_ICONS[cat]}
              {cat} ({categoryCounts[cat]})
            </Button>
          ))}
        </div>
      </div>

      {/* Role Categories Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["Administrative", "FM", "Staff", "External"] as const).map((category) => (
          <Card 
            key={category} 
            className={`cursor-pointer transition-all ${categoryFilter === category ? "ring-2 ring-primary" : ""}`}
            onClick={() => setCategoryFilter(categoryFilter === category ? "All" : category)}
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
                <TableHead>Role</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No roles match your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => {
                  const isExpanded = expandedRows.has(role.name);
                  const hasMany = role.permissions.length > 4;
                  
                  return (
                    <TableRow key={role.name} className="group">
                      <TableCell>
                        {hasMany && (
                          <button
                            onClick={() => toggleRowExpansion(role.name)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{role.name}</span>
                          {(role.permissions.includes("*") || role.wildcard) && (
                            <span title="Full Access">
                              <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                            </span>
                          )}
                          {role.systemReserved && (
                            <Badge variant="outline" className="text-xs">System</Badge>
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
                          {(isExpanded ? role.permissions : role.permissions.slice(0, 4)).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                          {!isExpanded && hasMany && (
                            <Badge 
                              variant="outline" 
                              className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                              onClick={() => toggleRowExpansion(role.name)}
                            >
                              +{role.permissions.length - 4} more
                            </Badge>
                          )}
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
            <Shield className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 font-medium">RBAC Configuration</p>
              <p className="text-sm text-blue-400/80 mt-1">
                Roles are sourced from <code className="text-blue-300">/api/superadmin/roles</code> (primary) 
                with fallback to <code className="text-blue-300">types/user.ts</code>. 
                {CANONICAL_ROLES.length} canonical roles are defined in the system.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Comparison Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Compare Roles
            </DialogTitle>
            <DialogDescription>
              Select two roles to compare their permissions side-by-side
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Role 1 selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">First Role</label>
              <select
                value={selectedRolesForCompare[0] || ""}
                onChange={(e) => setSelectedRolesForCompare([e.target.value || null, selectedRolesForCompare[1]])}
                className="w-full p-2 rounded-md border bg-background text-foreground"
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.name} value={role.name} disabled={role.name === selectedRolesForCompare[1]}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Role 2 selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Second Role</label>
              <select
                value={selectedRolesForCompare[1] || ""}
                onChange={(e) => setSelectedRolesForCompare([selectedRolesForCompare[0], e.target.value || null])}
                className="w-full p-2 rounded-md border bg-background text-foreground"
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.name} value={role.name} disabled={role.name === selectedRolesForCompare[0]}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison table */}
          {selectedRolesForCompare[0] && selectedRolesForCompare[1] && (
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead className="text-center">{selectedRolesForCompare[0]}</TableHead>
                    <TableHead className="text-center">{selectedRolesForCompare[1]}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getAllPermissions(
                    getRoleByName(selectedRolesForCompare[0]),
                    getRoleByName(selectedRolesForCompare[1])
                  ).map((perm) => {
                    const role1 = getRoleByName(selectedRolesForCompare[0]);
                    const role2 = getRoleByName(selectedRolesForCompare[1]);
                    const hasRole1 = role1?.permissions.includes(perm) || role1?.permissions.includes("*") || role1?.wildcard;
                    const hasRole2 = role2?.permissions.includes(perm) || role2?.permissions.includes("*") || role2?.wildcard;
                    
                    return (
                      <TableRow key={perm}>
                        <TableCell className="font-mono text-sm">{perm}</TableCell>
                        <TableCell className="text-center">
                          {hasRole1 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 inline" />
                          ) : (
                            <X className="h-5 w-5 text-red-500/50 inline" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasRole2 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 inline" />
                          ) : (
                            <X className="h-5 w-5 text-red-500/50 inline" />
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
    </div>
  );
}
