"use client";

/**
 * Superadmin Support Tools
 * User impersonation, session debugging, and support utilities
 * Uses /api/superadmin/impersonate/* endpoints
 * 
 * @module app/superadmin/support/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Users, Search, Shield, AlertTriangle, RefreshCw,
  LogIn, Mail, Phone, Building2,
  CheckCircle, XCircle, Ticket, History,
} from "@/components/ui/icons";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  orgId?: string;
  orgName?: string;
  lastLogin?: string;
  status: string;
  createdAt: string;
}

interface ImpersonationSession {
  _id: string;
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  reason: string;
  startedAt: string;
  endedAt?: string;
  ipAddress?: string;
}

interface SupportTicket {
  _id: string;
  subject: string;
  userId: string;
  userEmail: string;
  status: string;
  priority: string;
  createdAt: string;
  lastUpdate: string;
}

export default function SuperadminSupportPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<ImpersonationSession[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
  const [impersonationReason, setImpersonationReason] = useState("");
  const [isImpersonating, setIsImpersonating] = useState(false);

  const fetchUsers = useCallback(async (query?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      params.append("limit", "50");
      const response = await fetch(`/api/superadmin/users?${params}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/superadmin/impersonate/sessions", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Sessions endpoint may not exist
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/support-tickets?status=open", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch {
      // Tickets endpoint may not exist
    }
  }, []);

  useEffect(() => { 
    fetchUsers(); 
    fetchSessions();
    fetchTickets();
  }, [fetchUsers, fetchSessions, fetchTickets]);

  const handleSearch = () => {
    fetchUsers(searchQuery);
  };

  const handleImpersonate = async () => {
    if (!selectedUser || !impersonationReason.trim()) {
      toast.error("Please provide a reason for impersonation");
      return;
    }
    
    try {
      setIsImpersonating(true);
      const response = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: selectedUser._id,
          reason: impersonationReason,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Impersonation failed");
      }
      
      toast.success(`Now impersonating ${selectedUser.email}`);
      // Redirect to dashboard as impersonated user
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impersonation failed");
    } finally {
      setIsImpersonating(false);
      setImpersonateDialogOpen(false);
      setImpersonationReason("");
    }
  };

  const _handleEndImpersonation = async () => {
    try {
      const response = await fetch("/api/superadmin/impersonate/end", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to end impersonation");
      toast.success("Impersonation ended");
      window.location.href = "/superadmin";
    } catch {
      toast.error("Failed to end impersonation");
    }
  };

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "bg-red-500/20 text-red-400",
    ADMIN: "bg-orange-500/20 text-orange-400",
    MANAGER: "bg-blue-500/20 text-blue-400",
    USER: "bg-green-500/20 text-green-400",
    GUEST: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("superadmin.nav.support") || "Support Tools"}</h1>
          <p className="text-slate-400">User impersonation, session debugging, and support utilities</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchUsers(); fetchSessions(); fetchTickets(); }} disabled={loading} className="border-slate-700 text-slate-300">
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Warning Banner */}
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-4 flex items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-200 font-medium">Audit Notice</p>
            <p className="text-yellow-300/80 text-sm">All impersonation actions are logged and audited. Only use for legitimate support purposes.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="users" className="data-[state=active]:bg-slate-700"><Users className="h-4 w-4 me-2" />User Lookup</TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-700"><History className="h-4 w-4 me-2" />Session History</TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-slate-700"><Ticket className="h-4 w-4 me-2" />Open Tickets</TabsTrigger>
        </TabsList>

        {/* User Lookup Tab */}
        <TabsContent value="users">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-white">User Search</CardTitle>
              <CardDescription className="text-slate-400">Find users by email, name, or phone</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search by email, name, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                  <Search className="h-4 w-4 me-2" />Search
                </Button>
              </div>
              
              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">User</TableHead>
                      <TableHead className="text-slate-400">Role</TableHead>
                      <TableHead className="text-slate-400">Organization</TableHead>
                      <TableHead className="text-slate-400">Last Login</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400 w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{user.name}</span>
                            <span className="text-slate-400 text-sm flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
                            {user.phone && <span className="text-slate-500 text-sm flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleColors[user.role] || "bg-slate-500/20 text-slate-400"}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.orgName ? (
                            <span className="flex items-center gap-1 text-slate-300"><Building2 className="h-4 w-4 text-slate-500" />{user.orgName}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300">{user.lastLogin ? formatDate(user.lastLogin) : "Never"}</TableCell>
                        <TableCell>
                          {user.status === "active" ? (
                            <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 me-1" />Active</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 me-1" />{user.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedUser(user); setImpersonateDialogOpen(true); }}
                              className="border-slate-700"
                              disabled={user.role === "SUPER_ADMIN"}
                              title={user.role === "SUPER_ADMIN" ? "Cannot impersonate Super Admin" : "Impersonate User"}
                            >
                              <LogIn className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session History Tab */}
        <TabsContent value="sessions">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-white"><Shield className="h-5 w-5" />Impersonation History</CardTitle>
              <CardDescription className="text-slate-400">Audit log of all impersonation sessions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No impersonation sessions recorded</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Admin</TableHead>
                      <TableHead className="text-slate-400">Target User</TableHead>
                      <TableHead className="text-slate-400">Reason</TableHead>
                      <TableHead className="text-slate-400">Started</TableHead>
                      <TableHead className="text-slate-400">Ended</TableHead>
                      <TableHead className="text-slate-400">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session._id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="text-white">{session.adminEmail}</TableCell>
                        <TableCell className="text-slate-300">{session.targetUserEmail}</TableCell>
                        <TableCell className="text-slate-400 max-w-[200px] truncate">{session.reason}</TableCell>
                        <TableCell className="text-slate-300">{formatDate(session.startedAt)}</TableCell>
                        <TableCell>{session.endedAt ? <span className="text-green-400">{formatDate(session.endedAt)}</span> : <Badge className="bg-yellow-500/20 text-yellow-400">Active</Badge>}</TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">{session.ipAddress || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 text-white"><Ticket className="h-5 w-5" />Open Support Tickets</CardTitle>
              <CardDescription className="text-slate-400">Tickets requiring attention</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-slate-400">No open support tickets</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Subject</TableHead>
                      <TableHead className="text-slate-400">User</TableHead>
                      <TableHead className="text-slate-400">Priority</TableHead>
                      <TableHead className="text-slate-400">Created</TableHead>
                      <TableHead className="text-slate-400">Last Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket._id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="text-white font-medium">{ticket.subject}</TableCell>
                        <TableCell className="text-slate-300">{ticket.userEmail}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ticket.priority === "high" ? "bg-red-500/20 text-red-400" : ticket.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">{formatDate(ticket.createdAt)}</TableCell>
                        <TableCell className="text-slate-300">{formatDate(ticket.lastUpdate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Impersonation Dialog */}
      <Dialog open={impersonateDialogOpen} onOpenChange={setImpersonateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              Impersonate User
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <p className="text-white font-medium">{selectedUser.name}</p>
                <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                <Badge variant="outline" className={`mt-2 ${roleColors[selectedUser.role] || ""}`}>{selectedUser.role}</Badge>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-200 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  This action will be logged in the audit trail
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-slate-300">Reason for Impersonation *</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Customer reported billing issue..."
                  value={impersonationReason}
                  onChange={(e) => setImpersonationReason(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateDialogOpen(false)} className="border-slate-700">Cancel</Button>
            <Button onClick={handleImpersonate} disabled={isImpersonating || !impersonationReason.trim()} className="bg-yellow-600 hover:bg-yellow-700 text-black">
              {isImpersonating ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : <LogIn className="h-4 w-4 me-2" />}
              Start Impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
