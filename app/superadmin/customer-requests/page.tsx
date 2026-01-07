"use client";

/**
 * Superadmin Customer Requests Dashboard
 * Tenant-scoped customer request tracking with full admin access
 *
 * @module app/superadmin/customer-requests/page
 */

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Search,
  RefreshCw,
  Plus,
  Download,
  AlertTriangle,
  XCircle,
  Link2,
  Building2,
  Phone,
  Mail,
  Globe,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSuperadminSession } from "@/components/superadmin/superadmin-session";
import { TrackerSourceSwitch } from "@/components/superadmin/TrackerSourceSwitch";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerRequest {
  _id: string;
  requestId: string;
  tenantId: string;
  requestType: string;
  title: string;
  details: string;
  severity: string;
  status: string;
  channel: string;
  reporter?: {
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  linkedSystemIssueId?: string;
  tags: string[];
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  new: number;
  triaged: number;
  inProgress: number;
  released: number;
  closed: number;
  featureRequests: number;
  bugReports: number;
  incidents: number;
  questions: number;
  critical: number;
  high: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-blue-500 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-purple-500 text-white",
  triaged: "bg-blue-500 text-white",
  in_progress: "bg-yellow-500 text-black",
  released: "bg-green-500 text-white",
  closed: "bg-muted text-muted-foreground",
};

const TYPE_ICONS: Record<string, typeof MessageSquare> = {
  feature_request: MessageSquare,
  bug_report: AlertTriangle,
  incident: XCircle,
  question: MessageSquare,
};

const CHANNEL_ICONS: Record<string, typeof Globe> = {
  web: Globe,
  whatsapp: Phone,
  email: Mail,
  support_portal: Building2,
  phone: Phone,
  api: Globe,
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function CustomerRequestsPage() {
  const { toast } = useToast();
  const session = useSuperadminSession();
  const isAuthenticated = session?.authenticated ?? false;

  // State
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("");

  // New request form
  const [newRequest, setNewRequest] = useState({
    tenantId: "",
    requestType: "bug_report",
    title: "",
    details: "",
    severity: "medium",
    channel: "web",
  });

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (typeFilter !== "all") params.set("requestType", typeFilter);
      if (channelFilter !== "all") params.set("channel", channelFilter);
      if (tenantFilter) params.set("tenantId", tenantFilter);

      const response = await fetch(`/api/superadmin/customer-requests?${params}`);
      const data = await response.json();

      setRequests(data.requests || []);
      setStats(data.stats || null);
    } catch (error) {
      void error; // Intentional: error logged via toast
      toast({
        title: "Error",
        description: "Failed to load customer requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, severityFilter, typeFilter, channelFilter, tenantFilter, toast]);

  // Load data
  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests();
    }
  }, [isAuthenticated, fetchRequests]);

  // Auto-refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchRequests]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleCreateRequest = async () => {
    if (!newRequest.tenantId || !newRequest.title || !newRequest.details) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/superadmin/customer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create request");
      }

      toast({
        title: "Success",
        description: "Customer request created successfully",
      });

      setCreateDialogOpen(false);
      setNewRequest({
        tenantId: "",
        requestType: "bug_report",
        title: "",
        details: "",
        severity: "medium",
        channel: "web",
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create request",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    const blob = new Blob([JSON.stringify(requests, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-requests-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${requests.length} requests`,
    });
  };

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        request.title.toLowerCase().includes(searchLower) ||
        request.requestId.toLowerCase().includes(searchLower) ||
        request.tenantId.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Loading state
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Verifying access...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Source Switch */}
      <TrackerSourceSwitch activeSource="customer-requests" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Customer Requests
          </h1>
          <p className="text-muted-foreground">
            Track and manage customer feedback, bug reports, and feature requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh customer requests" title="Refresh customer requests">
            <RefreshCw className={`h-4 w-4 me-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} aria-label="Export customer requests to JSON" title="Export customer requests to JSON">
            <Download className="h-4 w-4 me-2" />
            Export
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" aria-label="Add new customer request" title="Add new customer request">
                <Plus className="h-4 w-4 me-2" />
                Add Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Customer Request</DialogTitle>
                <DialogDescription>
                  Log a new customer request, bug report, or feature request
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tenant ID *</Label>
                    <Input
                      value={newRequest.tenantId}
                      onChange={(e) => setNewRequest({ ...newRequest, tenantId: e.target.value })}
                      placeholder="org-123"
                    />
                  </div>
                  <div>
                    <Label>Request Type</Label>
                    <Select
                      value={newRequest.requestType}
                      onValueChange={(v) => setNewRequest({ ...newRequest, requestType: v })}
                      placeholder="Select type..."
                      className="mt-1 w-full bg-muted border-input text-foreground"
                    >
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="bug_report">Bug Report</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    placeholder="Brief description of the request"
                  />
                </div>
                <div>
                  <Label>Details *</Label>
                  <Textarea
                    value={newRequest.details}
                    onChange={(e) => setNewRequest({ ...newRequest, details: e.target.value })}
                    placeholder="Full details of the request..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Severity</Label>
                    <Select
                      value={newRequest.severity}
                      onValueChange={(v) => setNewRequest({ ...newRequest, severity: v })}
                      placeholder="Select severity..."
                      className="mt-1 w-full bg-muted border-input text-foreground"
                    >
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </Select>
                  </div>
                  <div>
                    <Label>Channel</Label>
                    <Select
                      value={newRequest.channel}
                      onValueChange={(v) => setNewRequest({ ...newRequest, channel: v })}
                      placeholder="Select channel..."
                      className="mt-1 w-full bg-muted border-input text-foreground"
                    >
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="support_portal">Support Portal</SelectItem>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} aria-label="Cancel creating request" title="Cancel creating request">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRequest} aria-label="Create customer request" title="Create customer request">Create Request</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-400">New</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{stats.new}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Triaged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.triaged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-400">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-400">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-400">Released</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.released}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter} placeholder="Status" className="w-full sm:w-40 bg-muted border-input text-foreground">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="triaged">Triaged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter} placeholder="Severity" className="w-full sm:w-40 bg-muted border-input text-foreground">
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter} placeholder="Type" className="w-full sm:w-40 bg-muted border-input text-foreground">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="bug_report">Bug Report</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </Select>
              <Select value={channelFilter} onValueChange={setChannelFilter} placeholder="Channel" className="w-full sm:w-40 bg-muted border-input text-foreground">
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="support_portal">Support Portal</SelectItem>
              </Select>
              <Input
                placeholder="Tenant ID..."
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="w-full sm:w-40 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No customer requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Linked Issue</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const TypeIcon = TYPE_ICONS[request.requestType] || MessageSquare;
                  const ChannelIcon = CHANNEL_ICONS[request.channel] || Globe;

                  return (
                    <TableRow key={request._id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{request.requestId}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{request.title}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {request.tenantId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TypeIcon className="h-4 w-4" />
                          <span className="capitalize">{request.requestType.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={SEVERITY_COLORS[request.severity] || "bg-muted text-muted-foreground"}>
                          {request.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[request.status] || "bg-muted text-muted-foreground"}>
                          {request.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ChannelIcon className="h-4 w-4" />
                          <span className="capitalize">{request.channel.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.linkedSystemIssueId ? (
                          <Badge variant="outline" className="font-mono">
                            <Link2 className="h-3 w-3 me-1" />
                            {request.linkedSystemIssueId}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request count */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredRequests.length} of {requests.length} requests
      </div>
    </div>
  );
}
