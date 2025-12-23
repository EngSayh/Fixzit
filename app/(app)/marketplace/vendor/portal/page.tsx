"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Upload,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
} from "@/components/ui/icons";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/contexts/TranslationContext";

interface VendorStats {
  totalProducts: number;
  activeProducts: number;
  pendingApproval: number;
  totalRevenue: number;
  monthlyOrders: number;
}

export default function VendorPortalPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const orgId = session?.user?.orgId;
        if (!orgId) {
          throw new Error("Organization ID not found");
        }
        const response = await fetch(
          `/api/org/${orgId}/marketplace/vendor/stats`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-tenant-id": orgId,
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    if (session?.user?.orgId) {
      fetchStats();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {t("common.loading", "Loading...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t("marketplace.vendor.profile", "Vendor Portal")}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your products, track performance, and grow your business
          </p>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive-foreground">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Products
                </p>
                <Package className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats.totalProducts}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Active Products
                </p>
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <p className="text-3xl font-bold text-success">
                {stats.activeProducts}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Approval
                </p>
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <p className="text-3xl font-bold text-warning">
                {stats.pendingApproval}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Monthly Orders
                </p>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats.monthlyOrders}
              </p>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Upload Product */}
          <Link
            href="/marketplace/vendor/products/upload"
            className="group rounded-2xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 group-hover:bg-primary transition-colors">
                <Upload className="h-6 w-6 text-primary group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t("marketplace.vendor.uploadProduct", "Upload Product")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add new products to your catalogue with images and
                  specifications
                </p>
              </div>
            </div>
          </Link>

          {/* Manage Products */}
          <Link
            href="/marketplace/vendor"
            className="group rounded-2xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-success/10 p-3 group-hover:bg-success transition-colors">
                <Package className="h-6 w-6 text-success group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t("marketplace.vendor.manageProducts", "Manage Products")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Edit existing products, update prices, and manage inventory
                </p>
              </div>
            </div>
          </Link>

          {/* Bulk Upload */}
          <Link
            href="/marketplace/vendor/products/upload?mode=bulk"
            className="group rounded-2xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-warning/10 p-3 group-hover:bg-warning transition-colors">
                <Upload className="h-6 w-6 text-warning group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t("marketplace.vendor.bulkUpload", "Bulk Upload")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload multiple products at once using CSV template
                </p>
              </div>
            </div>
          </Link>

          {/* Seller Central */}
          <Link
            href="/marketplace/seller-central"
            className="group rounded-2xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 group-hover:bg-primary transition-colors">
                <Settings className="h-6 w-6 text-primary group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t("marketplace.vendor.sellerCentral", "Seller Central Apps")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "marketplace.vendor.sellerCentral.desc",
                    "Jump into analytics, advertising, pricing, and compliance tools.",
                  )}
                </p>
              </div>
            </div>
          </Link>
        </section>

        {/* Help Section */}
        <section className="mt-8 rounded-2xl bg-gradient-to-r from-primary to-success p-6 text-white">
          <h3 className="text-xl font-semibold mb-2">
            Need Help Getting Started?
          </h3>
          <p className="text-white/90 mb-4">
            Check out our vendor guide to learn how to optimize your product
            listings and increase sales.
          </p>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-2xl bg-card px-4 py-2 text-sm font-semibold text-primary hover:bg-muted transition-colors"
          >
            View Vendor Guide
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </section>
      </div>
    </div>
  );
}
