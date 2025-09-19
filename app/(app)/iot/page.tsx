'use client';

import { useState, useEffect } from 'react';
import { Activity, Thermometer, Droplets, Wind, Zap, AlertTriangle, WifiOff, Battery, Gauge, TrendingUp, TrendingDown, Settings, Plus, Search, Filter, Building2, MapPin, Clock, BarChart3, LineChart, AlertCircle, CheckCircle, Radio } from 'lucide-react';

interface SensorReading {
  _id: string;
  sensorId: string;
  sensorName: string;
  type: 'temperature' | 'humidity' | 'pressure' | 'motion' | 'energy' | 'water' | 'air_quality' | 'vibration';
  value: number;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  propertyId: string;
  propertyName: string;
  location: string;
  battery: number;
  signalStrength: number;
  threshold: {
    min: number;
    max: number;
    critical: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  alerts: {
    type: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }[];
}

interface Device {
  _id: string;
  deviceId: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  propertyId: string;
  propertyName: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  installDate: string;
  firmwareVersion: string;
  sensors: string[];
  configuration: Record<string, any>;
  maintenanceSchedule?: string;
  alerts: number;
  batteryLevel?: number;
}

interface IoTStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  totalSensors: number;
  activeAlerts: number;
  criticalAlerts: number;
  avgUptime: number;
  dataPoints24h: number;
  energySavings: number;
  waterSavings: number;
}

interface AutomationRule {
  _id: string;
  name: string;
  description: string;
  trigger: {
    sensorId: string;
    condition: 'above' | 'below' | 'equals' | 'between';
    value: number | [number, number];
  };
  actions: {
    type: 'notification' | 'control' | 'workflow';
    target: string;
    parameters: Record<string, any>;
  }[];
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

export default function IoTPage() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [stats, setStats] = useState<IoTStats>({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    totalSensors: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    avgUptime: 0,
    dataPoints24h: 0,
    energySavings: 0,
    waterSavings: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'devices' | 'sensors' | 'automation' | 'analytics'>('dashboard');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    fetchIoTData();
    // Set up real-time updates
    const interval = setInterval(fetchIoTData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchIoTData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [readingsRes, devicesRes, rulesRes, statsRes] = await Promise.all([
        fetch('/api/iot/readings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/iot/devices', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/iot/automation', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/iot/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (readingsRes.ok && devicesRes.ok && rulesRes.ok && statsRes.ok) {
        const readingsData = await readingsRes.json();
        const devicesData = await devicesRes.json();
        const rulesData = await rulesRes.json();
        const statsData = await statsRes.json();
        
        setReadings(readingsData.data || []);
        setDevices(devicesData.data || []);
        setAutomationRules(rulesData.data || []);
        setStats(statsData.data || stats);
      }
    } catch (error) {
      console.error('Error fetching IoT data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (deviceData: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/iot/devices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deviceData)
      });

      if (response.ok) {
        await fetchIoTData();
        setShowAddDeviceModal(false);
      }
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  const handleAcknowledgeAlert = async (readingId: string, alertIndex: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/iot/readings/${readingId}/alerts/${alertIndex}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchIoTData();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return Thermometer;
      case 'humidity': return Droplets;
      case 'pressure': return Gauge;
      case 'motion': return Activity;
      case 'energy': return Zap;
      case 'water': return Droplets;
      case 'air_quality': return Wind;
      case 'vibration': return Radio;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      case 'offline': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesFilter = filter === 'all' || device.status === filter;
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         device.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         device.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const criticalReadings = readings.filter(r => r.status === 'critical');
  const warningReadings = readings.filter(r => r.status === 'warning');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IoT Management</h1>
          <p className="text-gray-600 mt-1">Monitor and control connected devices</p>
        </div>
        <button
          onClick={() => setShowAddDeviceModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Device</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Devices</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDevices}</p>
              <p className="text-sm text-green-600 mt-2">{stats.onlineDevices} online</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Sensors</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSensors}</p>
              <p className="text-sm text-gray-500 mt-2">{stats.dataPoints24h} readings/24h</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Radio className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.activeAlerts}</p>
              <p className="text-sm text-red-600 mt-2">{stats.criticalAlerts} critical</p>
            </div>
            <div className="bg-red-100 p-3 rounded-xl">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Energy Savings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.energySavings}%</p>
              <div className="flex items-center mt-2 text-green-600">
                <TrendingDown className="h-4 w-4 mr-1" />
                <span className="text-sm">vs baseline</span>
              </div>
            </div>
            <div className="bg-yellow-100 p-3 rounded-xl">
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Uptime</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgUptime}%</p>
              <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {(['dashboard', 'devices', 'sensors', 'automation', 'analytics'] as const).map((view) => (
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
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Critical Alerts */}
              {criticalReadings.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Critical Alerts
                  </h3>
                  <div className="space-y-2">
                    {criticalReadings.slice(0, 3).map((reading) => (
                      <div key={reading._id} className="flex items-center justify-between bg-white rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          {(() => {
                            const Icon = getSensorIcon(reading.type);
                            return <Icon className="h-5 w-5 text-red-600" />;
                          })()}
                          <div>
                            <p className="font-medium text-gray-900">{reading.sensorName}</p>
                            <p className="text-sm text-gray-600">
                              {reading.value} {reading.unit} - {reading.location}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcknowledgeAlert(reading._id, 0)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Acknowledge
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time Sensor Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {readings.slice(0, 9).map((reading) => {
                  const Icon = getSensorIcon(reading.type);
                  return (
                    <div key={reading._id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5 text-gray-600" />
                          <span className="font-medium text-gray-900">{reading.sensorName}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reading.status)}`}>
                          {reading.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-end justify-between">
                          <span className="text-2xl font-bold text-gray-900">
                            {reading.value}
                            <span className="text-sm font-normal text-gray-600 ml-1">{reading.unit}</span>
                          </span>
                          <div className="flex items-center text-sm">
                            {reading.trend === 'increasing' ? (
                              <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                            ) : reading.trend === 'decreasing' ? (
                              <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <span className="h-4 w-4 text-gray-400 mr-1">−</span>
                            )}
                            <span className={reading.trend === 'stable' ? 'text-gray-600' : reading.trend === 'increasing' ? 'text-red-600' : 'text-green-600'}>
                              {reading.trendPercentage}%
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          <MapPin className="inline h-3 w-3 mr-1" />
                          {reading.location}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            <Battery className="inline h-3 w-3 mr-1" />
                            {reading.battery}%
                          </span>
                          <span>
                            <Clock className="inline h-3 w-3 mr-1" />
                            {new Date(reading.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'devices' && (
            <>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search devices..."
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
                  <option value="all">All Devices</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              {/* Devices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  <div className="col-span-2 text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600">Loading devices...</p>
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="col-span-2 text-center py-12">
                    <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No devices found</p>
                  </div>
                ) : (
                  filteredDevices.map((device) => (
                    <div
                      key={device._id}
                      className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedDevice(device)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{device.name}</h3>
                          <p className="text-sm text-gray-600">{device.type} - {device.model}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          device.status === 'online' ? 'bg-green-50 text-green-600' :
                          device.status === 'offline' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {device.status.toUpperCase()}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium">{device.location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Property:</span>
                          <span className="font-medium">{device.propertyName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Sensors:</span>
                          <span className="font-medium">{device.sensors.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Last Seen:</span>
                          <span className="font-medium">{new Date(device.lastSeen).toLocaleString()}</span>
                        </div>
                        {device.batteryLevel !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Battery:</span>
                            <span className={`font-medium ${
                              device.batteryLevel > 50 ? 'text-green-600' :
                              device.batteryLevel > 20 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {device.batteryLevel}%
                            </span>
                          </div>
                        )}
                      </div>
                      {device.alerts > 0 && (
                        <div className="mt-3 flex items-center text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {device.alerts} active alerts
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeView === 'sensors' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Sensor Readings</h3>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4">Sensor</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Current Value</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Location</th>
                      <th className="text-left py-3 px-4">Last Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((reading) => (
                      <tr key={reading._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{reading.sensorName}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {(() => {
                              const Icon = getSensorIcon(reading.type);
                              return <Icon className="h-4 w-4 mr-2 text-gray-600" />;
                            })()}
                            {reading.type}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {reading.value} {reading.unit}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reading.status)}`}>
                            {reading.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">{reading.location}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(reading.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'automation' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Automation Rules</h3>
                <button className="text-indigo-600 hover:text-indigo-700 flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>New Rule</span>
                </button>
              </div>

              {automationRules.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No automation rules configured</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {automationRules.map((rule) => (
                    <div key={rule._id} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Triggered {rule.triggerCount} times</span>
                            {rule.lastTriggered && (
                              <span>Last: {new Date(rule.lastTriggered).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            className="sr-only peer"
                            onChange={() => {}}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
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
              <p className="text-gray-600">IoT analytics dashboard coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Add IoT Device</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddDevice(Object.fromEntries(formData));
            }}>
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Device Name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  name="deviceId"
                  placeholder="Device ID"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  name="type"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Device Type</option>
                  <option value="sensor">Sensor</option>
                  <option value="controller">Controller</option>
                  <option value="gateway">Gateway</option>
                  <option value="actuator">Actuator</option>
                </select>
                <input
                  type="text"
                  name="manufacturer"
                  placeholder="Manufacturer"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  name="model"
                  placeholder="Model"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  name="location"
                  placeholder="Installation Location"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}