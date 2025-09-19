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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  Users,
  FileText,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  User,
  Switch,
  Eye,
  EyeOff,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  PieChart as PieChartIcon,
  BarChart3,
  FileSpreadsheet,
  Receipt,
  Banknote,
  Home,
  Wrench,
  UserCheck,
  Shield,
} from 'lucide-react';

interface OwnerDashboardProps {
  ownerId: string;
  organizationId: string;
}

interface PropertySummary {
  id: string;
  name: string;
  address: string;
  units: number;
  occupiedUnits: number;
  monthlyRevenue: number;
  expenses: number;
  netIncome: number;
  managementAgent: {
    id: string;
    name: string;
    email: string;
    phone: string;
    performanceScore: number;
  };
}

interface FinancialStatement {
  propertyId: string;
  propertyName: string;
  period: string;
  income: {
    rent: number;
    fees: number;
    other: number;
    total: number;
  };
  expenses: {
    maintenance: number;
    utilities: number;
    management: number;
    other: number;
    total: number;
  };
  netIncome: number;
  collections: {
    collected: number;
    outstanding: number;
    rate: number;
  };
}

interface PendingApproval {
  id: string;
  type: 'expense' | 'contract' | 'major_maintenance' | 'lease_agreement';
  title: string;
  description: string;
  amount: number;
  currency: string;
  requestedBy: string;
  requestedAt: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  property: string;
  documents: string[];
}

const COLORS = ['#0078D4', '#00BCF2', '#00A859', '#FFB400', '#E74C3C', '#9C27B0'];

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ ownerId, organizationId }) => {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [financialStatements, setFinancialStatements] = useState<FinancialStatement[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');
  const [isLoading, setIsLoading] = useState(true);
  const [showSwitchAgentDialog, setShowSwitchAgentDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [availableAgents, setAvailableAgents] = useState([]);

  useEffect(() => {
    loadOwnerDashboardData();
  }, [ownerId, selectedProperty, selectedPeriod]);

  const loadOwnerDashboardData = async () => {
    setIsLoading(true);
    try {
      const [propertiesRes, statementsRes, approvalsRes] = await Promise.all([
        fetch(`/api/owner/${ownerId}/properties`),
        fetch(`/api/owner/${ownerId}/statements?period=${selectedPeriod}&property=${selectedProperty}`),
        fetch(`/api/owner/${ownerId}/approvals/pending`)
      ]);

      if (propertiesRes.ok) {
        const propertiesData = await propertiesRes.json();
        setProperties(propertiesData.properties || []);
      }

      if (statementsRes.ok) {
        const statementsData = await statementsRes.json();
        setFinancialStatements(statementsData.statements || []);
      }

      if (approvalsRes.ok) {
        const approvalsData = await approvalsRes.json();
        setPendingApprovals(approvalsData.approvals || []);
      }
    } catch (error) {
      console.error('Failed to load owner dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (approvalId: string, decision: 'approve' | 'reject', comments?: string) => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision, comments }),
      });

      if (response.ok) {
        // Remove from pending approvals
        setPendingApprovals(prev => prev.filter(approval => approval.id !== approvalId));
        
        // Show success message
        console.log(`Approval ${decision}d successfully`);
      }
    } catch (error) {
      console.error('Failed to process approval:', error);
    }
  };

  const handleSwitchAgent = async (propertyId: string, newAgentId: string, transferDate: Date) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/switch-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newAgentId,
          transferDate: transferDate.toISOString(),
          preserveHistory: true,
          notifyStakeholders: true
        }),
      });

      if (response.ok) {
        // Refresh property data
        await loadOwnerDashboardData();
        setShowSwitchAgentDialog(false);
        
        console.log('Management agent switched successfully');
      }
    } catch (error) {
      console.error('Failed to switch management agent:', error);
    }
  };

  const exportStatement = async (format: 'excel' | 'pdf', propertyId?: string) => {
    try {
      const params = new URLSearchParams({
        format,
        period: selectedPeriod,
        ...(propertyId && { propertyId })
      });

      const response = await fetch(`/api/owner/${ownerId}/statements/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial_statement_${selectedPeriod}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export statement:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate portfolio totals
  const portfolioTotals = properties.reduce((totals, property) => ({
    totalRevenue: totals.totalRevenue + property.monthlyRevenue,
    totalExpenses: totals.totalExpenses + property.expenses,
    totalUnits: totals.totalUnits + property.units,
    occupiedUnits: totals.occupiedUnits + property.occupiedUnits,
  }), { totalRevenue: 0, totalExpenses: 0, totalUnits: 0, occupiedUnits: 0 });

  const portfolioNetIncome = portfolioTotals.totalRevenue - portfolioTotals.totalExpenses;
  const portfolioOccupancyRate = portfolioTotals.totalUnits > 0 ? 
    (portfolioTotals.occupiedUnits / portfolioTotals.totalUnits) * 100 : 0;

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Portfolio KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(portfolioTotals.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Monthly</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income</p>
                <p className="text-2xl font-bold">{formatCurrency(portfolioNetIncome)}</p>
                <p className="text-xs text-muted-foreground">After expenses</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold">{portfolioOccupancyRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {portfolioTotals.occupiedUnits}/{portfolioTotals.totalUnits} units
                </p>
              </div>
              <Building className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Properties</p>
                <p className="text-2xl font-bold">{properties.length}</p>
                <p className="text-xs text-muted-foreground">In portfolio</p>
              </div>
              <Home className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pending Approvals ({pendingApprovals.length})</AlertTitle>
          <AlertDescription>
            You have {pendingApprovals.length} items requiring your approval.
            <Button variant="link" className="p-0 h-auto ml-2">
              Review Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Property Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Property Performance</CardTitle>
          <CardDescription>Performance overview of your property portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {properties.map((property) => (
              <div key={property.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{property.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {property.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(property.netIncome)}</p>
                    <p className="text-sm text-muted-foreground">Net Income</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Occupancy</p>
                    <p className="font-semibold">
                      {property.occupiedUnits}/{property.units}
                    </p>
                    <Progress 
                      value={(property.occupiedUnits / property.units) * 100} 
                      className="mt-1 h-2" 
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="font-semibold">{formatCurrency(property.monthlyRevenue)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Expenses</p>
                    <p className="font-semibold">{formatCurrency(property.expenses)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className="font-semibold">
                      {((property.netIncome / property.monthlyRevenue) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Management Agent Info */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">{property.managementAgent.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {property.managementAgent.phone}
                        <Mail className="h-3 w-3 ml-2 mr-1" />
                        {property.managementAgent.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Performance</p>
                      <p className={`font-semibold ${getPerformanceColor(property.managementAgent.performanceScore)}`}>
                        {property.managementAgent.performanceScore}%
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Switch className="h-4 w-4 mr-1" />
                          Switch Agent
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Switch Management Agent</DialogTitle>
                          <DialogDescription>
                            Transfer property management while preserving all historical data
                          </DialogDescription>
                        </DialogHeader>
                        <SwitchAgentForm 
                          propertyId={property.id}
                          currentAgent={property.managementAgent}
                          onSwitch={handleSwitchAgent}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={financialStatements}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Area type="monotone" dataKey="income.total" stroke="#00BCF2" fill="#00BCF2" fillOpacity={0.3} />
              <Area type="monotone" dataKey="expenses.total" stroke="#E74C3C" fill="#E74C3C" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const ApprovalsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals ({pendingApprovals.length})</CardTitle>
          <CardDescription>
            Items requiring your review and approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingApprovals.map((approval) => (
              <Card key={approval.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getPriorityColor(approval.priority)}>
                          {approval.priority}
                        </Badge>
                        <Badge variant="outline">{approval.type.replace('_', ' ')}</Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{approval.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{approval.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatCurrency(approval.amount)}
                        </span>
                        <span className="flex items-center">
                          <Building className="h-3 w-3 mr-1" />
                          {approval.property}
                        </span>
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {approval.requestedBy}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(approval.requestedAt, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproval(approval.id, 'reject')}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproval(approval.id, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                  
                  {approval.documents.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {approval.documents.map((doc, index) => (
                          <Button key={index} variant="outline" size="sm">
                            <FileText className="h-3 w-3 mr-1" />
                            {doc}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {pendingApprovals.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending approvals at this time.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const StatementsTab = () => (
    <div className="space-y-6">
      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Statements</CardTitle>
          <CardDescription>
            Download detailed financial statements for your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => exportStatement('excel')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>

            <Button variant="outline" onClick={() => exportStatement('pdf')}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* Financial Summary Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net Income</TableHead>
                <TableHead>Collection Rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialStatements.map((statement) => (
                <TableRow key={statement.propertyId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{statement.propertyName}</p>
                      <p className="text-sm text-muted-foreground">{statement.period}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(statement.income.total)}</TableCell>
                  <TableCell>{formatCurrency(statement.expenses.total)}</TableCell>
                  <TableCell>
                    <span className={statement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(statement.netIncome)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress value={statement.collections.rate} className="w-16 h-2" />
                      <span className="text-sm">{statement.collections.rate.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const ManagementTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property Management</CardTitle>
          <CardDescription>
            Manage your property management agents and service providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {properties.map((property) => (
              <Card key={property.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">{property.name}</h3>
                        <p className="text-sm text-muted-foreground">{property.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{property.managementAgent.name}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Performance:</span>
                          <span className={`font-semibold ${getPerformanceColor(property.managementAgent.performanceScore)}`}>
                            {property.managementAgent.performanceScore}%
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Switch className="h-4 w-4 mr-1" />
                        Switch Agent
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Switch Agent Form Component
  const SwitchAgentForm: React.FC<{
    propertyId: string;
    currentAgent: any;
    onSwitch: (propertyId: string, newAgentId: string, transferDate: Date) => void;
  }> = ({ propertyId, currentAgent, onSwitch }) => {
    const [newAgentId, setNewAgentId] = useState('');
    const [transferDate, setTransferDate] = useState(new Date());
    const [preserveHistory, setPreserveHistory] = useState(true);

    return (
      <div className="space-y-4">
        <div>
          <Label>Current Agent</Label>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">{currentAgent.name}</p>
            <p className="text-sm text-muted-foreground">{currentAgent.email}</p>
            <p className="text-sm">Performance: {currentAgent.performanceScore}%</p>
          </div>
        </div>

        <div>
          <Label>New Management Agent</Label>
          <Select value={newAgentId} onValueChange={setNewAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select new agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent-1">Premium Property Management</SelectItem>
              <SelectItem value="agent-2">Elite Facility Services</SelectItem>
              <SelectItem value="agent-3">Saudi Property Solutions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Transfer Date</Label>
          <Input
            type="date"
            value={transferDate.toISOString().split('T')[0]}
            onChange={(e) => setTransferDate(new Date(e.target.value))}
          />
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Transfer Process</AlertTitle>
          <AlertDescription>
            All historical data, tenant relationships, and financial records will be preserved.
            The new agent will receive a complete handover package.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setShowSwitchAgentDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSwitch(propertyId, newAgentId, transferDate)}
            disabled={!newAgentId}
          >
            Confirm Transfer
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading owner dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Owner Dashboard</h2>
          <p className="text-muted-foreground">
            Investment overview and property management control
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadOwnerDashboardData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Portfolio
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <PieChartIcon className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approvals ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="statements">
            <Receipt className="mr-2 h-4 w-4" />
            Statements
          </TabsTrigger>
          <TabsTrigger value="management">
            <UserCheck className="mr-2 h-4 w-4" />
            Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsTab />
        </TabsContent>

        <TabsContent value="statements">
          <StatementsTab />
        </TabsContent>

        <TabsContent value="management">
          <ManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerDashboard;