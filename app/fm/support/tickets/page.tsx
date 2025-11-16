'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/skeletons';
import ClientDate from '@/components/ClientDate';

import { logger } from '@/lib/logger';
interface TicketItem {
  id: string;
  code?: string;
  subject?: string;
  module?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
}

export default function SupportTicketsPage() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId } 
    })
      .then(r => r.json())
      .catch(error => {
        logger.error('FM tickets fetch error', { error });
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId ? `/api/support/tickets?status=${status}&priority=${priority}` : null,
    fetcher
  );

  const updateTicket = async (id: string, updates: { status?: string }) => {
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading('Updating ticket status...');

    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': orgId
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        toast.success('Ticket status updated successfully', { id: toastId });
        mutate();
      } else {
        const error = await res.json();
        toast.error(`Failed to update ticket: ${error.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      logger.error('Error updating ticket:', error);
      toast.error('Error updating ticket. Please try again.', { id: toastId });
    }
  };

  if (!session) {
    return <TableSkeleton rows={5} />;
  }

  if (!orgId) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error: No organization ID found in session</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-border rounded-2xl"
        >
          <option value="">All Status</option>
          <option value="New">New</option>
          <option value="Open">Open</option>
          <option value="Waiting">Waiting</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
        
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="px-3 py-2 border border-border rounded-2xl"
        >
          <option value="">All Priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="bg-card rounded-2xl shadow-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">Code</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">Subject</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">Module</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">Priority</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">Created</th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.items as TicketItem[] || []).map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {ticket.code}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {ticket.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {ticket.module}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ticket.priority === 'Urgent' ? 'bg-destructive/10 text-destructive-foreground' :
                      ticket.priority === 'High' ? 'bg-warning/10 text-warning' :
                      ticket.priority === 'Medium' ? 'bg-warning/10 text-warning-foreground' :
                      'bg-muted text-foreground'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={ticket.status}
                      onChange={e => updateTicket(ticket.id, { status: e.target.value })}
                      className="text-sm border border-border rounded px-2 py-1"
                    >
                      <option value="New">New</option>
                      <option value="Open">Open</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {ticket.createdAt ? <ClientDate date={ticket.createdAt} format="date-only" /> : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link 
                      href={`/fm/support/tickets/${ticket.id}`} 
                      className="text-primary hover:text-primary/90 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

