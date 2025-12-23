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
          <h1 className="text-3xl font-bold text-white mb-2">{t("superadmin.nav.vendors") || "Vendor Management"}</h1>
          <p className="text-slate-400">Manage suppliers, contractors, and service providers</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchVendors} disabled={loading} className="border-slate-700 text-slate-300">
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><Building2 className="h-8 w-8 text-blue-400" /><div><p className="text-2xl font-bold text-white">{stats.total}</p><p className="text-slate-400 text-sm">Total Vendors</p></div></div></CardContent></Card>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold text-white">{stats.active}</p><p className="text-slate-400 text-sm">Active</p></div></div></CardContent></Card>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><Star className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold text-white">{stats.avgRating.toFixed(1)}</p><p className="text-slate-400 text-sm">Avg Rating</p></div></div></CardContent></Card>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-purple-400" /><div><p className="text-2xl font-bold text-white">{VENDOR_TYPES.length}</p><p className="text-slate-400 text-sm">Categories</p></div></div></CardContent></Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]"><Input placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="bg-slate-800 border-slate-700 text-white" /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="all">All Types</SelectItem>{VENDOR_TYPES.map((type) => (<SelectItem key={type} value={type}>{type.replace("_", " ")}</SelectItem>))}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="all">All Status</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem></SelectContent></Select>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700"><Search className="h-4 w-4 me-2" />Search</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800"><CardTitle className="text-white">Vendors</CardTitle><CardDescription className="text-slate-400">All vendors across tenants</CardDescription></CardHeader>
        <CardContent className="p-0">
          {vendors.length === 0 ? (<div className="flex flex-col items-center justify-center py-12"><Building2 className="h-12 w-12 text-slate-600 mb-4" /><p className="text-slate-400">No vendors found</p></div>) : (
            <Table><TableHeader><TableRow className="border-slate-800"><TableHead className="text-slate-400">Vendor</TableHead><TableHead className="text-slate-400">Type</TableHead><TableHead className="text-slate-400">Contact</TableHead><TableHead className="text-slate-400">Location</TableHead><TableHead className="text-slate-400">Rating</TableHead><TableHead className="text-slate-400">Status</TableHead><TableHead className="text-slate-400 w-[80px]">View</TableHead></TableRow></TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor._id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell><div className="flex flex-col"><span className="text-white font-medium">{vendor.name}</span><span className="text-slate-500 text-sm">{vendor._id.slice(-8)}</span></div></TableCell>
                    <TableCell><Badge variant="outline" className={TYPE_COLORS[vendor.type] || ""}>{vendor.type?.replace("_", " ")}</Badge></TableCell>
                    <TableCell><div className="flex flex-col text-sm"><span className="text-slate-300">{vendor.contact?.primary?.name}</span><span className="text-slate-500 flex items-center gap-1"><Mail className="h-3 w-3" />{vendor.contact?.primary?.email}</span></div></TableCell>
                    <TableCell>{vendor.contact?.address?.city ? (<span className="text-slate-300 flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-500" />{vendor.contact.address.city}</span>) : <span className="text-slate-500">—</span>}</TableCell>
                    <TableCell>{vendor.rating ? (<div className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /><span className="text-white">{vendor.rating.average.toFixed(1)}</span></div>) : <span className="text-slate-500">—</span>}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[vendor.status] || ""}>{vendor.status === "ACTIVE" ? <CheckCircle className="h-3 w-3 me-1" /> : vendor.status === "SUSPENDED" ? <XCircle className="h-3 w-3 me-1" /> : null}{vendor.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => handleViewVendor(vendor)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (<div className="flex justify-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-slate-700">Previous</Button><span className="py-2 px-4 text-slate-400">Page {page} of {totalPages}</span><Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-slate-700">Next</Button></div>)}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader><DialogTitle className="text-white">Vendor Details</DialogTitle></DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Name</p><p className="text-white font-medium">{selectedVendor.name}</p></div>
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Type</p><Badge variant="outline" className={TYPE_COLORS[selectedVendor.type] || ""}>{selectedVendor.type}</Badge></div>
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Status</p><Badge variant="outline" className={STATUS_COLORS[selectedVendor.status] || ""}>{selectedVendor.status}</Badge></div>
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Created</p><p className="text-white">{formatDate(selectedVendor.createdAt)}</p></div>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg">
                <p className="text-slate-400 text-sm mb-2">Primary Contact</p>
                <div className="space-y-2">
                  <p className="text-white flex items-center gap-2"><Users className="h-4 w-4 text-slate-500" />{selectedVendor.contact?.primary?.name}</p>
                  <p className="text-slate-300 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" />{selectedVendor.contact?.primary?.email}</p>
                  {selectedVendor.contact?.primary?.phone && <p className="text-slate-300 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" />{selectedVendor.contact.primary.phone}</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
