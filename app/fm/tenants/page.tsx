'use client';

import { useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CardGridSkeleton } from '@/components/skeletons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users, Plus, Search, Mail, Phone, MapPin, Eye, Edit, Trash2, User, Building, Shield } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { CreateTenantForm } from '@/components/fm/tenants/CreateTenantForm';
import { FmGuardedPage } from '@/components/fm/FmGuardedPage';
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

const sarCurrencyFormatter = new Intl.NumberFormat('en-SA', {
  style: 'currency',
  currency: 'SAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});


export default function TenantsPage() {
  return (
    <FmGuardedPage moduleId="tenants">
      {({ orgId, supportBanner }) => (
        <TenantsContent orgId={orgId} supportBanner={supportBanner} />
      )}
    </FmGuardedPage>
  );
}

type TenantsContentProps = {
  orgId: string;
  supportBanner?: ReactNode | null;
};

function TenantsContent({ orgId, supportBanner }: TenantsContentProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const fetcher = (url: string) =>
    fetch(url, {
      headers: { 'x-tenant-id': orgId }
    })
      .then((r) => r.json())
      .catch((error) => {
        logger.error('FM tenants fetch error', error);
        throw error;
      });

  const { data, mutate, isLoading, error } = useSWR(
    orgId ? [`/api/tenants?search=${encodeURIComponent(search)}&type=${typeFilter}`, orgId] : null,
    ([url]) => fetcher(url)
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  const tenants = data?.items || [];
  const showEmptyState = !isLoading && !error && tenants.length === 0;

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="tenants" />
      {supportBanner}
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('fm.tenants.tenantType', 'Tenant Type')} />
                </SelectTrigger>
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

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t('fm.tenants.errors.failedToLoadTitle', 'Unable to load tenants')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>{t('fm.tenants.errors.failedToLoadDescription', 'Something went wrong while contacting the server. Please retry.')}</span>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              {t('common.retry', 'Retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tenants Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(tenants as Tenant[]).map((tenant) => (
              <TenantCard key={tenant.id} tenant={tenant} />
            ))}
          </div>

          {/* Empty State */}
          {showEmptyState && (
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

function TenantCard({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation();
  const missingValue = t('common.notAvailable', 'Not available');
  const primaryEmail = tenant.contact?.primary?.email?.trim();
  const primaryPhone = tenant.contact?.primary?.phone?.trim();
  const locationParts = [
    tenant.address?.current?.city?.trim(),
    tenant.address?.current?.region?.trim()
  ].filter(Boolean);
  const location = locationParts.join(', ') || missingValue;
  const outstandingBalance = tenant.financial?.outstandingBalance ?? 0;
  const outstandingBalanceDisplay = sarCurrencyFormatter.format(outstandingBalance);
  
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
          <span>{primaryEmail || t('fm.tenants.noEmail', 'No email on file')}</span>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Phone className="w-4 h-4 me-1" />
          <span>{primaryPhone || t('fm.tenants.noPhone', 'No phone on file')}</span>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 me-1" />
          <span>{location}</span>
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
              {outstandingBalanceDisplay}
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
