import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Filter,
  Grid,
  List,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Star,
  Heart,
  Share,
  Phone,
  Mail,
  Calendar,
  Eye,
  Camera,
  DollarSign,
  TrendingUp,
  Home,
  Building,
  Zap,
  Shield,
  Award,
  Clock,
  User,
  MessageCircle,
  Download,
  Upload,
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  type: 'apartment' | 'villa' | 'office' | 'retail' | 'warehouse';
  listingType: 'sale' | 'rent';
  price: number;
  currency: string;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  location: {
    city: string;
    district: string;
    street: string;
    coordinates: { lat: number; lng: number };
  };
  amenities: string[];
  images: string[];
  agent: {
    id: string;
    name: string;
    company: string;
    phone: string;
    email: string;
    rating: number;
    verified: boolean;
  };
  features: {
    furnished: boolean;
    balcony: boolean;
    garden: boolean;
    pool: boolean;
    gym: boolean;
    security: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  views: number;
  favorites: number;
  status: 'active' | 'pending' | 'sold' | 'rented';
}

interface SearchFilters {
  type: string;
  listingType: string;
  city: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  minArea: number;
  maxArea: number;
  bedrooms: string;
  bathrooms: string;
  amenities: string[];
  features: string[];
}

export const AqarDouq: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    listingType: 'all',
    city: 'all',
    district: 'all',
    minPrice: 0,
    maxPrice: 0,
    minArea: 0,
    maxArea: 0,
    bedrooms: 'all',
    bathrooms: 'all',
    amenities: [],
    features: []
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteProperties, setFavoriteProperties] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [properties, searchQuery, filters, sortBy]);

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/aqar-douq/properties');
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
      // Load demo data
      setProperties(getDemoProperties());
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...properties];

    // Text search
    if (searchQuery) {
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.location.district.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(property => property.type === filters.type);
    }

    // Listing type filter
    if (filters.listingType !== 'all') {
      filtered = filtered.filter(property => property.listingType === filters.listingType);
    }

    // Price range
    if (filters.minPrice > 0) {
      filtered = filtered.filter(property => property.price >= filters.minPrice);
    }
    if (filters.maxPrice > 0) {
      filtered = filtered.filter(property => property.price <= filters.maxPrice);
    }

    // Area range
    if (filters.minArea > 0) {
      filtered = filtered.filter(property => property.area >= filters.minArea);
    }
    if (filters.maxArea > 0) {
      filtered = filtered.filter(property => property.area <= filters.maxArea);
    }

    // Bedrooms
    if (filters.bedrooms !== 'all') {
      const bedroomCount = parseInt(filters.bedrooms);
      filtered = filtered.filter(property => property.bedrooms === bedroomCount);
    }

    // Bathrooms
    if (filters.bathrooms !== 'all') {
      const bathroomCount = parseInt(filters.bathrooms);
      filtered = filtered.filter(property => property.bathrooms === bathroomCount);
    }

    // Sort
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'area_large':
        filtered.sort((a, b) => b.area - a.area);
        break;
      case 'area_small':
        filtered.sort((a, b) => a.area - b.area);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    setFilteredProperties(filtered);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleRequestViewing = async (propertyId: string, contactInfo: any) => {
    try {
      const response = await fetch('/api/aqar-douq/viewing-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          ...contactInfo
        }),
      });

      if (response.ok) {
        console.log('Viewing request submitted successfully');
        // This would create a CRM lead as specified
      }
    } catch (error) {
      console.error('Failed to submit viewing request:', error);
    }
  };

  const toggleFavorite = (propertyId: string) => {
    const newFavorites = new Set(favoriteProperties);
    if (newFavorites.has(propertyId)) {
      newFavorites.delete(propertyId);
    } else {
      newFavorites.add(propertyId);
    }
    setFavoriteProperties(newFavorites);
  };

  const PropertyCard: React.FC<{ property: Property }> = ({ property }) => {
    const isFavorite = favoriteProperties.has(property.id);

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        {/* Property Image */}
        <div className="relative">
          <div className="aspect-video bg-gray-200 flex items-center justify-center">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
          
          {/* Overlay Badges */}
          <div className="absolute top-3 left-3">
            <Badge variant={property.listingType === 'sale' ? 'default' : 'secondary'}>
              {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
            </Badge>
          </div>
          
          <div className="absolute top-3 right-3 flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="bg-white/80 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(property.id);
              }}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="bg-white/80 hover:bg-white"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>

          {/* Price Overlay */}
          <div className="absolute bottom-3 left-3">
            <div className="bg-black/70 text-white px-3 py-1 rounded-lg">
              <span className="font-bold text-lg">
                {formatPrice(property.price, property.currency)}
              </span>
              {property.listingType === 'rent' && (
                <span className="text-sm ml-1">/month</span>
              )}
            </div>
          </div>
        </div>

        {/* Property Details */}
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
              <p className="text-sm text-gray-600 flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {property.location.district}, {property.location.city}
              </p>
            </div>

            {/* Property Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              {property.bedrooms && (
                <div className="flex items-center space-x-1">
                  <Bed className="h-4 w-4" />
                  <span>{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center space-x-1">
                  <Bath className="h-4 w-4" />
                  <span>{property.bathrooms}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Square className="h-4 w-4" />
                <span>{property.area} m²</span>
              </div>
              {property.parking && (
                <div className="flex items-center space-x-1">
                  <Car className="h-4 w-4" />
                  <span>{property.parking}</span>
                </div>
              )}
            </div>

            {/* Agent Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{property.agent.name}</p>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-600">{property.agent.rating}</span>
                    {property.agent.verified && (
                      <Shield className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Eye className="h-3 w-3" />
                <span>{property.views}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Request Viewing
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Property Viewing</DialogTitle>
                    <DialogDescription>
                      Schedule a viewing for {property.title}
                    </DialogDescription>
                  </DialogHeader>
                  <ViewingRequestForm 
                    property={property}
                    onSubmit={handleRequestViewing}
                  />
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={() => setSelectedProperty(property)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const PropertyListItem: React.FC<{ property: Property }> = ({ property }) => {
    const isFavorite = favoriteProperties.has(property.id);

    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="flex">
            {/* Property Image */}
            <div className="w-48 h-32 bg-gray-200 flex items-center justify-center flex-shrink-0">
              <Camera className="h-8 w-8 text-gray-400" />
            </div>

            {/* Property Details */}
            <div className="flex-1 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{property.title}</h3>
                  <p className="text-sm text-gray-600 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {property.location.district}, {property.location.city}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl text-blue-600">
                    {formatPrice(property.price, property.currency)}
                  </div>
                  {property.listingType === 'rent' && (
                    <div className="text-sm text-gray-600">/month</div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                {property.bedrooms && (
                  <div className="flex items-center space-x-1">
                    <Bed className="h-4 w-4" />
                    <span>{property.bedrooms} beds</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center space-x-1">
                    <Bath className="h-4 w-4" />
                    <span>{property.bathrooms} baths</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Square className="h-4 w-4" />
                  <span>{property.area} m²</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                {property.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  <span className="text-sm font-medium">{property.agent.name}</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">{property.agent.rating}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleFavorite(property.id)}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ViewingRequestForm: React.FC<{
    property: Property;
    onSubmit: (propertyId: string, contactInfo: any) => void;
  }> = ({ property, onSubmit }) => {
    const [formData, setFormData] = useState({
      name: '',
      phone: '',
      email: '',
      preferredDate: '',
      preferredTime: '',
      message: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(property.id, formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Preferred Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.preferredDate}
              onChange={(e) => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="time">Preferred Time</Label>
            <Select
              value={formData.preferredTime}
              onValueChange={(value) => setFormData(prev => ({ ...prev, preferredTime: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="09:00">9:00 AM</SelectItem>
                <SelectItem value="10:00">10:00 AM</SelectItem>
                <SelectItem value="11:00">11:00 AM</SelectItem>
                <SelectItem value="14:00">2:00 PM</SelectItem>
                <SelectItem value="15:00">3:00 PM</SelectItem>
                <SelectItem value="16:00">4:00 PM</SelectItem>
                <SelectItem value="17:00">5:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="message">Additional Message (Optional)</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Any specific requirements or questions..."
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">
            Submit Request
          </Button>
        </div>
      </form>
    );
  };

  const FilterPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Property Type</Label>
          <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="villa">Villa</SelectItem>
              <SelectItem value="office">Office</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="warehouse">Warehouse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Listing Type</Label>
          <Select value={filters.listingType} onValueChange={(value) => setFilters(prev => ({ ...prev, listingType: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sale">For Sale</SelectItem>
              <SelectItem value="rent">For Rent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>City</Label>
          <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="riyadh">Riyadh</SelectItem>
              <SelectItem value="jeddah">Jeddah</SelectItem>
              <SelectItem value="dammam">Dammam</SelectItem>
              <SelectItem value="mecca">Mecca</SelectItem>
              <SelectItem value="medina">Medina</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Min Price</Label>
            <Input
              type="number"
              value={filters.minPrice || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Max Price</Label>
            <Input
              type="number"
              value={filters.maxPrice || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 0 }))}
              placeholder="No limit"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Bedrooms</Label>
            <Select value={filters.bedrooms} onValueChange={(value) => setFilters(prev => ({ ...prev, bedrooms: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bathrooms</Label>
            <Select value={filters.bathrooms} onValueChange={(value) => setFilters(prev => ({ ...prev, bathrooms: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setFilters({
            type: 'all',
            listingType: 'all',
            city: 'all',
            district: 'all',
            minPrice: 0,
            maxPrice: 0,
            minArea: 0,
            maxArea: 0,
            bedrooms: 'all',
            bathrooms: 'all',
            amenities: [],
            features: []
          })}
        >
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  );

  const getDemoProperties = (): Property[] => [
    {
      id: '1',
      title: 'Luxury Villa in Al Nakheel District',
      description: 'Stunning 4-bedroom villa with private pool and garden. Perfect for families.',
      type: 'villa',
      listingType: 'sale',
      price: 2500000,
      currency: 'SAR',
      area: 450,
      bedrooms: 4,
      bathrooms: 3,
      parking: 2,
      location: {
        city: 'Riyadh',
        district: 'Al Nakheel',
        street: 'King Fahd Road',
        coordinates: { lat: 24.7136, lng: 46.6753 }
      },
      amenities: ['Pool', 'Garden', 'Garage', 'Security'],
      images: [],
      agent: {
        id: 'agent1',
        name: 'Ahmed Al-Rashid',
        company: 'Prime Properties',
        phone: '+966501234567',
        email: 'ahmed@primeproperties.sa',
        rating: 4.8,
        verified: true
      },
      features: {
        furnished: false,
        balcony: true,
        garden: true,
        pool: true,
        gym: false,
        security: true
      },
      createdAt: new Date('2025-09-15'),
      updatedAt: new Date('2025-09-18'),
      views: 156,
      favorites: 23,
      status: 'active'
    },
    // Add more demo properties...
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Aqar Douq</h1>
                <p className="text-sm text-gray-600">Real Estate Marketplace</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline">
                <TrendingUp className="h-3 w-3 mr-1" />
                {filteredProperties.length} Properties
              </Badge>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                List Property
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search properties by location, type, or features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="area_large">Area: Large to Small</SelectItem>
                <SelectItem value="area_small">Area: Small to Large</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border border-gray-200 rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <FilterPanel />
            </div>
          )}

          {/* Properties Grid/List */}
          <div className="flex-1">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading properties...</p>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12">
                <Home className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {filteredProperties.map((property) =>
                  viewMode === 'grid' ? (
                    <PropertyCard key={property.id} property={property} />
                  ) : (
                    <PropertyListItem key={property.id} property={property} />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AqarDouq;