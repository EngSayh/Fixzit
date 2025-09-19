"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatPercentage } from "@/lib/utils";
import { 
  Users, UserPlus, Target, Briefcase, MessageSquare, CheckSquare,
  TrendingUp, BarChart3, PieChart, Phone, Mail, Calendar, Plus,
  Search, Filter, Download, Eye, Edit, Trash2, ArrowRight,
  Clock, DollarSign, Star, AlertTriangle, CheckCircle, X,
  Building2, MapPin, Tag, Loader2, FileText, Activity
} from "lucide-react";

// Tab configuration
const CRM_TABS = [
  { id: 'overview', name: 'Overview', icon: BarChart3, description: 'CRM dashboard and analytics' },
  { id: 'leads', name: 'Leads', icon: Target, description: 'Lead management and tracking' },
  { id: 'contacts', name: 'Contacts', icon: Users, description: 'Contact database' },
  { id: 'deals', name: 'Deals', icon: Briefcase, description: 'Deal pipeline management' },
  { id: 'tasks', name: 'Tasks', icon: CheckSquare, description: 'Task and activity tracking' },
  { id: 'interactions', name: 'Interactions', icon: MessageSquare, description: 'Communication history' },
  { id: 'analytics', name: 'Analytics', icon: TrendingUp, description: 'Performance metrics' }
];

// Enhanced CRM Stats interface
interface CRMStats {
  leads: {
    total: number;
    new: number;
    converted: number;
    conversionRate: number;
    bySource: Array<{ source: string; _count: { source: number } }>;
    byStatus: Array<{ status: string; _count: { status: number } }>;
  };
  contacts: {
    total: number;
    new: number;
    active: number;
    byType: Array<{ type: string; _count: { type: number } }>;
  };
  deals: {
    total: number;
    new: number;
    won: number;
    lost: number;
    conversionRate: number;
    totalValue: number;
    wonValue: number;
    averageSize: number;
    byStage: Array<{ stage: string; _count: { stage: number }; _sum: { value: number } }>;
  };
  activities: {
    interactions: {
      total: number;
      recent: number;
      byType: Array<{ type: string; _count: { type: number } }>;
    };
    tasks: {
      total: number;
      pending: number;
      overdue: number;
      completed: number;
      completionRate: number;
    };
  };
  salesFunnel: Array<{ stage: string; count: number; value: number }>;
  forecasting: {
    totalPipelineValue: number;
    weightedPipelineValue: number;
    bestCaseRevenue: number;
    worstCaseRevenue: number;
  };
  performance: {
    leadConversionRate: number;
    dealConversionRate: number;
    taskCompletionRate: number;
    averageDealSize: number;
  };
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  score: number;
  createdAt: string;
  assignedTo: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  type: string;
  lastContact: string;
  totalInteractions: number;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string;
  contact: Contact;
  assignedTo: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string;
  assignedTo: string;
  relatedTo: string;
  relatedType: string;
}

interface Interaction {
  id: string;
  type: string;
  subject: string;
  contact: Contact;
  date: string;
  duration?: number;
  notes: string;
  outcome?: string;
}

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/crm/stats", { 
          signal: ctrl.signal, 
          cache: 'no-store' 
        });
        if (!response.ok) throw new Error("Failed to fetch CRM stats");
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err?.message ?? "Unknown error");
        }
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTabData = async () => {
      setIsLoading(true);
      try {
        switch (activeTab) {
          case 'overview':
          case 'analytics':
            await fetchStats();
            break;
          case 'leads':
            const leadsRes = await fetch('/api/crm/leads', { signal: ctrl.signal });
            if (leadsRes.ok) {
              const data = await leadsRes.json();
              setLeads(data);
            }
            break;
          case 'contacts':
            const contactsRes = await fetch('/api/crm/contacts', { signal: ctrl.signal });
            if (contactsRes.ok) {
              const data = await contactsRes.json();
              setContacts(data);
            }
            break;
          case 'deals':
            const dealsRes = await fetch('/api/crm/deals', { signal: ctrl.signal });
            if (dealsRes.ok) {
              const data = await dealsRes.json();
              setDeals(data);
            }
            break;
          case 'tasks':
            const tasksRes = await fetch('/api/crm/tasks', { signal: ctrl.signal });
            if (tasksRes.ok) {
              const data = await tasksRes.json();
              setTasks(data);
            }
            break;
          case 'interactions':
            const interactionsRes = await fetch('/api/crm/interactions', { signal: ctrl.signal });
            if (interactionsRes.ok) {
              const data = await interactionsRes.json();
              setInteractions(data);
            }
            break;
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err?.message ?? "Unknown error");
        }
      } finally {
        setIsLoading(false);
      }
    };

    let int: number | undefined;
    const start = () => { 
      fetchTabData(); 
      int = window.setInterval(fetchTabData, 30000); 
    };
    const stop = () => { 
      if (int) {
        window.clearInterval(int);
        int = undefined;
      }
    };
    const onVis = () => (document.hidden ? stop() : start());
    
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { 
      stop(); 
      document.removeEventListener('visibilitychange', onVis); 
      ctrl.abort(); 
    };
  }, [activeTab]);

  // Overview Tab Component
  const OverviewTab = () => {
    if (!stats) return null;

    return (
      <div className="space-y-6">
        {/* Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.leads.total}</p>
                <p className="text-xs text-green-600 mt-1">+{stats.leads.new} new this month</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Deals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.deals.total}</p>
                <p className="text-xs text-gray-600 mt-1">${(stats.deals.totalValue / 1000).toFixed(0)}k value</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(stats.deals.conversionRate)}</p>
                <p className="text-xs text-green-600 mt-1">↑ 5% from last month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-600">{stats.activities.tasks.overdue}</p>
                <p className="text-xs text-gray-600 mt-1">of {stats.activities.tasks.total} total</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Sales Funnel */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Funnel</h3>
          <div className="space-y-3">
            {stats.salesFunnel.map((stage, index) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 w-24">{stage.stage}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-8">
                  <div 
                    className={`h-8 rounded-full flex items-center justify-end pr-3 text-xs font-medium text-white ${
                      index === 0 ? 'bg-blue-500' : 
                      index === stats.salesFunnel.length - 1 ? 'bg-green-500' : 
                      'bg-gray-500'
                    }`}
                    style={{ width: `${(stage.count / (stats.salesFunnel[0]?.count || 1)) * 100}%` }}
                  >
                    {stage.count} deals
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-20 text-right">
                  ${(stage.value / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/crm/leads/new" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <UserPlus className="h-6 w-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Add Lead</p>
            <p className="text-xs text-gray-600">Create new lead</p>
          </Link>
          <Link href="/crm/deals/new" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <Briefcase className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">New Deal</p>
            <p className="text-xs text-gray-600">Start new opportunity</p>
          </Link>
          <Link href="/crm/tasks" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <CheckSquare className="h-6 w-6 text-orange-600 mb-2" />
            <p className="font-medium text-gray-900">View Tasks</p>
            <p className="text-xs text-gray-600">{stats.activities.tasks.pending} pending</p>
          </Link>
          <Link href="/crm/analytics" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900">Analytics</p>
            <p className="text-xs text-gray-600">View reports</p>
          </Link>
        </div>
      </div>
    );
  };

  // Leads Tab Component
  const LeadsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="h-4 w-4 inline mr-2" />
            Filter
          </button>
        </div>
        <Link 
          href="/crm/leads/new"
          className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86]"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Add Lead
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium">No leads found</p>
                  <Link href="/crm/leads/new" className="text-[#0061A8] hover:text-[#004c86] mt-2 inline-block">
                    Add your first lead →
                  </Link>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{lead.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lead.company}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lead.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                      lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link href={`/crm/leads/${lead.id}`} className="text-[#0061A8] hover:text-[#004c86] mr-3">
                      View
                    </Link>
                    <Link href={`/crm/leads/${lead.id}/convert`} className="text-gray-600 hover:text-gray-900">
                      Convert
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Contacts Tab Component
  const ContactsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4 inline mr-2" />
            Export
          </button>
          <Link 
            href="/crm/contacts/new"
            className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86]"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Add Contact
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500">No contacts found</p>
            <Link href="/crm/contacts/new" className="text-[#0061A8] hover:text-[#004c86] mt-2 inline-block">
              Add your first contact →
            </Link>
          </div>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg font-semibold text-blue-600">
                      {contact.firstName[0]}{contact.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{contact.position}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{contact.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{contact.phone}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                <Link href={`/crm/contacts/${contact.id}`} className="text-[#0061A8] text-sm hover:text-[#004c86]">
                  View Details
                </Link>
                <button className="text-gray-600 text-sm hover:text-gray-900">Send Email</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Deals Tab Component
  const DealsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
          />
        </div>
        <Link 
          href="/crm/deals/new"
          className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86]"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          New Deal
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Close Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium">No deals found</p>
                  <Link href="/crm/deals/new" className="text-[#0061A8] hover:text-[#004c86] mt-2 inline-block">
                    Create your first deal →
                  </Link>
                </td>
              </tr>
            ) : (
              deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{deal.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {deal.contact.firstName} {deal.contact.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">${deal.value.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      deal.stage === 'won' ? 'bg-green-100 text-green-800' :
                      deal.stage === 'lost' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {deal.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(deal.expectedCloseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link href={`/crm/deals/${deal.id}`} className="text-[#0061A8] hover:text-[#004c86] mr-3">
                      View
                    </Link>
                    <button className="text-gray-600 hover:text-gray-900">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Tasks Tab Component  
  const TasksTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="all">All Tasks</option>
            <option value="today">Today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86]">
          <Plus className="h-4 w-4 inline mr-2" />
          Add Task
        </button>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500">No tasks found</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {task.assignedTo}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Interactions Tab Component
  const InteractionsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search interactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
          />
        </div>
        <button className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004c86]">
          <Plus className="h-4 w-4 inline mr-2" />
          Log Interaction
        </button>
      </div>

      <div className="space-y-4">
        {interactions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500">No interactions found</p>
          </div>
        ) : (
          interactions.map((interaction) => (
            <div key={interaction.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    interaction.type === 'call' ? 'bg-blue-100' :
                    interaction.type === 'email' ? 'bg-green-100' :
                    interaction.type === 'meeting' ? 'bg-purple-100' :
                    'bg-gray-100'
                  }`}>
                    {interaction.type === 'call' && <Phone className="h-5 w-5 text-blue-600" />}
                    {interaction.type === 'email' && <Mail className="h-5 w-5 text-green-600" />}
                    {interaction.type === 'meeting' && <Calendar className="h-5 w-5 text-purple-600" />}
                    {interaction.type === 'note' && <FileText className="h-5 w-5 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{interaction.subject}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      with {interaction.contact.firstName} {interaction.contact.lastName}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">{interaction.notes}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(interaction.date).toLocaleDateString()}
                  </p>
                  {interaction.duration && (
                    <p className="text-xs text-gray-500 mt-1">{interaction.duration} min</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Analytics Tab Component
  const AnalyticsTab = () => {
    if (!stats) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Sources */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources Performance</h3>
            <div className="space-y-3">
              {stats.leads.bySource.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{source.source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(source._count.source / stats.leads.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {source._count.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deal Stages */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Pipeline</h3>
            <div className="space-y-3">
              {stats.deals.byStage.map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{stage.stage}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{stage._count.stage} deals</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${(stage._sum.value / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Forecasting */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecast</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(stats.forecasting.totalPipelineValue / 1000).toFixed(0)}k
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weighted Value</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(stats.forecasting.weightedPipelineValue / 1000).toFixed(0)}k
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Best Case</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(stats.forecasting.bestCaseRevenue / 1000).toFixed(0)}k
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Worst Case</p>
                <p className="text-2xl font-bold text-red-600">
                  ${(stats.forecasting.worstCaseRevenue / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </div>

          {/* Activity Metrics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.activities.interactions.total}
                </div>
                <div className="text-sm text-gray-600">Total Interactions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.activities.tasks.completed}
                </div>
                <div className="text-sm text-gray-600">Tasks Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {formatPercentage(stats.performance.taskCompletionRate)}
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  ${(stats.performance.averageDealSize / 1000).toFixed(0)}k
                </div>
                <div className="text-sm text-gray-600">Avg Deal Size</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading CRM statistics…</span>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert" aria-live="assertive">
          <p className="text-red-600">Error loading CRM data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
              <p className="text-gray-600">Manage customers, leads, and sales pipeline</p>
            </div>
            <div className="flex items-center gap-4">
              <Activity className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-600">Last sync: 2 minutes ago</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {CRM_TABS.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#0061A8] text-[#0061A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 mr-2 ${
                    activeTab === tab.id ? 'text-[#0061A8]' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400 font-normal">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'leads' && <LeadsTab />}
        {activeTab === 'contacts' && <ContactsTab />}
        {activeTab === 'deals' && <DealsTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'interactions' && <InteractionsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}