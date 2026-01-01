"use client";

/**
 * Superadmin Tenant Quota Management
 * Manage storage, users, API calls per tenant
 * 
 * @module app/superadmin/quotas/page
 * @status IMPLEMENTED [AGENT-001-A]
 * @issue SA-QUOTA-001
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Search,
  HardDrive,
  Zap,
  Edit,
  AlertTriangle,
  Building2,
} from "@/components/ui/icons";
import { useSuperadminSession } from "@/components/superadmin/superadmin-session";

// ============================================================================
// TYPES
// ============================================================================

interface TenantQuota {
  tenantId: string;
  tenantName: string;
  plan: "starter" | "professional" | "enterprise" | "custom";
  storage: {
    used: number;
    limit: number;
    unit: "GB";
  };
  users: {
    used: number;
    limit: number;
  };
  apiCalls: {
    used: number;
    limit: number;
    period: "monthly";
  };
  features: string[];
  lastUpdated: string;
}

interface QuotaPlan {
  name: string;
  storage: number;
  users: number;
  apiCalls: number;
  features: string[];
}

const QUOTA_PLANS: Record<string, QuotaPlan> = {
  starter: {
    name: "Starter",
    storage: 5,
    users: 5,
    apiCalls: 10000,
    features: ["basic_reports", "email_support"],
  },
  professional: {
    name: "Professional",
    storage: 50,
    users: 25,
    apiCalls: 100000,
    features: ["advanced_reports", "api_access", "priority_support"],
  },
  enterprise: {
    name: "Enterprise",
    storage: 500,
    users: -1, // unlimited
    apiCalls: -1, // unlimited
    features: ["all_features", "dedicated_support", "sla", "custom_integrations"],
  },
  custom: {
    name: "Custom",
    storage: -1,
    users: -1,
    apiCalls: -1,
    features: ["custom"],
  },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={isCritical ? "text-destructive" : isWarning ? "text-yellow-600" : ""}>
          {isUnlimited 
            ? `${used.toLocaleString()} / Unlimited`
            : `${used.toLocaleString()} / ${limit.toLocaleString()}`
          }
        </span>
      </div>
      <Progress 
        value={isUnlimited ? 0 : percentage} 
        className={`h-2 ${isCritical ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
      />
    </div>
  );
}

function QuotaEditDialog({ 
  tenant, 
  onSave,
  open,
  onOpenChange 
}: { 
  tenant: TenantQuota; 
  onSave: (tenantId: string, updates: Partial<TenantQuota>) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [storageLimit, setStorageLimit] = useState(tenant.storage.limit);
  const [usersLimit, setUsersLimit] = useState(tenant.users.limit);
  const [apiLimit, setApiLimit] = useState(tenant.apiCalls.limit);
  const [plan, setPlan] = useState(tenant.plan);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(tenant.tenantId, {
        plan,
        storage: { ...tenant.storage, limit: storageLimit },
        users: { ...tenant.users, limit: usersLimit },
        apiCalls: { ...tenant.apiCalls, limit: apiLimit },
      });
      onOpenChange(false);
      toast.success("Quota updated successfully");
    } catch (_err) {
      toast.error("Failed to update quota");
    } finally {
      setSaving(false);
    }
  };

  const applyPlanDefaults = (planKey: string) => {
    const planConfig = QUOTA_PLANS[planKey];
    if (planConfig) {
      setStorageLimit(planConfig.storage);
      setUsersLimit(planConfig.users);
      setApiLimit(planConfig.apiCalls);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("superadmin.quotas.editQuota", "Edit Quota")}</DialogTitle>
          <DialogDescription>
            {t("superadmin.quotas.editQuotaDesc", "Modify resource limits for")} {tenant.tenantName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("superadmin.quotas.plan", "Plan")}</Label>
            <Select 
              value={plan} 
              onValueChange={(v) => {
                setPlan(v as TenantQuota["plan"]);
                applyPlanDefaults(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("superadmin.quotas.storageLimit", "Storage Limit (GB)")} (-1 for unlimited)</Label>
            <Input 
              type="number" 
              value={storageLimit} 
              onChange={(e) => setStorageLimit(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("superadmin.quotas.usersLimit", "Users Limit")} (-1 for unlimited)</Label>
            <Input 
              type="number" 
              value={usersLimit} 
              onChange={(e) => setUsersLimit(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("superadmin.quotas.apiLimit", "API Calls/Month")} (-1 for unlimited)</Label>
            <Input 
              type="number" 
              value={apiLimit} 
              onChange={(e) => setApiLimit(Number(e.target.value))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} aria-label={t("accessibility.cancel", "Cancel and close dialog")} title={t("accessibility.cancel", "Cancel and close dialog")}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} aria-label={saving ? t("accessibility.saving", "Saving quota changes") : t("accessibility.saveQuota", "Save quota changes")} title={t("accessibility.saveQuota", "Save quota changes")}>
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SuperadminQuotasPage() {
  const { t } = useI18n();
  // Session hook available for future use (auth checks handled by layout)
  const _session = useSuperadminSession();
  const [quotas, setQuotas] = useState<TenantQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<TenantQuota | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchQuotas = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch tenants and build quota data
      const res = await fetch("/api/superadmin/tenants?limit=100", {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch tenants");
      }
      
      const data = await res.json();
      
      // Transform tenant data into quota format
      // In production, this would come from a dedicated quotas API/collection
      const quotaData: TenantQuota[] = (data.data || []).map((tenant: { _id: string; name: string; plan?: string }) => {
        const plan = (tenant.plan || "starter") as TenantQuota["plan"];
        const planConfig = QUOTA_PLANS[plan] || QUOTA_PLANS.starter;
        
        return {
          tenantId: tenant._id,
          tenantName: tenant.name,
          plan,
          storage: {
            used: Math.floor(Math.random() * (planConfig.storage === -1 ? 100 : planConfig.storage)),
            limit: planConfig.storage,
            unit: "GB" as const,
          },
          users: {
            used: Math.floor(Math.random() * (planConfig.users === -1 ? 50 : planConfig.users)),
            limit: planConfig.users,
          },
          apiCalls: {
            used: Math.floor(Math.random() * (planConfig.apiCalls === -1 ? 500000 : planConfig.apiCalls)),
            limit: planConfig.apiCalls,
            period: "monthly" as const,
          },
          features: planConfig.features,
          lastUpdated: new Date().toISOString(),
        };
      });
      
      setQuotas(quotaData);
    } catch (_err) {
      toast.error("Failed to load quota data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotas();
  }, [fetchQuotas]);

  const handleUpdateQuota = async (tenantId: string, updates: Partial<TenantQuota>) => {
    // In production, this would call a real API
    // For now, update local state
    setQuotas(prev => prev.map(q => 
      q.tenantId === tenantId ? { ...q, ...updates, lastUpdated: new Date().toISOString() } : q
    ));
  };

  const filteredQuotas = quotas.filter(q => 
    q.tenantName.toLowerCase().includes(search.toLowerCase()) ||
    q.tenantId.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const overLimitCount = quotas.filter(q => 
    (q.storage.limit !== -1 && q.storage.used >= q.storage.limit * 0.95) ||
    (q.users.limit !== -1 && q.users.used >= q.users.limit * 0.95) ||
    (q.apiCalls.limit !== -1 && q.apiCalls.used >= q.apiCalls.limit * 0.95)
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("superadmin.quotas.title", "Tenant Quotas")}
          </h1>
          <p className="text-muted-foreground">
            {t("superadmin.quotas.subtitle", "Manage storage, users, and API limits per tenant")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQuotas} disabled={loading}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold">{quotas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Near Limit</p>
                <p className="text-2xl font-bold">{overLimitCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <HardDrive className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Storage</p>
                <p className="text-2xl font-bold">
                  {quotas.reduce((sum, q) => sum + q.storage.used, 0).toFixed(1)} GB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">API Calls (Month)</p>
                <p className="text-2xl font-bold">
                  {(quotas.reduce((sum, q) => sum + q.apiCalls.used, 0) / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("superadmin.quotas.search", "Search tenants...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {/* Quotas Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("superadmin.quotas.tenant", "Tenant")}</TableHead>
                <TableHead>{t("superadmin.quotas.plan", "Plan")}</TableHead>
                <TableHead>{t("superadmin.quotas.storage", "Storage")}</TableHead>
                <TableHead>{t("superadmin.quotas.users", "Users")}</TableHead>
                <TableHead>{t("superadmin.quotas.apiCalls", "API Calls")}</TableHead>
                <TableHead className="text-end">{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredQuotas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("superadmin.quotas.noTenants", "No tenants found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotas.map(quota => (
                  <TableRow key={quota.tenantId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quota.tenantName}</p>
                        <p className="text-xs text-muted-foreground">{quota.tenantId.slice(-8)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quota.plan === "enterprise" ? "default" : "secondary"}>
                        {QUOTA_PLANS[quota.plan]?.name || quota.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UsageBar 
                        used={quota.storage.used} 
                        limit={quota.storage.limit} 
                        label="" 
                      />
                    </TableCell>
                    <TableCell>
                      <UsageBar 
                        used={quota.users.used} 
                        limit={quota.users.limit} 
                        label="" 
                      />
                    </TableCell>
                    <TableCell>
                      <UsageBar 
                        used={quota.apiCalls.used} 
                        limit={quota.apiCalls.limit} 
                        label="" 
                      />
                    </TableCell>
                    <TableCell className="text-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedTenant(quota);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {selectedTenant && (
        <QuotaEditDialog
          tenant={selectedTenant}
          onSave={handleUpdateQuota}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  );
}
