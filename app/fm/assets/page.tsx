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
import { Building2, Plus, Search, Filter, Settings, Eye, Edit, Trash2, AlertTriangle, CheckCircle, XCircle } from &apos;lucide-react&apos;;

const fetcher = (url: string) => fetch(url, { headers: { "x-tenant-id": "demo-tenant" } }).then(r => r.json());

export default function AssetsPage() {
  const [search, setSearch] = useState(&apos;');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(&apos;');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, mutate } = useSWR(
    `/api/assets?search=${encodeURIComponent(search)}&type=${typeFilter}&status=${statusFilter}`,
    fetcher
  );

  const assets = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <p className="text-gray-600">Equipment registry and predictive maintenance</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <CreateAssetForm onCreated={() => { mutate(); setCreateOpen(false); }} />
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
                  placeholder="Search assets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="HVAC">HVAC</SelectItem>
                <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                <SelectItem value="PLUMBING">Plumbing</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="ELEVATOR">Elevator</SelectItem>
                <SelectItem value="GENERATOR">Generator</SelectItem>
                <SelectItem value="FIRE_SYSTEM">Fire System</SelectItem>
                <SelectItem value="IT_EQUIPMENT">IT Equipment</SelectItem>
                <SelectItem value="VEHICLE">Vehicle</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset: any) => (
          <AssetCard key={asset._id} asset={asset} onUpdated={mutate} />
        ))}
      </div>

      {/* Empty State */}
      {assets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assets Found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first asset to the registry.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AssetCard({ asset, onUpdated }: { asset: any; onUpdated: () => void }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE&apos;:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'MAINTENANCE&apos;:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'OUT_OF_SERVICE&apos;:
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Settings className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE&apos;:
        return &apos;bg-green-100 text-green-800&apos;;
      case &apos;MAINTENANCE&apos;:
        return &apos;bg-yellow-100 text-yellow-800&apos;;
      case &apos;OUT_OF_SERVICE&apos;:
        return &apos;bg-red-100 text-red-800&apos;;
      default:
        return &apos;bg-gray-100 text-gray-800&apos;;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{asset.name}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{asset.code}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(asset.status)}
            <Badge className={getStatusColor(asset.status)}>
              {asset.status.toLowerCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Type:</span>
            <span className="text-sm font-medium">{asset.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Category:</span>
            <span className="text-sm font-medium">{asset.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Criticality:</span>
            <Badge variant="outline" className={
              asset.criticality === 'CRITICAL&apos; ? &apos;border-red-300 text-red-700&apos; :
              asset.criticality === &apos;HIGH&apos; ? &apos;border-orange-300 text-orange-700&apos; :
              asset.criticality === &apos;MEDIUM&apos; ? &apos;border-yellow-300 text-yellow-700&apos; :
              &apos;border-gray-300 text-gray-700&apos;
            }>
              {asset.criticality}
            </Badge>
          </div>
          {asset.location && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Location:</span>
              <span className="text-sm font-medium">
                {asset.location.building && `${asset.location.building}`}
                {asset.location.floor && `, Floor ${asset.location.floor}`}
                {asset.location.room && `, Room ${asset.location.room}`}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Last Maintenance: {asset.maintenanceHistory?.length > 0
              ? new Date(asset.maintenanceHistory[asset.maintenanceHistory.length - 1].date).toLocaleDateString()
              : 'Never&apos;}
          </span>
          <div className="flex space-x-2">
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
        </div>
      </CardContent>
    </Card>
  );
}

function CreateAssetForm({ onCreated }: { onCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: &apos;',
    description: '',
    type: &apos;',
    category: '',
    manufacturer: &apos;',
    model: '',
    serialNumber: &apos;',
    propertyId: '',
    location: {
      building: &apos;',
      floor: '',
      room: &apos;',
      coordinates: { lat: 24.7136, lng: 46.6753 } // Default to Riyadh
    },
    specs: {
      capacity: '',
      powerRating: &apos;',
      voltage: '',
      current: &apos;',
      frequency: '',
      dimensions: &apos;',
      weight: ''
    },
    purchase: {
      date: &apos;',
      cost: 0,
      supplier: '',
      warranty: {
        period: 12,
        expiry: &apos;',
        terms: ''
      }
    },
    status: &apos;ACTIVE&apos;,
    criticality: &apos;MEDIUM&apos;,
    tags: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(&apos;/api/assets&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos;, &apos;x-tenant-id&apos;: &apos;demo-tenant&apos; },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onCreated();
      } else {
        alert(&apos;Failed to create asset&apos;);
      }
    } catch (error) {
      alert(&apos;Error creating asset&apos;);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Asset Name *</label>
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
              <SelectItem value="HVAC">HVAC</SelectItem>
              <SelectItem value="ELECTRICAL">Electrical</SelectItem>
              <SelectItem value="PLUMBING">Plumbing</SelectItem>
              <SelectItem value="SECURITY">Security</SelectItem>
              <SelectItem value="ELEVATOR">Elevator</SelectItem>
              <SelectItem value="GENERATOR">Generator</SelectItem>
              <SelectItem value="FIRE_SYSTEM">Fire System</SelectItem>
              <SelectItem value="IT_EQUIPMENT">IT Equipment</SelectItem>
              <SelectItem value="VEHICLE">Vehicle</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
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
          <label className="block text-sm font-medium mb-1">Category *</label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Manufacturer</label>
          <Input
            value={formData.manufacturer}
            onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({...formData, model: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Serial Number</label>
          <Input
            value={formData.serialNumber}
            onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
            <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Criticality</label>
        <Select value={formData.criticality} onValueChange={(value) => setFormData({...formData, criticality: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          Create Asset
        </Button>
      </div>
    </form>
  );
}
