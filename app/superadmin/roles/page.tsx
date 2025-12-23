"use client";

/**
 * Superadmin Roles & Permissions
 * View RBAC configuration (read-only reference)
 * 
 * @module app/superadmin/roles/page
 */

import { useI18n } from "@/i18n/useI18n";
import { Shield, CheckCircle, Users, Building2, Wrench } from "@/components/ui/icons";
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

// RBAC Role Matrix (read from types/user.ts)
const ROLES = [
  { name: "SUPER_ADMIN", description: "Full system access", category: "Administrative", permissions: ["*"] },
  { name: "CORPORATE_ADMIN", description: "Full org access", category: "Administrative", permissions: ["*"] },
  { name: "ADMIN", description: "Organization admin", category: "Administrative", permissions: ["dashboard", "workOrders", "properties", "finance", "hr", "administration"] },
  { name: "MANAGER", description: "Department manager", category: "Administrative", permissions: ["dashboard", "workOrders", "properties", "hr", "support", "reports"] },
  { name: "FM_MANAGER", description: "Facility management lead", category: "FM", permissions: ["dashboard", "workOrders", "properties", "hr", "support", "reports"] },
  { name: "PROPERTY_MANAGER", description: "Property operations", category: "FM", permissions: ["dashboard", "properties", "workOrders", "crm", "support", "reports"] },
  { name: "TECHNICIAN", description: "Field technician", category: "FM", permissions: ["dashboard", "workOrders", "support"] },
  { name: "TEAM_MEMBER", description: "General staff", category: "Staff", permissions: ["dashboard", "workOrders", "support", "reports"] },
  { name: "FINANCE", description: "Finance module access", category: "Staff", permissions: ["dashboard", "finance", "reports", "support"] },
  { name: "HR", description: "HR module access", category: "Staff", permissions: ["dashboard", "hr", "support", "reports"] },
  { name: "PROCUREMENT", description: "Procurement access", category: "Staff", permissions: ["dashboard", "marketplace", "support", "reports"] },
  { name: "OWNER", description: "Property owner", category: "External", permissions: ["dashboard", "properties", "support", "reports"] },
  { name: "TENANT", description: "Property tenant", category: "External", permissions: ["dashboard", "properties", "support", "reports"] },
  { name: "VENDOR", description: "Marketplace vendor", category: "External", permissions: ["dashboard", "marketplace", "support"] },
];

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("superadmin.nav.roles")}
        </h1>
        <p className="text-slate-400">
          RBAC role matrix reference (14-role system)
        </p>
      </div>

      {/* Role Categories Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["Administrative", "FM", "Staff", "External"].map((category) => {
          const count = ROLES.filter((r) => r.category === category).length;
          return (
            <Card key={category} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${CATEGORY_COLORS[category]}`}>
                    {CATEGORY_ICONS[category]}
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{category}</p>
                    <p className="text-xl font-bold text-white">{count} roles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Roles Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Role Definitions
          </CardTitle>
          <CardDescription className="text-slate-400">
            System-wide RBAC configuration (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Role</TableHead>
                <TableHead className="text-slate-400">Category</TableHead>
                <TableHead className="text-slate-400">Description</TableHead>
                <TableHead className="text-slate-400">Modules</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((role) => (
                <TableRow key={role.name} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{role.name}</span>
                      {role.permissions.includes("*") && (
                        <span title="Full Access">
                          <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CATEGORY_COLORS[role.category]}>
                      {CATEGORY_ICONS[role.category]}
                      <span className="ms-1">{role.category}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{role.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 4).map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs text-slate-400 border-slate-700">
                          {perm}
                        </Badge>
                      ))}
                      {role.permissions.length > 4 && (
                        <Badge variant="outline" className="text-xs text-slate-500 border-slate-700">
                          +{role.permissions.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
                Role definitions are defined in <code className="text-blue-300">types/user.ts</code> and 
                permission mappings in <code className="text-blue-300">config/navigation.ts</code>.
                To modify roles, update these source files and redeploy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
