'use client';

import { useState} from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, {
  headers: {
    "x-user": localStorage.getItem("x-user") || ""
  }
}).then(r => r.json());

export default function MyTicketsPage() {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const { data, mutate } = useSWR('/api/support/tickets/my', fetcher);

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    
    const res = await fetch(`/api/support/tickets/${selectedTicket._id}/reply`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user': localStorage.getItem("x-user") || ""
      },
      body: JSON.stringify({ text: replyText })
    });
    
    if (res.ok) {
      setReplyText('');
      mutate();
      // Refresh selected ticket
      const ticketRes = await fetch(`/api/support/tickets/${selectedTicket._id}`, {
        headers: { 'x-user': localStorage.getItem("x-user") || "" }
      });
      if (ticketRes.ok) {
        setSelectedTicket(await ticketRes.json());
      }
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
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          New Ticket
        </button>
      </div>

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
                data?.items?.map((ticket: unknown) => (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedTicket?._id === ticket._id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-gray-900 text-sm">{ticket.code}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ticket.status === 'New' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'Open' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'Waiting' ? 'bg-purple-100 text-purple-800' :
                        ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
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
                    selectedTicket.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                    selectedTicket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                    selectedTicket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTicket.priority} Priority
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 max-h-96 overflow-y-auto">
                {selectedTicket.messages?.map((msg: any, index: number) => (
                  <div key={index} className={`mb-4 ${
                    msg.byRole === 'ADMIN' ? 'ml-8' : ''
                  }`}>
                    <div className={`p-3 rounded-lg ${
                      msg.byRole === 'ADMIN' 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-medium text-gray-600">
                          {msg.byRole === 'ADMIN' ? 'Support Team' : 'You'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(msg.at).toLocaleString()}
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
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                  />
                  <button
                    onClick={sendReply}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
    </div>
  );
}

