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
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
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
  const auto = useAutoTranslator('fm.assets');
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
        <p className="text-destructive">
          {auto('Error: No organization ID found. Please contact support.', 'errors.noOrg')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {auto('Asset Management', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Equipment registry and predictive maintenance', 'header.subtitle')}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 me-2" />
              {auto('New Asset', 'actions.newAsset')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{auto('Add New Asset', 'dialog.title')}</DialogTitle>
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
                  placeholder={auto('Search assets...', 'filters.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
              <Select value={typeFilter} onValueChange={setTypeFilter} className="w-48">
                <SelectTrigger>
                  <SelectValue placeholder={auto('Asset Type', 'filters.type')} />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="">{auto('All Types', 'filters.allTypes')}</SelectItem>
                <SelectItem value="HVAC">{auto('HVAC', 'filters.types.hvac')}</SelectItem>
                <SelectItem value="ELECTRICAL">{auto('Electrical', 'filters.types.electrical')}</SelectItem>
                <SelectItem value="PLUMBING">{auto('Plumbing', 'filters.types.plumbing')}</SelectItem>
                <SelectItem value="SECURITY">{auto('Security', 'filters.types.security')}</SelectItem>
                <SelectItem value="ELEVATOR">{auto('Elevator', 'filters.types.elevator')}</SelectItem>
                <SelectItem value="GENERATOR">{auto('Generator', 'filters.types.generator')}</SelectItem>
                <SelectItem value="FIRE_SYSTEM">{auto('Fire System', 'filters.types.fireSystem')}</SelectItem>
                <SelectItem value="IT_EQUIPMENT">{auto('IT Equipment', 'filters.types.itEquipment')}</SelectItem>
                <SelectItem value="VEHICLE">{auto('Vehicle', 'filters.types.vehicle')}</SelectItem>
                <SelectItem value="OTHER">{auto('Other', 'filters.types.other')}</SelectItem>
              </SelectContent>
            </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter} className="w-48">
                <SelectTrigger>
                  <SelectValue placeholder={auto('Status', 'filters.status')} />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="">{auto('All Status', 'filters.allStatus')}</SelectItem>
                <SelectItem value="ACTIVE">{auto('Active', 'status.active')}</SelectItem>
                <SelectItem value="MAINTENANCE">{auto('Maintenance', 'status.maintenance')}</SelectItem>
                <SelectItem value="OUT_OF_SERVICE">{auto('Out of Service', 'status.outOfService')}</SelectItem>
                <SelectItem value="DECOMMISSIONED">{auto('Decommissioned', 'status.decommissioned')}</SelectItem>
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
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {auto('No Assets Found', 'empty.title')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {auto('Get started by adding your first asset to the registry.', 'empty.subtitle')}
                </p>
                <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 me-2" />
                  {auto('Add Asset', 'actions.addAsset')}
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
  const auto = useAutoTranslator('fm.assets.card');
  
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

    const toastId = toast.loading(
      auto('Deleting {{name}}...', 'toast.deleting').replace('{{name}}', asset.name ?? '')
    );
    
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': orgId }
      });
      
      if (response.ok) {
        toast.success(auto('Asset deleted successfully', 'toast.deleteSuccess'), { id: toastId });
        onUpdated();
      } else {
        const error = await response.json();
        toast.error(
          auto('Failed to delete asset: {{error}}', 'toast.deleteFailed').replace(
            '{{error}}',
            error.error || auto('Unknown error', 'toast.unknown')
          ),
          { id: toastId }
        );
      }
    } catch (error) {
      logger.error('Delete error:', error);
      toast.error(auto('Error deleting asset. Please try again.', 'toast.deleteError'), { id: toastId });
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
            <span className="text-sm text-muted-foreground">
              {auto('Type:', 'type')}
            </span>
            <span className="text-sm font-medium">{asset.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {auto('Category:', 'category')}
            </span>
            <span className="text-sm font-medium">{asset.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {auto('Criticality:', 'criticality')}
            </span>
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
              <span className="text-sm text-muted-foreground">
                {auto('Location:', 'location')}
              </span>
              <span className="text-sm font-medium">
                {asset.location.building && `${asset.location.building}`}
                {asset.location.floor &&
                  `, ${auto('Floor {{floor}}', 'floor').replace(
                    '{{floor}}',
                    asset.location.floor ?? ''
                  )}`}
                {asset.location.room &&
                  `, ${auto('Room {{room}}', 'room').replace(
                    '{{room}}',
                    asset.location.room ?? ''
                  )}`}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {auto('Last Maintenance:', 'lastMaintenance')}{' '}
            {asset.maintenanceHistory && asset.maintenanceHistory.length > 0 && asset.maintenanceHistory[asset.maintenanceHistory.length - 1].date
              ? <ClientDate date={asset.maintenanceHistory[asset.maintenanceHistory.length - 1].date as string} format="date-only" />
              : auto('Never', 'never')}
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
  const auto = useAutoTranslator('fm.assets.form');
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
      toast.error(auto('No organization ID found', 'errors.noOrg'));
      return;
    }

    const toastId = toast.loading(auto('Creating asset...', 'loading'));

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
        toast.success(auto('Asset created successfully', 'success'), { id: toastId });
        onCreated();
      } else {
        const error = await response.json();
        toast.error(
          auto('Failed to create asset: {{error}}', 'failed').replace(
            '{{error}}',
            error.error || auto('Unknown error', 'unknown')
          ),
          { id: toastId }
        );
      }
    } catch (error) {
      logger.error('Error creating asset:', error);
      toast.error(auto('Error creating asset. Please try again.', 'error'), { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto('Asset Name *', 'form.labels.name')}
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto('Type *', 'form.labels.type')}
          </label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger>
              <SelectValue placeholder={auto('Select type', 'form.placeholders.type')}>
                {formData.type || ''}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HVAC">{auto('HVAC', 'filters.types.hvac')}</SelectItem>
              <SelectItem value="ELECTRICAL">{auto('Electrical', 'filters.types.electrical')}</SelectItem>
              <SelectItem value="PLUMBING">{auto('Plumbing', 'filters.types.plumbing')}</SelectItem>
              <SelectItem value="SECURITY">{auto('Security', 'filters.types.security')}</SelectItem>
              <SelectItem value="ELEVATOR">{auto('Elevator', 'filters.types.elevator')}</SelectItem>
              <SelectItem value="GENERATOR">{auto('Generator', 'filters.types.generator')}</SelectItem>
              <SelectItem value="FIRE_SYSTEM">{auto('Fire System', 'filters.types.fireSystem')}</SelectItem>
              <SelectItem value="IT_EQUIPMENT">{auto('IT Equipment', 'filters.types.itEquipment')}</SelectItem>
              <SelectItem value="VEHICLE">{auto('Vehicle', 'filters.types.vehicle')}</SelectItem>
              <SelectItem value="OTHER">{auto('Other', 'filters.types.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {auto('Description', 'form.labels.description')}
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto('Category *', 'form.labels.category')}
          </label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto('Manufacturer', 'form.labels.manufacturer')}
          </label>
          <Input
            value={formData.manufacturer}
            onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto('Model', 'form.labels.model')}
          </label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({...formData, model: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto('Serial Number', 'form.labels.serial')}
          </label>
          <Input
            value={formData.serialNumber}
            onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {auto('Status', 'form.labels.status')}
        </label>
        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
          <SelectTrigger>
            <SelectValue placeholder={auto('Select status', 'form.placeholders.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">{auto('Active', 'status.active')}</SelectItem>
            <SelectItem value="MAINTENANCE">{auto('Maintenance', 'status.maintenance')}</SelectItem>
            <SelectItem value="OUT_OF_SERVICE">{auto('Out of Service', 'status.outOfService')}</SelectItem>
            <SelectItem value="DECOMMISSIONED">{auto('Decommissioned', 'status.decommissioned')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {auto('Criticality', 'form.labels.criticality')}
        </label>
        <Select value={formData.criticality} onValueChange={(value) => setFormData({...formData, criticality: value})}>
          <SelectTrigger>
            <SelectValue placeholder={auto('Select criticality', 'form.placeholders.criticality')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">{auto('Low', 'form.criticality.low')}</SelectItem>
            <SelectItem value="MEDIUM">{auto('Medium', 'form.criticality.medium')}</SelectItem>
            <SelectItem value="HIGH">{auto('High', 'form.criticality.high')}</SelectItem>
            <SelectItem value="CRITICAL">{auto('Critical', 'form.criticality.critical')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          {auto('Create Asset', 'form.actions.submit')}
        </Button>
      </div>
    </form>
  );
}
