"use client";

/**
 * Superadmin Billing & Plans Management
 * Real billing management using /api/superadmin/billing/*
 * 
 * @module app/superadmin/billing/page
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
import { 
  CreditCard, RefreshCw, Search, Eye,
  DollarSign, TrendingUp, Package, CheckCircle,
} from "@/components/ui/icons";

interface PricePerModule {
  module_key: string;
  monthly_usd: number;
  monthly_sar: number;
}

interface SeatTier {
  min_seats: number;
  max_seats: number;
  discount_pct: number;
  prices?: PricePerModule[];
}

interface PriceBook {
  _id: string;
  name: string;
  description?: string;
  region?: string;
  currency?: string;
  effective_from?: string;
  active?: boolean;
  isActive?: boolean;
  tiers?: SeatTier[];
  createdAt: string;
  updatedAt?: string;
}

interface BenchmarkPlan {
  name?: string;
  price_per_user_month_usd?: number;
  url?: string;
  features?: string[];
}

interface BenchmarkSource {
  _id: string;
  vendor: string;
  region?: string;
  plans?: BenchmarkPlan[];
  retrieved_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BenchmarkRow {
  _id: string;
  name: string;
  type: string;
  value?: number | null;
  unit?: string;
  period?: string;
  createdAt?: string;
}

interface AnnualDiscount {
  percentage: number;
  minMonths?: number;
  enabled: boolean;
}

export default function SuperadminBillingPage() {
  const { t } = useI18n();
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [annualDiscount, setAnnualDiscount] = useState<AnnualDiscount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPriceBook, setSelectedPriceBook] = useState<PriceBook | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchPriceBooks = useCallback(async () => {
    const response = await fetch("/api/superadmin/billing/pricebooks", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to load price books");
    }
    const data = await response.json();
    const list = Array.isArray(data) ? data : data.pricebooks || [];
    setPriceBooks(list);
  }, []);

  const fetchBenchmarks = useCallback(async () => {
    const response = await fetch("/api/superadmin/billing/benchmark", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to load benchmarks");
    }
    const data = await response.json();
    const list: BenchmarkSource[] = Array.isArray(data) ? data : data.benchmarks || [];
    const rows: BenchmarkRow[] = [];
    list.forEach((bm) => {
      const plans = Array.isArray(bm.plans) ? bm.plans : [];
      if (plans.length === 0) {
        rows.push({
          _id: bm._id,
          name: bm.vendor,
          type: bm.region || "Global",
          value: null,
          unit: "USD / user / mo",
          period: bm.retrieved_at,
          createdAt: bm.createdAt || bm.retrieved_at,
        });
        return;
      }
      plans.forEach((plan, index) => {
        rows.push({
          _id: `${bm._id}:${index}`,
          name: `${bm.vendor}${plan.name ? ` - ${plan.name}` : ""}`,
          type: bm.region || "Global",
          value: typeof plan.price_per_user_month_usd === "number" ? plan.price_per_user_month_usd : null,
          unit: "USD / user / mo",
          period: bm.retrieved_at,
          createdAt: bm.createdAt || bm.retrieved_at,
        });
      });
    });
    setBenchmarks(rows);
  }, []);

  const fetchAnnualDiscount = useCallback(async () => {
    const response = await fetch("/api/superadmin/billing/annual-discount", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to load annual discount");
    }
    const data = await response.json();
    const percentage = typeof data?.percentage === "number" ? data.percentage : 0;
    const enabled =
      typeof data?.enabled === "boolean" ? data.enabled : percentage > 0;
    setAnnualDiscount({
      percentage,
      minMonths: typeof data?.minMonths === "number" ? data.minMonths : undefined,
      enabled,
    });
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      fetchPriceBooks(),
      fetchBenchmarks(),
      fetchAnnualDiscount(),
    ]);
    const failed = results.find((result) => result.status === "rejected");
    if (failed && failed.status === "rejected") {
      const message =
        failed.reason instanceof Error ? failed.reason.message : "Failed to load billing data";
      setError(message);
    }
    setLoading(false);
  }, [fetchPriceBooks, fetchBenchmarks, fetchAnnualDiscount]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredPriceBooks = priceBooks.filter((pb) => {
    if (!search) return true;
    return (pb.name || "").toLowerCase().includes(search.toLowerCase());
  });

  const formatCurrency = (value: number, currency = "SAR") => {
    if (!Number.isFinite(value)) return "N/A";
    return new Intl.NumberFormat("en-SA", { style: "currency", currency }).format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const getModuleCount = (pb: PriceBook) => {
    const keys = new Set<string>();
    pb.tiers?.forEach((tier) => {
      tier.prices?.forEach((price) => keys.add(price.module_key));
    });
    return keys.size;
  };

  const isPriceBookActive = (pb: PriceBook) => {
    if (typeof pb.active === "boolean") return pb.active;
    if (typeof pb.isActive === "boolean") return pb.isActive;
    return false;
  };

  const formatDiscountPercent = (discount: number) => {
    const pct = discount > 1 ? discount : discount * 100;
    return `${Math.round(pct * 100) / 100}%`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.billing")}</h1>
          <p className="text-muted-foreground">Manage subscription plans, pricing, and billing operations</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="border-input text-muted-foreground" aria-label={t("common.refresh", "Refresh billing data")} title={t("common.refresh", "Refresh billing data")}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><Package className="h-5 w-5 text-blue-400" /></div>
              <div><p className="text-2xl font-bold text-foreground">{priceBooks.length}</p><p className="text-sm text-muted-foreground">Price Books</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20"><CheckCircle className="h-5 w-5 text-green-400" /></div>
              <div><p className="text-2xl font-bold text-foreground">{priceBooks.filter(isPriceBookActive).length}</p><p className="text-sm text-muted-foreground">Active</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20"><TrendingUp className="h-5 w-5 text-purple-400" /></div>
              <div><p className="text-2xl font-bold text-foreground">{benchmarks.length}</p><p className="text-sm text-muted-foreground">Benchmarks</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20"><DollarSign className="h-5 w-5 text-yellow-400" /></div>
              <div><p className="text-2xl font-bold text-foreground">{annualDiscount?.percentage || 0}%</p><p className="text-sm text-muted-foreground">Annual Discount</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pricebooks" className="space-y-4">
        <TabsList className="bg-muted border-input">
          <TabsTrigger value="pricebooks" className="data-[state=active]:bg-muted">Price Books</TabsTrigger>
          <TabsTrigger value="benchmarks" className="data-[state=active]:bg-muted">Benchmarks</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-muted">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="pricebooks" className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search price books..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10 bg-muted border-input text-foreground max-w-md" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><CreditCard className="h-5 w-5" />Price Books</CardTitle>
              <CardDescription className="text-muted-foreground">Pricing configurations for different regions and tiers</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filteredPriceBooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12"><CreditCard className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No price books found</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Region</TableHead>
                      <TableHead className="text-muted-foreground">Currency</TableHead>
                      <TableHead className="text-muted-foreground">Modules</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground w-[80px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPriceBooks.map((pb) => (
                      <TableRow key={pb._id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <div><p className="text-foreground font-medium">{pb.name}</p>{pb.description && <p className="text-sm text-muted-foreground">{pb.description}</p>}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{pb.region || "Global"}</TableCell>
                        <TableCell className="text-muted-foreground">{pb.currency || "SAR"}</TableCell>
                        <TableCell className="text-muted-foreground">{getModuleCount(pb)} modules</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isPriceBookActive(pb) ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}>
                            {isPriceBookActive(pb) ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedPriceBook(pb); setViewDialogOpen(true); }} aria-label={t("superadmin.billing.viewPriceBook", `View ${pb.name} price book details`)} title={t("superadmin.billing.viewPriceBook", `View ${pb.name} price book details`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><TrendingUp className="h-5 w-5" />Billing Benchmarks</CardTitle>
              <CardDescription className="text-muted-foreground">Performance metrics and billing thresholds</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {benchmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12"><TrendingUp className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No benchmarks configured</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Value</TableHead>
                      <TableHead className="text-muted-foreground">Period</TableHead>
                      <TableHead className="text-muted-foreground">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benchmarks.map((bm) => (
                      <TableRow key={bm._id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-foreground font-medium">{bm.name}</TableCell>
                        <TableCell className="text-muted-foreground">{bm.type}</TableCell>
                        <TableCell className="text-muted-foreground">{typeof bm.value === "number" ? bm.value : "N/A"} {bm.unit}</TableCell>
                        <TableCell className="text-muted-foreground">{bm.period ? formatDate(bm.period) : "N/A"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(bm.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground"><DollarSign className="h-5 w-5" />Annual Discount</CardTitle>
              <CardDescription className="text-muted-foreground">Configure discount for annual subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-yellow-500/20">
                    <DollarSign className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{annualDiscount?.percentage || 0}%</p>
                    <p className="text-sm text-muted-foreground">Current Discount</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {annualDiscount?.enabled ? (
                    <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground">Disabled</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Price Book Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price Book Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">{selectedPriceBook?.name}</DialogDescription>
          </DialogHeader>
          {selectedPriceBook && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Region</p><p className="text-foreground">{selectedPriceBook.region || "Global"}</p></div>
                <div><p className="text-sm text-muted-foreground">Currency</p><p className="text-foreground">{selectedPriceBook.currency || "SAR"}</p></div>
                <div><p className="text-sm text-muted-foreground">Created</p><p className="text-foreground">{formatDate(selectedPriceBook.createdAt)}</p></div>
                <div><p className="text-sm text-muted-foreground">Status</p><Badge className={isPriceBookActive(selectedPriceBook) ? "bg-green-500/20 text-green-400" : ""}>{isPriceBookActive(selectedPriceBook) ? "Active" : "Inactive"}</Badge></div>
              </div>
              {selectedPriceBook.tiers && selectedPriceBook.tiers.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Seat Tiers</p>
                  <div className="space-y-2">
                    {selectedPriceBook.tiers.map((tier, i) => (
                      <div key={i} className="space-y-2 rounded-lg border border-border bg-muted p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground">{tier.min_seats}-{tier.max_seats} seats</span>
                          <span className="text-yellow-400">{formatDiscountPercent(tier.discount_pct)} off</span>
                        </div>
                        {tier.prices && tier.prices.length > 0 ? (
                          <div className="space-y-1">
                            {tier.prices.map((price) => {
                              const monthly = selectedPriceBook.currency === "SAR" ? price.monthly_sar : price.monthly_usd;
                              return (
                                <div key={price.module_key} className="flex items-center justify-between text-sm text-muted-foreground">
                                  <span>{price.module_key}</span>
                                  <span className="text-foreground">{formatCurrency(monthly, selectedPriceBook.currency || "USD")}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No module pricing defined</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)} aria-label={t("common.close", "Close price book details")} title={t("common.close", "Close price book details")}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

