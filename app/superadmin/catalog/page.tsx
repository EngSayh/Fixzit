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
import { Select, SelectItem } from "@/components/ui/select";
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
  /** SA-CATALOG-001: Business model classification */
  businessModel?: "B2B" | "B2C" | "BOTH";
}

const CATEGORIES = ["SPARE_PARTS", "TOOLS", "EQUIPMENT", "CONSUMABLES", "SAFETY", "ELECTRICAL", "PLUMBING"];
const __BUSINESS_MODELS = ["B2B", "B2C", "BOTH"]; // Reserved for filter UI
const STATUS_COLORS: Record<string, string> = { ACTIVE: "bg-green-500/20 text-green-400", INACTIVE: "bg-muted text-muted-foreground", OUT_OF_STOCK: "bg-red-500/20 text-red-400", PENDING: "bg-yellow-500/20 text-yellow-400" };
const BUSINESS_MODEL_COLORS: Record<string, string> = { B2B: "bg-blue-500/20 text-blue-500", B2C: "bg-green-500/20 text-green-500", BOTH: "bg-purple-500/20 text-purple-500" };

export default function SuperadminCatalogPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [businessModelFilter, setBusinessModelFilter] = useState<string>("all");
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
      if (businessModelFilter !== "all") params.append("businessModel", businessModelFilter);
      
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
  }, [page, searchQuery, categoryFilter, statusFilter, businessModelFilter]);

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
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.catalog.title", "Product Catalog")}</h1>
          <p className="text-muted-foreground">{t("superadmin.catalog.subtitle", "Manage Fixzit Souq marketplace products")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading} className="border-input text-muted-foreground" aria-label={t("common.refresh", "Refresh product catalog")} title={t("common.refresh", "Refresh product catalog")}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><Package className="h-8 w-8 text-blue-400" /><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-muted-foreground text-sm">{t("superadmin.catalog.totalProducts", "Total Products")}</p></div></div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold text-foreground">{stats.active}</p><p className="text-muted-foreground text-sm">{t("superadmin.catalog.active", "Active")}</p></div></div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold text-foreground">{stats.lowStock}</p><p className="text-muted-foreground text-sm">{t("superadmin.catalog.lowStock", "Low Stock")}</p></div></div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalValue)}</p><p className="text-muted-foreground text-sm">{t("superadmin.catalog.inventoryValue", "Inventory Value")}</p></div></div></CardContent></Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("superadmin.catalog.searchPlaceholder", "Search products...")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="ps-10 bg-muted border-input text-foreground placeholder:text-muted-foreground" />
            </div>
            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter} placeholder={t("superadmin.catalog.categoryPlaceholder", "Category")} className="w-full sm:w-40 bg-muted border-input text-foreground"><SelectItem value="all">{t("superadmin.catalog.allCategories", "All Categories")}</SelectItem>{CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat.replace("_", " ")}</SelectItem>))}</Select>
              <Select value={statusFilter} onValueChange={setStatusFilter} placeholder={t("superadmin.catalog.statusPlaceholder", "Status")} className="w-full sm:w-40 bg-muted border-input text-foreground"><SelectItem value="all">{t("superadmin.catalog.allStatus", "All Status")}</SelectItem><SelectItem value="ACTIVE">{t("superadmin.catalog.active", "Active")}</SelectItem><SelectItem value="INACTIVE">{t("common.inactive", "Inactive")}</SelectItem><SelectItem value="OUT_OF_STOCK">{t("common.outOfStock", "Out of Stock")}</SelectItem></Select>
              <Select value={businessModelFilter} onValueChange={setBusinessModelFilter} placeholder={t("superadmin.catalog.modelPlaceholder", "Model")} className="w-full sm:w-40 bg-muted border-input text-foreground"><SelectItem value="all">{t("superadmin.catalog.allModels", "All Models")}</SelectItem><SelectItem value="B2B">B2B Only</SelectItem><SelectItem value="B2C">B2C Only</SelectItem><SelectItem value="BOTH">B2B & B2C</SelectItem></Select>
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700" aria-label={t("superadmin.catalog.search", "Search products")} title={t("superadmin.catalog.search", "Search products")}><Search className="h-4 w-4 me-2" />{t("superadmin.catalog.search", "Search")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border"><CardTitle className="text-foreground">{t("superadmin.catalog.products", "Products")}</CardTitle><CardDescription className="text-muted-foreground">{t("superadmin.catalog.marketplaceCatalog", "Marketplace catalog")}</CardDescription></CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (<div className="flex flex-col items-center justify-center py-12"><Package className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{t("superadmin.catalog.noProducts", "No products found")}</p></div>) : (
            <Table><TableHeader><TableRow className="border-border"><TableHead className="text-muted-foreground">Product</TableHead><TableHead className="text-muted-foreground">Category</TableHead><TableHead className="text-muted-foreground">Model</TableHead><TableHead className="text-muted-foreground text-end">Price</TableHead><TableHead className="text-muted-foreground text-end">Stock</TableHead><TableHead className="text-muted-foreground">Vendor</TableHead><TableHead className="text-muted-foreground">Status</TableHead><TableHead className="text-muted-foreground w-[80px]">View</TableHead></TableRow></TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product._id} className="border-border hover:bg-muted/50">
                    <TableCell><div className="flex flex-col"><span className="text-foreground font-medium">{product.name}</span><span className="text-muted-foreground text-sm font-mono">{product.sku}</span></div></TableCell>
                    <TableCell><Badge variant="outline" className="bg-blue-500/20 text-blue-400">{product.category?.replace("_", " ")}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={BUSINESS_MODEL_COLORS[product.businessModel || "B2B"]}>{product.businessModel || "B2B"}</Badge></TableCell>
                    <TableCell className="text-end text-foreground font-medium">{formatCurrency(product.price?.amount || 0)}</TableCell>
                    <TableCell className="text-end"><span className={`font-medium ${(product.inventory?.quantity || 0) < 10 ? "text-yellow-400" : "text-muted-foreground"}`}>{product.inventory?.quantity || 0}</span></TableCell>
                    <TableCell className="text-muted-foreground">{product.vendorName || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[product.status] || ""}>{product.status === "ACTIVE" ? <CheckCircle className="h-3 w-3 me-1" /> : product.status === "OUT_OF_STOCK" ? <XCircle className="h-3 w-3 me-1" /> : null}{product.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => handleViewProduct(product)} aria-label={t("superadmin.catalog.viewProduct", `View ${product.name} details`)} title={t("superadmin.catalog.viewProduct", `View ${product.name} details`)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (<div className="flex justify-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-input" aria-label={t("common.previousPage", "Go to previous page")} title={t("common.previousPage", "Go to previous page")}>Previous</Button><span className="py-2 px-4 text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-input" aria-label={t("common.nextPage", "Go to next page")} title={t("common.nextPage", "Go to next page")}>Next</Button></div>)}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-input max-w-2xl">
          <DialogHeader><DialogTitle className="text-foreground">Product Details</DialogTitle></DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Name</p><p className="text-foreground font-medium">{selectedProduct.name}</p></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">SKU</p><p className="text-foreground font-mono">{selectedProduct.sku}</p></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Price</p><p className="text-foreground font-medium">{formatCurrency(selectedProduct.price?.amount || 0)}</p></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Stock</p><p className="text-foreground">{selectedProduct.inventory?.quantity || 0} units</p></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Category</p><Badge variant="outline" className="bg-blue-500/20 text-blue-400">{selectedProduct.category}</Badge></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Business Model</p><Badge variant="outline" className={BUSINESS_MODEL_COLORS[selectedProduct.businessModel || "B2B"]}>{selectedProduct.businessModel || "B2B"}</Badge></div>
                <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Status</p><Badge variant="outline" className={STATUS_COLORS[selectedProduct.status] || ""}>{selectedProduct.status}</Badge></div>
              </div>
              {selectedProduct.vendorName && <div className="bg-muted p-4 rounded-lg"><p className="text-muted-foreground text-sm mb-1">Vendor</p><p className="text-foreground">{selectedProduct.vendorName}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
