import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Thermometer,
  Droplets,
  Zap,
  Shield,
  Camera,
  Lock,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Bell,
  Home,
  Building,
  Lightbulb,
  Wind,
  Gauge,
  MapPin,
} from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  batteryLevel?: number;
  lastSeen: Date;
  values?: Record<string, any>;
}

interface EnvironmentalData {
  temperature: { avg: number; min: number; max: number; sensors: any[] };
  humidity: { avg: number; min: number; max: number; sensors: any[] };
  airQuality: { avg: number; status: string; sensors: any[] };
}

interface EnergyData {
  totalConsumption: number;
  totalCost: number;
  devices: Array<{
    deviceId: string;
    location: string;
    consumption: number;
    cost: number;
  }>;
}

interface SecurityStatus {
  armed: boolean;
  breaches: any[];
  openDoors: any[];
  recentAccess: any[];
  cameras: any[];
}

const COLORS = ['#0078D4', '#00BCF2', '#00A859', '#FFB400', '#E74C3C', '#9C27B0'];

export const SmartBuildingDashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null);
  const [energyData, setEnergyData] = useState<EnergyData | null>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('property-1');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedProperty, autoRefresh]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [devicesRes, envRes, energyRes, securityRes] = await Promise.all([
        fetch(`/api/iot/devices?propertyId=${selectedProperty}`),
        fetch(`/api/iot/environmental?propertyId=${selectedProperty}`),
        fetch(`/api/iot/energy?propertyId=${selectedProperty}`),
        fetch(`/api/iot/security?propertyId=${selectedProperty}`)
      ]);

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setDevices(devicesData.devices || []);
      }

      if (envRes.ok) {
        const envData = await envRes.json();
        setEnvironmentalData(envData);
      }

      if (energyRes.ok) {
        const energyData = await energyRes.json();
        setEnergyData(energyData);
      }

      if (securityRes.ok) {
        const securityData = await securityRes.json();
        setSecurityStatus(securityData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'temperature_sensor': return <Thermometer className="h-5 w-5" />;
      case 'humidity_sensor': return <Droplets className="h-5 w-5" />;
      case 'motion_detector': return <Activity className="h-5 w-5" />;
      case 'door_sensor': return <Lock className="h-5 w-5" />;
      case 'smoke_detector': return <AlertTriangle className="h-5 w-5" />;
      case 'energy_meter': return <Zap className="h-5 w-5" />;
      case 'security_camera': return <Camera className="h-5 w-5" />;
      case 'hvac_controller': return <Wind className="h-5 w-5" />;
      case 'lighting_controller': return <Lightbulb className="h-5 w-5" />;
      case 'air_quality_sensor': return <Gauge className="h-5 w-5" />;
      default: return <Home className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBatteryIcon = (level?: number) => {
    if (!level) return null;
    return level < 20 ? 
      <BatteryLow className="h-4 w-4 text-red-500" /> : 
      <Battery className="h-4 w-4 text-green-500" />;
  };

  const formatTemperature = (temp: number) => `${temp.toFixed(1)}°C`;
  const formatHumidity = (humidity: number) => `${humidity.toFixed(1)}%`;
  const formatEnergy = (energy: number) => `${energy.toFixed(2)} kWh`;
  const formatCurrency = (amount: number) => `SAR ${amount.toFixed(2)}`;

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold">{devices.length}</p>
                <p className="text-xs text-muted-foreground">
                  {devices.filter(d => d.status === 'online').length} online
                </p>
              </div>
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Temperature</p>
                <p className="text-2xl font-bold">
                  {environmentalData ? formatTemperature(environmentalData.temperature.avg) : '--'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {environmentalData && `${formatTemperature(environmentalData.temperature.min)} - ${formatTemperature(environmentalData.temperature.max)}`}
                </p>
              </div>
              <Thermometer className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Energy Usage</p>
                <p className="text-2xl font-bold">
                  {energyData ? formatEnergy(energyData.totalConsumption) : '--'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {energyData && formatCurrency(energyData.totalCost)}
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security</p>
                <p className="text-2xl font-bold">
                  {securityStatus?.breaches.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {securityStatus?.armed ? 'Armed' : 'Disarmed'}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Monitoring */}
      {environmentalData && (
        <Card>
          <CardHeader>
            <CardTitle>Environmental Conditions</CardTitle>
            <CardDescription>Real-time environmental monitoring across the property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Temperature</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTemperature(environmentalData.temperature.avg)}
                  </span>
                </div>
                <Progress value={(environmentalData.temperature.avg / 40) * 100} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTemperature(environmentalData.temperature.min)}</span>
                  <span>{formatTemperature(environmentalData.temperature.max)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Humidity</span>
                  <span className="text-sm text-muted-foreground">
                    {formatHumidity(environmentalData.humidity.avg)}
                  </span>
                </div>
                <Progress value={environmentalData.humidity.avg} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatHumidity(environmentalData.humidity.min)}</span>
                  <span>{formatHumidity(environmentalData.humidity.max)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Air Quality</span>
                  <Badge variant={environmentalData.airQuality.status === 'good' ? 'default' : 'destructive'}>
                    {environmentalData.airQuality.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <Progress value={(environmentalData.airQuality.avg / 500) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground text-center">
                  AQI: {environmentalData.airQuality.avg.toFixed(0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle>Device Status</CardTitle>
          <CardDescription>Overview of all connected IoT devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.slice(0, 10).map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getDeviceIcon(device.type)}
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {device.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getBatteryIcon(device.batteryLevel)}
                  {device.batteryLevel && (
                    <span className="text-xs text-muted-foreground">
                      {device.batteryLevel}%
                    </span>
                  )}
                  <Badge className={getStatusColor(device.status)}>
                    {device.status}
                  </Badge>
                  {device.status === 'online' ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const EnergyTab = () => (
    <div className="space-y-6">
      {energyData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Consumption</p>
                    <p className="text-2xl font-bold">{formatEnergy(energyData.totalConsumption)}</p>
                  </div>
                  <Zap className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold">{formatCurrency(energyData.totalCost)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Meters</p>
                    <p className="text-2xl font-bold">{energyData.devices.length}</p>
                  </div>
                  <Gauge className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Energy Consumption by Location</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={energyData.devices}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatEnergy(value as number), 'Consumption']} />
                  <Bar dataKey="consumption" fill="#FFB400" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={energyData.devices.map(device => ({
                      name: device.location,
                      value: device.cost
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                  >
                    {energyData.devices.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      {securityStatus && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Status</p>
                    <p className="text-lg font-bold">
                      {securityStatus.armed ? 'Armed' : 'Disarmed'}
                    </p>
                  </div>
                  <Shield className={`h-8 w-8 ${securityStatus.armed ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open Doors</p>
                    <p className="text-2xl font-bold">{securityStatus.openDoors.length}</p>
                  </div>
                  <Lock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Cameras</p>
                    <p className="text-2xl font-bold">
                      {securityStatus.cameras.filter(c => c.status === 'online').length}
                    </p>
                  </div>
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recent Access</p>
                    <p className="text-2xl font-bold">{securityStatus.recentAccess.length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {securityStatus.breaches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Security Breaches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {securityStatus.breaches.map((breach, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium">Motion detected at {breach.location}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(breach.detectedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Doors</CardTitle>
              </CardHeader>
              <CardContent>
                {securityStatus.openDoors.length === 0 ? (
                  <p className="text-muted-foreground">All doors are secure</p>
                ) : (
                  <div className="space-y-2">
                    {securityStatus.openDoors.map((door, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span>{door.location}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(door.openedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Camera Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {securityStatus.cameras.map((camera, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Camera className="h-4 w-4" />
                        <span>{camera.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {camera.recording && (
                          <Badge variant="default" className="text-xs">Recording</Badge>
                        )}
                        <Badge className={getStatusColor(camera.status)}>
                          {camera.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Smart Building Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and control your IoT devices and building systems
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <span className="text-sm">Auto-refresh</span>
          </div>
          <Button variant="outline" onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium">System Online</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">{devices.filter(d => d.status === 'online').length}</span> / {devices.length} Devices Online
              </div>
              {environmentalData && (
                <div className="text-sm">
                  <span className="font-medium">{formatTemperature(environmentalData.temperature.avg)}</span> Average Temperature
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Home className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="energy">
            <Zap className="mr-2 h-4 w-4" />
            Energy
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Settings className="mr-2 h-4 w-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="energy">
          <EnergyTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Building Automation</CardTitle>
              <CardDescription>
                Manage automated rules and smart building controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Automation Rules</h3>
                <p className="text-muted-foreground mb-4">
                  Configure smart building automation and control rules.
                </p>
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Automation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartBuildingDashboard;