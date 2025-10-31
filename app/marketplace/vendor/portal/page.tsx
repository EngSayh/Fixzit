'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Upload, BarChart3, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface VendorStats {
  totalProducts: number;
  activeProducts: number;
  pendingApproval: number;
  totalRevenue: number;
  monthlyOrders: number;
}

export default function VendorPortalPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/marketplace/vendor/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F1111]">
            {t('marketplace.vendor.profile', 'Vendor Portal')}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your products, track performance, and grow your business
          </p>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-2xl bg-[var(--fixzit-danger-lightest)] border border-red-200 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--fixzit-danger)]" />
            <p className="text-sm text-[var(--fixzit-danger-darker)]">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <Package className="h-5 w-5 text-[#0061A8]" />
              </div>
              <p className="text-3xl font-bold text-[#0F1111]">{stats.totalProducts}</p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Active Products</p>
                <CheckCircle className="h-5 w-5 text-[#00A859]" />
              </div>
              <p className="text-3xl font-bold text-[#00A859]">{stats.activeProducts}</p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <AlertCircle className="h-5 w-5 text-[#FFB400]" />
              </div>
              <p className="text-3xl font-bold text-[#FFB400]">{stats.pendingApproval}</p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Monthly Orders</p>
                <BarChart3 className="h-5 w-5 text-[#0061A8]" />
              </div>
              <p className="text-3xl font-bold text-[#0F1111]">{stats.monthlyOrders}</p>
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
              <div className="rounded-2xl bg-[#0061A8]/10 p-3 group-hover:bg-[#0061A8] transition-colors">
                <Upload className="h-6 w-6 text-[#0061A8] group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0F1111] mb-1">
                  {t('marketplace.vendor.uploadProduct', 'Upload Product')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add new products to your catalogue with images and specifications
                </p>
              </div>
            </div>
          </Link>

          {/* Manage Products */}
          <Link 
            href="/marketplace/vendor/products"
            className="group rounded-2xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#00A859]/10 p-3 group-hover:bg-[#00A859] transition-colors">
                <Package className="h-6 w-6 text-[#00A859] group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0F1111] mb-1">
                  {t('marketplace.vendor.manageProducts', 'Manage Products')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Edit existing products, update prices, and manage inventory
                </p>
              </div>
            </div>
          </Link>

          {/* Bulk Upload */}
          <Link 
            href="/marketplace/vendor/products/bulk"
            className="group rounded-2xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#FFB400]/10 p-3 group-hover:bg-[#FFB400] transition-colors">
                <Upload className="h-6 w-6 text-[#FFB400] group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0F1111] mb-1">
                  {t('marketplace.vendor.bulkUpload', 'Bulk Upload')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload multiple products at once using CSV template
                </p>
              </div>
            </div>
          </Link>

          {/* Analytics */}
          <Link 
            href="/marketplace/vendor/analytics"
            className="group rounded-2xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#0061A8]/10 p-3 group-hover:bg-[#0061A8] transition-colors">
                <BarChart3 className="h-6 w-6 text-[#0061A8] group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0F1111] mb-1">
                  Analytics & Reports
                </h3>
                <p className="text-sm text-muted-foreground">
                  View sales trends, revenue reports, and performance metrics
                </p>
              </div>
            </div>
          </Link>

          {/* Settings */}
          <Link 
            href="/marketplace/vendor/settings"
            className="group rounded-2xl bg-card p-6 shadow-sm border border-border hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-muted p-3 group-hover:bg-muted transition-colors">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0F1111] mb-1">
                  Settings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Update business details, payment info, and notification preferences
                </p>
              </div>
            </div>
          </Link>
        </section>

        {/* Help Section */}
        <section className="mt-8 rounded-2xl bg-gradient-to-r from-[#0061A8] to-[#00A859] p-6 text-white">
          <h3 className="text-xl font-semibold mb-2">Need Help Getting Started?</h3>
          <p className="text-white/90 mb-4">
            Check out our vendor guide to learn how to optimize your product listings and increase sales.
          </p>
          <Link 
            href="/marketplace/vendor/guide"
            className="inline-flex items-center gap-2 rounded-2xl bg-card px-4 py-2 text-sm font-semibold text-[#0061A8] hover:bg-muted transition-colors"
          >
            View Vendor Guide
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>
      </div>
    </div>
  );
}
