"use client";

/**
 * Superadmin Marketplace Catalog Management
 * Product catalog for Fixzit Souq using marketplace APIs
 * 
 * @module app/superadmin/catalog/page
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
import { 
  Package, RefreshCw, Search, Eye, DollarSign,
  CheckCircle, XCircle, AlertTriangle,
} from "@/components/ui/icons";

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  price: { amount: number; currency: string };
  status: string;
  inventory: { quantity: number; reserved: number };
  vendorId?: string;
  vendorName?: string;
  createdAt: string;
}

const CATEGORIES = ["SPARE_PARTS", "TOOLS", "EQUIPMENT", "CONSUMABLES", "SAFETY", "ELECTRICAL", "PLUMBING"];
const STATUS_COLORS: Record<string, string> = { ACTIVE: "bg-green-500/20 text-green-400", INACTIVE: "bg-gray-500/20 text-gray-400", OUT_OF_STOCK: "bg-red-500/20 text-red-400", PENDING: "bg-yellow-500/20 text-yellow-400" };

export default function SuperadminCatalogPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "20");
      if (searchQuery) params.append("search", searchQuery);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`/api/souq/products?${params}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      // Products may not exist yet
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSearch = () => { setPage(1); fetchProducts(); };
  const handleViewProduct = (product: Product) => { setSelectedProduct(product); setViewDialogOpen(true); };
  const formatCurrency = (amount: number, currency = "SAR") => new Intl.NumberFormat("en-SA", { style: "currency", currency }).format(amount);

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === "ACTIVE").length,
    lowStock: products.filter(p => (p.inventory?.quantity || 0) < 10).length,
    totalValue: products.reduce((sum, p) => sum + (p.price?.amount || 0) * (p.inventory?.quantity || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("superadmin.nav.catalog") || "Product Catalog"}</h1>
          <p className="text-slate-400">Manage Fixzit Souq marketplace products</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading} className="border-slate-700 text-slate-300">
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><Package className="h-8 w-8 text-blue-400" /><div><p className="text-2xl font-bold text-white">{stats.total}</p><p className="text-slate-400 text-sm">Total Products</p></div></div></CardContent></Card>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold text-white">{stats.active}</p><p className="text-slate-400 text-sm">Active</p></div></div></CardContent></Card>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold text-white">{stats.lowStock}</p><p className="text-slate-400 text-sm">Low Stock</p></div></div></CardContent></Card>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold text-white">{formatCurrency(stats.totalValue)}</p><p className="text-slate-400 text-sm">Inventory Value</p></div></div></CardContent></Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]"><Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="bg-slate-800 border-slate-700 text-white" /></div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat.replace("_", " ")}</SelectItem>))}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="all">All Status</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem><SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem></SelectContent></Select>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700"><Search className="h-4 w-4 me-2" />Search</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800"><CardTitle className="text-white">Products</CardTitle><CardDescription className="text-slate-400">Marketplace catalog</CardDescription></CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (<div className="flex flex-col items-center justify-center py-12"><Package className="h-12 w-12 text-slate-600 mb-4" /><p className="text-slate-400">No products found</p></div>) : (
            <Table><TableHeader><TableRow className="border-slate-800"><TableHead className="text-slate-400">Product</TableHead><TableHead className="text-slate-400">Category</TableHead><TableHead className="text-slate-400 text-end">Price</TableHead><TableHead className="text-slate-400 text-end">Stock</TableHead><TableHead className="text-slate-400">Vendor</TableHead><TableHead className="text-slate-400">Status</TableHead><TableHead className="text-slate-400 w-[80px]">View</TableHead></TableRow></TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product._id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell><div className="flex flex-col"><span className="text-white font-medium">{product.name}</span><span className="text-slate-500 text-sm font-mono">{product.sku}</span></div></TableCell>
                    <TableCell><Badge variant="outline" className="bg-blue-500/20 text-blue-400">{product.category?.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-end text-white font-medium">{formatCurrency(product.price?.amount || 0)}</TableCell>
                    <TableCell className="text-end"><span className={`font-medium ${(product.inventory?.quantity || 0) < 10 ? "text-yellow-400" : "text-slate-300"}`}>{product.inventory?.quantity || 0}</span></TableCell>
                    <TableCell className="text-slate-300">{product.vendorName || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[product.status] || ""}>{product.status === "ACTIVE" ? <CheckCircle className="h-3 w-3 me-1" /> : product.status === "OUT_OF_STOCK" ? <XCircle className="h-3 w-3 me-1" /> : null}{product.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => handleViewProduct(product)}><Eye className="h-4 w-4" /></Button></TableCell>
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
          <DialogHeader><DialogTitle className="text-white">Product Details</DialogTitle></DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Name</p><p className="text-white font-medium">{selectedProduct.name}</p></div>
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">SKU</p><p className="text-white font-mono">{selectedProduct.sku}</p></div>
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Price</p><p className="text-white font-medium">{formatCurrency(selectedProduct.price?.amount || 0)}</p></div>
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Stock</p><p className="text-white">{selectedProduct.inventory?.quantity || 0} units</p></div>
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Category</p><Badge variant="outline" className="bg-blue-500/20 text-blue-400">{selectedProduct.category}</Badge></div>
                <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Status</p><Badge variant="outline" className={STATUS_COLORS[selectedProduct.status] || ""}>{selectedProduct.status}</Badge></div>
              </div>
              {selectedProduct.vendorName && <div className="bg-slate-800 p-4 rounded-lg"><p className="text-slate-400 text-sm mb-1">Vendor</p><p className="text-white">{selectedProduct.vendorName}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
