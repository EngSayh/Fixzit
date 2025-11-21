'use client';
/* eslint-disable react-hooks/rules-of-hooks */

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { TableSkeleton } from '@/components/skeletons';
import ClientDate from '@/components/ClientDate';

import { logger } from '@/lib/logger';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
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
  const auto = useAutoTranslator('fm.supportTickets');
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({ moduleId: 'support' });
  
  if (!hasOrgContext || !orgId) {
    return guard;
  }
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error(auto('No organization ID', 'errors.missingOrg')));
    }
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId } 
    })
      .then(r => r.json())
      .catch(error => {
        logger.error('FM tickets fetch error', error);
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId ? `/api/support/tickets?status=${status}&priority=${priority}` : null,
    fetcher
  );

  const updateTicket = async (id: string, updates: { status?: string }) => {
    if (!orgId) {
        toast.error(auto('No organization ID found', 'errors.missingOrg'));
        return;
      }

    const toastId = toast.loading(auto('Updating ticket status...', 'toast.updating'));

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
        toast.success(auto('Ticket status updated successfully', 'toast.success'), { id: toastId });
        mutate();
      } else {
        const error = await res.json();
        const detail = error?.error || auto('Unknown error', 'errors.unknown');
        toast.error(
          auto('Failed to update ticket: {{message}}', 'toast.updateFailed', {
            message: detail,
          }),
          { id: toastId }
        );
      }
    } catch (_error) {
      logger.error('Error updating ticket:', _error);
      toast.error(auto('Error updating ticket. Please try again.', 'toast.genericError'), { id: toastId });
    }
  };

  if (!session) {
    return <TableSkeleton rows={5} />;
  }

  if (!orgId) {
    return (
      <div className="p-6 space-y-6">
        <ModuleViewTabs moduleId="support" />
        {guard}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <ModuleViewTabs moduleId="support" />
      {supportBanner}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Support Tickets', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Manage customer support requests', 'header.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-border rounded-2xl"
        >
          <option value="">{auto('All Status', 'filters.status.all')}</option>
          <option value="New">{auto('New', 'filters.status.new')}</option>
          <option value="Open">{auto('Open', 'filters.status.open')}</option>
          <option value="Waiting">{auto('Waiting', 'filters.status.waiting')}</option>
          <option value="Resolved">{auto('Resolved', 'filters.status.resolved')}</option>
          <option value="Closed">{auto('Closed', 'filters.status.closed')}</option>
        </select>
        
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="px-3 py-2 border border-border rounded-2xl"
        >
          <option value="">{auto('All Priority', 'filters.priority.all')}</option>
          <option value="Low">{auto('Low', 'filters.priority.low')}</option>
          <option value="Medium">{auto('Medium', 'filters.priority.medium')}</option>
          <option value="High">{auto('High', 'filters.priority.high')}</option>
          <option value="Urgent">{auto('Urgent', 'filters.priority.urgent')}</option>
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
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    {auto('Code', 'table.code')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    {auto('Subject', 'table.subject')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    {auto('Module', 'table.module')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    {auto('Priority', 'table.priority')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    {auto('Status', 'table.status')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    {auto('Created', 'table.created')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    {auto('Actions', 'table.actions')}
                  </th>
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
                      <option value="New">{auto('New', 'filters.status.new')}</option>
                      <option value="Open">{auto('Open', 'filters.status.open')}</option>
                      <option value="Waiting">{auto('Waiting', 'filters.status.waiting')}</option>
                      <option value="Resolved">{auto('Resolved', 'filters.status.resolved')}</option>
                      <option value="Closed">{auto('Closed', 'filters.status.closed')}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {ticket.createdAt ? (
                      <ClientDate date={ticket.createdAt} format="date-only" />
                    ) : (
                      auto('N/A', 'table.notAvailable')
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link 
                      href={`/fm/support/tickets/${ticket.id}`} 
                      className="text-primary hover:text-primary/90 hover:underline"
                    >
                      {auto('View', 'table.view')}
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
