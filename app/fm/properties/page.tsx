'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { Separator } from '@/src/components/ui/separator';
import { Building2, Plus, Search, Filter, MapPin, Eye, Edit, Trash2, Home, Building, Factory, Map } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { headers: { "x-tenant-id": "demo-tenant" } }).then(r => r.json());

export default function PropertiesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, mutate } = useSWR(
    `/api/properties?search=${encodeURIComponent(search)}&type=${typeFilter}`,
    fetcher
  );

  const properties = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Property Management</h1>
          <p className="text-gray-600">Real estate portfolio and tenant management</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              New Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
            </DialogHeader>
            <CreatePropertyForm onCreated={() => { mutate(); setCreateOpen(false); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search properties..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                <SelectItem value="MIXED_USE">Mixed Use</SelectItem>
                <SelectItem value="LAND">Land</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              View Map
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property: any) => (
          <PropertyCard key={property._id} property={property} onUpdated={mutate} />
        ))}
      </div>

      {/* Empty State */}
      {properties.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first property to the portfolio.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PropertyCard({ property, onUpdated }: { property: any; onUpdated: () => void }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'RESIDENTIAL':
        return <Home className="w-5 h-5" />;
      case 'COMMERCIAL':
        return <Building className="w-5 h-5" />;
      case 'INDUSTRIAL':
        return <Factory className="w-5 h-5" />;
      default:
        return <Building2 className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RESIDENTIAL':
        return 'bg-blue-100 text-blue-800';
      case 'COMMERCIAL':
        return 'bg-green-100 text-green-800';
      case 'INDUSTRIAL':
        return 'bg-orange-100 text-orange-800';
      case 'MIXED_USE':
        return 'bg-purple-100 text-purple-800';
      case 'LAND':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const occupancyRate = property.details?.occupancyRate || 0;
  const totalUnits = property.units?.length || 0;
  const occupiedUnits = property.units?.filter((u: any) => u.status === 'OCCUPIED').length || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(property.type)}
            <div className="flex-1">
              <CardTitle className="text-lg">{property.name}</CardTitle>
              <p className="text-sm text-gray-600">{property.code}</p>
            </div>
          </div>
          <Badge className={getTypeColor(property.type)}>
            {property.type.toLowerCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{property.address?.city}, {property.address?.region}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Area:</span>
            <span className="text-sm font-medium">{property.details?.totalArea || 'N/A'} sqm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Units:</span>
            <span className="text-sm font-medium">{totalUnits} units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Occupancy:</span>
            <span className="text-sm font-medium">{occupancyRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Monthly Rent:</span>
            <span className="text-sm font-medium">{property.financial?.monthlyRent?.toLocaleString() || 'N/A'} SAR</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Status:</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Active</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Tenants:</span>
            <span className="text-sm font-medium">{occupiedUnits}/{totalUnits}</span>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatePropertyForm({ onCreated }: { onCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    subtype: '',
    address: {
      street: '',
      city: '',
      region: '',
      postalCode: '',
      coordinates: { lat: 24.7136, lng: 46.6753 }, // Default to Riyadh
      nationalAddress: '',
      district: ''
    },
    details: {
      totalArea: 0,
      builtArea: 0,
      bedrooms: 0,
      bathrooms: 0,
      floors: 0,
      parkingSpaces: 0,
      yearBuilt: new Date().getFullYear(),
      occupancyRate: 0
    },
    ownership: {
      type: 'OWNED',
      owner: {
        name: '',
        contact: '',
        id: ''
      },
      lease: {
        startDate: '',
        endDate: '',
        monthlyRent: 0,
        landlord: ''
      }
    },
    features: {
      amenities: [] as string[],
      utilities: {
        electricity: '',
        water: '',
        gas: '',
        internet: ''
      },
      accessibility: {
        elevator: false,
        ramp: false,
        parking: false
      }
    },
    tags: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'demo-tenant' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onCreated();
      } else {
        alert('Failed to create property');
      }
    } catch (error) {
      alert('Error creating property');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Property Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RESIDENTIAL">Residential</SelectItem>
              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
              <SelectItem value="MIXED_USE">Mixed Use</SelectItem>
              <SelectItem value="LAND">Land</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Street Address *</label>
          <Input
            value={formData.address.street}
            onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">City *</label>
          <Input
            value={formData.address.city}
            onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Region *</label>
          <Input
            value={formData.address.region}
            onChange={(e) => setFormData({...formData, address: {...formData.address, region: e.target.value}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Postal Code</label>
          <Input
            value={formData.address.postalCode}
            onChange={(e) => setFormData({...formData, address: {...formData.address, postalCode: e.target.value}})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Total Area (sqm)</label>
          <Input
            type="number"
            value={formData.details.totalArea}
            onChange={(e) => setFormData({...formData, details: {...formData.details, totalArea: Number(e.target.value)}})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Built Area (sqm)</label>
          <Input
            type="number"
            value={formData.details.builtArea}
            onChange={(e) => setFormData({...formData, details: {...formData.details, builtArea: Number(e.target.value)}})}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Bedrooms</label>
          <Input
            type="number"
            value={formData.details.bedrooms}
            onChange={(e) => setFormData({...formData, details: {...formData.details, bedrooms: Number(e.target.value)}})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bathrooms</label>
          <Input
            type="number"
            value={formData.details.bathrooms}
            onChange={(e) => setFormData({...formData, details: {...formData.details, bathrooms: Number(e.target.value)}})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Floors</label>
          <Input
            type="number"
            value={formData.details.floors}
            onChange={(e) => setFormData({...formData, details: {...formData.details, floors: Number(e.target.value)}})}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-green-600 hover:bg-green-700">
          Create Property
        </Button>
      </div>
    </form>
  );
}