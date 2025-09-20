'use client';

import React, { useState, useEffect } from 'react';
import {
  Tool, Calendar, CheckCircle, Clock, AlertTriangle,
  Building2, Wrench, Settings, TrendingUp, FileText,
  Filter, Search, Plus, ChevronRight, BarChart3
} from 'lucide-react';
import { useTranslation } from '../../../contexts/I18nContext';

interface MaintenanceTask {
  id: string;
  title: string;
  asset: string;
  location: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastCompleted: string;
  nextDue: string;
  status: 'scheduled' | 'overdue' | 'completed' | 'in-progress';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  completionRate: number;
}

export default function PreventivePage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedView, setSelectedView] = useState<'calendar' | 'list'>('list');
  const [filterFrequency, setFilterFrequency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    const mockTasks: MaintenanceTask[] = [
      {
        id: 'PM-001',
        title: 'HVAC System Inspection',
        asset: 'Central AC Unit',
        location: 'Building A - Roof',
        frequency: 'monthly',
        lastCompleted: '2024-12-15',
        nextDue: '2025-01-15',
        status: 'scheduled',
        priority: 'high',
        assignee: 'Tech Team A',
        completionRate: 95
      },
      {
        id: 'PM-002',
        title: 'Elevator Maintenance',
        asset: 'Elevator #1',
        location: 'Building A',
        frequency: 'weekly',
        lastCompleted: '2025-01-10',
        nextDue: '2025-01-17',
        status: 'scheduled',
        priority: 'critical',
        assignee: 'Elevator Specialists',
        completionRate: 100
      },
      {
        id: 'PM-003',
        title: 'Fire Alarm Testing',
        asset: 'Fire Detection System',
        location: 'All Buildings',
        frequency: 'monthly',
        lastCompleted: '2024-12-20',
        nextDue: '2025-01-20',
        status: 'overdue',
        priority: 'critical',
        assignee: 'Safety Team',
        completionRate: 88
      },
      {
        id: 'PM-004',
        title: 'Generator Inspection',
        asset: 'Backup Generator',
        location: 'Building B - Basement',
        frequency: 'quarterly',
        lastCompleted: '2024-10-15',
        nextDue: '2025-01-15',
        status: 'in-progress',
        priority: 'high',
        assignee: 'Power Systems',
        completionRate: 92
      },
      {
        id: 'PM-005',
        title: 'Plumbing System Check',
        asset: 'Water Pumps',
        location: 'Pump Room',
        frequency: 'monthly',
        lastCompleted: '2024-12-28',
        nextDue: '2025-01-28',
        status: 'scheduled',
        priority: 'medium',
        assignee: 'Plumbing Team',
        completionRate: 87
      }
    ];

    setTimeout(() => {
      setTasks(mockTasks);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      daily: 'bg-purple-100 text-purple-800',
      weekly: 'bg-indigo-100 text-indigo-800',
      monthly: 'bg-blue-100 text-blue-800',
      quarterly: 'bg-teal-100 text-teal-800',
      yearly: 'bg-gray-100 text-gray-800'
    };
    return colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFrequency = filterFrequency === 'all' || task.frequency === filterFrequency;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFrequency && matchesStatus && matchesSearch;
  });

  const stats = {
    total: tasks.length,
    scheduled: tasks.filter(t => t.status === 'scheduled').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    averageCompletion: Math.round(tasks.reduce((acc, t) => acc + t.completionRate, 0) / tasks.length) || 0
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preventive Maintenance</h1>
          <p className="text-gray-600 mt-1">Schedule and track regular maintenance tasks</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Schedule Task
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <Tool className="w-8 h-8 text-brand-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{stats.scheduled}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold mt-1">{stats.averageCompletion}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="all">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="overdue">Overdue</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedView('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedView === 'list' 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setSelectedView('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedView === 'calendar' 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Calendar View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {selectedView === 'list' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="card">
              <div className="card-body">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <Tool className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No maintenance tasks found</p>
              </div>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const daysUntilDue = getDaysUntilDue(task.nextDue);
              return (
                <div key={task.id} className="card hover:shadow-md transition-shadow">
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-gray-500">{task.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(task.frequency)}`}>
                            {task.frequency}
                          </span>
                          <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">{task.title}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Asset</p>
                            <p className="text-sm font-medium text-gray-700">
                              <Wrench className="w-3 h-3 inline mr-1" />
                              {task.asset}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="text-sm font-medium text-gray-700">
                              <Building2 className="w-3 h-3 inline mr-1" />
                              {task.location}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Assigned To</p>
                            <p className="text-sm font-medium text-gray-700">{task.assignee}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Last Completed</p>
                            <p className="text-sm text-gray-700">
                              {new Date(task.lastCompleted).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Next Due</p>
                            <p className={`text-sm font-medium ${
                              daysUntilDue < 0 ? 'text-red-600' : 
                              daysUntilDue <= 7 ? 'text-yellow-600' : 'text-gray-700'
                            }`}>
                              {new Date(task.nextDue).toLocaleDateString()}
                              {daysUntilDue < 0 && ` (${Math.abs(daysUntilDue)} days overdue)`}
                              {daysUntilDue > 0 && daysUntilDue <= 7 && ` (${daysUntilDue} days)`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Completion Rate</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    task.completionRate >= 90 ? 'bg-green-500' : 
                                    task.completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${task.completionRate}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{task.completionRate}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="btn btn-sm px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100">
                          View Details
                        </button>
                        <button className="btn btn-sm px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100">
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Calendar view coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}