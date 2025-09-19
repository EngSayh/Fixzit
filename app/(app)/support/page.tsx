'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Search, Filter, Plus, User, Calendar, Tag, Paperclip, Send, ChevronRight, TrendingUp, Users, MessageCircle, Zap, BookOpen, HelpCircle, Star, ArrowUp, ArrowDown } from 'lucide-react';

interface SupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'property' | 'maintenance' | 'general' | 'complaint';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  createdBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    department: string;
  };
  propertyId?: string;
  propertyName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  responseTime?: number;
  resolutionTime?: number;
  satisfaction?: number;
  tags: string[];
  attachments: {
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
  messages: {
    _id: string;
    message: string;
    sender: {
      _id: string;
      name: string;
      role: string;
    };
    timestamp: string;
    attachments: string[];
    isInternal: boolean;
  }[];
  relatedTickets: string[];
  slaBreached: boolean;
  escalationLevel: number;
}

interface KnowledgeArticle {
  _id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  createdAt: string;
  updatedAt: string;
  author: string;
  isPublished: boolean;
  relatedArticles: string[];
}

interface SupportStats {
  openTickets: number;
  avgResponseTime: number;
  resolutionRate: number;
  satisfactionScore: number;
  ticketsToday: number;
  ticketsThisWeek: number;
  pendingEscalations: number;
  slaCompliance: number;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeArticle[]>([]);
  const [stats, setStats] = useState<SupportStats>({
    openTickets: 0,
    avgResponseTime: 0,
    resolutionRate: 0,
    satisfactionScore: 0,
    ticketsToday: 0,
    ticketsThisWeek: 0,
    pendingEscalations: 0,
    slaCompliance: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tickets' | 'knowledge' | 'analytics'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchSupportData();
  }, []);

  const fetchSupportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [ticketsRes, statsRes, kbRes] = await Promise.all([
        fetch('/api/support/tickets', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/support/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/support/knowledge-base', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (ticketsRes.ok && statsRes.ok && kbRes.ok) {
        const ticketsData = await ticketsRes.json();
        const statsData = await statsRes.json();
        const kbData = await kbRes.json();
        
        setTickets(ticketsData.data || []);
        setStats(statsData.data || stats);
        setKnowledgeBase(kbData.data || []);
      }
    } catch (error) {
      console.error('Error fetching support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
      });

      if (response.ok) {
        await fetchSupportData();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/support/tickets/${selectedTicket._id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newMessage })
      });

      if (response.ok) {
        setNewMessage('');
        await fetchSupportData();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await fetchSupportData();
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50';
      case 'waiting_customer': return 'text-purple-600 bg-purple-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter;
    const matchesPriority = priority === 'all' || ticket.priority === priority;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesPriority && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-600 mt-1">Manage tickets and help your customers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Tickets</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.openTickets}</p>
              <div className="flex items-center mt-2 text-blue-600">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+{stats.ticketsToday} today</span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgResponseTime}h</p>
              <p className="text-sm text-gray-500 mt-2">SLA: &lt; 4 hours</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-xl">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolution Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.resolutionRate}%</p>
              <div className="flex items-center mt-2 text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+5% vs last week</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Satisfaction Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.satisfactionScore}</p>
              <div className="flex items-center mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= Math.floor(stats.satisfactionScore) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <Star className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {(['tickets', 'knowledge', 'analytics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'knowledge' ? 'Knowledge Base' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'tickets' && (
            <div className="flex gap-6">
              {/* Tickets List */}
              <div className="flex-1">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_customer">Waiting Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Tickets */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-600">Loading tickets...</p>
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-gray-600">No tickets found</p>
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <div
                        key={ticket._id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer ${
                          selectedTicket?._id === ticket._id ? 'ring-2 ring-indigo-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-gray-900">#{ticket.ticketNumber}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority.toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ').toUpperCase()}
                              </span>
                              {ticket.slaBreached && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                                  SLA BREACH
                                </span>
                              )}
                            </div>
                            <p className="mt-2 font-medium text-gray-900">{ticket.subject}</p>
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {ticket.createdBy.name}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                              {ticket.propertyName && (
                                <span className="flex items-center">
                                  <Tag className="h-4 w-4 mr-1" />
                                  {ticket.propertyName}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ticket Details */}
              {selectedTicket && (
                <div className="w-96 bg-gray-50 rounded-xl p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">#{selectedTicket.ticketNumber}</h3>
                      <p className="text-gray-600 mt-1">{selectedTicket.subject}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(selectedTicket._id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_customer">Waiting Customer</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Messages</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedTicket.messages.map((message) => (
                          <div
                            key={message._id}
                            className={`p-3 rounded-lg ${
                              message.sender.role === 'customer'
                                ? 'bg-white ml-4'
                                : 'bg-indigo-50 mr-4'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {message.sender.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{message.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button
                          onClick={handleSendMessage}
                          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Knowledge Base Articles</h3>
                <button className="text-indigo-600 hover:text-indigo-700 flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>New Article</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {knowledgeBase.map((article) => (
                  <div key={article._id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-gray-900 mb-2">{article.title}</h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{article.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-1" />
                          {article.views} views
                        </span>
                        <span className="flex items-center">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {article.helpful} helpful
                        </span>
                      </div>
                      <button className="text-indigo-600 hover:text-indigo-700 text-sm">
                        Read more
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Support analytics coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Create New Ticket</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateTicket(Object.fromEntries(formData));
            }}>
              <div className="space-y-4">
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <textarea
                  name="description"
                  placeholder="Describe your issue..."
                  rows={4}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  name="category"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Category</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="property">Property</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="general">General</option>
                  <option value="complaint">Complaint</option>
                </select>
                <select
                  name="priority"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}