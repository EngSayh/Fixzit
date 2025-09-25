'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/src/providers/RootProviders';
import { FileText, Plus, Calendar, Clock, Package, DollarSign, Filter, Search, ChevronRight } from 'lucide-react';

// Mock RFQ data
const MOCK_RFQS = [
  {
    id: 'RFQ-2024-001',
    title: 'Electrical Components for Tower A',
    status: 'open',
    dueDate: '2024-12-30',
    createdDate: '2024-12-20',
    items: 15,
    bids: 5,
    estimatedValue: 125000,
    category: 'Electrical',
    priority: 'high'
  },
  {
    id: 'RFQ-2024-002',
    title: 'HVAC Filters - Annual Supply',
    status: 'evaluating',
    dueDate: '2024-12-28',
    createdDate: '2024-12-18',
    items: 8,
    bids: 12,
    estimatedValue: 45000,
    category: 'HVAC',
    priority: 'medium'
  },
  {
    id: 'RFQ-2024-003',
    title: 'Paint and Coating Materials',
    status: 'closed',
    dueDate: '2024-12-15',
    createdDate: '2024-12-01',
    items: 20,
    bids: 8,
    estimatedValue: 75000,
    category: 'Paints',
    selectedVendor: 'ABC Paints Co.',
    priority: 'low'
  }
];

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-green-100 text-green-800', icon: '🟢' },
  evaluating: { label: 'Evaluating', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', icon: '⚪' },
  awarded: { label: 'Awarded', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '🔴' }
};

/**
 * RFQs management page displaying a dashboard of request-for-quote items and related actions.
 *
 * Renders a client-side RFQ dashboard with tabs (My RFQs, Available to Bid, Awarded), search and status filters,
 * a list of RFQ cards (title, status, priority, metadata, estimated value, bids, optional awarded vendor),
 * an empty state with a create action, and a quick-stats panel. Uses mock RFQ data, supports RTL input direction,
 * and pulls localized strings via the app's i18n hook.
 *
 * @returns The RFQs page JSX element.
 */
export default function RFQsPage() {
  const { t, language, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<'my-rfqs' | 'available' | 'awarded'>('my-rfqs');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter RFQs based on tab and filters
  const filteredRFQs = MOCK_RFQS.filter(rfq => {
    const matchesSearch = rfq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rfq.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTimeRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return t('marketplace.expired', 'Expired');
    if (days === 0) return t('marketplace.dueToday', 'Due today');
    if (days === 1) return t('marketplace.dueTomorrow', 'Due tomorrow');
    return t('marketplace.daysRemaining', '{{days}} days remaining').replace('{{days}}', days.toString());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('marketplace.rfqs', 'RFQs & Bids')}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('marketplace.rfqsDescription', 'Request quotes and manage bids from suppliers')}
              </p>
            </div>
            
            <Link
              href="/souq/rfqs/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004d87] transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('marketplace.createRfq', 'Create RFQ')}
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('my-rfqs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my-rfqs'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('marketplace.myRfqs', 'My RFQs')}
              </button>
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'available'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('marketplace.availableRfqs', 'Available to Bid')}
              </button>
              <button
                onClick={() => setActiveTab('awarded')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'awarded'
                    ? 'border-[#0061A8] text-[#0061A8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('marketplace.awardedRfqs', 'Awarded')}
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('marketplace.searchRfqs', 'Search RFQs...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              >
                <option value="all">{t('common.allStatus', 'All Status')}</option>
                <option value="open">{t('common.open', 'Open')}</option>
                <option value="evaluating">{t('common.evaluating', 'Evaluating')}</option>
                <option value="closed">{t('common.closed', 'Closed')}</option>
                <option value="awarded">{t('common.awarded', 'Awarded')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* RFQ List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          {filteredRFQs.map((rfq) => (
            <div
              key={rfq.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {rfq.title}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${(STATUS_CONFIG as any)[rfq.status]?.color || ''}`}>
                        {(STATUS_CONFIG as any)[rfq.status]?.icon || ''} {(STATUS_CONFIG as any)[rfq.status]?.label || rfq.status}
                      </span>
                      {rfq.priority === 'high' && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                          {t('common.highPriority', 'High Priority')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {rfq.id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {rfq.items} {t('common.items', 'items')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {t('common.created', 'Created')}: {new Date(rfq.createdDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getTimeRemaining(rfq.dueDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-sm text-gray-500">{t('marketplace.estimatedValue', 'Estimated Value')}:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {rfq.estimatedValue.toLocaleString()} SAR
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">{t('marketplace.bidsReceived', 'Bids Received')}:</span>
                          <span className="ml-2 font-semibold text-[#00A859]">{rfq.bids}</span>
                        </div>
                        {rfq.selectedVendor && (
                          <div>
                            <span className="text-sm text-gray-500">{t('marketplace.awardedTo', 'Awarded to')}:</span>
                            <span className="ml-2 font-semibold text-gray-900">{rfq.selectedVendor}</span>
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/souq/rfqs/${rfq.id}`}
                        className="inline-flex items-center gap-1 text-[#0061A8] hover:text-[#004d87] font-medium"
                      >
                        {t('common.viewDetails', 'View Details')}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRFQs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t('marketplace.noRfqs', 'No RFQs found')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('marketplace.noRfqsDescription', 'Get started by creating a new RFQ.')}
            </p>
            <div className="mt-6">
              <Link
                href="/souq/rfqs/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004d87] transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('marketplace.createRfq', 'Create RFQ')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('marketplace.rfqStats', 'RFQ Statistics')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#0061A8]">12</div>
              <div className="text-sm text-gray-600">{t('marketplace.activeRfqs', 'Active RFQs')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#00A859]">45</div>
              <div className="text-sm text-gray-600">{t('marketplace.totalBids', 'Total Bids')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#FFB400]">8</div>
              <div className="text-sm text-gray-600">{t('marketplace.pendingEvaluation', 'Pending Evaluation')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-700">2.3M</div>
              <div className="text-sm text-gray-600">{t('marketplace.totalValue', 'Total Value (SAR)')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
