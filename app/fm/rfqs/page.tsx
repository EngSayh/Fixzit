'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { logger } from '@/lib/logger';
import { 
  FileText, Plus, Search, DollarSign, 
  MapPin, Eye, Send, Clock,
  Shield, Package, Wrench, Building2
} from 'lucide-react';

interface RFQItem {
  id: string;
  code?: string;
  title?: string;
  type?: string;
  status?: string;
  category?: string;
  description?: string;
  deadline?: string;
  budget?: {
    estimated?: number;
    currency?: string;
  };
  bidding?: {
    anonymous?: boolean;
    targetBids?: number;
  };
  compliance?: {
    cityBounded?: boolean;
  };
  timeline?: {
    bidDeadline?: string;
  };
  location?: {
    city?: string;
    radius?: number;
  };
  bids?: unknown[];
}

export default function RFQsPage() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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
        logger.error('FM RFQs fetch error', { error });
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId ? `/api/rfqs?search=${encodeURIComponent(search)}&status=${statusFilter}&category=${categoryFilter}` : null,
    fetcher
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!orgId) {
    return <p>Error: No organization ID found in session</p>;
  }

  const rfqs = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RFQs & Bidding</h1>
          <p className="text-muted-foreground">City-bounded procurement with 3-bid collection</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 me-2" />
              New RFQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Request for Quotation</DialogTitle>
            </DialogHeader>
            <CreateRFQForm orgId={orgId} onCreated={() => { mutate(); setCreateOpen(false); }} />
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
                  placeholder="Search RFQs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} placeholder="Status" className="w-48">
                <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="BIDDING">Bidding</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="AWARDED">Awarded</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter} placeholder="Category" className="w-48">
                <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="Construction">Construction</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Supplies">Supplies</SelectItem>
                <SelectItem value="Services">Services</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* RFQs Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(rfqs as RFQItem[]).map((rfq) => (
              <RFQCard key={rfq.id} rfq={rfq} orgId={orgId} onUpdated={mutate} />
            ))}
          </div>

          {/* Empty State */}
          {rfqs.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No RFQs Found</h3>
                <p className="text-muted-foreground mb-4">Get started by creating your first request for quotation.</p>
                <Button onClick={() => setCreateOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 me-2" />
                  Create RFQ
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function RFQCard({ rfq, orgId, onUpdated }: { rfq: RFQItem; orgId?: string; onUpdated: () => void }) {
  const router = useRouter();

  const handlePublish = async () => {
    if (!confirm(`Publish RFQ "${rfq.title}"? This will make it visible to vendors.`)) return;
    if (!orgId) return toast.error('Organization ID missing');

    const toastId = toast.loading('Publishing RFQ...');
    try {
      const res = await fetch(`/api/rfqs/${rfq.id}/publish`, {
        method: 'POST',
        headers: { 'x-tenant-id': orgId, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to publish RFQ');
      toast.success('RFQ published successfully', { id: toastId });
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish RFQ', { id: toastId });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'construction':
        return <Building2 className="w-5 h-5" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5" />;
      case 'supplies':
        return <Package className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-muted text-foreground';
      case 'PUBLISHED':
        return 'bg-primary/10 text-primary-foreground';
      case 'BIDDING':
        return 'bg-warning/10 text-warning-foreground';
      case 'CLOSED':
        return 'bg-warning/10 text-warning';
      case 'AWARDED':
        return 'bg-success/10 text-success-foreground';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const daysRemaining = rfq.timeline?.bidDeadline 
    ? Math.ceil((new Date(rfq.timeline.bidDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const bidProgress = rfq.bidding?.targetBids 
    ? Math.min((rfq.bids?.length || 0) / rfq.bidding.targetBids * 100, 100)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(rfq.category || '')}
            <div className="flex-1">
              <CardTitle className="text-lg">{rfq.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{rfq.code}</p>
            </div>
          </div>
          <Badge className={getStatusColor(rfq.status || '')}>
            {rfq.status?.toLowerCase() || ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{rfq.description}</p>

        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 me-1 rtl:ml-1 rtl:mr-0" />
          <span>{rfq.location?.city}</span>
          {rfq.location?.radius && (
            <span className="ms-2 rtl:mr-2 rtl:ml-0">• {rfq.location.radius}km radius</span>
          )}
        </div>

        {/* Bid Collection Progress */}
        {rfq.status === 'BIDDING' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bid Collection</span>
              <span className="font-medium">
                {rfq.bids?.length || 0}/{rfq.bidding?.targetBids || 3} bids
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-teal-600 h-2 rounded-full transition-all"
                style={{ width: `${bidProgress}%` }}
              />
            </div>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="w-4 h-4 me-1" />
              Deadline
            </div>
            <p className="font-medium mt-1">
              {daysRemaining !== null ? (
                daysRemaining > 0 
                  ? `${daysRemaining} days left`
                  : `Closed`
              ) : 'No deadline'}
            </p>
          </div>
          <div>
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="w-4 h-4 me-1" />
              Budget
            </div>
            <p className="font-medium mt-1">
              {rfq.budget?.estimated?.toLocaleString() || 'N/A'} {rfq.budget?.currency || 'SAR'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3 text-sm">
            {rfq.bidding?.anonymous && (
              <div className="flex items-center text-muted-foreground">
                <Shield className="w-4 h-4 me-1" />
                <span>Anonymous</span>
              </div>
            )}
            {rfq.compliance?.cityBounded && (
              <div className="flex items-center text-muted-foreground">
                <MapPin className="w-4 h-4 me-1" />
                <span>City Only</span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/fm/rfqs/${rfq.id}`)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            {rfq.status === 'DRAFT' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handlePublish}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateRFQForm({ onCreated, orgId }: { onCreated: () => void; orgId: string }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    type: 'WORKS',
    location: {
      city: 'Riyadh',
      region: 'Riyadh',
      address: '',
      radius: 20,
      nationalAddress: ''
    },
    projectId: '',
    specifications: [] as string[],
    timeline: {
      bidDeadline: '', // ✅ HYDRATION FIX: Initialize empty
      startDate: '', // ✅ HYDRATION FIX: Initialize empty
      completionDate: '' // ✅ HYDRATION FIX: Initialize empty
    },
    budget: {
      estimated: 0,
      currency: 'SAR'
    },
    requirements: {
      qualifications: [] as string[],
      experience: '',
      insurance: {
        required: true,
        minimum: 1000000
      },
      licenses: [] as string[],
      references: 3
    },
    bidding: {
      anonymous: true,
      targetBids: 3,
      bidLeveling: true,
      alternates: false,
      validity: 30
    },
    compliance: {
      cityBounded: true,
      insuranceRequired: true,
      licenseRequired: true,
      backgroundCheck: false
    },
    tags: [] as string[]
  });

  // ✅ HYDRATION FIX: Set default dates after client hydration
  useEffect(() => {
    if (!formData.timeline.bidDeadline) {
      setFormData(prev => ({
        ...prev,
        timeline: {
          ...prev.timeline,
          bidDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          completionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      }));
    }
  }, [formData.timeline.bidDeadline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading('Creating RFQ...');

    try {
      const response = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': orgId 
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('RFQ created successfully', { id: toastId });
        onCreated();
      } else {
        const error = await response.json();
        toast.error(`Failed to create RFQ: ${error.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      logger.error('Error creating RFQ:', error);
      toast.error('Error creating RFQ. Please try again.', { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">RFQ Title *</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
            <SelectTrigger>
              <SelectValue>
                {categoryFilter || "Select category"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Construction">Construction</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
              <SelectItem value="Supplies">Supplies</SelectItem>
              <SelectItem value="Services">Services</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description *</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City *</label>
          <Input
            value={formData.location.city}
            onChange={(e) => setFormData({...formData, location: {...formData.location, city: e.target.value}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Service Radius (km)</label>
          <Input
            type="number"
            value={formData.location.radius}
            onChange={(e) => setFormData({...formData, location: {...formData.location, radius: Number(e.target.value)}})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Target Bids</label>
          <Input
            type="number"
            value={formData.bidding.targetBids}
            onChange={(e) => setFormData({...formData, bidding: {...formData.bidding, targetBids: Number(e.target.value)}})}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Bid Deadline *</label>
          <Input
            type="date"
            value={formData.timeline.bidDeadline}
            onChange={(e) => setFormData({...formData, timeline: {...formData.timeline, bidDeadline: e.target.value}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <Input
            type="date"
            value={formData.timeline.startDate}
            onChange={(e) => setFormData({...formData, timeline: {...formData.timeline, startDate: e.target.value}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Completion Date *</label>
          <Input
            type="date"
            value={formData.timeline.completionDate}
            onChange={(e) => setFormData({...formData, timeline: {...formData.timeline, completionDate: e.target.value}})}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Estimated Budget *</label>
        <Input
          type="number"
          value={formData.budget.estimated}
          onChange={(e) => setFormData({...formData, budget: {...formData.budget, estimated: Number(e.target.value)}})}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Compliance Requirements</label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.compliance.cityBounded}
              onChange={(e) => setFormData({...formData, compliance: {...formData.compliance, cityBounded: e.target.checked}})}
              className="me-2"
            />
            City Bounded
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.compliance.insuranceRequired}
              onChange={(e) => setFormData({...formData, compliance: {...formData.compliance, insuranceRequired: e.target.checked}})}
              className="me-2"
            />
            Insurance Required
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.bidding.anonymous}
              onChange={(e) => setFormData({...formData, bidding: {...formData.bidding, anonymous: e.target.checked}})}
              className="me-2"
            />
            Anonymous Bidding
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
          Create RFQ
        </Button>
      </div>
    </form>
  );
}
