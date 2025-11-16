'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
} from 'lucide-react';

interface PerformanceData {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
}

interface KeywordPerformance {
  keyword: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  spend: number;
  conversions: number;
  acos: number;
  roas: number;
}

interface ProductPerformance {
  productId: string;
  productName: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  acos: number;
}

type DatePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';
type SortField = keyof KeywordPerformance | keyof ProductPerformance;
type SortDirection = 'asc' | 'desc';

interface PerformanceReportProps {
  campaignId?: string; // Optional: filter by specific campaign
}

export function PerformanceReport({ campaignId }: PerformanceReportProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>('last7');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [keywordData, setKeywordData] = useState<KeywordPerformance[]>([]);
  const [productData, setProductData] = useState<ProductPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'keywords' | 'products'>('keywords');
  const [sortField, setSortField] = useState<SortField>('impressions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  useEffect(() => {
    const dates = calculateDateRange(datePreset);
    setStartDate(dates.start);
    setEndDate(dates.end);
  }, [datePreset]);

  useEffect(() => {
    if (startDate && endDate) {
      loadPerformanceData();
    }
  }, [startDate, endDate, campaignId]);

  const calculateDateRange = (preset: DatePreset) => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'last7':
        start.setDate(today.getDate() - 7);
        break;
      case 'last30':
        start.setDate(today.getDate() - 30);
        break;
      default:
        return { start: '', end: '' };
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start', startDate);
      if (endDate) params.append('end', endDate);
      if (campaignId) params.append('campaignId', campaignId);

      const queryString = params.toString();
      const response = await fetch(
        `/api/souq/ads/reports${queryString ? `?${queryString}` : ''}`
      );
      if (!response.ok) throw new Error('Failed to load performance data');

      const payload = await response.json();
      const report = payload.data || {};

      setPerformanceData(report.timeseries || []);
      setKeywordData(report.keywords || []);
      setProductData(report.products || []);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedData = () => {
    const data = activeView === 'keywords' ? [...keywordData] : [...productData];
    
    data.sort((a, b) => {
      const aValue = a[sortField as keyof typeof a];
      const bValue = b[sortField as keyof typeof b];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return data;
  };

  const exportToCSV = () => {
    const data = activeView === 'keywords' ? keywordData : productData;
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map((row) => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const paginatedData = getSortedData().slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(getSortedData().length / rowsPerPage);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-4 h-4" />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>

          <div className="flex gap-2">
            {[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'last7', label: 'Last 7 Days' },
              { value: 'last30', label: 'Last 30 Days' },
              { value: 'custom', label: 'Custom' },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setDatePreset(preset.value as DatePreset)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  datePreset === preset.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}

          <button
            onClick={exportToCSV}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Over Time</h3>
        
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading chart data...</div>
        ) : (
          <div className="space-y-6">
            {/* Simple text-based chart visualization */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Impressions & Clicks</span>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">Impressions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600">Clicks</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {performanceData.slice(-7).map((data, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div
                        className="bg-blue-500 rounded"
                        style={{ height: `${(data.impressions / 5000) * 80}px` }}
                        title={`${data.impressions} impressions`}
                      ></div>
                      <div className="text-xs text-gray-600">{data.impressions}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Daily Spend</span>
                <span className="text-sm text-gray-600">
                  Total: {performanceData.reduce((sum, d) => sum + d.spend, 0).toFixed(2)} SAR
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {performanceData.slice(-7).map((data, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div
                        className="bg-red-500 rounded"
                        style={{ height: `${(data.spend / 100) * 80}px` }}
                        title={`${data.spend.toFixed(2)} SAR`}
                      ></div>
                      <div className="text-xs text-gray-600">{data.spend.toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Tables */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveView('keywords');
              setCurrentPage(1);
            }}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeView === 'keywords'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Keyword Performance
          </button>
          <button
            onClick={() => {
              setActiveView('products');
              setCurrentPage(1);
            }}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeView === 'products'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Product Performance
          </button>
        </div>

        {/* Keyword Performance Table */}
        {activeView === 'keywords' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader field="keyword">Keyword</SortableHeader>
                  <SortableHeader field="campaignName">Campaign</SortableHeader>
                  <SortableHeader field="impressions">Impressions</SortableHeader>
                  <SortableHeader field="clicks">Clicks</SortableHeader>
                  <SortableHeader field="ctr">CTR</SortableHeader>
                  <SortableHeader field="avgCpc">Avg CPC</SortableHeader>
                  <SortableHeader field="spend">Spend</SortableHeader>
                  <SortableHeader field="conversions">Conversions</SortableHeader>
                  <SortableHeader field="acos">ACOS</SortableHeader>
                  <SortableHeader field="roas">ROAS</SortableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.map((row, index) => {
                  const data = row as KeywordPerformance;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{data.keyword}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{data.campaignName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {data.impressions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {data.clicks.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          {data.ctr.toFixed(2)}%
                          {data.ctr > 2 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {data.avgCpc.toFixed(2)} SAR
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {data.spend.toFixed(2)} SAR
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{data.conversions}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span
                          className={`px-2 py-1 rounded ${
                            data.acos < 20
                              ? 'bg-green-100 text-green-800'
                              : data.acos < 30
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {data.acos.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{data.roas.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Product Performance Table */}
        {activeView === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader field="productId">Product ID</SortableHeader>
                  <SortableHeader field="productName">Product Name</SortableHeader>
                  <SortableHeader field="campaignName">Campaign</SortableHeader>
                  <SortableHeader field="impressions">Impressions</SortableHeader>
                  <SortableHeader field="clicks">Clicks</SortableHeader>
                  <SortableHeader field="ctr">CTR</SortableHeader>
                  <SortableHeader field="conversions">Conversions</SortableHeader>
                  <SortableHeader field="revenue">Revenue</SortableHeader>
                  <SortableHeader field="acos">ACOS</SortableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.map((row, index) => {
                  const data = row as ProductPerformance;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{data.productId}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {data.productName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{data.campaignName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {data.impressions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {data.clicks.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          {data.ctr.toFixed(2)}%
                          {data.ctr > 2 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{data.conversions}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {data.revenue.toFixed(2)} SAR
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span
                          className={`px-2 py-1 rounded ${
                            data.acos < 20
                              ? 'bg-green-100 text-green-800'
                              : data.acos < 30
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {data.acos.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(currentPage * rowsPerPage, getSortedData().length)} of{' '}
              {getSortedData().length} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
