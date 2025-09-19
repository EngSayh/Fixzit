'use client';

import { useState, useEffect } from 'react';
import { Wrench, Calendar, CheckCircle, AlertTriangle, Clock, TrendingUp, BarChart3, Settings, Plus, Search, Filter, Building2, CalendarDays, FileText, User, DollarSign, Target, Activity, Zap, Timer, AlertCircle } from 'lucide-react';

interface MaintenanceSchedule {
  _id: string;
  name: string;
  assetId: string;
  assetName: string;
  assetType: string;
  propertyId: string;
  propertyName: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  lastPerformed: string;
  nextDue: string;
  assignedTeam: string;
  estimatedDuration: number;
  estimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'overdue' | 'in_progress' | 'completed' | 'skipped';
  compliance: boolean;
  checklistItems: {
    item: string;
    completed: boolean;
    notes?: string;
  }[];
  history: {
    date: string;
    performedBy: string;
    duration: number;
    cost: number;
    notes: string;
    issues?: string[];
  }[];
  documents: string[];
  notifications: {
    daysBefore: number;
    sentTo: string[];
    sent: boolean;
  }[];
}

interface Asset {
  _id: string;
  name: string;
  type: string;
  category: string;
  propertyId: string;
  propertyName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installDate: string;
  warrantyExpiry: string;
  lifeExpectancy: number;
  currentCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  maintenanceSchedules: string[];
  totalMaintenanceCost: number;
  lastInspection: string;
  nextInspection: string;
  documents: {
    type: string;
    name: string;
    url: string;
  }[];
  specifications: Record<string, any>;
}

interface MaintenanceStats {
  totalAssets: number;
  scheduledMaintenance: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionTime: number;
  monthlySpend: number;
  ytdSpend: number;
  costSavings: number;
  upcomingThisWeek: number;
  complianceRate: number;
}

export default function PreventivePage() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>({
    totalAssets: 0,
    scheduledMaintenance: 0,
    overdueTasks: 0,
    completionRate: 0,
    avgCompletionTime: 0,
    monthlySpend: 0,
    ytdSpend: 0,
    costSavings: 0,
    upcomingThisWeek: 0,
    complianceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'calendar' | 'list' | 'assets' | 'analytics'>('calendar');
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [schedulesRes, assetsRes, statsRes] = await Promise.all([
        fetch('/api/preventive/schedules', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/preventive/assets', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/preventive/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (schedulesRes.ok && assetsRes.ok && statsRes.ok) {
        const schedulesData = await schedulesRes.json();
        const assetsData = await assetsRes.json();
        const statsData = await statsRes.json();
        
        setSchedules(schedulesData.data || []);
        setAssets(assetsData.data || []);
        setStats(statsData.data || stats);
      }
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (scheduleData: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/preventive/schedules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        await fetchMaintenanceData();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handleCompleteTask = async (scheduleId: string, completionData: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/preventive/schedules/${scheduleId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completionData)
      });

      if (response.ok) {
        await fetchMaintenanceData();
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'skipped': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesFilter = filter === 'all' || schedule.status === filter;
    const matchesSearch = schedule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         schedule.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         schedule.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getCalendarDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const calendarDays = [];
    
    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      calendarDays.push({ date: null, schedules: [] });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const daySchedules = schedules.filter(s => {
        const scheduleDate = new Date(s.nextDue);
        return scheduleDate.getDate() === day &&
               scheduleDate.getMonth() === month &&
               scheduleDate.getFullYear() === year;
      });
      calendarDays.push({ date, schedules: daySchedules });
    }
    
    return calendarDays;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Preventive Maintenance</h1>
          <p className="text-gray-600 mt-1">Schedule and track maintenance activities</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Schedule</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Assets</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAssets}</p>
              <p className="text-sm text-gray-500 mt-2">Tracked items</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scheduled Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.scheduledMaintenance}</p>
              <p className="text-sm text-blue-600 mt-2">{stats.upcomingThisWeek} this week</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Tasks</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.overdueTasks}</p>
              <p className="text-sm text-gray-500 mt-2">Need attention</p>
            </div>
            <div className="bg-red-100 p-3 rounded-xl">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completionRate}%</p>
              <div className="flex items-center mt-2 text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+5% vs last month</span>
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Spend</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${stats.monthlySpend.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-2">-12% vs budget</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-xl">
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {(['calendar', 'list', 'assets', 'analytics'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`py-4 border-b-2 transition-colors capitalize ${
                  activeView === view
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeView === 'calendar' && (
            <div>
              {/* Calendar Controls */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    &larr;
                  </button>
                  <h3 className="text-lg font-semibold">
                    {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    &rarr;
                  </button>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    Scheduled
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    Overdue
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    Completed
                  </span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
                    {day}
                  </div>
                ))}
                {getCalendarDays().map((day, index) => (
                  <div
                    key={index}
                    className={`bg-white p-3 min-h-[100px] ${
                      day.date ? 'hover:bg-gray-50' : ''
                    }`}
                  >
                    {day.date && (
                      <>
                        <div className="text-sm text-gray-900 mb-1">{day.date.getDate()}</div>
                        <div className="space-y-1">
                          {day.schedules.slice(0, 3).map((schedule) => (
                            <div
                              key={schedule._id}
                              onClick={() => setSelectedSchedule(schedule)}
                              className={`text-xs p-1 rounded cursor-pointer truncate ${
                                schedule.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                schedule.status === 'completed' ? 'bg-green-100 text-green-700' :
                                'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {schedule.assetName}
                            </div>
                          ))}
                          {day.schedules.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{day.schedules.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'list' && (
            <>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search maintenance schedules..."
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
                  <option value="scheduled">Scheduled</option>
                  <option value="overdue">Overdue</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Schedule List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600">Loading maintenance schedules...</p>
                  </div>
                ) : filteredSchedules.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No schedules found</p>
                  </div>
                ) : (
                  filteredSchedules.map((schedule) => (
                    <div
                      key={schedule._id}
                      className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedSchedule(schedule)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">{schedule.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                              {schedule.status.toUpperCase()}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(schedule.priority)}`}>
                              {schedule.priority.toUpperCase()}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Asset:</span>
                              <p className="font-medium">{schedule.assetName}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Property:</span>
                              <p className="font-medium">{schedule.propertyName}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Next Due:</span>
                              <p className="font-medium">{new Date(schedule.nextDue).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Team:</span>
                              <p className="font-medium">{schedule.assignedTeam}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {schedule.estimatedDuration}h duration
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              ${schedule.estimatedCost}
                            </span>
                            <span className="flex items-center">
                              <CalendarDays className="h-4 w-4 mr-1" />
                              {schedule.frequency}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteTask(schedule._id, { /* completion data */ });
                          }}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Start Task
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeView === 'assets' && (
            <div className="space-y-4">
              {assets.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No assets registered</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assets.map((asset) => (
                    <div key={asset._id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{asset.type} - {asset.category}</p>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Condition:</span>
                              <span className={`font-medium ${getConditionColor(asset.currentCondition)}`}>
                                {asset.currentCondition.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Warranty:</span>
                              <span className={`font-medium ${
                                new Date(asset.warrantyExpiry) > new Date() ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {new Date(asset.warrantyExpiry).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Total Maintenance:</span>
                              <span className="font-medium">${asset.totalMaintenanceCost.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <button className="text-indigo-600 hover:text-indigo-700">
                          <FileText className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Maintenance analytics coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Create Maintenance Schedule</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateSchedule(Object.fromEntries(formData));
            }}>
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Schedule Name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  name="assetId"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Asset</option>
                  {assets.map(asset => (
                    <option key={asset._id} value={asset._id}>{asset.name}</option>
                  ))}
                </select>
                <select
                  name="frequency"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
                <input
                  type="number"
                  name="estimatedDuration"
                  placeholder="Estimated Duration (hours)"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  name="estimatedCost"
                  placeholder="Estimated Cost ($)"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
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
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}