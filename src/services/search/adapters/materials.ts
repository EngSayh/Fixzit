// src/services/search/adapters/materials.ts
import { SearchResult } from '../SearchService';

// Materials & Services (Fixzit Souq) search adapter
export async function search(q: string, entities?: string[]): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  
  try {
    // In production, this would call your actual Souq API
    const response = await fetch(`/api/souq/search?q=${encodeURIComponent(q)}`);
    
    if (!response.ok) {
      return getMockResults(q);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    return getMockResults(q);
  }
}

function getMockResults(q: string): SearchResult[] {
  const mockData = [
    { 
      id: 'SKU-ACF-14x20', 
      type: 'product',
      title: `HVAC Filter ${q}`, 
      subtitle: '14x20x1 • MERV 11 • In Stock (50)', 
      href: '/souq/products/ACF-14x20', 
      icon: 'Package', 
      badge: 'Product',
      score: 0.95 
    },
    { 
      id: 'SRV-PLM-001', 
      type: 'service',
      title: `${q} Plumbing Services`, 
      subtitle: '24/7 Emergency • 4.7★ • SAR 250/hr', 
      href: '/souq/services/PLM-001', 
      icon: 'Wrench', 
      badge: 'Service',
      score: 0.9 
    },
    { 
      id: 'RFQ-2023-156', 
      type: 'rfq',
      title: `RFQ: ${q} Equipment Supply`, 
      subtitle: 'Open • 5 Bids • Closes in 3 days', 
      href: '/souq/rfqs/2023-156', 
      icon: 'FileText', 
      badge: 'RFQ',
      score: 0.85 
    },
    { 
      id: 'VND-COOL-789', 
      type: 'vendor',
      title: `${q} Trading Co.`, 
      subtitle: 'HVAC Supplier • 4.5★ • Verified', 
      href: '/souq/vendors/COOL-789', 
      icon: 'Store', 
      badge: 'Vendor',
      score: 0.8 
    },
    { 
      id: 'CAT-HVAC', 
      type: 'category',
      title: `${q} - HVAC Equipment`, 
      subtitle: '125 Products • 15 Vendors', 
      href: '/souq/categories/hvac', 
      icon: 'Grid', 
      badge: 'Category',
      score: 0.7 
    },
    { 
      id: 'ORD-2023-789', 
      type: 'order',
      title: `Order #2023-789`, 
      subtitle: 'Processing • SAR 5,250 • Est. delivery: 2 days', 
      href: '/souq/orders/2023-789', 
      icon: 'ShoppingCart', 
      badge: 'Order',
      score: 0.6 
    }
  ];

  // Filter and sort by relevance
  return mockData
    .filter(item => 
      item.title.toLowerCase().includes(q.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q.toLowerCase()))
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}