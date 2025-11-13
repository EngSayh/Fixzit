'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { CardGridSkeleton } from '@/components/skeletons';
import { Building2, Plus, Search, Settings, Eye, Edit, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import ClientDate from '@/components/ClientDate';

import { logger } from '@/lib/logger';
interface MaintenanceRecord {
  date?: string;
}

interface AssetItem {
  id: string;
  name?: string;
  code?: string;
  type?: string;
  category?: string;
  status?: string;
  criticality?: string;
  location?: {
    building?: string;
    floor?: string;
    room?: string;
  };
  maintenanceHistory?: MaintenanceRecord[];
}

export default function AssetsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const orgId = session?.user?.orgId;

  // Fetcher with dynamic tenant ID from session
  const fetcher = (url: string) => {
    if (!orgId) return Promise.reject(new Error('No organization ID'));
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId } 
    })
      .then(r => r.json())
      .catch(error => {
        logger.error('FM assets fetch error', { error });
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId ? `/api/assets?search=${encodeURIComponent(search)}&type=${typeFilter}&status=${statusFilter}` : null,
    fetcher
  );

  const assets = data?.items || [];

  // Show loading state if no session yet
  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: No organization ID found. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <p className="text-muted-foreground">Equipment registry and predictive maintenance</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 me-2" />
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
                <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search assets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
              <Select value={typeFilter} onValueChange={setTypeFilter} placeholder="Asset Type" className="w-48">
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
              <Select value={statusFilter} onValueChange={setStatusFilter} placeholder="Status" className="w-48">
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
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(assets as AssetItem[]).map((asset) => (
              <AssetCard key={asset.id} asset={asset} onUpdated={mutate} />
            ))}
          </div>

          {/* Empty State */}
          {assets.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Assets Found</h3>
                <p className="text-muted-foreground mb-4">Get started by adding your first asset to the registry.</p>
                <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 me-2" />
                  Add Asset
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function AssetCard({ asset, onUpdated }: { asset: AssetItem; onUpdated: () => void }) {
  const { data: session } = useSession();
  
  const handleView = () => {
    // Placeholder: Navigate to asset detail view or open modal
    logger.info(`View asset: ${asset.id}`);
  };

  const handleEdit = () => {
    // Placeholder: Open edit modal or navigate to edit page
    logger.info(`Edit asset: ${asset.id}`);
    // After successful edit, call onUpdated()
  };

  const handleDelete = async () => {
    const orgId = session?.user?.orgId;
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading(`Deleting ${asset.name}...`);
    
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': orgId }
      });
      
      if (response.ok) {
        toast.success('Asset deleted successfully', { id: toastId });
        onUpdated();
      } else {
        const error = await response.json();
        toast.error(`Failed to delete asset: ${error.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      logger.error('Delete error:', error);
      toast.error('Error deleting asset. Please try again.', { id: toastId });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'MAINTENANCE':
        return <AlertTriangle className="w-4 h-4 text-accent" />;
      case 'OUT_OF_SERVICE':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Settings className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success/10 text-success-foreground';
      case 'MAINTENANCE':
        return 'bg-warning/10 text-warning-foreground';
      case 'OUT_OF_SERVICE':
        return 'bg-destructive/10 text-destructive-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{asset.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{asset.code}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(asset.status || '')}
            <Badge className={getStatusColor(asset.status || '')}>
              {asset.status?.toLowerCase() || ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Type:</span>
            <span className="text-sm font-medium">{asset.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Category:</span>
            <span className="text-sm font-medium">{asset.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Criticality:</span>
            <Badge variant="outline" className={
              asset.criticality === 'CRITICAL' ? 'border-destructive/30 text-destructive' :
              asset.criticality === 'HIGH' ? 'border-warning text-warning' :
              asset.criticality === 'MEDIUM' ? 'border-warning text-warning' :
              'border-border text-foreground'
            }>
              {asset.criticality}
            </Badge>
          </div>
          {asset.location && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Location:</span>
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
          <span className="text-sm text-muted-foreground">
            Last Maintenance: {asset.maintenanceHistory && asset.maintenanceHistory.length > 0 && asset.maintenanceHistory[asset.maintenanceHistory.length - 1].date
              ? <ClientDate date={asset.maintenanceHistory[asset.maintenanceHistory.length - 1].date as string} format="date-only" />
              : 'Never'}
          </span>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={handleView}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateAssetForm({ onCreated }: { onCreated: () => void }) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    category: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    propertyId: '',
    location: {
      building: '',
      floor: '',
      room: '',
      coordinates: { lat: 24.7136, lng: 46.6753 } // Default to Riyadh
    },
    specs: {
      capacity: '',
      powerRating: '',
      voltage: '',
      current: '',
      frequency: '',
      dimensions: '',
      weight: ''
    },
    purchase: {
      date: '',
      cost: 0,
      supplier: '',
      warranty: {
        period: 12,
        expiry: '',
        terms: ''
      }
    },
    status: 'ACTIVE',
    criticality: 'MEDIUM',
    tags: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const orgId = session?.user?.orgId;
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading('Creating asset...');

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': orgId 
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Asset created successfully', { id: toastId });
        onCreated();
      } else {
        const error = await response.json();
        toast.error(`Failed to create asset: ${error.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      logger.error('Error creating asset:', error);
      toast.error('Error creating asset. Please try again.', { id: toastId });
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
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          Create Asset
        </Button>
      </div>
    </form>
  );
}

