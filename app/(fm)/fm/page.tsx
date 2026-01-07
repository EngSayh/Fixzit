"use client";

import { useState, useMemo, type ReactNode } from "react";
import { logger } from "@/lib/logger";
import { useTranslation } from "@/contexts/TranslationContext";
// 🟩 MIGRATED: Now using consolidated useFormTracking hook
import { useFormTracking } from "@/hooks/useFormTracking";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
} from "@/components/ui/icons";
import ClientDate from "@/components/ClientDate";

interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: string;
  status: "Active" | "Pending" | "Inactive";
  contact: string;
  email: string;
  location: string;
  services: string[];
  responseTime: string;
}

interface RFQ {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  status: "Open" | "Draft" | "Closed" | "Awarded";
  budget: string;
  description: string;
  bids: number;
}

interface PurchaseOrder {
  id: string;
  vendor: string;
  total: string;
  date: string;
  status: "Issued" | "Received" | "Cancelled" | "Pending";
  items: string[];
  deliveryDate: string;
}

const VENDORS: Vendor[] = [
  {
    id: "V001",
    name: "CoolAir Co.",
    category: "AC Repair",
    rating: "4.7",
    status: "Active",
    contact: "+966 50 123 4567",
    email: "info@coolair.com",
    location: "Riyadh",
    services: ["AC Installation", "AC Maintenance", "AC Repair"],
    responseTime: "< 2 hours",
  },
  {
    id: "V002",
    name: "Spark Electric",
    category: "Electrical",
    rating: "4.4",
    status: "Active",
    contact: "+966 50 987 6543",
    email: "contact@sparkelectric.com",
    location: "Jeddah",
    services: ["Electrical Installation", "Maintenance", "Emergency Repairs"],
    responseTime: "< 4 hours",
  },
  {
    id: "V003",
    name: "AquaFlow",
    category: "Plumbing",
    rating: "4.1",
    status: "Pending",
    contact: "+966 50 555 0123",
    email: "service@aquaflow.com",
    location: "Dammam",
    services: ["Plumbing Installation", "Pipe Repair", "Drainage"],
    responseTime: "< 6 hours",
  },
];

const RFQS: RFQ[] = [
  {
    id: "RFQ-1024",
    title: "Annual AC Maintenance Contract",
    category: "AC Repair",
    dueDate: "2025-10-01",
    status: "Open",
    budget: "SAR 50,000",
    description:
      "Annual maintenance contract for 50 AC units across 3 buildings",
    bids: 3,
  },
  {
    id: "RFQ-1025",
    title: "Mall Cleaning Services",
    category: "Cleaning",
    dueDate: "2025-10-10",
    status: "Draft",
    budget: "SAR 120,000",
    description:
      "Daily cleaning services for shopping mall including common areas",
    bids: 0,
  },
  {
    id: "RFQ-1026",
    title: "Office Renovation",
    category: "Construction",
    dueDate: "2025-09-30",
    status: "Open",
    budget: "SAR 200,000",
    description:
      "Complete office renovation including electrical and plumbing work",
    bids: 5,
  },
];

const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "PO-8812",
    vendor: "CoolAir Co.",
    total: "24,000",
    date: "2025-09-12",
    status: "Issued",
    items: ["AC Maintenance - Tower A", "Filter Replacement x 10"],
    deliveryDate: "2025-09-20",
  },
  {
    id: "PO-8813",
    vendor: "Spark Electric",
    total: "15,500",
    date: "2025-09-10",
    status: "Received",
    items: ["Electrical Inspection", "Outlet Installation x 5"],
    deliveryDate: "2025-09-15",
  },
];

export default function FMPage() {
  return (
    <FmGuardedPage moduleId="marketplace">
      {({ supportBanner }) => <FMPageContent supportBanner={supportBanner} />}
    </FmGuardedPage>
  );
}

type FMPageContentProps = {
  supportBanner?: ReactNode;
};

function FMPageContent({ supportBanner }: FMPageContentProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Track initial state for dirty detection
  const [initialState] = useState({ searchTerm: "", statusFilter: "all" });

  // Derive isDirty from state comparison (component's responsibility per new pattern)
  const isDirty =
    searchTerm !== initialState.searchTerm ||
    statusFilter !== initialState.statusFilter;

  // 🟩 MIGRATED: Use consolidated useFormTracking hook
  const { handleSubmit } = useFormTracking({
    formId: "fm-page-filters",
    isDirty,
    onSave: async () => {
      try {
        const key = "fxz_fm_filters";
        const payload = JSON.stringify({
          searchTerm,
          statusFilter,
          savedAt: Date.now(),
        });
        localStorage.setItem(key, payload);
        logger.info(`Filter preferences saved: ${payload}`);
      } catch (error) {
        logger.error("Failed to persist filters", error as Error);
      }
    },
  });

  // Handle search term changes - no manual markDirty needed
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Handle status filter changes - no manual markDirty needed
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const vendors = VENDORS;
  const rfqs = RFQS;
  const orders = PURCHASE_ORDERS;

  // Filter data based on search and status
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        vendor.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchTerm, statusFilter]);

  const filteredRFQs = useMemo(() => {
    return rfqs.filter((rfq) => {
      const matchesSearch =
        rfq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfq.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        rfq.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [rfqs, searchTerm, statusFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        order.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-success/10 text-success-foreground border-success/20";
      case "pending":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "inactive":
        return "bg-muted text-foreground border-border";
      case "open":
        return "bg-primary/10 text-primary-foreground border-primary/20";
      case "draft":
        return "bg-muted text-foreground border-border";
      case "closed":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "awarded":
        return "bg-success/10 text-success-foreground border-success/20";
      case "issued":
        return "bg-primary/10 text-primary-foreground border-primary/20";
      case "received":
        return "bg-success/10 text-success-foreground border-success/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {supportBanner}
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("nav.fm", "Facility Management")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "fm.description",
            "Manage your facility operations, vendors, and procurement",
          )}
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search input - full width */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search", "Search...")}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="ps-10 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {/* Row 2: Filter dropdowns - horizontal */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-40 bg-muted border-input text-foreground">
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("common.all", "All Status")}
                  </SelectItem>
                  <SelectItem value="active">
                    {t("status.active", "Active")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("status.pending", "Pending")}
                  </SelectItem>
                  <SelectItem value="open">{t("status.open", "Open")}</SelectItem>
                  <SelectItem value="draft">
                    {t("status.draft", "Draft")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubmit}
                disabled={!isDirty}
                className="bg-success text-white hover:bg-success/90"
                aria-label={t("common.save", "Save")}
              >
                {t("common.save", "Save")}
              </Button>
              <Button variant="outline" size="sm" aria-label={t("common.export", "Export")}>
                <Download className="h-4 w-4 me-2" />
                {t("common.export", "Export")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="catalog">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            📋 {t("fm.tabs.catalog", "Catalog")}
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            👥 {t("fm.tabs.vendors", "Vendors")}
          </TabsTrigger>
          <TabsTrigger value="rfqs" className="flex items-center gap-2">
            📄 {t("fm.tabs.rfqs", "RFQs & Bids")}
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            📦 {t("fm.tabs.orders", "Orders & POs")}
          </TabsTrigger>
        </TabsList>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "AC Repair",
                icon: "❄️",
                count: 12,
                color: "bg-primary/100",
                key: "ac",
              },
              {
                name: "Plumbing",
                icon: "🔧",
                count: 8,
                color: "bg-success/100",
                key: "plumbing",
              },
              {
                name: "Cleaning",
                icon: "🧹",
                count: 15,
                color: "bg-warning/100",
                key: "cleaning",
              },
              {
                name: "Electrical",
                icon: "⚡",
                count: 10,
                color: "bg-secondary/100",
                key: "electrical",
              },
              {
                name: "Painting",
                icon: "🎨",
                count: 6,
                color: "bg-accent/100",
                key: "painting",
              },
              {
                name: "Elevators",
                icon: "🛗",
                count: 4,
                color: "bg-primary/100",
                key: "elevators",
              },
            ].map((service) => (
              <Card
                key={service.key}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-16 h-16 ${service.color} rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4`}
                  >
                    {service.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {service.count} {t("common.vendors", "vendors available")}
                  </p>
                  <Button variant="outline" size="sm" className="w-full" aria-label={t("common.view", "View Vendors")}>
                    {t("common.view", "View Vendors")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="mt-6">
          <div className="space-y-4">
            {filteredVendors.map((vendor) => (
              <Card
                key={vendor.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {vendor.name}
                        </h3>
                        <Badge className={getStatusColor(vendor.status)}>
                          {vendor.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="text-sm font-medium">
                            {vendor.rating}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {t("vendor.category", "Category")}:
                          </span>
                          {vendor.category}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {vendor.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {vendor.contact}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {vendor.email}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-foreground mb-2">
                          {t("vendor.services", "Services")}:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {vendor.services.map((service) => (
                            <Badge key={service} variant="outline">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {t("vendor.responseTime", "Response Time")}:
                          </span>
                          {vendor.responseTime}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" aria-label={`View vendor ${vendor.name}`}>
                            <Eye className="h-4 w-4 me-2" />
                            {t("common.view", "View")}
                          </Button>
                          <Button variant="outline" size="sm" aria-label={`Edit vendor ${vendor.name}`}>
                            <Edit className="h-4 w-4 me-2" />
                            {t("common.edit", "Edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive/90"
                            aria-label={`Delete vendor ${vendor.name}`}
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t("common.delete", "Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* RFQs & Bids Tab */}
        <TabsContent value="rfqs" className="mt-6">
          <div className="space-y-4">
            {filteredRFQs.map((rfq) => (
              <Card key={rfq.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {rfq.title}
                        </h3>
                        <Badge className={getStatusColor(rfq.status)}>
                          {rfq.status}
                        </Badge>
                        <Badge variant="outline">
                          {rfq.bids} {t("rfq.bids", "bids")}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {t("rfq.category", "Category")}:
                          </span>
                          {rfq.category}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {t("rfq.due", "Due")}:{" "}
                          <ClientDate date={rfq.dueDate} format="date-only" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          {t("rfq.budget", "Budget")}: {rfq.budget}
                        </div>
                      </div>

                      <p className="text-muted-foreground mb-4">
                        {rfq.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {t("rfq.id", "RFQ ID")}: {rfq.id}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" aria-label={`View RFQ ${rfq.id}`}>
                            <Eye className="h-4 w-4 me-2" />
                            {t("common.view", "View")}
                          </Button>
                          <Button variant="outline" size="sm" aria-label={`Edit RFQ ${rfq.id}`}>
                            <Edit className="h-4 w-4 me-2" />
                            {t("common.edit", "Edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive/90"
                            aria-label={`Delete RFQ ${rfq.id}`}
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t("common.delete", "Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Orders & POs Tab */}
        <TabsContent value="orders" className="mt-6">
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("order.po", "PO")} {order.id}
                        </h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {t("order.vendor", "Vendor")}:
                          </span>
                          {order.vendor}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {t("order.date", "Order Date")}:{" "}
                          <ClientDate date={order.date} format="date-only" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          {t("order.total", "Total")}: SAR {order.total}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-foreground mb-2">
                          {t("order.items", "Items")}:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item) => (
                            <Badge key={item} variant="outline">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {t("order.delivery", "Delivery")}:{" "}
                          <ClientDate
                            date={order.deliveryDate}
                            format="date-only"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" aria-label={`View PO ${order.id}`}>
                            <Eye className="h-4 w-4 me-2" />
                            {t("common.view", "View")}
                          </Button>
                          <Button variant="outline" size="sm" aria-label={`Edit PO ${order.id}`}>
                            <Edit className="h-4 w-4 me-2" />
                            {t("common.edit", "Edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive/90"
                            aria-label={`Delete PO ${order.id}`}
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t("common.delete", "Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 
        🟩 MIGRATION NOTE: Dialog components removed
        useFormTracking now manages dialogs globally via FormStateContext
        The global dialogs will automatically show when navigating with unsaved changes
      */}
    </div>
  );
}
