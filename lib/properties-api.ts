import { Property, Unit, Tenant, Lease, PropertyDocument } from '@/types/properties';

// Properties API functions
export async function getProperties(): Promise<Property[]> {
  try {
    const response = await fetch('/api/properties');
    if (!response.ok) throw new Error('Failed to fetch properties');
    return await response.json();
  } catch (error) {
    console.error('Error fetching properties:', error);
    // Return mock data as fallback
    return mockProperties;
  }
}

export async function getProperty(id: string): Promise<Property | null> {
  try {
    const response = await fetch(`/api/properties/${id}`);
    if (!response.ok) throw new Error('Failed to fetch property');
    return await response.json();
  } catch (error) {
    console.error('Error fetching property:', error);
    // Return mock data as fallback
    return mockProperties.find(p => p.id === id) || null;
  }
}

export async function createProperty(property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
  try {
    const response = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(property),
    });
    if (!response.ok) throw new Error('Failed to create property');
    return await response.json();
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
}

export async function updateProperty(id: string, property: Partial<Property>): Promise<Property> {
  try {
    const response = await fetch(`/api/properties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(property),
    });
    if (!response.ok) throw new Error('Failed to update property');
    return await response.json();
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
}

export async function deleteProperty(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/properties/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete property');
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
}

// Units API functions
export async function getUnits(propertyId?: string): Promise<Unit[]> {
  try {
    const url = propertyId ? `/api/units?propertyId=${propertyId}` : '/api/units';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch units');
    return await response.json();
  } catch (error) {
    console.error('Error fetching units:', error);
    return mockUnits.filter(u => !propertyId || u.propertyId === propertyId);
  }
}

export async function createUnit(unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Unit> {
  try {
    const response = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unit),
    });
    if (!response.ok) throw new Error('Failed to create unit');
    return await response.json();
  } catch (error) {
    console.error('Error creating unit:', error);
    throw error;
  }
}

// Tenants API functions
export async function getTenants(propertyId?: string): Promise<Tenant[]> {
  try {
    const url = propertyId ? `/api/tenants?propertyId=${propertyId}` : '/api/tenants';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch tenants');
    return await response.json();
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return mockTenants;
  }
}

export async function createTenant(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
  try {
    const response = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant),
    });
    if (!response.ok) throw new Error('Failed to create tenant');
    return await response.json();
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
}

// Mock data as fallback
const mockProperties: Property[] = [
  {
    id: '1',
    name: 'Riyadh Business Center',
    address: 'King Fahd Road, Riyadh, Saudi Arabia',
    type: 'commercial',
    totalUnits: 45,
    description: 'Premium commercial complex in prime location',
    amenities: ['parking', 'security', 'elevators', 'ac'],
    squareFootage: 12000,
    latitude: 24.7136,
    longitude: 46.6753,
    orgId: 'org-1',
    createdBy: 'admin',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    occupiedUnits: 42,
    monthlyRevenue: 450000
  },
  {
    id: '2',
    name: 'Al Nakheel Residential',
    address: 'Al Nakheel District, Riyadh, Saudi Arabia',
    type: 'residential',
    totalUnits: 32,
    description: 'Modern residential compound with family facilities',
    amenities: ['playground', 'pool', 'gym', 'security'],
    squareFootage: 8500,
    latitude: 24.6877,
    longitude: 46.7219,
    orgId: 'org-1',
    createdBy: 'admin',
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
    occupiedUnits: 28,
    monthlyRevenue: 280000
  }
];

const mockUnits: Unit[] = [
  {
    id: '1',
    propertyId: '1',
    unitNumber: '101',
    type: 'office',
    bedrooms: 0,
    bathrooms: 1,
    areaSqm: 250,
    rentAmount: 8000,
    status: 'occupied',
    orgId: 'org-1',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    propertyId: '1',
    unitNumber: '102',
    type: 'office',
    bedrooms: 0,
    bathrooms: 1,
    areaSqm: 300,
    rentAmount: 9500,
    status: 'vacant',
    orgId: 'org-1',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  }
];

const mockTenants: Tenant[] = [
  {
    id: '1',
    firstName: 'Ahmed',
    lastName: 'Al-Rashid',
    email: 'ahmed.rashid@email.com',
    phone: '+966501234567',
    nationalId: '1234567890',
    emergencyContact: 'Fatima Al-Rashid: +966509876543',
    moveInDate: '2024-01-01',
    status: 'active',
    orgId: 'org-1',
    createdBy: 'admin',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

// Property Statistics
export async function getPropertyStats(): Promise<any> {
  try {
    const response = await fetch('/api/properties/stats');
    if (!response.ok) throw new Error('Failed to fetch property stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching property stats:', error);
    return {
      totalProperties: 156,
      totalUnits: 1247,
      occupiedUnits: 1172,
      totalRevenue: 4500000,
      occupancyRate: 94.0,
      avgRent: 3840
    };
  }
}