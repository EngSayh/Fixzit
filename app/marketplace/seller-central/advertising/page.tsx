'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  TrendingUp,
  DollarSign,
  Eye,
  MousePointerClick,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface Campaign {
  campaignId: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'ended';
  dailyBudget: number;
  spentToday: number;
  startDate: string;
  endDate?: string;
  bids: unknown[];
}

interface CampaignStats {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  avgCpc: number;
  acos: number;
  roas: number;
}

interface OverviewMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgAcos: number;
  avgRoas: number;
}

export default function AdvertisingPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns'>('overview');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignStats, setCampaignStats] = useState<Record<string, CampaignStats>>({});
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics>({
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    avgAcos: 0,
    avgRoas: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (session) {
      loadCampaigns();
    }
  }, [session, filterStatus, filterType]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await fetch(`/api/souq/ads/campaigns?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load campaigns');

      const payload = await response.json();
      const apiCampaigns = payload.data || [];
      setCampaigns(apiCampaigns);

      // Load stats for each campaign
      const statsPromises = apiCampaigns.map((campaign: Campaign) =>
        fetch(`/api/souq/ads/campaigns/${campaign.campaignId}/stats`)
          .then(async (res) => {
            if (!res.ok) throw new Error('Failed to load campaign stats');
            const statsPayload = await res.json();
            const statsData = statsPayload.data || statsPayload;
            return {
              campaignId: campaign.campaignId,
              stats: statsData,
            };
          })
      );

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, CampaignStats> = {};
      statsResults.forEach(({ campaignId, stats }) => {
        statsMap[campaignId] = stats;
      });
      setCampaignStats(statsMap);

      // Calculate overview metrics
      calculateOverviewMetrics(apiCampaigns, statsMap);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOverviewMetrics = (
    campaigns: Campaign[],
    stats: Record<string, CampaignStats>
  ) => {
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalRevenue = 0;
    let activeCampaigns = 0;

    campaigns.forEach((campaign) => {
      const stat = stats[campaign.campaignId];
      if (stat && campaign.status === 'active') {
        totalSpend += stat.spend;
        totalImpressions += stat.impressions;
        totalClicks += stat.clicks;
        totalRevenue += stat.revenue;
        activeCampaigns++;
      }
    });

    setOverviewMetrics({
      totalSpend,
      totalImpressions,
      totalClicks,
      avgAcos: totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0,
      avgRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    });
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const response = await fetch(`/api/souq/ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update campaign');

      loadCampaigns();
    } catch (error) {
      console.error('Failed to toggle campaign status:', error);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/souq/ads/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete campaign');

      loadCampaigns();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const MetricCard = ({
    icon: Icon,
    label,
    value,
    subtitle,
    color,
  }: {
    icon: typeof TrendingUp;
    label: string;
    value: string;
    subtitle?: string;
    color: string;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Advertising</h1>
        <p className="text-gray-600 mt-2">
          Manage your advertising campaigns and track performance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'campaigns'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Campaigns
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              icon={DollarSign}
              label="Total Spend"
              value={`${overviewMetrics.totalSpend.toFixed(2)} SAR`}
              subtitle="Last 30 days"
              color="text-red-600"
            />
            <MetricCard
              icon={Eye}
              label="Impressions"
              value={overviewMetrics.totalImpressions.toLocaleString()}
              color="text-blue-600"
            />
            <MetricCard
              icon={MousePointerClick}
              label="Clicks"
              value={overviewMetrics.totalClicks.toLocaleString()}
              color="text-green-600"
            />
            <MetricCard
              icon={TrendingUp}
              label="ACOS"
              value={`${overviewMetrics.avgAcos.toFixed(1)}%`}
              subtitle="Lower is better"
              color="text-purple-600"
            />
            <MetricCard
              icon={BarChart3}
              label="ROAS"
              value={overviewMetrics.avgRoas.toFixed(2)}
              subtitle="Higher is better"
              color="text-indigo-600"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex gap-4">
              <Link
                href="/marketplace/seller-central/advertising/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Campaign
              </Link>
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <BarChart3 className="w-5 h-5" />
                View Reports
              </button>
            </div>
          </div>

          {/* Active Campaigns Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Campaigns</h3>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : filteredCampaigns.filter((c) => c.status === 'active').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active campaigns. Create one to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCampaigns
                  .filter((c) => c.status === 'active')
                  .slice(0, 5)
                  .map((campaign) => {
                    const stats = campaignStats[campaign.campaignId];
                    const budgetUsed = (campaign.spentToday / campaign.dailyBudget) * 100;

                    return (
                      <div
                        key={campaign.campaignId}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                          <p className="text-sm text-gray-600">
                            {campaign.type.replace('_', ' ').toUpperCase()} • {campaign.bids.length}{' '}
                            bids
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Budget Used</p>
                            <p className="font-medium text-gray-900">
                              {campaign.spentToday.toFixed(2)} / {campaign.dailyBudget.toFixed(2)}{' '}
                              SAR
                            </p>
                            <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  budgetUsed > 90
                                    ? 'bg-red-600'
                                    : budgetUsed > 75
                                    ? 'bg-yellow-600'
                                    : 'bg-green-600'
                                }`}
                                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                              />
                            </div>
                          </div>

                          {stats && (
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Performance</p>
                              <p className="font-medium text-gray-900">
                                CTR: {stats.ctr.toFixed(2)}%
                              </p>
                              <p className="text-sm text-gray-600">
                                CPC: {stats.avgCpc.toFixed(2)} SAR
                              </p>
                            </div>
                          )}

                          <Link
                            href={`/marketplace/seller-central/advertising/${campaign.campaignId}`}
                            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Filters and Search */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="sponsored_products">Sponsored Products</option>
                  <option value="sponsored_brands">Sponsored Brands</option>
                  <option value="product_display">Product Display</option>
                </select>
              </div>

              <Link
                href="/marketplace/seller-central/advertising/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Campaign
              </Link>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading campaigns...</div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No campaigns found</p>
                <Link
                  href="/marketplace/seller-central/advertising/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Campaign
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCampaigns.map((campaign) => {
                    const stats = campaignStats[campaign.campaignId];
                    const budgetUsed = (campaign.spentToday / campaign.dailyBudget) * 100;

                    return (
                      <tr key={campaign.campaignId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{campaign.name}</p>
                            <p className="text-sm text-gray-600">
                              {campaign.type.replace('_', ' ').toUpperCase()} • {campaign.bids.length} bids
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              campaign.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : campaign.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-gray-900">
                              {campaign.spentToday.toFixed(2)} / {campaign.dailyBudget.toFixed(2)} SAR
                            </p>
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  budgetUsed > 90
                                    ? 'bg-red-600'
                                    : budgetUsed > 75
                                    ? 'bg-yellow-600'
                                    : 'bg-green-600'
                                }`}
                                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {stats ? (
                            <div className="text-sm">
                              <p className="text-gray-900">
                                {stats.impressions.toLocaleString()} impressions
                              </p>
                              <p className="text-gray-600">
                                CTR: {stats.ctr.toFixed(2)}% • CPC: {stats.avgCpc.toFixed(2)} SAR
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No data</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCampaignStatus(campaign.campaignId, campaign.status)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title={campaign.status === 'active' ? 'Pause' : 'Resume'}
                            >
                              {campaign.status === 'active' ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <Link
                              href={`/marketplace/seller-central/advertising/${campaign.campaignId}/edit`}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => deleteCampaign(campaign.campaignId)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/marketplace/seller-central/advertising/${campaign.campaignId}`}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
