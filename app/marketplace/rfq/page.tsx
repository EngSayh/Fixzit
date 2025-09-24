'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  BadgeCheck,
  Calendar,
  Loader2,
  MapPin,
  Package,
  Search,
  Target,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem } from '@/src/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import LoginPrompt from '@/src/components/LoginPrompt';

type RFQItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  category?: string;
  status: string;
  location?: {
    city?: string | null;
    region?: string | null;
    radius?: number | null;
  } | null;
  budget?: {
    estimated?: number | null;
    currency?: string | null;
  } | null;
  timeline?: {
    publishDate?: string | null;
    bidDeadline?: string | null;
    startDate?: string | null;
    completionDate?: string | null;
  } | null;
  bidding?: {
    targetBids?: number | null;
    maxBids?: number | null;
    anonymous?: boolean | null;
  } | null;
  bidsCount: number;
};

type RFQResponse = {
  items: RFQItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    tenantId: string;
  };
};

const DEFAULT_TENANT = process.env.NEXT_PUBLIC_MARKETPLACE_TENANT || 'demo-tenant';

const fetcher = async (url: string): Promise<RFQResponse> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load RFQs');
  }
  const json = await res.json();
  return json.data;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function MarketplaceRFQPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<RFQItem | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('tenantId', DEFAULT_TENANT);
    params.set('limit', '24');
    if (search.trim()) params.set('search', search.trim());
    if (category) params.set('category', category);
    if (city) params.set('city', city);
    if (status) params.set('status', status);
    return params.toString();
  }, [search, category, city, status]);

  const { data, error, isLoading } = useSWR<RFQResponse>(
    `/api/public/rfqs?${queryString}`,
    fetcher,
    { keepPreviousData: true }
  );

  const rfqs = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Open Requests for Quote</h1>
          <p className="text-gray-600">Published RFQs that are currently collecting bids from verified vendors.</p>
        </div>
        <Button className="bg-[#0061A8] hover:bg-[#00508d]" onClick={() => setShowLoginPrompt(true)}>
          Post your RFQ
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search RFQs by title, code, or scope"
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[540px]">
              <Select value={category} onValueChange={value => setCategory(value)}>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Construction">Construction</SelectItem>
                  <SelectItem value="Supplies">Supplies</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={city}
                onChange={event => setCity(event.target.value)}
                placeholder="City"
              />
              <Select value={status} onValueChange={value => setStatus(value)}>
                <SelectContent>
                  <SelectItem value="">Published & bidding</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="BIDDING">Bidding</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="AWARDED">Awarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#0061A8]" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-red-700 font-semibold">We could not reach the RFQ board.</p>
            <p className="text-sm text-red-600">Please refresh the page or try again in a few minutes.</p>
          </CardContent>
        </Card>
      ) : rfqs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <Target className="w-10 h-10 text-gray-400 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900">No RFQs match your filters</h2>
            <p className="text-sm text-gray-600">Clear your filters to explore all active procurement requests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {rfqs.map(rfq => (
            <Card key={rfq.id} className="flex flex-col">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-gray-900">{rfq.title}</CardTitle>
                  <Badge variant="outline" className="uppercase text-xs">
                    {rfq.code}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Package className="w-4 h-4" />
                  <span>{rfq.category || 'General procurement'}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-gray-600 line-clamp-3">{rfq.description}</p>

                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{rfq.location?.city || 'Kingdom-wide'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Bid deadline: {formatDate(rfq.timeline?.bidDeadline)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{rfq.bidsCount} bids received</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge
                    className={(() => {
                      switch (rfq.status) {
                        case 'AWARDED':
                          return 'bg-green-100 text-green-800';
                        case 'BIDDING':
                          return 'bg-yellow-100 text-yellow-800';
                        case 'PUBLISHED':
                          return 'bg-blue-100 text-blue-800';
                        case 'CLOSED':
                          return 'bg-gray-200 text-gray-700';
                        default:
                          return 'bg-gray-100 text-gray-700';
                      }
                    })()}
                  >
                    {rfq.status.toLowerCase()}
                  </Badge>
                  <div className="text-right text-sm text-gray-500">
                    <div>Budget</div>
                    <div className="font-medium text-gray-900">
                      {rfq.budget?.estimated
                        ? `${rfq.budget.currency || 'SAR'} ${rfq.budget.estimated.toLocaleString()}`
                        : 'Confidential'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-[#0061A8] hover:bg-[#00508d]" onClick={() => setSelected(rfq)}>
                    View details
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowLoginPrompt(true)}>
                    Submit bid
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        title="Sign in to participate"
        description="Authenticated vendors can submit bids, track clarifications, and view award status."
        action="rfq"
        redirectTo="/marketplace/rfq"
      />

      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{selected.title}</DialogTitle>
              <p className="text-sm text-gray-500">{selected.code}</p>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600 whitespace-pre-line">{selected.description}</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Timeline</span>
                  </div>
                  <ul className="mt-2 text-sm space-y-1 text-gray-700">
                    <li>Bid deadline: {formatDate(selected.timeline?.bidDeadline)}</li>
                    <li>Expected start: {formatDate(selected.timeline?.startDate)}</li>
                    <li>Completion: {formatDate(selected.timeline?.completionDate)}</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <BadgeCheck className="w-4 h-4 text-[#00A859]" />
                    <span>Bidding requirements</span>
                  </div>
                  <ul className="mt-2 text-sm space-y-1 text-gray-700">
                    <li>Target bids: {selected.bidding?.targetBids ?? 3}</li>
                    <li>Max bids: {selected.bidding?.maxBids ?? 'Not enforced'}</li>
                    <li>Anonymous review: {selected.bidding?.anonymous ? 'Enabled' : 'Disabled'}</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-500">Estimated budget</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selected.budget?.estimated
                      ? `${selected.budget.currency || 'SAR'} ${selected.budget.estimated.toLocaleString()}`
                      : 'Confidential'}
                  </p>
                </div>
                <Button onClick={() => setShowLoginPrompt(true)} className="bg-[#0061A8] hover:bg-[#00508d]">
                  Submit bid
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
