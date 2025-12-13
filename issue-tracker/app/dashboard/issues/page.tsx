/**
 * Issue Tracker Dashboard
 * Super Admin view for managing development issues
 * 
 * @module app/dashboard/issues/page
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface Issue {
  _id: string;
  issueId: string;
  legacyId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  effort: string;
  location: {
    filePath: string;
    lineStart?: number;
    lineEnd?: number;
  };
  module: string;
  subModule?: string;
  action: string;
  riskTags: string[];
  assignedTo?: string;
  sprintReady: boolean;
  firstSeenAt: string;
  mentionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  summary: {
    total: number;
    open: number;
    resolved: number;
    blocked: number;
    criticalOpen: number;
    quickWinsCount: number;
    staleCount: number;
    avgAgeDays: number;
  };
  byPriority: { P0: number; P1: number; P2: number; P3: number };
  byStatus: { open: number; inProgress: number; resolved: number; blocked: number };
  byCategory: Array<{ category: string; count: number; byPriority: any }>;
  byModule: Array<{ module: string; count: number; bugs: number; logic: number; tests: number }>;
  fileHeatMap: Array<{ file: string; total: number; bugs: number; logic: number; tests: number }>;
  quickWins: Array<{ issueId: string; title: string; effort: string; priority: string; action: string }>;
  staleIssues: Array<{ issueId: string; title: string; daysPending: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-100 text-red-800 border-red-200',
  P1: 'bg-orange-100 text-orange-800 border-orange-200',
  P2: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  P3: 'bg-green-100 text-green-800 border-green-200',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  in_review: 'bg-indigo-100 text-indigo-800',
  blocked: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const CATEGORY_ICONS: Record<string, string> = {
  bug: '🐛',
  logic_error: '⚠️',
  missing_test: '🧪',
  efficiency: '⚡',
  security: '🔒',
  feature: '✨',
  next_step: '📋',
};

const RISK_TAG_COLORS: Record<string, string> = {
  SECURITY: 'bg-red-50 text-red-700',
  MULTI_TENANT: 'bg-orange-50 text-orange-700',
  FINANCIAL: 'bg-yellow-50 text-yellow-700',
  PERFORMANCE: 'bg-blue-50 text-blue-700',
  TEST_GAP: 'bg-purple-50 text-purple-700',
  DATA_INTEGRITY: 'bg-pink-50 text-pink-700',
};

// ============================================================================
// COMPONENTS
// ============================================================================

function StatCard({ title, value, subtitle, icon, color = 'blue' }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <h3 className="mt-2 font-medium text-gray-700">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[priority] || 'bg-gray-100'}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const displayStatus = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100'}`}>
      {displayStatus}
    </span>
  );
}

function EffortBadge({ effort }: { effort: string }) {
  const colors: Record<string, string> = {
    XS: 'bg-green-100 text-green-700',
    S: 'bg-blue-100 text-blue-700',
    M: 'bg-yellow-100 text-yellow-700',
    L: 'bg-orange-100 text-orange-700',
    XL: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[effort] || 'bg-gray-100'}`}>
      {effort}
    </span>
  );
}

function RiskTags({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <span key={tag} className={`text-xs px-1.5 py-0.5 rounded ${RISK_TAG_COLORS[tag] || 'bg-gray-100'}`}>
          {tag.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

function FileHeatMap({ data }: { data: Stats['fileHeatMap'] }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        🔥 File Heat Map
        <span className="text-sm font-normal text-gray-500">(Most Affected Files)</span>
      </h3>
      <div className="space-y-2">
        {data.map((file, idx) => (
          <div key={file.file} className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-6">{idx + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono truncate" title={file.file}>{file.file}</p>
              <div className="flex gap-2 text-xs text-gray-500">
                {file.bugs > 0 && <span>🐛 {file.bugs}</span>}
                {file.logic > 0 && <span>⚠️ {file.logic}</span>}
                {file.tests > 0 && <span>🧪 {file.tests}</span>}
              </div>
            </div>
            <span className="text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">
              {file.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickWinsPanel({ quickWins }: { quickWins: Stats['quickWins'] }) {
  return (
    <div className="bg-green-50 rounded-lg border border-green-200 p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-800">
        🎯 Quick Wins
        <span className="text-sm font-normal">(Low Effort + High Impact)</span>
      </h3>
      <div className="space-y-2">
        {quickWins.map(item => (
          <div key={item.issueId} className="bg-white rounded p-2 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-green-700">{item.issueId}</span>
              <EffortBadge effort={item.effort} />
              <PriorityBadge priority={item.priority} />
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaleIssuesPanel({ staleIssues }: { staleIssues: Stats['staleIssues'] }) {
  if (!staleIssues?.length) return null;
  
  return (
    <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-800">
        ⏰ Stale Issues
        <span className="text-sm font-normal">(Pending &gt; 7 days)</span>
      </h3>
      <div className="space-y-2">
        {staleIssues.map(item => (
          <div key={item.issueId} className="bg-white rounded p-2 border border-amber-100">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm text-amber-700">{item.issueId}</span>
              <span className="text-xs text-amber-600">{item.daysPending} days</span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-1">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueRow({ issue, onSelect }: { issue: Issue; onSelect: (id: string) => void }) {
  const age = Math.floor((Date.now() - new Date(issue.firstSeenAt).getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <tr 
      className="hover:bg-gray-50 cursor-pointer border-b"
      onClick={() => onSelect(issue.issueId)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span>{CATEGORY_ICONS[issue.category] || '📌'}</span>
          <span className="font-mono text-sm">{issue.issueId}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 line-clamp-1">{issue.title}</p>
        <p className="text-sm text-gray-500 font-mono truncate max-w-md">{issue.location.filePath}</p>
      </td>
      <td className="px-4 py-3">
        <PriorityBadge priority={issue.priority} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={issue.status} />
      </td>
      <td className="px-4 py-3">
        <EffortBadge effort={issue.effort} />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">{issue.module}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-500">{age}d</span>
      </td>
      <td className="px-4 py-3">
        <RiskTags tags={issue.riskTags?.slice(0, 2)} />
      </td>
    </tr>
  );
}

function FilterBar({ filters, onFilterChange }: {
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
      <select
        value={filters.status || ''}
        onChange={(e) => onFilterChange('status', e.target.value)}
        className="rounded border-gray-300 text-sm"
      >
        <option value="">All Status</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="blocked">Blocked</option>
        <option value="resolved">Resolved</option>
      </select>
      
      <select
        value={filters.priority || ''}
        onChange={(e) => onFilterChange('priority', e.target.value)}
        className="rounded border-gray-300 text-sm"
      >
        <option value="">All Priority</option>
        <option value="P0">P0 - Critical</option>
        <option value="P1">P1 - High</option>
        <option value="P2">P2 - Medium</option>
        <option value="P3">P3 - Low</option>
      </select>
      
      <select
        value={filters.category || ''}
        onChange={(e) => onFilterChange('category', e.target.value)}
        className="rounded border-gray-300 text-sm"
      >
        <option value="">All Categories</option>
        <option value="bug">🐛 Bugs</option>
        <option value="logic_error">⚠️ Logic Errors</option>
        <option value="missing_test">🧪 Missing Tests</option>
        <option value="efficiency">⚡ Efficiency</option>
        <option value="security">🔒 Security</option>
      </select>
      
      <input
        type="text"
        placeholder="Search issues..."
        value={filters.search || ''}
        onChange={(e) => onFilterChange('search', e.target.value)}
        className="rounded border-gray-300 text-sm flex-1 min-w-[200px]"
      />
      
      <button
        onClick={() => onFilterChange('quickWins', filters.quickWins === 'true' ? '' : 'true')}
        className={`px-3 py-1 rounded text-sm ${
          filters.quickWins === 'true' 
            ? 'bg-green-500 text-white' 
            : 'bg-white border border-gray-300'
        }`}
      >
        🎯 Quick Wins
      </button>
      
      <button
        onClick={() => onFilterChange('stale', filters.stale === 'true' ? '' : 'true')}
        className={`px-3 py-1 rounded text-sm ${
          filters.stale === 'true' 
            ? 'bg-amber-500 text-white' 
            : 'bg-white border border-gray-300'
        }`}
      >
        ⏰ Stale Only
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function IssueTrackerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/issues/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data.data);
    } catch (err: any) {
      console.error('Stats fetch error:', err);
    }
  }, []);
  
  // Fetch issues
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      params.set('page', pagination.page.toString());
      
      const res = await fetch(`/api/issues?${params}`);
      if (!res.ok) throw new Error('Failed to fetch issues');
      const data = await res.json();
      
      setIssues(data.data.issues);
      setPagination(p => ({
        ...p,
        totalPages: data.data.pagination.totalPages,
        total: data.data.pagination.total,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);
  
  useEffect(() => {
    fetchStats();
    fetchIssues();
  }, [fetchStats, fetchIssues]);
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPagination(p => ({ ...p, page: 1 }));
  };
  
  const handleIssueSelect = (issueId: string) => {
    router.push(`/dashboard/issues/${issueId}`);
  };
  
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Issue Tracker Dashboard</h1>
            <p className="text-gray-600">Monitor and manage development issues</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              📥 Import Issues
            </button>
            <button
              onClick={() => router.push('/dashboard/issues/new')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              ➕ New Issue
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <StatCard 
            title="Total Issues" 
            value={stats.summary.total} 
            icon="📊" 
            color="blue"
          />
          <StatCard 
            title="Open" 
            value={stats.summary.open} 
            subtitle="Needs attention"
            icon="📂" 
            color="blue"
          />
          <StatCard 
            title="Critical (P0+P1)" 
            value={stats.summary.criticalOpen} 
            subtitle="High priority"
            icon="🔴" 
            color="red"
          />
          <StatCard 
            title="Quick Wins" 
            value={stats.summary.quickWinsCount} 
            subtitle="Low effort"
            icon="🎯" 
            color="green"
          />
          <StatCard 
            title="Blocked" 
            value={stats.summary.blocked} 
            icon="🚧" 
            color="yellow"
          />
          <StatCard 
            title="Avg Age" 
            value={`${stats.summary.avgAgeDays}d`} 
            subtitle="Days pending"
            icon="⏱️" 
            color="purple"
          />
        </div>
      )}
      
      {/* Priority Distribution */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
            <div className="text-2xl font-bold text-red-700">{stats.byPriority.P0}</div>
            <div className="text-xs text-red-600">P0 Critical</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">{stats.byPriority.P1}</div>
            <div className="text-xs text-orange-600">P1 High</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{stats.byPriority.P2}</div>
            <div className="text-xs text-yellow-600">P2 Medium</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
            <div className="text-2xl font-bold text-green-700">{stats.byPriority.P3}</div>
            <div className="text-xs text-green-600">P3 Low</div>
          </div>
        </div>
      )}
      
      {/* Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {stats?.fileHeatMap && <FileHeatMap data={stats.fileHeatMap} />}
        {stats?.quickWins && <QuickWinsPanel quickWins={stats.quickWins} />}
        {stats?.staleIssues && <StaleIssuesPanel staleIssues={stats.staleIssues} />}
      </div>
      
      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={handleFilterChange} />
      
      {/* Issues Table */}
      <div className="bg-white rounded-lg border mt-4 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effort</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading issues...
                </td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No issues found
                </td>
              </tr>
            ) : (
              issues.map(issue => (
                <IssueRow key={issue._id} issue={issue} onSelect={handleIssueSelect} />
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {issues.length} of {pagination.total} issues
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      {/* Import Modal */}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onSuccess={() => {
          setShowImportModal(false);
          fetchStats();
          fetchIssues();
        }} />
      )}
    </div>
  );
}

// ============================================================================
// IMPORT MODAL COMPONENT
// ============================================================================

function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handlePreview = async () => {
    if (!content.trim()) {
      setError('Please paste the PENDING_MASTER.md content');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/issues/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, dryRun: true }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Import preview failed');
      }
      
      setPreview(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleImport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/issues/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, dryRun: false }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }
      
      alert(`Import complete!\nCreated: ${data.data.created}\nUpdated: ${data.data.updated}\nSkipped: ${data.data.skipped}`);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">📥 Import from PENDING_MASTER.md</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Paste your PENDING_MASTER.md content:
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 font-mono text-sm border rounded-lg p-3"
              placeholder="## 🗓️ 2025-12-13T18:10:27+03:00 — Post-Stabilization Audit v65.5..."
            />
          </div>
          
          {preview && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium mb-2">Preview Results</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>Parsed: <strong>{preview.parsed}</strong> items</p>
                  <p>After dedup: <strong>{preview.afterDedup}</strong> items</p>
                </div>
                <div>
                  <p>🐛 Bugs: {preview.byCategory?.bugs || 0}</p>
                  <p>⚠️ Logic: {preview.byCategory?.logic || 0}</p>
                  <p>🧪 Tests: {preview.byCategory?.tests || 0}</p>
                  <p>⚡ Efficiency: {preview.byCategory?.efficiency || 0}</p>
                  <p>📋 Next Steps: {preview.byCategory?.nextSteps || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handlePreview}
            disabled={loading || !content.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Preview'}
          </button>
          {preview && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : `Import ${preview.afterDedup} Issues`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
