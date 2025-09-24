// src/services/search/adapters/realEstate.ts
import { SearchResult } from '../SearchService';

// Real Estate (Aqar Souq) search adapter
export async function search(q: string, entities?: string[]): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  
  try {
    // In production, this would call your actual Aqar API
    const response = await fetch(`/api/aqar/search?q=${encodeURIComponent(q)}`);
    
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
      id: 'LIST-901', 
      type: 'listing',
      title: `${q} Residence - For Sale`, 
      subtitle: '3BR Villa • North Riyadh • SAR 1.2M', 
      href: '/aqar/listings/901', 
      icon: 'Home', 
      badge: 'For Sale',
      score: 0.95 
    },
    { 
      id: 'LIST-902', 
      type: 'listing',
      title: `${q} Apartments - For Rent`, 
      subtitle: '2BR • Olaya District • SAR 85k/year', 
      href: '/aqar/listings/902', 
      icon: 'Building', 
      badge: 'For Rent',
      score: 0.9 
    },
    { 
      id: 'PROJ-201', 
      type: 'project',
      title: `${q} Heights Development`, 
      subtitle: 'New Launch • 200 Units • Q3 2024', 
      href: '/aqar/projects/201', 
      icon: 'Building2', 
      badge: 'Project',
      score: 0.85 
    },
    { 
      id: 'AGENT-301', 
      type: 'agent',
      title: `Agent: ${q} Real Estate`, 
      subtitle: 'Licensed Broker • 4.8★ • 50+ Listings', 
      href: '/aqar/agents/301', 
      icon: 'UserCheck', 
      badge: 'Agent',
      score: 0.7 
    },
    { 
      id: 'AREA-401', 
      type: 'area',
      title: `${q} District`, 
      subtitle: 'Riyadh • 35 Active Listings • Avg: SAR 950k', 
      href: '/aqar/areas/401', 
      icon: 'MapPin', 
      badge: 'Area',
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