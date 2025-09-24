// src/services/search/adapters/fm.ts
import { SearchResult } from '../SearchService';

// Facility Management search adapter
export async function search(q: string, entities: string[]): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  
  try {
    // In production, this would call your actual FM APIs
    const response = await fetch(`/api/fm/search?q=${encodeURIComponent(q)}&entities=${entities.join(',')}`);
    
    if (!response.ok) {
      // Fallback to mock data for now
      return getMockResults(q);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    // Return mock data if API fails
    return getMockResults(q);
  }
}

function getMockResults(q: string): SearchResult[] {
  const mockData = [
    { 
      id: 'WO-1042', 
      type: 'work-order',
      title: `Work Order: ${q}`, 
      subtitle: 'P2 • In Progress • Building A', 
      href: '/work-orders/1042', 
      icon: 'ClipboardList', 
      badge: 'WO',
      score: 0.9 
    },
    { 
      id: 'PROP-33', 
      type: 'property',
      title: `Property: ${q} Towers`, 
      subtitle: 'Riyadh • 120 Units • 95% Occupied', 
      href: '/properties/33', 
      icon: 'Building2', 
      badge: 'Property',
      score: 0.8 
    },
    { 
      id: 'UNIT-501', 
      type: 'unit',
      title: `Unit 501 - ${q}`, 
      subtitle: 'Tower A • 2BR • Occupied', 
      href: '/properties/33/units/501', 
      icon: 'Home', 
      badge: 'Unit',
      score: 0.7 
    },
    { 
      id: 'TNT-789', 
      type: 'tenant',
      title: `Tenant: ${q} Corp`, 
      subtitle: 'Active • 5 Units • Since 2022', 
      href: '/tenants/789', 
      icon: 'Users', 
      badge: 'Tenant',
      score: 0.6 
    },
    { 
      id: 'VND-456', 
      type: 'vendor',
      title: `Vendor: ${q} Services`, 
      subtitle: 'HVAC • 4.5★ • Active', 
      href: '/vendors/456', 
      icon: 'Factory', 
      badge: 'Vendor',
      score: 0.5 
    },
    { 
      id: 'INV-2023-089', 
      type: 'invoice',
      title: `Invoice #2023-089`, 
      subtitle: 'SAR 15,000 • Due in 7 days', 
      href: '/finance/invoices/2023-089', 
      icon: 'FileText', 
      badge: 'Invoice',
      score: 0.4 
    }
  ];

  // Filter based on query
  return mockData
    .filter(item => 
      item.title.toLowerCase().includes(q.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q.toLowerCase()))
    )
    .slice(0, 10);
}