'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Truck, Plus, Search, Star, MapPin, Eye, Edit, Trash2, Building2, Wrench, ShoppingCart, Users } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { headers: { "x-tenant-id": "demo-tenant" } }).then(r => r.json());

interface Vendor {
  _id: string;
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  contact?: { 
    email?: string; 
    phone?: string;
    address?: {
      city?: string;
      region?: string;
    };
  };
  performance?: { 
    successRate?: number; 
    averageResponseTime?: number;
    rating?: number;
    completedProjects?: number;
  };
  business?: { 
    specializations?: string[];
  };
  rating?: number;
  address?: { city?: string };
}

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, mutate } = useSWR(
    `/api/vendors?search=${encodeURIComponent(search)}&type=${typeFilter}&status=${statusFilter}`,
    fetcher
  );

  const vendors = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-gray-600">Supplier network and performance management</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              New Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <CreateVendorForm onCreated={() => { mutate(); setCreateOpen(false); }} />
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
                  placeholder="Search vendors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Vendor Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="SUPPLIER">Supplier</SelectItem>
                <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                <SelectItem value="SERVICE_PROVIDER">Service Provider</SelectItem>
                <SelectItem value="CONSULTANT">Consultant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(vendors as Vendor[]).map((vendor) => (
          <VendorCard key={vendor._id} vendor={vendor} onUpdated={mutate} />
        ))}
      </div>

      {/* Empty State */}
      {vendors.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vendors Found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first vendor to the network.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VendorCard({ vendor }: { vendor: Vendor; onUpdated: () => void }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUPPLIER':
        return <ShoppingCart className="w-5 h-5" />;
      case 'CONTRACTOR':
        return <Wrench className="w-5 h-5" />;
      case 'SERVICE_PROVIDER':
        return <Users className="w-5 h-5" />;
      case 'CONSULTANT':
        return <Building2 className="w-5 h-5" />;
      default:
        return <Truck className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SUPPLIER':
        return 'bg-blue-100 text-blue-800';
      case 'CONTRACTOR':
        return 'bg-green-100 text-green-800';
      case 'SERVICE_PROVIDER':
        return 'bg-purple-100 text-purple-800';
      case 'CONSULTANT':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      case 'REJECTED':
        return 'bg-gray-100 text-gray-800';
      case 'BLACKLISTED':
        return 'bg-black text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(vendor.type || '')}
            <div className="flex-1">
              <CardTitle className="text-lg">{vendor.name}</CardTitle>
              <p className="text-sm text-gray-600">{vendor.code}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={getTypeColor(vendor.type || '')}>
              {vendor.type?.toLowerCase() || ''}
            </Badge>
            <Badge className={getStatusColor(vendor.status || '')}>
              {vendor.status?.toLowerCase() || ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{vendor.contact?.address?.city}, {vendor.contact?.address?.region}</span>
        </div>

        <div className="flex items-center text-sm">
          <Star className="w-4 h-4 mr-1 text-yellow-500" />
          <span className="font-medium">{vendor.performance?.rating || 'N/A'}</span>
          <span className="text-gray-600 ml-2">
            ({vendor.performance?.completedProjects || 0} projects)
          </span>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Success Rate:</span>
            <span className="text-sm font-medium">{vendor.performance?.successRate || 0}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Response Time:</span>
            <span className="text-sm font-medium">{vendor.performance?.averageResponseTime || 'N/A'} hrs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Specializations:</span>
            <span className="text-sm font-medium">{vendor.business?.specializations?.length || 0}</span>
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

function CreateVendorForm({ onCreated }: { onCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    contact: {
      primary: {
        name: '',
        title: '',
        email: '',
        phone: '',
        mobile: ''
      },
      secondary: {
        name: '',
        email: '',
        phone: ''
      },
      address: {
        street: '',
        city: '',
        region: '',
        postalCode: ''
      }
    },
    business: {
      registrationNumber: '',
      taxId: '',
      licenseNumber: '',
      establishedDate: '',
      employees: 0,
      annualRevenue: 0,
      specializations: [] as string[],
      certifications: [] as string[]
    },
    status: 'PENDING',
    tags: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'demo-tenant' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onCreated();
      } else {
        alert('Failed to create vendor');
      }
    } catch {
      alert('Error creating vendor');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Company Name *</label>
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
              <SelectItem value="SUPPLIER">Supplier</SelectItem>
              <SelectItem value="CONTRACTOR">Contractor</SelectItem>
              <SelectItem value="SERVICE_PROVIDER">Service Provider</SelectItem>
              <SelectItem value="CONSULTANT">Consultant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Contact Name *</label>
          <Input
            value={formData.contact.primary.name}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, primary: {...formData.contact.primary, name: e.target.value}}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <Input
            type="email"
            value={formData.contact.primary.email}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, primary: {...formData.contact.primary, email: e.target.value}}})}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <Input
            value={formData.contact.primary.phone}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, primary: {...formData.contact.primary, phone: e.target.value}}})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mobile</label>
          <Input
            value={formData.contact.primary.mobile}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, primary: {...formData.contact.primary, mobile: e.target.value}}})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City *</label>
          <Input
            value={formData.contact.address.city}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, address: {...formData.contact.address, city: e.target.value}}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Region *</label>
          <Input
            value={formData.contact.address.region}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, address: {...formData.contact.address, region: e.target.value}}})}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Street Address *</label>
        <Input
          value={formData.contact.address.street}
          onChange={(e) => setFormData({...formData, contact: {...formData.contact, address: {...formData.contact.address, street: e.target.value}}})}
          required
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
          Create Vendor
        </Button>
      </div>
    </form>
  );
}

