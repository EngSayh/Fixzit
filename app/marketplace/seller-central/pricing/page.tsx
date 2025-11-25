"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Award,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import PricingRuleCard from "@/components/seller/pricing/PricingRuleCard";
import CompetitorAnalysis from "@/components/seller/pricing/CompetitorAnalysis";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface RepricerSettings {
  enabled: boolean;
  rules: Record<
    string,
    {
      enabled: boolean;
      minPrice: number;
      maxPrice: number;
      targetPosition: "win" | "competitive";
      undercut: number;
      protectMargin: boolean;
    }
  >;
  defaultRule?: {
    enabled: boolean;
    minPrice: number;
    maxPrice: number;
    targetPosition: "win" | "competitive";
    undercut: number;
    protectMargin: boolean;
  };
}

interface Listing {
  _id: string;
  fsin: string;
  title: string;
  sku: string;
  price: number;
  buyBoxWinner: boolean;
  buyBoxScore: number;
  lastPriceChange?: Date;
}

export default function PricingDashboardPage() {
  const auto = useAutoTranslator("marketplace.sellerCentral.pricing");
  const [settings, setSettings] = useState<RepricerSettings | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repricing, setRepricing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, listingsRes] = await Promise.all([
        fetch("/api/souq/repricer/settings"),
        fetch("/api/souq/inventory"), // Get seller's listings
      ]);

      if (!settingsRes.ok)
        throw new Error(
          auto("Failed to fetch settings", "errors.fetchSettings"),
        );
      if (!listingsRes.ok)
        throw new Error(
          auto("Failed to fetch listings", "errors.fetchListings"),
        );

      const settingsData = await settingsRes.json();
      const listingsData = await listingsRes.json();

      setSettings(settingsData.settings);
      setListings(listingsData.listings || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : auto("Unknown error", "errors.unknown"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRepricer = async (enabled: boolean) => {
    try {
      if (!settings) return;

      const newSettings = { ...settings, enabled };

      const response = await fetch("/api/souq/repricer/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (!response.ok)
        throw new Error(
          auto("Failed to update settings", "errors.updateSettings"),
        );

      setSettings(newSettings);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : auto("Unknown error", "errors.unknown"),
      );
    }
  };

  const handleRunRepricing = async () => {
    try {
      setRepricing(true);
      const response = await fetch("/api/souq/repricer/run", {
        method: "POST",
      });

      if (!response.ok)
        throw new Error(auto("Failed to run repricing", "errors.runRepricing"));

      const data = await response.json();

      // Refresh listings after repricing
      await fetchData();

      alert(
        auto(
          "Repricing complete: {{count}} listings updated",
          "alerts.repricingComplete",
        ).replace("{{count}}", String(data.result.repriced)),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : auto("Unknown error", "errors.unknown"),
      );
    } finally {
      setRepricing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {auto("Loading pricing dashboard...", "state.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const buyBoxWinners = listings.filter((l) => l.buyBoxWinner).length;
  const avgBuyBoxScore =
    listings.length > 0
      ? listings.reduce((sum, l) => sum + l.buyBoxScore, 0) / listings.length
      : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {auto("Pricing Dashboard", "header.title")}
        </h1>
        <p className="text-gray-600">
          {auto(
            "Manage your pricing strategy and monitor Buy Box performance.",
            "header.subtitle",
          )}
        </p>
      </div>

      {/* Auto-Repricer Toggle */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {auto("Auto-Repricer", "autoRepricer.title")}
            </h2>
            <p className="text-sm text-gray-600">
              {auto(
                "Automatically adjust prices every 15 minutes to stay competitive",
                "autoRepricer.description",
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRunRepricing}
              disabled={repricing || !settings?.enabled}
              variant="outline"
            >
              <RefreshCw
                className={`w-4 h-4 me-2 ${repricing ? "animate-spin" : ""}`}
              />
              {repricing
                ? auto("Repricing...", "autoRepricer.repricing")
                : auto("Run Now", "autoRepricer.runNow")}
            </Button>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={handleToggleAutoRepricer}
            />
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              {auto("Total Listings", "metrics.totalListings")}
            </h3>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{listings.length}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              {auto("Buy Box Winners", "metrics.buyBoxWinners")}
            </h3>
            <Award className="w-5 h-5 text-warning" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{buyBoxWinners}</p>
            <span className="text-sm text-gray-600">
              (
              {listings.length > 0
                ? ((buyBoxWinners / listings.length) * 100).toFixed(0)
                : 0}
              %)
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              {auto("Avg Buy Box Score", "metrics.avgScore")}
            </h3>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {avgBuyBoxScore.toFixed(0)}
          </p>
        </Card>
      </div>

      {/* Listings Table */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {auto("Your Listings", "listings.title")}
        </h2>

        {listings.length === 0 ? (
          <p className="text-center text-gray-600 py-8">
            {auto(
              "No active listings found. Create a listing to start selling.",
              "listings.empty",
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-start py-3 px-4 font-medium text-gray-700">
                    {auto("Product", "listings.columns.product")}
                  </th>
                  <th className="text-start py-3 px-4 font-medium text-gray-700">
                    {auto("SKU", "listings.columns.sku")}
                  </th>
                  <th className="text-start py-3 px-4 font-medium text-gray-700">
                    {auto("Price", "listings.columns.price")}
                  </th>
                  <th className="text-start py-3 px-4 font-medium text-gray-700">
                    {auto("Buy Box", "listings.columns.buyBox")}
                  </th>
                  <th className="text-start py-3 px-4 font-medium text-gray-700">
                    {auto("Score", "listings.columns.score")}
                  </th>
                  <th className="text-start py-3 px-4 font-medium text-gray-700">
                    {auto("Last Change", "listings.columns.lastChange")}
                  </th>
                  <th className="text-start py-3 px-4 font-medium text-gray-700">
                    {auto("Actions", "listings.columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing._id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {listing.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {listing.fsin}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{listing.sku}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">
                        {auto(
                          "SAR {{price}}",
                          "listings.row.priceValue",
                        ).replace("{{price}}", listing.price.toFixed(2))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {listing.buyBoxWinner ? (
                        <Badge className="bg-warning/10 text-warning-foreground">
                          <Award className="w-3 h-3 me-1" />
                          {auto("Winner", "listings.badges.winner")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {auto("Not Winning", "listings.badges.notWinning")}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {listing.buyBoxScore}
                        </span>
                        {listing.buyBoxScore >= 80 ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : listing.buyBoxScore >= 50 ? (
                          <TrendingUp className="w-4 h-4 text-warning" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {listing.lastPriceChange
                        ? new Date(listing.lastPriceChange).toLocaleDateString()
                        : auto("Never", "listings.row.never")}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">
                        {auto("View Details", "listings.actions.view")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pricing Rules */}
      {settings && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {auto("Pricing Rules", "rules.title")}
          </h2>
          <PricingRuleCard settings={settings} onUpdate={setSettings} />
        </Card>
      )}

      {/* Competitor Analysis */}
      {listings.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {auto("Competitor Analysis", "analysis.title")}
          </h2>
          <CompetitorAnalysis fsin={listings[0].fsin} />
        </Card>
      )}
    </div>
  );
}
