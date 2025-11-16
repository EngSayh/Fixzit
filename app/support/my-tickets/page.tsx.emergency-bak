'use client';

import { useState} from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/skeletons';
import ClientDate from '@/components/ClientDate';
import { logger } from '@/lib/logger';
interface TicketMessage {
  from: string;
  text: string;
  timestamp: string;
  byRole?: string;
  at?: string;
}

interface Ticket {
  id: string;
  code: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  module?: string;
  type?: string;
  messages?: TicketMessage[];
}

export default function MyTicketsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetcher = (url: string) => {
    // Auth cookie is sent automatically by browser
    // Backend extracts user from session
    return fetch(url)
      .then(r => r.json())
      .catch(error => {
        logger.error('Support tickets fetch error', { error });
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    userId ? '/api/support/tickets/my' : null, 
    fetcher
  );

  if (!session) {
    return <TableSkeleton rows={5} />;
  }

  if (!userId) {
    return <p>Error: No user ID found in session</p>;
  }

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) {
      toast.error('Please enter a reply message.');
      return;
    }
    
    const toastId = toast.loading('Sending reply...');
    
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
          // Auth cookie sent automatically by browser
        },
        body: JSON.stringify({ text: replyText })
      });
      
      if (res.ok) {
        toast.success('Reply sent successfully', { id: toastId });
        setReplyText('');
        await mutate();
        // Refresh selected ticket
        const ticketRes = await fetch(`/api/support/tickets/${selectedTicket.id}`);
        if (ticketRes.ok) {
          setSelectedTicket(await ticketRes.json());
        }
      } else {
        const error = await res.json();
        toast.error(`Failed to send reply: ${error.error || 'Please try again.'}`, { id: toastId });
      }
    } catch (error) {
      logger.error('Error sending reply:', error);
      toast.error('An error occurred. Please try again.', { id: toastId });
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Support Tickets</h1>
          <p className="text-muted-foreground">View and manage your support requests</p>
        </div>
        <button 
          onClick={() => {
            const footer = document.querySelector('footer');
            const supportBtn = footer?.querySelector('button');
            supportBtn?.click();
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors"
        >
          New Ticket
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl shadow-md border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Your Tickets</h2>
              </div>
              <div className="divide-y divide-border">
                {data?.items?.length === 0 ? (
                  <p className="p-4 text-muted-foreground text-center">No tickets yet</p>
                ) : (
                  data?.items?.map((ticket: Ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer hover:bg-muted ${
                      selectedTicket?.id === ticket.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-foreground text-sm">{ticket.code}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ticket.status === 'New' ? 'bg-primary/10 text-primary' :
                        ticket.status === 'Open' ? 'bg-accent/10 text-accent-foreground' :
                        ticket.status === 'Waiting' ? 'bg-secondary/10 text-secondary' :
                        ticket.status === 'Resolved' ? 'bg-success/10 text-success' :
                        'bg-muted text-foreground'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <ClientDate date={ticket.createdAt} format="date-only" />
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-card rounded-2xl shadow-md border border-border">
              <div className="p-4 border-b border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-semibold text-foreground">{selectedTicket.subject}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedTicket.code} • {selectedTicket.module} • {selectedTicket.type}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    selectedTicket.priority === 'Urgent' ? 'bg-destructive/10 text-destructive' :
                    selectedTicket.priority === 'High' ? 'bg-warning/10 text-warning-foreground' :
                    selectedTicket.priority === 'Medium' ? 'bg-accent/10 text-accent-foreground' :
                    'bg-muted text-foreground'
                  }`}>
                    {selectedTicket.priority} Priority
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 max-h-96 overflow-y-auto">
                {selectedTicket.messages?.map((msg, index: number) => (
                  <div key={`msg-${index}`} className={`mb-4 ${
>>>>>>> feat/souq-marketplace-advanced
                    msg.byRole === 'ADMIN' ? 'ms-8' : ''
                  }`}>
                    <div className={`p-3 rounded-2xl ${
                      msg.byRole === 'ADMIN' 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-muted border border-border'
                    }`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {msg.byRole === 'ADMIN' ? 'Support Team' : 'You'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <ClientDate date={msg.at || msg.timestamp} format="medium" />
                        </p>
                      </div>
                      <p className="text-sm text-foreground">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              {selectedTicket.status !== 'Closed' && (
                <div className="p-4 border-t border-border">
                  <textarea
                    aria-label="Type your reply to this support ticket"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full px-3 py-2 border border-border rounded-2xl h-24"
                  />
                  <button
                    onClick={sendReply}
                    className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90"
                  >
                    Send Reply
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
              <p className="text-muted-foreground">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

