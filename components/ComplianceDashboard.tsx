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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  Search,
  Filter,
  Calendar as CalendarIcon,
  User,
  Lock,
  Fingerprint,
  Award,
  BookOpen,
  Settings,
  RefreshCw,
  FileSignature,
  Gavel,
  Scale,
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: string;
  action: string;
  userId: string;
  userName: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  metadata: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ComplianceMetrics {
  auditTrail: {
    totalEntries: number;
    lastMonth: number;
    integrityScore: number;
  };
  dataProtection: {
    gdprCompliance: number;
    dataRetention: number;
    encryptionStatus: number;
  };
  accessControl: {
    rbacCompliance: number;
    passwordPolicy: number;
    mfaAdoption: number;
  };
  documents: {
    totalSigned: number;
    pendingSigning: number;
    verificationScore: number;
  };
}

export const ComplianceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  useEffect(() => {
    loadComplianceData();
  }, []);

  useEffect(() => {
    loadAuditEntries();
  }, [searchTerm, selectedEventType, selectedSeverity, dateRange]);

  const loadComplianceData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/compliance/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedEventType !== 'all') params.append('eventType', selectedEventType);
      if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);
      if (dateRange.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange.to) params.append('endDate', dateRange.to.toISOString());

      const response = await fetch(`/api/audit/trail?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to load audit entries:', error);
    }
  };

  const generateComplianceReport = async (type: string) => {
    try {
      const response = await fetch('/api/compliance/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          dateRange,
          format: 'pdf'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance_report_${type}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'user_action': return <User className="h-4 w-4" />;
      case 'data_change': return <FileText className="h-4 w-4" />;
      case 'security_event': return <Shield className="h-4 w-4" />;
      case 'system_event': return <Settings className="h-4 w-4" />;
      case 'compliance_event': return <Award className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const ComplianceOverview = () => {
    if (!metrics) return <div>Loading...</div>;

    return (
      <div className="space-y-6">
        {/* Compliance Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Audit Trail</p>
                  <p className="text-2xl font-bold">{metrics.auditTrail.integrityScore}%</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.auditTrail.totalEntries.toLocaleString()} entries
                  </p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <Progress value={metrics.auditTrail.integrityScore} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Protection</p>
                  <p className="text-2xl font-bold">{metrics.dataProtection.gdprCompliance}%</p>
                  <p className="text-xs text-muted-foreground">
                    GDPR Compliance
                  </p>
                </div>
                <Lock className="h-8 w-8 text-green-600" />
              </div>
              <Progress value={metrics.dataProtection.gdprCompliance} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Access Control</p>
                  <p className="text-2xl font-bold">{metrics.accessControl.rbacCompliance}%</p>
                  <p className="text-xs text-muted-foreground">
                    RBAC Implementation
                  </p>
                </div>
                <Fingerprint className="h-8 w-8 text-purple-600" />
              </div>
              <Progress value={metrics.accessControl.rbacCompliance} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Digital Signatures</p>
                  <p className="text-2xl font-bold">{metrics.documents.verificationScore}%</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.documents.totalSigned} signed
                  </p>
                </div>
                <FileSignature className="h-8 w-8 text-orange-600" />
              </div>
              <Progress value={metrics.documents.verificationScore} className="mt-3" />
            </CardContent>
          </Card>
        </div>

        {/* Compliance Standards */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Standards</CardTitle>
            <CardDescription>
              Current compliance status across different standards and regulations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ISO 27001</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
                <Progress value={95} className="h-2" />
                <p className="text-xs text-muted-foreground">Information Security Management</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">GDPR</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
                <Progress value={92} className="h-2" />
                <p className="text-xs text-muted-foreground">Data Protection Regulation</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SOX</span>
                  <Badge variant="secondary">In Progress</Badge>
                </div>
                <Progress value={78} className="h-2" />
                <p className="text-xs text-muted-foreground">Sarbanes-Oxley Act</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ZATCA</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
                <Progress value={100} className="h-2" />
                <p className="text-xs text-muted-foreground">Saudi Tax Authority</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">PCI DSS</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
                <Progress value={88} className="h-2" />
                <p className="text-xs text-muted-foreground">Payment Card Industry</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">NIST</span>
                  <Badge variant="secondary">In Progress</Badge>
                </div>
                <Progress value={82} className="h-2" />
                <p className="text-xs text-muted-foreground">Cybersecurity Framework</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Compliance Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Compliance Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  type: 'Document Signed',
                  description: 'Service Agreement #SA-2025-0123 digitally signed',
                  timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                  severity: 'low',
                  icon: <FileSignature className="h-4 w-4" />
                },
                {
                  type: 'Audit Log Review',
                  description: 'Monthly audit log review completed',
                  timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
                  severity: 'medium',
                  icon: <BookOpen className="h-4 w-4" />
                },
                {
                  type: 'Data Retention',
                  description: 'Automated data retention policy executed',
                  timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
                  severity: 'low',
                  icon: <Clock className="h-4 w-4" />
                },
                {
                  type: 'Security Scan',
                  description: 'Quarterly security vulnerability scan completed',
                  timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  severity: 'high',
                  icon: <Shield className="h-4 w-4" />
                },
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.type}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityColor(activity.severity)}>
                      {activity.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(activity.timestamp, 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const AuditTrailTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search audit entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="user_action">User Actions</SelectItem>
                <SelectItem value="data_change">Data Changes</SelectItem>
                <SelectItem value="security_event">Security Events</SelectItem>
                <SelectItem value="system_event">System Events</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd")} -{" "}
                        {format(dateRange.to, "LLL dd")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button onClick={loadAuditEntries}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Comprehensive log of all system activities and changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {format(new Date(entry.timestamp), 'MMM dd, HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getEventTypeIcon(entry.eventType)}
                      <span className="text-sm">{entry.eventType.replace('_', ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{entry.action}</TableCell>
                  <TableCell className="text-sm">{entry.userName || entry.userId}</TableCell>
                  <TableCell className="text-sm">
                    {entry.resource}
                    {entry.resourceId && (
                      <span className="text-muted-foreground">#{entry.resourceId}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(entry.severity)}>
                      {entry.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{entry.ipAddress}</TableCell>
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

  const DigitalSignaturesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Signed</p>
                <p className="text-2xl font-bold">{metrics?.documents.totalSigned || 0}</p>
              </div>
              <FileSignature className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Signing</p>
                <p className="text-2xl font-bold">{metrics?.documents.pendingSigning || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verification Score</p>
                <p className="text-2xl font-bold">{metrics?.documents.verificationScore || 0}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signature Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Digital Signature Management</h3>
            <p className="text-muted-foreground mb-4">
              Manage digital signatures and document signing workflows.
            </p>
            <Button>
              <FileSignature className="mr-2 h-4 w-4" />
              Create Signature Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ReportsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance Reports</CardTitle>
          <CardDescription>
            Generate comprehensive compliance and audit reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Audit Trail Report',
                description: 'Complete audit trail with integrity verification',
                icon: <BookOpen className="h-6 w-6" />,
                type: 'audit_trail'
              },
              {
                title: 'Data Protection Report',
                description: 'GDPR compliance and data handling report',
                icon: <Lock className="h-6 w-6" />,
                type: 'data_protection'
              },
              {
                title: 'Access Control Report',
                description: 'User access patterns and security analysis',
                icon: <Fingerprint className="h-6 w-6" />,
                type: 'access_control'
              },
              {
                title: 'Digital Signatures Report',
                description: 'Document signing activity and verification',
                icon: <FileSignature className="h-6 w-6" />,
                type: 'digital_signatures'
              },
              {
                title: 'Regulatory Compliance',
                description: 'Multi-standard compliance status report',
                icon: <Scale className="h-6 w-6" />,
                type: 'regulatory'
              },
              {
                title: 'Security Incidents',
                description: 'Security events and incident analysis',
                icon: <Shield className="h-6 w-6" />,
                type: 'security_incidents'
              },
            ].map((report, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {report.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{report.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                      <Button 
                        size="sm" 
                        onClick={() => generateComplianceReport(report.type)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Generate
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

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading compliance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor compliance status, audit trails, and digital signatures
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadComplianceData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Award className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="audit">
            <BookOpen className="mr-2 h-4 w-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="signatures">
            <FileSignature className="mr-2 h-4 w-4" />
            Digital Signatures
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ComplianceOverview />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTrailTab />
        </TabsContent>

        <TabsContent value="signatures">
          <DigitalSignaturesTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceDashboard;