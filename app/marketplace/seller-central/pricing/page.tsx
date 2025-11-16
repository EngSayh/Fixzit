'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Award, DollarSign, RefreshCw } from 'lucide-react';
import PricingRuleCard from '@/components/seller/pricing/PricingRuleCard';
import CompetitorAnalysis from '@/components/seller/pricing/CompetitorAnalysis';

interface RepricerSettings {
  enabled: boolean;
  rules: Record<string, {
    enabled: boolean;
    minPrice: number;
    maxPrice: number;
    targetPosition: 'win' | 'competitive';
    undercut: number;
    protectMargin: boolean;
  }>;
  defaultRule?: {
    enabled: boolean;
    minPrice: number;
    maxPrice: number;
    targetPosition: 'win' | 'competitive';
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
        fetch('/api/souq/repricer/settings'),
        fetch('/api/souq/inventory') // Get seller's listings
      ]);

      if (!settingsRes.ok) throw new Error('Failed to fetch settings');
      if (!listingsRes.ok) throw new Error('Failed to fetch listings');

      const settingsData = await settingsRes.json();
      const listingsData = await listingsRes.json();

      setSettings(settingsData.settings);
      setListings(listingsData.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRepricer = async (enabled: boolean) => {
    try {
      if (!settings) return;

      const newSettings = { ...settings, enabled };
      
      const response = await fetch('/api/souq/repricer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings })
      });

      if (!response.ok) throw new Error('Failed to update settings');

      setSettings(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleRunRepricing = async () => {
    try {
      setRepricing(true);
      const response = await fetch('/api/souq/repricer/run', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to run repricing');

      const data = await response.json();
      
      // Refresh listings after repricing
      await fetchData();

      alert(`Repricing complete: ${data.result.repriced} listings updated`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRepricing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing dashboard...</p>
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

  const buyBoxWinners = listings.filter(l => l.buyBoxWinner).length;
  const avgBuyBoxScore = listings.length > 0
    ? listings.reduce((sum, l) => sum + l.buyBoxScore, 0) / listings.length
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pricing Dashboard</h1>
        <p className="text-gray-600">
          Manage your pricing strategy and monitor Buy Box performance.
        </p>
      </div>

      {/* Auto-Repricer Toggle */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Auto-Repricer
            </h2>
            <p className="text-sm text-gray-600">
              Automatically adjust prices every 15 minutes to stay competitive
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRunRepricing}
              disabled={repricing || !settings?.enabled}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${repricing ? 'animate-spin' : ''}`} />
              {repricing ? 'Repricing...' : 'Run Now'}
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
            <h3 className="text-sm font-medium text-gray-600">Total Listings</h3>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{listings.length}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Buy Box Winners</h3>
            <Award className="w-5 h-5 text-warning" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{buyBoxWinners}</p>
            <span className="text-sm text-gray-600">
              ({listings.length > 0 ? ((buyBoxWinners / listings.length) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Buy Box Score</h3>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {avgBuyBoxScore.toFixed(0)}
          </p>
        </Card>
      </div>

      {/* Listings Table */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Listings</h2>
        
        {listings.length === 0 ? (
          <p className="text-center text-gray-600 py-8">
            No active listings found. Create a listing to start selling.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Price</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Buy Box</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Last Change</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing._id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{listing.title}</div>
                      <div className="text-sm text-gray-600">{listing.fsin}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{listing.sku}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">
                        SAR {listing.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {listing.buyBoxWinner ? (
                        <Badge className="bg-warning/10 text-warning-foreground">
                          <Award className="w-3 h-3 mr-1" />
                          Winner
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Winning</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{listing.buyBoxScore}</span>
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
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">
                        View Details
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing Rules</h2>
          <PricingRuleCard settings={settings} onUpdate={setSettings} />
        </Card>
      )}

      {/* Competitor Analysis */}
      {listings.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Competitor Analysis</h2>
          <CompetitorAnalysis fsin={listings[0].fsin} />
        </Card>
      )}
    </div>
  );
}
