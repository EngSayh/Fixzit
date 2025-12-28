"use client";

/**
 * Superadmin Vendors Management
 * Cross-tenant vendor management using /api/vendors endpoints
 * 
 * @module app/superadmin/vendors/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Building2, RefreshCw, Search, Eye, Star, Phone, Mail, MapPin, 
  Users, CheckCircle, XCircle, TrendingUp,
} from "@/components/ui/icons";

interface Vendor {
  _id: string;
  name: string;
  type: string;
  contact: {
    primary: { name: string; email: string; phone?: string };
    address?: { city?: string; region?: string };
  };
  status: string;
  rating?: { average: number; count: number };
  orgId?: string;
  createdAt: string;
}

const VENDOR_TYPES = ["SUPPLIER", "CONTRACTOR", "SERVICE_PROVIDER", "CONSULTANT"];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400",
  INACTIVE: "bg-gray-500/20 text-gray-400",
  SUSPENDED: "bg-red-500/20 text-red-400",
  PENDING: "bg-yellow-500/20 text-yellow-400",
};

const TYPE_COLORS: Record<string, string> = {
  SUPPLIER: "bg-blue-500/20 text-blue-400",
  CONTRACTOR: "bg-purple-500/20 text-purple-400",
  SERVICE_PROVIDER: "bg-green-500/20 text-green-400",
  CONSULTANT: "bg-orange-500/20 text-orange-400",
};

export default function SuperadminVendorsPage() {
  const { t } = useI18n();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "20");
      if (searchQuery) params.append("search", searchQuery);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`/api/vendors?${params}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      toast.error("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, typeFilter, statusFilter]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleSearch = () => { setPage(1); fetchVendors(); };
  const handleViewVendor = (vendor: Vendor) => { setSelectedVendor(vendor); setViewDialogOpen(true); };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const stats = { total: vendors.length, active: vendors.filter(v => v.status === "ACTIVE").length, avgRating: vendors.filter(v => v.rating).reduce((sum, v) => sum + (v.rating?.average || 0), 0) / (vendors.filter(v => v.rating).length || 1) };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.vendors") || "Vendor Management"}</h1>
          <p className="text-muted-foreground">Manage suppliers, contractors, and service providers</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchVendors} disabled={loading} className="border-input text-muted-foreground">
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><Building2 className="h-8 w-8 text-blue-400" /><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-muted-foreground text-sm">Total Vendors</p></div></div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold text-foreground">{stats.active}</p><p className="text-muted-foreground text-sm">Active</p></div></div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><Star className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold text-foreground">{stats.avgRating.toFixed(1)}</p><p className="text-muted-foreground text-sm">Avg Rating</p></div></div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-purple-400" /><div><p className="text-2xl font-bold text-foreground">{VENDOR_TYPES.length}</p><p className="text-muted-foreground text-sm">Categories</p></div></div></CardContent></Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]"><Input placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="bg-muted border-input text-foreground" /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[180px] bg-muted border-input text-foreground"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent className="bg-muted border-input"><SelectItem value="all">All Types</SelectItem>{VENDOR_TYPES.map((type) => (<SelectItem key={type} value={type}>{type.replace("_", " ")}</SelectItem>))}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] bg-muted border-input text-foreground"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent className="bg-muted border-input"><SelectItem value="all">All Status</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem></SelectContent></Select>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700"><Search className="h-4 w-4 me-2" />Search</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border"><CardTitle className="text-foreground">Vendors</CardTitle><CardDescription className="text-muted-foreground">All vendors across tenants</CardDescription></CardHeader>
        <CardContent className="p-0">
          {vendors.length === 0 ? (<div className="flex flex-col items-center justify-center py-12"><Building2 className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No vendors found</p></div>) : (
            <Table><TableHeader><TableRow className="border-border"><TableHead className="text-muted-foreground">Vendor</TableHead><TableHead className="text-muted-foreground">Type</TableHead><TableHead className="text-muted-foreground">Contact</TableHead><TableHead className="text-muted-foreground">Location</TableHead><TableHead className="text-muted-foreground">Rating</TableHead><TableHead className="text-muted-foreground">Status</TableHead><TableHead className="text-muted-foreground w-[80px]">View</TableHead></TableRow></TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor._id} className="border-border hover:bg-muted/50">
                    <TableCell><div className="flex flex-col"><span className="text-foreground font-medium">{vendor.name}</span><span className="text-muted-foreground text-sm">{vendor._id.slice(-8)}</span></div></TableCell>
                    <TableCell><Badge variant="outline" className={TYPE_COLORS[vendor.type] || ""}>{vendor.type?.replace("_", " ")}</Badge></TableCell>
                    <TableCell><div className="flex flex-col text-sm"><span className="text-muted-foreground">{vendor.contact?.primary?.name}</span><span className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{vendor.contact?.primary?.email}</span></div></TableCell>
                    <TableCell>{vendor.contact?.address?.city ? (<span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" />{vendor.contact.address.city}</span>) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{vendor.rating ? (<div className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /><span className="text-foreground">{vendor.rating.average.toFixed(1)}</span></div>) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[vendor.status] || ""}>{vendor.status === "ACTIVE" ? <CheckCircle className="h-3 w-3 me-1" /> : vendor.status === "SUSPENDED" ? <XCircle className="h-3 w-3 me-1" /> : null}{vendor.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => handleViewVendor(vendor)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (<div className="flex justify-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-input">Previous</Button><span className="py-2 px-4 text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-input">Next</Button></div>)}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-input max-w-2xl">
          <DialogHeader><DialogTitle className="text-foreground">Vendor Details</DialogTitle></DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Name</p><p className="text-foreground font-medium">{selectedVendor.name}</p></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Type</p><Badge variant="outline" className={TYPE_COLORS[selectedVendor.type] || ""}>{selectedVendor.type}</Badge></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Status</p><Badge variant="outline" className={STATUS_COLORS[selectedVendor.status] || ""}>{selectedVendor.status}</Badge></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Created</p><p className="text-foreground">{formatDate(selectedVendor.createdAt)}</p></div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-muted-foreground text-sm mb-2">Primary Contact</p>
                <div className="space-y-2">
                  <p className="text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{selectedVendor.contact?.primary?.name}</p>
                  <p className="text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selectedVendor.contact?.primary?.email}</p>
                  {selectedVendor.contact?.primary?.phone && <p className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{selectedVendor.contact.primary.phone}</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
