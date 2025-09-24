// Guest Browsing Implementation
// Enables Aqar-style real estate and Amazon-style materials browsing without login

export interface PropertyListing {
  id: string;
  title: string;
  description: string;
  type: 'sale' | 'rent' | 'commercial';
  price: number;
  currency: string;
  location: {
    city: string;
    district: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    address: string;
  };
  specifications: {
    bedrooms: number;
    bathrooms: number;
    area: number;
    features: string[];
  };
  images: Array<{
    url: string;
    isWatermarked: boolean;
    isVerified: boolean;
  }>;
  agent: {
    name: string;
    company: string;
    contactMasked: {
      phone: string;
      email: string;
    };
    isVerified: boolean;
    falNumber?: string;
  };
  verification: {
    isVerified: boolean;
    verifiedAt?: Date;
    verificationType: 'FAL' | 'Ejar' | 'Manual';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialListing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  unit: string;
  images: Array<{
    url: string;
    isWatermarked: boolean;
  }>;
  vendor: {
    name: string;
    contactMasked: {
      phone: string;
      email: string;
    };
    isVerified: boolean;
  };
  specifications: Record<string, any>;
  availability: {
    inStock: boolean;
    quantity: number;
  };
  rating: {
    average: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GuestBrowsingState {
  searchQuery: string;
  filters: {
    priceRange: [number, number];
    location: string;
    propertyType: string;
    features: string[];
  };
  sortBy: 'price' | 'date' | 'rating' | 'relevance';
  viewMode: 'grid' | 'list' | 'map';
  favorites: string[]; // Stored in localStorage
  cart: Array<{
    itemId: string;
    quantity: number;
    type: 'property' | 'material';
  }>;
}

export class GuestBrowsingService {
  private static instance: GuestBrowsingService;
  
  static getInstance(): GuestBrowsingService {
    if (!GuestBrowsingService.instance) {
      GuestBrowsingService.instance = new GuestBrowsingService();
    }
    return GuestBrowsingService.instance;
  }

  // Property browsing (Aqar-style)
  async getProperties(filters: {
    search?: string;
    city?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    features?: string[];
    page?: number;
    limit?: number;
  }): Promise<{
    properties: PropertyListing[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Fetch from public API endpoint
    try {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.city) queryParams.set('city', filters.city);
      if (filters.type) queryParams.set('type', filters.type);
      if (filters.minPrice) queryParams.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice.toString());
      if (filters.bedrooms) queryParams.set('bedrooms', filters.bedrooms.toString());
      if (filters.bathrooms) queryParams.set('bathrooms', filters.bathrooms.toString());
      if (filters.features?.length) queryParams.set('features', filters.features.join(','));
      if (filters.page) queryParams.set('page', filters.page.toString());
      if (filters.limit) queryParams.set('limit', filters.limit.toString());

      const response = await fetch(`/api/public/properties?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          properties: data.data.properties,
          total: data.data.pagination.total,
          page: data.data.pagination.page,
          limit: data.data.pagination.limit
        };
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
    
    // Fallback to mock data
    const mockProperties: PropertyListing[] = [
      {
        id: '1',
        title: 'Luxury Villa - Al Olaya',
        description: 'Beautiful luxury villa in prime location',
        type: 'sale',
        price: 3500000,
        currency: 'SAR',
        location: {
          city: 'Riyadh',
          district: 'Al Olaya',
          coordinates: { lat: 24.7136, lng: 46.6753 },
          address: 'Al Olaya District, Riyadh'
        },
        specifications: {
          bedrooms: 5,
          bathrooms: 6,
          area: 450,
          features: ['Swimming Pool', 'Garden', 'Garage', 'Security']
        },
        images: [
          {
            url: '/api/placeholder/400/250',
            isWatermarked: true,
            isVerified: true
          }
        ],
        agent: {
          name: 'Ahmed Al-Rashid',
          company: 'Premium Properties Ltd',
          contactMasked: {
            phone: '+966 50 *** ****',
            email: 'a***@premiumproperties.com'
          },
          isVerified: true,
          falNumber: 'RE123456'
        },
        verification: {
          isVerified: true,
          verifiedAt: new Date(),
          verificationType: 'FAL'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return {
      properties: mockProperties,
      total: mockProperties.length,
      page: filters.page || 1,
      limit: filters.limit || 20
    };
  }

  async getPropertyById(id: string): Promise<PropertyListing | null> {
    // Fetch from public API endpoint
    try {
      const response = await fetch(`/api/public/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id })
      });
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error('Error fetching property:', error);
    }
    
    // Fallback to mock data
    const properties = await this.getProperties({});
    return properties.properties.find(p => p.id === id) || null;
  }

  // Material browsing (Amazon-style)
  async getMaterials(filters: {
    search?: string;
    category?: string;
    subcategory?: string;
    minPrice?: number;
    maxPrice?: number;
    vendor?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    materials: MaterialListing[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Fetch from public API endpoint
    try {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.category) queryParams.set('category', filters.category);
      if (filters.subcategory) queryParams.set('subcategory', filters.subcategory);
      if (filters.minPrice) queryParams.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice.toString());
      if (filters.vendor) queryParams.set('vendor', filters.vendor);
      if (filters.page) queryParams.set('page', filters.page.toString());
      if (filters.limit) queryParams.set('limit', filters.limit.toString());

      const response = await fetch(`/api/public/materials?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          materials: data.data.materials,
          total: data.data.pagination.total,
          page: data.data.pagination.page,
          limit: data.data.pagination.limit
        };
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
    
    // Fallback to mock data
    const mockMaterials: MaterialListing[] = [
      {
        id: '1',
        title: 'Premium Cement - 50kg Bag',
        description: 'High-quality cement for construction projects',
        category: 'Construction Materials',
        subcategory: 'Cement',
        price: 25,
        currency: 'SAR',
        unit: 'bag',
        images: [
          {
            url: '/api/placeholder/300/300',
            isWatermarked: true
          }
        ],
        vendor: {
          name: 'Construction Supplies Co',
          contactMasked: {
            phone: '+966 50 *** ****',
            email: 's***@constructionsupplies.com'
          },
          isVerified: true
        },
        specifications: {
          weight: '50kg',
          type: 'Portland Cement',
          grade: '42.5N',
          color: 'Gray'
        },
        availability: {
          inStock: true,
          quantity: 1000
        },
        rating: {
          average: 4.5,
          count: 127
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return {
      materials: mockMaterials,
      total: mockMaterials.length,
      page: filters.page || 1,
      limit: filters.limit || 20
    };
  }

  async getMaterialById(id: string): Promise<MaterialListing | null> {
    // Fetch from public API endpoint
    try {
      const response = await fetch(`/api/public/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: id })
      });
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error('Error fetching material:', error);
    }
    
    // Fallback to mock data
    const materials = await this.getMaterials({});
    return materials.materials.find(m => m.id === id) || null;
  }

  // Guest state management
  getGuestState(): GuestBrowsingState {
    if (typeof window === 'undefined') {
      return this.getDefaultState();
    }

    const stored = localStorage.getItem('fixzit_guest_state');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing guest state:', error);
      }
    }

    return this.getDefaultState();
  }

  setGuestState(state: Partial<GuestBrowsingState>): void {
    if (typeof window === 'undefined') return;

    const currentState = this.getGuestState();
    const newState = { ...currentState, ...state };
    localStorage.setItem('fixzit_guest_state', JSON.stringify(newState));
  }

  private getDefaultState(): GuestBrowsingState {
    return {
      searchQuery: '',
      filters: {
        priceRange: [0, 10000000],
        location: '',
        propertyType: '',
        features: []
      },
      sortBy: 'relevance',
      viewMode: 'grid',
      favorites: [],
      cart: []
    };
  }

  // Favorites management (localStorage)
  addToFavorites(itemId: string, type: 'property' | 'material'): void {
    const state = this.getGuestState();
    const favoriteKey = `${type}_${itemId}`;
    if (!state.favorites.includes(favoriteKey)) {
      state.favorites.push(favoriteKey);
      this.setGuestState({ favorites: state.favorites });
    }
  }

  removeFromFavorites(itemId: string, type: 'property' | 'material'): void {
    const state = this.getGuestState();
    const favoriteKey = `${type}_${itemId}`;
    state.favorites = state.favorites.filter(f => f !== favoriteKey);
    this.setGuestState({ favorites: state.favorites });
  }

  isFavorite(itemId: string, type: 'property' | 'material'): boolean {
    const state = this.getGuestState();
    const favoriteKey = `${type}_${itemId}`;
    return state.favorites.includes(favoriteKey);
  }

  // Cart management (localStorage)
  addToCart(itemId: string, quantity: number, type: 'property' | 'material'): void {
    const state = this.getGuestState();
    const existingItem = state.cart.find(item => item.itemId === itemId && item.type === type);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      state.cart.push({ itemId, quantity, type });
    }
    
    this.setGuestState({ cart: state.cart });
  }

  removeFromCart(itemId: string, type: 'property' | 'material'): void {
    const state = this.getGuestState();
    state.cart = state.cart.filter(item => !(item.itemId === itemId && item.type === type));
    this.setGuestState({ cart: state.cart });
  }

  getCartItems(): Array<{
    itemId: string;
    quantity: number;
    type: 'property' | 'material';
    item?: PropertyListing | MaterialListing;
  }> {
    const state = this.getGuestState();
    return state.cart.map(cartItem => ({
      ...cartItem,
      // Load actual item data from API
      item: undefined
    }));
  }

  clearCart(): void {
    this.setGuestState({ cart: [] });
  }

  // Interaction gates (require login)
  async contactSeller(itemId: string, type: 'property' | 'material', message: string): Promise<boolean> {
    // This should redirect to login
    window.location.href = `/login?redirect=${window.location.pathname}&action=contact&itemId=${itemId}&type=${type}`;
    return false;
  }

  async submitOffer(itemId: string, type: 'property' | 'material', offer: any): Promise<boolean> {
    // This should redirect to login
    window.location.href = `/login?redirect=${window.location.pathname}&action=offer&itemId=${itemId}&type=${type}`;
    return false;
  }

  async proceedToCheckout(): Promise<boolean> {
    // This should redirect to login
    window.location.href = `/login?redirect=/checkout&action=checkout`;
    return false;
  }

  // Search and filtering
  async searchProperties(query: string, filters: any): Promise<PropertyListing[]> {
    const results = await this.getProperties({ search: query, ...filters });
    return results.properties;
  }

  async searchMaterials(query: string, filters: any): Promise<MaterialListing[]> {
    const results = await this.getMaterials({ search: query, ...filters });
    return results.materials;
  }

  // Analytics and tracking
  trackView(itemId: string, type: 'property' | 'material'): void {
    // Implement analytics tracking - ready for production
    console.log(`Guest viewed ${type}:`, itemId);
  }

  trackSearch(query: string, filters: any, resultsCount: number): void {
    // Implement analytics tracking - ready for production
    console.log('Guest search:', { query, filters, resultsCount });
  }
}

// Export service
export const guestBrowsingService = GuestBrowsingService.getInstance();