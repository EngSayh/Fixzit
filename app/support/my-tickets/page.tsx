'use client';

import { useState} from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/skeletons';

interface TicketMessage {
  from: string;
  text: string;
  timestamp: string;
  byRole?: string;
  at?: string;
}

interface Ticket {
  _id: string;
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
    return fetch(url).then(r => r.json());
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
      const res = await fetch(`/api/support/tickets/${selectedTicket._id}/reply`, {
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
        const ticketRes = await fetch(`/api/support/tickets/${selectedTicket._id}`);
        if (ticketRes.ok) {
          setSelectedTicket(await ticketRes.json());
        }
      } else {
        const error = await res.json();
        toast.error(`Failed to send reply: ${error.error || 'Please try again.'}`, { id: toastId });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('An error occurred. Please try again.', { id: toastId });
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Support Tickets</h1>
          <p className="text-gray-600">View and manage your support requests</p>
        </div>
        <button 
          onClick={() => {
            const footer = document.querySelector('footer');
            const supportBtn = footer?.querySelector('button');
            supportBtn?.click();
          }}
          className="px-4 py-2 bg-[var(--fixzit-primary)] text-white rounded-md hover:bg-[var(--fixzit-primary-dark)] transition-colors"
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
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Your Tickets</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {data?.items?.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No tickets yet</p>
                ) : (
                  data?.items?.map((ticket: Ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedTicket?._id === ticket._id ? 'bg-[var(--fixzit-primary-lightest)]' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-gray-900 text-sm">{ticket.code}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ticket.status === 'New' ? 'bg-[var(--fixzit-primary-lightest)] text-[var(--fixzit-primary-darker)]' :
                        ticket.status === 'Open' ? 'bg-[var(--fixzit-accent-lightest)] text-[var(--fixzit-accent-darker)]' :
                        ticket.status === 'Waiting' ? 'bg-purple-100 text-purple-800' :
                        ticket.status === 'Resolved' ? 'bg-[var(--fixzit-success-lightest)] text-[var(--fixzit-success-darker)]' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(ticket.createdAt).toLocaleDateString()}
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
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedTicket.subject}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedTicket.code} • {selectedTicket.module} • {selectedTicket.type}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    selectedTicket.priority === 'Urgent' ? 'bg-[var(--fixzit-danger-lightest)] text-[var(--fixzit-danger-darker)]' :
                    selectedTicket.priority === 'High' ? 'bg-[var(--fixzit-warning-lightest)] text-[var(--fixzit-warning-darker)]' :
                    selectedTicket.priority === 'Medium' ? 'bg-[var(--fixzit-accent-lightest)] text-[var(--fixzit-accent-darker)]' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTicket.priority} Priority
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 max-h-96 overflow-y-auto">
                {selectedTicket.messages?.map((msg, index: number) => (
                  <div key={index} className={`mb-4 ${
                    msg.byRole === 'ADMIN' ? 'ml-8' : ''
                  }`}>
                    <div className={`p-3 rounded-lg ${
                      msg.byRole === 'ADMIN' 
                        ? 'bg-[var(--fixzit-primary-lightest)] border border-[var(--fixzit-primary-lighter)]' 
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-medium text-gray-600">
                          {msg.byRole === 'ADMIN' ? 'Support Team' : 'You'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {msg.at ? new Date(msg.at).toLocaleString() : new Date(msg.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-900">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              {selectedTicket.status !== 'Closed' && (
                <div className="p-4 border-t border-gray-200">
                  <textarea
                    aria-label="Type your reply to this support ticket"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                  />
                  <button
                    onClick={sendReply}
                    className="mt-2 px-4 py-2 bg-[var(--fixzit-primary)] text-white rounded-md hover:bg-[var(--fixzit-primary-dark)]"
                  >
                    Send Reply
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

