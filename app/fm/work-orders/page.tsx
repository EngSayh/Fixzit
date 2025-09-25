'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';

const fetcher = (url: string) => fetch(url).then(r => r.json());

/**
 * Client-side React page that displays and manages a paginated, filterable list of work orders.
 *
 * Renders a header with a "New Work Order" action, a filter bar (search, status, priority),
 * a list of results fetched from `/api/work-orders` (via SWR), and pagination controls.
 *
 * Controls:
 * - Search input resets to page 1 when changed.
 * - Status and priority selects reset to page 1 when changed.
 * - Prev/Next buttons navigate pages and are disabled at the bounds.
 *
 * Data behavior:
 * - Builds a query string with `limit` (20), `page`, and optional `q`, `status`, and `priority`.
 * - Uses SWR to fetch parsed JSON from `/api/work-orders?{query}`.
 * - Exposes loading, empty, and populated list states; each item shows code, title, status,
 *   priority, property ID (or "—"), due date (formatted or "—"), and an "Open" link.
 *
 * @returns The page's JSX element.
 */
export default function WorkOrdersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('limit', String(pageSize));
    sp.set('page', String(page));
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (priority) sp.set('priority', priority);
    return sp.toString();
  }, [q, status, priority, page]);

  const { data, isLoading } = useSWR(`/api/work-orders?${query}`, fetcher);
  const items = data?.items || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-600">Manage and track work orders across all properties</p>
        </div>
        <Link href="/fm/work-orders">
          <Button className="bg-green-600 hover:bg-green-700">+ New Work Order</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border">
        <Input placeholder="Search..." value={q} onChange={(e)=>{setQ(e.target.value); setPage(1);}} className="w-64" />
        <Select value={status} onValueChange={(v)=>{setStatus(v); setPage(1);}}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="DISPATCHED">Dispatched</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v)=>{setPriority(v); setPage(1);}}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="URGENT">P1 Urgent</SelectItem>
            <SelectItem value="HIGH">P2 High</SelectItem>
            <SelectItem value="MEDIUM">P3 Medium</SelectItem>
            <SelectItem value="LOW">P4 Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No work orders found</div>
        ) : (
          <div className="divide-y">
            {items.map((wo: any) => (
              <div key={wo._id} className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{wo.code} — {wo.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {wo.status} • {wo.priority} • {wo.propertyId || '—'} • Due: {wo.dueAt ? new Date(wo.dueAt).toLocaleString() : '—'}
                  </div>
                </div>
                <Link href={`/fm/work-orders?code=${encodeURIComponent(wo.code)}`} className="text-blue-600 text-sm">Open</Link>
              </div>
            ))}
          </div>
        )}
        <div className="p-3 flex items-center justify-between text-sm text-gray-600">
          <span>Total: {total}</span>
          <div className="space-x-2">
            <Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
            <span>Page {page} / {pages}</span>
            <Button variant="outline" disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

