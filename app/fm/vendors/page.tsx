'use client';

import { useState } from &apos;react&apos;;
import useSWR from 'swr&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Badge } from &apos;@/src/components/ui/badge&apos;;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from &apos;@/src/components/ui/dialog&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import { Textarea } from &apos;@/src/components/ui/textarea&apos;;
import { Separator } from &apos;@/src/components/ui/separator&apos;;
import { Truck, Plus, Search, Filter, Star, MapPin, Eye, Edit, Trash2, Building2, Wrench, ShoppingCart, Users } from &apos;lucide-react&apos;;

const fetcher = (url: string) => fetch(url, { headers: { "x-tenant-id": "demo-tenant" } }).then(r => r.json());

export default function VendorsPage() {
  const [search, setSearch] = useState(&apos;');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(&apos;');
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
        {vendors.map((vendor: any) => (
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

function VendorCard({ vendor, onUpdated }: { vendor: any; onUpdated: () => void }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUPPLIER&apos;:
        return <ShoppingCart className="w-5 h-5" />;
      case 'CONTRACTOR&apos;:
        return <Wrench className="w-5 h-5" />;
      case 'SERVICE_PROVIDER&apos;:
        return <Users className="w-5 h-5" />;
      case 'CONSULTANT&apos;:
        return <Building2 className="w-5 h-5" />;
      default:
        return <Truck className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SUPPLIER&apos;:
        return &apos;bg-blue-100 text-blue-800&apos;;
      case &apos;CONTRACTOR&apos;:
        return &apos;bg-green-100 text-green-800&apos;;
      case &apos;SERVICE_PROVIDER&apos;:
        return &apos;bg-purple-100 text-purple-800&apos;;
      case &apos;CONSULTANT&apos;:
        return &apos;bg-orange-100 text-orange-800&apos;;
      default:
        return &apos;bg-gray-100 text-gray-800&apos;;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case &apos;APPROVED&apos;:
        return &apos;bg-green-100 text-green-800&apos;;
      case &apos;PENDING&apos;:
        return &apos;bg-yellow-100 text-yellow-800&apos;;
      case &apos;SUSPENDED&apos;:
        return &apos;bg-red-100 text-red-800&apos;;
      case &apos;REJECTED&apos;:
        return &apos;bg-gray-100 text-gray-800&apos;;
      case &apos;BLACKLISTED&apos;:
        return &apos;bg-black text-white&apos;;
      default:
        return &apos;bg-gray-100 text-gray-800&apos;;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(vendor.type)}
            <div className="flex-1">
              <CardTitle className="text-lg">{vendor.name}</CardTitle>
              <p className="text-sm text-gray-600">{vendor.code}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={getTypeColor(vendor.type)}>
              {vendor.type.toLowerCase()}
            </Badge>
            <Badge className={getStatusColor(vendor.status)}>
              {vendor.status.toLowerCase()}
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
          <span className="font-medium">{vendor.performance?.rating || 'N/A&apos;}</span>
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
            <span className="text-sm font-medium">{vendor.performance?.averageResponseTime || 'N/A&apos;} hrs</span>
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
    name: &apos;',
    type: '',
    contact: {
      primary: {
        name: &apos;',
        title: '',
        email: &apos;',
        phone: '',
        mobile: &apos;'
      },
      secondary: {
        name: '',
        email: &apos;',
        phone: ''
      },
      address: {
        street: &apos;',
        city: '',
        region: &apos;',
        postalCode: ''
      }
    },
    business: {
      registrationNumber: &apos;',
      taxId: '',
      licenseNumber: &apos;',
      establishedDate: '',
      employees: 0,
      annualRevenue: 0,
      specializations: [] as string[],
      certifications: [] as any[]
    },
    status: &apos;PENDING&apos;,
    tags: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(&apos;/api/vendors&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos;, &apos;x-tenant-id&apos;: &apos;demo-tenant&apos; },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onCreated();
      } else {
        alert(&apos;Failed to create vendor&apos;);
      }
    } catch (error) {
      alert(&apos;Error creating vendor&apos;);
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
