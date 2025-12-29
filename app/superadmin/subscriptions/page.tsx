"use client";

/**
 * Superadmin Subscriptions Management
 * Comprehensive subscription and tier pricing management
 * 
 * @module app/superadmin/subscriptions/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Wallet, RefreshCw, Search, Eye, Edit, Plus, Trash2,
  Users, Building2, Crown, Star, Sparkles, Check, X,
  DollarSign, TrendingUp, Clock,
} from "@/components/ui/icons";
import { toast } from "sonner";

interface SubscriptionTier {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  features: string[];
  limits: {
    users?: number;
    storage?: number;
    apiCalls?: number;
    [key: string]: number | undefined;
  };
  isActive: boolean;
  isPopular?: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface TenantSubscription {
  _id: string;
  tenantId: string;
  tenantName: string;
  tierId: string;
  tierName: string;
  billingCycle: "monthly" | "annual";
  status: "active" | "trial" | "past_due" | "cancelled" | "expired";
  startDate: string;
  endDate?: string;
  trialEndsAt?: string;
  amount: number;
  currency: string;
  autoRenew: boolean;
  paymentMethod?: string;
  createdAt: string;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  mrr: number;
  arr: number;
}

const TIER_ICONS: Record<string, typeof Crown> = {
  free: Star,
  starter: Sparkles,
  professional: Crown,
  enterprise: Building2,
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  trial: "bg-blue-500/20 text-blue-400",
  past_due: "bg-yellow-500/20 text-yellow-400",
  cancelled: "bg-red-500/20 text-red-400",
  expired: "bg-gray-500/20 text-gray-400",
};

export default function SuperadminSubscriptionsPage() {
  const { t } = useI18n();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Dialogs
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<TenantSubscription | null>(null);

  // Tier form state
  const [tierForm, setTierForm] = useState({
    name: "",
    displayName: "",
    description: "",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "SAR",
    features: "",
    limits: { users: 0, storage: 0, apiCalls: 0 },
    isActive: true,
    isPopular: false,
    sortOrder: 0,
  });

  const fetchTiers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/subscriptions/tiers", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setTiers(Array.isArray(data) ? data : data.tiers || []);
      }
    } catch {
      // May not have tiers API yet
      // Default tiers for demo
      setTiers([
        {
          _id: "tier-free",
          name: "free",
          displayName: "Free",
          description: "Perfect for getting started",
          monthlyPrice: 0,
          annualPrice: 0,
          currency: "SAR",
          features: ["Up to 3 users", "Basic features", "Community support"],
          limits: { users: 3, storage: 1, apiCalls: 1000 },
          isActive: true,
          sortOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "tier-starter",
          name: "starter",
          displayName: "Starter",
          description: "For small teams",
          monthlyPrice: 99,
          annualPrice: 999,
          currency: "SAR",
          features: ["Up to 10 users", "All basic features", "Email support", "API access"],
          limits: { users: 10, storage: 10, apiCalls: 10000 },
          isActive: true,
          sortOrder: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "tier-professional",
          name: "professional",
          displayName: "Professional",
          description: "For growing businesses",
          monthlyPrice: 299,
          annualPrice: 2999,
          currency: "SAR",
          features: ["Up to 50 users", "All features", "Priority support", "Advanced analytics", "Custom integrations"],
          limits: { users: 50, storage: 100, apiCalls: 100000 },
          isActive: true,
          isPopular: true,
          sortOrder: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "tier-enterprise",
          name: "enterprise",
          displayName: "Enterprise",
          description: "For large organizations",
          monthlyPrice: 999,
          annualPrice: 9999,
          currency: "SAR",
          features: ["Unlimited users", "All features", "Dedicated support", "SLA guarantee", "Custom development", "On-premise option"],
          limits: { users: -1, storage: -1, apiCalls: -1 },
          isActive: true,
          sortOrder: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/subscriptions", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(Array.isArray(data) ? data : data.subscriptions || []);
      }
    } catch {
      // Demo data
      setSubscriptions([
        {
          _id: "sub-1",
          tenantId: "tenant-1",
          tenantName: "Acme Corp",
          tierId: "tier-professional",
          tierName: "Professional",
          billingCycle: "annual",
          status: "active",
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 2999,
          currency: "SAR",
          autoRenew: true,
          paymentMethod: "credit_card",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "sub-2",
          tenantId: "tenant-2",
          tenantName: "Tech Solutions",
          tierId: "tier-starter",
          tierName: "Starter",
          billingCycle: "monthly",
          status: "active",
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 99,
          currency: "SAR",
          autoRenew: true,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "sub-3",
          tenantId: "tenant-3",
          tenantName: "StartupXYZ",
          tierId: "tier-starter",
          tierName: "Starter",
          billingCycle: "monthly",
          status: "trial",
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 0,
          currency: "SAR",
          autoRenew: false,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "sub-4",
          tenantId: "tenant-4",
          tenantName: "Legacy Inc",
          tierId: "tier-professional",
          tierName: "Professional",
          billingCycle: "annual",
          status: "past_due",
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 2999,
          currency: "SAR",
          autoRenew: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/subscriptions/stats", { credentials: "include" });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch {
      // Calculate from demo data
      const activeCount = subscriptions.filter(s => s.status === "active").length;
      const trialCount = subscriptions.filter(s => s.status === "trial").length;
      const pastDueCount = subscriptions.filter(s => s.status === "past_due").length;
      const monthlyRevenue = subscriptions
        .filter(s => s.status === "active")
        .reduce((sum, s) => sum + (s.billingCycle === "monthly" ? s.amount : s.amount / 12), 0);
      
      setStats({
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeCount,
        trialSubscriptions: trialCount,
        pastDueSubscriptions: pastDueCount,
        mrr: Math.round(monthlyRevenue),
        arr: Math.round(monthlyRevenue * 12),
      });
    }
  }, [subscriptions]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTiers(), fetchSubscriptions()]);
    setLoading(false);
  }, [fetchTiers, fetchSubscriptions]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (subscriptions.length > 0) fetchStats(); }, [subscriptions, fetchStats]);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = !search || 
      sub.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      sub.tierName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number, currency = "SAR") => {
    return new Intl.NumberFormat("en-SA", { style: "currency", currency }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleSaveTier = async () => {
    try {
      const tierData = {
        ...tierForm,
        features: tierForm.features.split("\n").filter(Boolean),
      };
      
      const url = editingTier 
        ? `/api/admin/subscriptions/tiers/${editingTier._id}`
        : "/api/admin/subscriptions/tiers";
      
      const response = await fetch(url, {
        method: editingTier ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(tierData),
      });
      
      if (response.ok) {
        toast.success(editingTier ? "Tier updated" : "Tier created");
        setTierDialogOpen(false);
        setEditingTier(null);
        fetchTiers();
      } else {
        toast.error("Failed to save tier");
      }
    } catch {
      toast.error("Error saving tier");
    }
  };

  const handleEditTier = (tier: SubscriptionTier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      displayName: tier.displayName,
      description: tier.description || "",
      monthlyPrice: tier.monthlyPrice,
      annualPrice: tier.annualPrice,
      currency: tier.currency,
      features: tier.features.join("\n"),
      limits: tier.limits as { users: number; storage: number; apiCalls: number },
      isActive: tier.isActive,
      isPopular: tier.isPopular || false,
      sortOrder: tier.sortOrder,
    });
    setTierDialogOpen(true);
  };

  const handleNewTier = () => {
    setEditingTier(null);
    setTierForm({
      name: "",
      displayName: "",
      description: "",
      monthlyPrice: 0,
      annualPrice: 0,
      currency: "SAR",
      features: "",
      limits: { users: 0, storage: 0, apiCalls: 0 },
      isActive: true,
      isPopular: false,
      sortOrder: tiers.length + 1,
    });
    setTierDialogOpen(true);
  };

  const handleViewSubscription = (sub: TenantSubscription) => {
    setSelectedSubscription(sub);
    setSubscriptionDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.subscriptions")}</h1>
          <p className="text-muted-foreground">Manage subscription tiers, pricing, and tenant subscriptions</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="border-input text-muted-foreground">
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><Users className="h-5 w-5 text-blue-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.totalSubscriptions}</p><p className="text-sm text-muted-foreground">Total</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20"><Check className="h-5 w-5 text-green-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.activeSubscriptions}</p><p className="text-sm text-muted-foreground">Active</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20"><Clock className="h-5 w-5 text-purple-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.trialSubscriptions}</p><p className="text-sm text-muted-foreground">Trials</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20"><X className="h-5 w-5 text-yellow-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{stats.pastDueSubscriptions}</p><p className="text-sm text-muted-foreground">Past Due</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20"><DollarSign className="h-5 w-5 text-emerald-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{formatCurrency(stats.mrr)}</p><p className="text-sm text-muted-foreground">MRR</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20"><TrendingUp className="h-5 w-5 text-cyan-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{formatCurrency(stats.arr)}</p><p className="text-sm text-muted-foreground">ARR</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList className="bg-muted border-input">
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-muted">Subscriptions</TabsTrigger>
          <TabsTrigger value="tiers" className="data-[state=active]:bg-muted">Pricing Tiers</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search subscriptions..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10 bg-muted border-input text-foreground" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} placeholder="Filter by status">
                <SelectTrigger className="w-[180px] bg-muted border-input">
                  {statusFilter === "all" ? "All Statuses" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><Wallet className="h-5 w-5" />Tenant Subscriptions</CardTitle>
              <CardDescription className="text-muted-foreground">Manage individual tenant subscription plans</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12"><Wallet className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No subscriptions found</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Tenant</TableHead>
                      <TableHead className="text-muted-foreground">Plan</TableHead>
                      <TableHead className="text-muted-foreground">Billing</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Start Date</TableHead>
                      <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((sub) => (
                      <TableRow key={sub._id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">{sub.tenantName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{sub.tierName}</TableCell>
                        <TableCell className="text-muted-foreground capitalize">{sub.billingCycle}</TableCell>
                        <TableCell className="text-foreground">{formatCurrency(sub.amount, sub.currency)}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[sub.status] || "bg-gray-500/20 text-gray-400"}>
                            {sub.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(sub.startDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewSubscription(sub)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tiers Tab */}
        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleNewTier} className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 me-2" />Add Tier
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...tiers].sort((a, b) => a.sortOrder - b.sortOrder).map((tier) => {
              const TierIcon = TIER_ICONS[tier.name] || Star;
              return (
                <Card key={tier._id} className={`bg-card border-border relative ${tier.isPopular ? "ring-2 ring-primary" : ""}`}>
                  {tier.isPopular && (
                    <div className="absolute -top-3 start-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto p-3 rounded-full bg-primary/20 w-fit mb-2">
                      <TierIcon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-foreground">{tier.displayName}</CardTitle>
                    <CardDescription className="text-muted-foreground">{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground">
                        {formatCurrency(tier.monthlyPrice, tier.currency)}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        or {formatCurrency(tier.annualPrice, tier.currency)}/year
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {tier.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-400 shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {tier.features.length > 4 && (
                        <li className="text-sm text-muted-foreground">+{tier.features.length - 4} more features</li>
                      )}
                    </ul>
                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="outline" className={tier.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                        {tier.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTier(tier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTier ? "Edit Tier" : "Create New Tier"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Configure pricing tier details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Internal Name</Label>
                <Input value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} placeholder="e.g., professional" className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={tierForm.displayName} onChange={(e) => setTierForm({ ...tierForm, displayName: e.target.value })} placeholder="e.g., Professional" className="bg-muted border-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={tierForm.description} onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })} placeholder="Short description" className="bg-muted border-input" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Monthly Price</Label>
                <Input type="number" value={tierForm.monthlyPrice} onChange={(e) => setTierForm({ ...tierForm, monthlyPrice: Number(e.target.value) })} className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label>Annual Price</Label>
                <Input type="number" value={tierForm.annualPrice} onChange={(e) => setTierForm({ ...tierForm, annualPrice: Number(e.target.value) })} className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={tierForm.currency} onValueChange={(v) => setTierForm({ ...tierForm, currency: v })} placeholder="Currency">
                  <SelectTrigger className="bg-muted border-input">{tierForm.currency}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea value={tierForm.features} onChange={(e) => setTierForm({ ...tierForm, features: e.target.value })} placeholder={"Feature 1\nFeature 2\nFeature 3"} className="bg-muted border-input min-h-[100px]" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Max Users</Label>
                <Input type="number" value={tierForm.limits.users} onChange={(e) => setTierForm({ ...tierForm, limits: { ...tierForm.limits, users: Number(e.target.value) } })} placeholder="-1 for unlimited" className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label>Storage (GB)</Label>
                <Input type="number" value={tierForm.limits.storage} onChange={(e) => setTierForm({ ...tierForm, limits: { ...tierForm.limits, storage: Number(e.target.value) } })} className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label>API Calls</Label>
                <Input type="number" value={tierForm.limits.apiCalls} onChange={(e) => setTierForm({ ...tierForm, limits: { ...tierForm.limits, apiCalls: Number(e.target.value) } })} className="bg-muted border-input" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={tierForm.isActive} onCheckedChange={(v) => setTierForm({ ...tierForm, isActive: v })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={tierForm.isPopular} onCheckedChange={(v) => setTierForm({ ...tierForm, isPopular: v })} />
                <Label>Popular Badge</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTier}>{editingTier ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">{selectedSubscription?.tenantName}</DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Plan</p><p className="text-foreground font-medium">{selectedSubscription.tierName}</p></div>
                <div><p className="text-sm text-muted-foreground">Billing Cycle</p><p className="text-foreground capitalize">{selectedSubscription.billingCycle}</p></div>
                <div><p className="text-sm text-muted-foreground">Amount</p><p className="text-foreground">{formatCurrency(selectedSubscription.amount, selectedSubscription.currency)}</p></div>
                <div><p className="text-sm text-muted-foreground">Status</p><Badge className={STATUS_COLORS[selectedSubscription.status]}>{selectedSubscription.status.replace("_", " ")}</Badge></div>
                <div><p className="text-sm text-muted-foreground">Start Date</p><p className="text-foreground">{formatDate(selectedSubscription.startDate)}</p></div>
                <div><p className="text-sm text-muted-foreground">Auto Renew</p><p className="text-foreground">{selectedSubscription.autoRenew ? "Yes" : "No"}</p></div>
                {selectedSubscription.trialEndsAt && (
                  <div className="col-span-2"><p className="text-sm text-muted-foreground">Trial Ends</p><p className="text-foreground">{formatDate(selectedSubscription.trialEndsAt)}</p></div>
                )}
                {selectedSubscription.paymentMethod && (
                  <div className="col-span-2"><p className="text-sm text-muted-foreground">Payment Method</p><p className="text-foreground capitalize">{selectedSubscription.paymentMethod.replace("_", " ")}</p></div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">Change Plan</Button>
                <Button variant="outline" className="flex-1">Cancel Subscription</Button>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
