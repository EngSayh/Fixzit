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
import { Separator } from '@/components/ui/separator';
import { CardGridSkeleton } from '@/components/skeletons';
import { Users, Plus, Search, Mail, Phone, MapPin, Eye, Edit, Trash2, User, Building, Shield } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

import { logger } from '@/lib/logger';
interface TenantProperty {
  occupancy?: {
    status?: string;
  };
}

interface Tenant {
  id: string;
  name?: string;
  code?: string;
  type?: string;
  contact?: {
    primary?: {
      email?: string;
      phone?: string;
    };
  };
  address?: {
    current?: {
      city?: string;
      region?: string;
    };
  };
  financial?: {
    outstandingBalance?: number;
  };
  properties?: TenantProperty[];
}

export default function TenantsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId } 
    })
      .then(r => r.json())
      .catch(error => {
        logger.error('FM tenants fetch error', { error });
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId ? `/api/tenants?search=${encodeURIComponent(search)}&type=${typeFilter}` : null,
    fetcher
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!orgId) {
    return <p>Error: No organization ID found in session</p>;
  }

  const tenants = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('fm.tenants.title', 'Tenant Management')}</h1>
          <p className="text-muted-foreground">{t('fm.tenants.subtitle', 'Customer relationship and lease management')}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90">
              <Plus className="w-4 h-4 me-2" />
              {t('fm.tenants.newTenant', 'New Tenant')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t('fm.tenants.addTenant', 'Add New Tenant')}</DialogTitle>
            </DialogHeader>
            <CreateTenantForm orgId={orgId} onCreated={() => { mutate(); setCreateOpen(false); }} />
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
                  placeholder={t('fm.tenants.searchTenants', 'Search tenants...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
              <Select value={typeFilter} onValueChange={setTypeFilter} placeholder={t('fm.tenants.tenantType', 'Tenant Type')} className="w-48">
                <SelectContent>
                <SelectItem value="">{t('fm.properties.allTypes', 'All Types')}</SelectItem>
                <SelectItem value="INDIVIDUAL">{t('fm.tenants.individual', 'Individual')}</SelectItem>
                <SelectItem value="COMPANY">{t('fm.tenants.company', 'Company')}</SelectItem>
                <SelectItem value="GOVERNMENT">{t('fm.tenants.government', 'Government')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(tenants as Tenant[]).map((tenant) => (
              <TenantCard key={tenant.id} tenant={tenant} onUpdated={mutate} />
            ))}
          </div>

          {/* Empty State */}
          {tenants.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('fm.tenants.noTenants', 'No Tenants Found')}</h3>
                <p className="text-muted-foreground mb-4">{t('fm.tenants.noTenantsText', 'Get started by adding your first tenant.')}</p>
                <Button onClick={() => setCreateOpen(true)} className="bg-secondary hover:bg-secondary/90">
                  <Plus className="w-4 h-4 me-2" />
                  {t('fm.tenants.addTenant', 'Add Tenant')}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TenantCard({ tenant }: { tenant: Tenant; onUpdated: () => void }) {
  const { t } = useTranslation();
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL':
        return <User className="w-5 h-5" />;
      case 'COMPANY':
        return <Building className="w-5 h-5" />;
      case 'GOVERNMENT':
        return <Shield className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL':
        return 'bg-primary/10 text-primary-foreground';
      case 'COMPANY':
        return 'bg-success/10 text-success-foreground';
      case 'GOVERNMENT':
        return 'bg-destructive/10 text-destructive-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL':
        return t('fm.tenants.individual', 'Individual');
      case 'COMPANY':
        return t('fm.tenants.company', 'Company');
      case 'GOVERNMENT':
        return t('fm.tenants.government', 'Government');
      default:
        return type?.toLowerCase() || '';
    }
  };

  const activeProperties = tenant.properties?.filter((p) => p.occupancy?.status === 'ACTIVE').length || 0;
  const totalProperties = tenant.properties?.length || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(tenant.type || '')}
            <div className="flex-1">
              <CardTitle className="text-lg">{tenant.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{tenant.code}</p>
            </div>
          </div>
          <Badge className={getTypeColor(tenant.type || '')}>
            {getTypeLabel(tenant.type || '')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Mail className="w-4 h-4 me-1" />
          <span>{tenant.contact?.primary?.email}</span>
        </div>

        {tenant.contact?.primary?.phone && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Phone className="w-4 h-4 me-1" />
            <span>{tenant.contact.primary.phone}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 me-1" />
          <span>{tenant.address?.current?.city}, {tenant.address?.current?.region}</span>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('fm.tenants.properties', 'Properties')}:</span>
            <span className="text-sm font-medium">{activeProperties}/{totalProperties}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('fm.tenants.leaseStatus', 'Lease Status')}:</span>
            <Badge variant="outline" className="text-success border-success">
              {activeProperties > 0 ? t('properties.leases.active', 'Active') : t('fm.tenants.noActiveLeases', 'No Active Leases')}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('fm.tenants.outstandingBalance', 'Outstanding Balance')}:</span>
            <span className="text-sm font-medium">
              {tenant.financial?.outstandingBalance?.toLocaleString() || '0'} SAR
            </span>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="ghost" size="sm" aria-label={t('common.view', 'View')} title={t('common.view', 'View')}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" aria-label={t('common.edit', 'Edit')} title={t('common.edit', 'Edit')}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" aria-label={t('common.delete', 'Delete')} title={t('common.delete', 'Delete')}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateTenantForm({ onCreated, orgId }: { onCreated: () => void; orgId: string }) {
  const { t } = useTranslation();
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
      emergency: {
        name: '',
        relationship: '',
        phone: ''
      }
    },
    identification: {
      nationalId: '',
      companyRegistration: '',
      taxId: '',
      licenseNumber: ''
    },
    address: {
      current: {
        street: '',
        city: '',
        region: '',
        postalCode: ''
      },
      permanent: {
        street: '',
        city: '',
        region: '',
        postalCode: ''
      }
    },
    preferences: {
      communication: {
        email: true,
        sms: false,
        phone: false,
        app: false
      },
      notifications: {
        maintenance: true,
        rent: true,
        events: false,
        announcements: false
      },
      language: 'ar',
      timezone: 'Asia/Riyadh'
    },
    tags: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading('Creating tenant...');

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': orgId 
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Tenant created successfully', { id: toastId });
        onCreated();
      } else {
        const error = await response.json();
        toast.error(`Failed to create tenant: ${error.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      logger.error('Error creating tenant:', error);
      toast.error('Error creating tenant. Please try again.', { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.tenants.tenantName', 'Tenant Name')} *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.properties.type', 'Type')} *</label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger>
              <SelectValue>
                {typeFilter || t('fm.properties.selectType', 'Select type')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INDIVIDUAL">{t('fm.tenants.individual', 'Individual')}</SelectItem>
              <SelectItem value="COMPANY">{t('fm.tenants.company', 'Company')}</SelectItem>
              <SelectItem value="GOVERNMENT">{t('fm.tenants.government', 'Government')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.tenants.primaryContactName', 'Primary Contact Name')} *</label>
          <Input
            value={formData.contact.primary.name}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, primary: {...formData.contact.primary, name: e.target.value}}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.tenants.email', 'Email')} *</label>
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
          <label className="block text-sm font-medium mb-1">{t('fm.tenants.phone', 'Phone')}</label>
          <Input
            value={formData.contact.primary.phone}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, primary: {...formData.contact.primary, phone: e.target.value}}})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.tenants.mobile', 'Mobile')}</label>
          <Input
            value={formData.contact.primary.mobile}
            onChange={(e) => setFormData({...formData, contact: {...formData.contact, primary: {...formData.contact.primary, mobile: e.target.value}}})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.properties.city', 'City')} *</label>
          <Input
            value={formData.address.current.city}
            onChange={(e) => setFormData({...formData, address: {...formData.address, current: {...formData.address.current, city: e.target.value}}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.properties.region', 'Region')} *</label>
          <Input
            value={formData.address.current.region}
            onChange={(e) => setFormData({...formData, address: {...formData.address, current: {...formData.address.current, region: e.target.value}}})}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('fm.properties.streetAddress', 'Street Address')} *</label>
        <Input
          value={formData.address.current.street}
          onChange={(e) => setFormData({...formData, address: {...formData.address, current: {...formData.address.current, street: e.target.value}}})}
          required
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-secondary hover:bg-secondary/90">
          {t('fm.tenants.createTenant', 'Create Tenant')}
        </Button>
      </div>
    </form>
  );
}