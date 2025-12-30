"use client";

/**
 * Superadmin FM Services Catalog
 * Facility Management services catalog for Fixzit Souq
 * 
 * @module app/superadmin/catalog/services/page
 * @status IMPLEMENTED [AGENT-001-A]
 * @issue SA-SERVICE-001
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Search,
  Eye,
  Edit,
  Plus,
  Wrench,
  Clock,
  CheckCircle,
  Users,
  Star,
} from "@/components/ui/icons";
import { useSuperadminSession } from "@/components/superadmin/superadmin-session";

// ============================================================================
// TYPES
// ============================================================================

interface FMService {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  category: "HVAC" | "ELECTRICAL" | "PLUMBING" | "CLEANING" | "SECURITY" | "LANDSCAPING" | "PEST_CONTROL" | "GENERAL";
  pricing: {
    type: "FIXED" | "HOURLY" | "CUSTOM";
    basePrice: number;
    currency: string;
  };
  estimatedDuration: number; // minutes
  isActive: boolean;
  isOnDemand: boolean;
  isContractBased: boolean;
  requiresCertification: boolean;
  assignedVendors: number;
  completedJobs: number;
  avgRating: number;
  businessModel: "B2B" | "B2C" | "BOTH";
  createdAt: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_SERVICES: FMService[] = [
  {
    id: "svc-1",
    name: "AC Maintenance",
    nameAr: "صيانة التكييف",
    description: "Regular HVAC maintenance including filter replacement and system inspection",
    category: "HVAC",
    pricing: { type: "FIXED", basePrice: 150, currency: "SAR" },
    estimatedDuration: 60,
    isActive: true,
    isOnDemand: true,
    isContractBased: true,
    requiresCertification: true,
    assignedVendors: 12,
    completedJobs: 1450,
    avgRating: 4.7,
    businessModel: "BOTH",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "svc-2",
    name: "Electrical Repair",
    nameAr: "إصلاحات كهربائية",
    description: "General electrical repairs and troubleshooting",
    category: "ELECTRICAL",
    pricing: { type: "HOURLY", basePrice: 80, currency: "SAR" },
    estimatedDuration: 90,
    isActive: true,
    isOnDemand: true,
    isContractBased: false,
    requiresCertification: true,
    assignedVendors: 8,
    completedJobs: 890,
    avgRating: 4.5,
    businessModel: "BOTH",
    createdAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "svc-3",
    name: "Plumbing Services",
    nameAr: "خدمات السباكة",
    description: "Pipe repairs, drain cleaning, and water heater services",
    category: "PLUMBING",
    pricing: { type: "HOURLY", basePrice: 70, currency: "SAR" },
    estimatedDuration: 120,
    isActive: true,
    isOnDemand: true,
    isContractBased: true,
    requiresCertification: false,
    assignedVendors: 15,
    completedJobs: 2100,
    avgRating: 4.6,
    businessModel: "BOTH",
    createdAt: "2024-02-01T00:00:00Z",
  },
  {
    id: "svc-4",
    name: "Office Deep Cleaning",
    nameAr: "تنظيف المكاتب العميق",
    description: "Commercial deep cleaning for offices and facilities",
    category: "CLEANING",
    pricing: { type: "CUSTOM", basePrice: 500, currency: "SAR" },
    estimatedDuration: 240,
    isActive: true,
    isOnDemand: false,
    isContractBased: true,
    requiresCertification: false,
    assignedVendors: 6,
    completedJobs: 320,
    avgRating: 4.8,
    businessModel: "B2B",
    createdAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "svc-5",
    name: "Security System Installation",
    nameAr: "تركيب أنظمة الأمن",
    description: "CCTV, access control, and alarm system installation",
    category: "SECURITY",
    pricing: { type: "CUSTOM", basePrice: 2000, currency: "SAR" },
    estimatedDuration: 480,
    isActive: true,
    isOnDemand: false,
    isContractBased: true,
    requiresCertification: true,
    assignedVendors: 4,
    completedJobs: 85,
    avgRating: 4.9,
    businessModel: "B2B",
    createdAt: "2024-04-01T00:00:00Z",
  },
  {
    id: "svc-6",
    name: "Pest Control",
    nameAr: "مكافحة الآفات",
    description: "Residential and commercial pest control services",
    category: "PEST_CONTROL",
    pricing: { type: "FIXED", basePrice: 200, currency: "SAR" },
    estimatedDuration: 90,
    isActive: true,
    isOnDemand: true,
    isContractBased: true,
    requiresCertification: true,
    assignedVendors: 5,
    completedJobs: 650,
    avgRating: 4.4,
    businessModel: "BOTH",
    createdAt: "2024-05-01T00:00:00Z",
  },
  {
    id: "svc-7",
    name: "Garden Maintenance",
    nameAr: "صيانة الحدائق",
    description: "Lawn care, irrigation, and landscape maintenance",
    category: "LANDSCAPING",
    pricing: { type: "HOURLY", basePrice: 50, currency: "SAR" },
    estimatedDuration: 180,
    isActive: false,
    isOnDemand: false,
    isContractBased: true,
    requiresCertification: false,
    assignedVendors: 3,
    completedJobs: 120,
    avgRating: 4.3,
    businessModel: "B2C",
    createdAt: "2024-06-01T00:00:00Z",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  HVAC: "bg-blue-500/20 text-blue-500",
  ELECTRICAL: "bg-yellow-500/20 text-yellow-500",
  PLUMBING: "bg-cyan-500/20 text-cyan-500",
  CLEANING: "bg-green-500/20 text-green-500",
  SECURITY: "bg-red-500/20 text-red-500",
  LANDSCAPING: "bg-emerald-500/20 text-emerald-500",
  PEST_CONTROL: "bg-orange-500/20 text-orange-500",
  GENERAL: "bg-gray-500/20 text-gray-500",
};

const PRICING_LABELS: Record<string, string> = {
  FIXED: "Fixed",
  HOURLY: "Per Hour",
  CUSTOM: "Custom Quote",
};

const BUSINESS_MODEL_COLORS: Record<string, string> = {
  B2B: "bg-blue-500/20 text-blue-500",
  B2C: "bg-green-500/20 text-green-500",
  BOTH: "bg-purple-500/20 text-purple-500",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatCurrency(amount: number, currency = "SAR"): string {
  return new Intl.NumberFormat("en-SA", { style: "currency", currency }).format(amount);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FMServicesCatalogPage() {
  const { t } = useI18n();
  const _session = useSuperadminSession();
  const [services, setServices] = useState<FMService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Dialog states
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<FMService | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      // In production: fetch from /api/souq/services or /api/fm/services
      await new Promise(r => setTimeout(r, 500));
      setServices(MOCK_SERVICES);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive } : s));
    toast.success(isActive ? "Service activated" : "Service deactivated");
  };

  const viewDetails = (service: FMService) => {
    setSelectedService(service);
    setShowDetailDialog(true);
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nameAr.includes(search) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchesModel = modelFilter === "all" || s.businessModel === modelFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && s.isActive) || 
      (statusFilter === "inactive" && !s.isActive);
    return matchesSearch && matchesCategory && matchesModel && matchesStatus;
  });

  // Stats
  const activeCount = services.filter(s => s.isActive).length;
  const totalJobs = services.reduce((sum, s) => sum + s.completedJobs, 0);
  const avgRating = services.reduce((sum, s) => sum + s.avgRating, 0) / services.length || 0;
  const totalVendors = services.reduce((sum, s) => sum + s.assignedVendors, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            {t("superadmin.services.title", "FM Services Catalog")}
          </h1>
          <p className="text-muted-foreground">
            {t("superadmin.services.subtitle", "Manage facility management services in the marketplace")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchServices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh", "Refresh")}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 me-2" />
            {t("superadmin.services.add", "Add Service")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{services.length}</p>
                <p className="text-xs text-green-500">{activeCount} active</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Jobs</p>
                <p className="text-2xl font-bold">{totalJobs.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned Vendors</p>
                <p className="text-2xl font-bold">{totalVendors}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("superadmin.services.search", "Search services...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="HVAC">HVAC</SelectItem>
            <SelectItem value="ELECTRICAL">Electrical</SelectItem>
            <SelectItem value="PLUMBING">Plumbing</SelectItem>
            <SelectItem value="CLEANING">Cleaning</SelectItem>
            <SelectItem value="SECURITY">Security</SelectItem>
            <SelectItem value="LANDSCAPING">Landscaping</SelectItem>
            <SelectItem value="PEST_CONTROL">Pest Control</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            <SelectItem value="B2B">B2B</SelectItem>
            <SelectItem value="B2C">B2C</SelectItem>
            <SelectItem value="BOTH">B2B & B2C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("superadmin.services.name", "Service")}</TableHead>
                <TableHead>{t("superadmin.services.category", "Category")}</TableHead>
                <TableHead>{t("superadmin.services.model", "Model")}</TableHead>
                <TableHead>{t("superadmin.services.pricing", "Pricing")}</TableHead>
                <TableHead>{t("superadmin.services.duration", "Duration")}</TableHead>
                <TableHead>{t("superadmin.services.vendors", "Vendors")}</TableHead>
                <TableHead>{t("superadmin.services.rating", "Rating")}</TableHead>
                <TableHead>{t("superadmin.services.active", "Active")}</TableHead>
                <TableHead>{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t("superadmin.services.noServices", "No services found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map(service => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.nameAr}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={CATEGORY_COLORS[service.category]}>
                        {service.category.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={BUSINESS_MODEL_COLORS[service.businessModel]}>
                        {service.businessModel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatCurrency(service.pricing.basePrice)}</p>
                        <p className="text-xs text-muted-foreground">{PRICING_LABELS[service.pricing.type]}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDuration(service.estimatedDuration)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{service.assignedVendors}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span>{service.avgRating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({service.completedJobs})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={(checked) => handleToggleActive(service.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => viewDetails(service)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedService?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedService?.nameAr}
            </DialogDescription>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedService.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge className={CATEGORY_COLORS[selectedService.category]}>
                    {selectedService.category.replace("_", " ")}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Business Model</p>
                  <Badge className={BUSINESS_MODEL_COLORS[selectedService.businessModel]}>
                    {selectedService.businessModel}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pricing</p>
                  <p className="font-medium">
                    {formatCurrency(selectedService.pricing.basePrice)} 
                    <span className="text-sm text-muted-foreground ms-1">
                      ({PRICING_LABELS[selectedService.pricing.type]})
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Est. Duration</p>
                  <p className="font-medium">{formatDuration(selectedService.estimatedDuration)}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {selectedService.isOnDemand && (
                  <Badge variant="secondary">On-Demand</Badge>
                )}
                {selectedService.isContractBased && (
                  <Badge variant="secondary">Contract Available</Badge>
                )}
                {selectedService.requiresCertification && (
                  <Badge variant="secondary">Certification Required</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{selectedService.assignedVendors}</p>
                  <p className="text-sm text-muted-foreground">Vendors</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{selectedService.completedJobs.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Completed Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    {selectedService.avgRating.toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              {t("common.close", "Close")}
            </Button>
            <Button>
              <Edit className="h-4 w-4 me-2" />
              {t("common.edit", "Edit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
