'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShoppingBag, Package, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketplaceCounters {
  marketplace: { listings: number; orders: number; reviews: number };
}

export default function MarketplaceDashboard() {
  const [activeTab, setActiveTab] = useState('vendors');
  const [counters, setCounters] = useState<MarketplaceCounters | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    let mounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch('/api/counters', {
          signal: abortController.signal,
        });
        
        // Handle auth errors explicitly
        if (response.status === 401 || response.status === 403) {
          if (mounted && typeof window !== 'undefined') {
            // User is not authenticated or lacks permission
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          }
          return;
        }
        
        if (!response.ok) throw new Error('Failed to fetch counters');
        const data = await response.json();
        
        if (mounted) {
          setCounters({
            marketplace: data.marketplace || { listings: 0, orders: 0, reviews: 0 },
          });
          setLoading(false);
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') return;
        
        if (mounted) {
          logger.error('Failed to load marketplace data:', error as Error);
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      mounted = false;
      abortController.abort();
    };
  }, []);

  const tabs = [
    { id: 'vendors', label: 'Vendors' },
    { id: 'catalog', label: 'Catalog', count: counters?.marketplace.listings },
    { id: 'orders', label: 'Orders', count: counters?.marketplace.orders },
    { id: 'rfqs', label: 'RFQs' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
        <p className="text-muted-foreground">Manage vendors, catalog, and orders</p>
      </div>

      <div className="flex items-center gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
              <Package className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{loading ? '...' : counters?.marketplace.listings || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
              <ShoppingBag className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{loading ? '...' : counters?.marketplace.orders || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reviews</CardTitle>
              <Star className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{loading ? '...' : counters?.marketplace.reviews || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {['vendors', 'orders', 'rfqs'].includes(activeTab) && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">{tabs.find(t => t.id === activeTab)?.label}</p>
              <p className="text-sm mt-2">Content will be implemented here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
