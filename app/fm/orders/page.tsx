"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
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
  SelectValue,
} from "@/components/ui/select";
import { CardGridSkeleton } from "@/components/skeletons";
import ClientDate from "@/components/ClientDate";
import {
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  DollarSign,
  Calendar,
  Package,
} from "lucide-react";
import { logger } from "@/lib/logger";

interface Order {
  id: string;
  orderNumber?: string;
  vendorId?: string;
  vendorName?: string;
  buyerUserId?: string;
  total?: number;
  status?: string;
  items?: Array<{
    name?: string;
    quantity?: number;
    price?: number;
  }>;
  deliveryDate?: string;
  createdAt?: string;
  type?: "PURCHASE" | "SERVICE";
  description?: string;
  location?: string;
}

const fetcher = async (url: string, orgId?: string) => {
  if (!orgId) {
    throw new Error("Organization ID required");
  }
  try {
    const res = await fetch(url, {
      headers: { "x-tenant-id": orgId },
    });
    if (!res.ok) throw new Error("Failed to fetch orders");
    const json = await res.json();
    return json.data || json.orders || json.items || [];
  } catch (_error) {
    logger.error("FM orders fetch error", _error as Error);
    throw _error;
  }
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const { hasOrgContext, orgId, guard, supportBanner } = useFmOrgGuard({
    moduleId: "marketplace",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch orders
  const ordersUrl = orgId
    ? `/api/marketplace/orders${statusFilter !== "all" ? `?status=${statusFilter.toUpperCase()}` : ""}`
    : null;

  const {
    data: ordersData,
    error,
    isLoading,
    mutate,
  } = useSWR(
    ordersUrl ? [ordersUrl, orgId] : null,
    ([url, id]: [string, string | undefined]) => fetcher(url, id),
  );

  const orders = Array.isArray(ordersData) ? ordersData : [];

  // Client-side search filter
  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return searchTerm === "" || matchesSearch;
  });

  // Separate by type (if type field exists)
  const purchaseOrders = filteredOrders.filter(
    (o: Order) => !o.type || o.type === "PURCHASE",
  );
  const serviceOrders = filteredOrders.filter(
    (o: Order) => o.type === "SERVICE",
  );

  const handleDelete = async (orderId: string, orderNumber: string) => {
    const confirmMessage = t(
      "orders.confirmDelete",
      'Delete order "{{number}}"? This cannot be undone.',
    ).replace("{{number}}", orderNumber);
    if (!confirm(confirmMessage)) return;
    if (!orgId)
      return toast.error(
        t("fm.errors.orgIdMissing", "Organization ID missing from session"),
      );

    const toastId = toast.loading(
      t("orders.toast.deleting", "Deleting order..."),
    );
    try {
      const res = await fetch(`/api/marketplace/orders/${orderId}`, {
        method: "DELETE",
        headers: { "x-tenant-id": orgId },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        const message =
          error &&
          typeof error === "object" &&
          "error" in error &&
          typeof error.error === "string"
            ? error.error
            : t("orders.errors.deleteUnknown", "Failed to delete order");
        throw new Error(message);
      }
      toast.success(
        t("orders.toast.deleteSuccess", "Order deleted successfully"),
        { id: toastId },
      );
      mutate();
    } catch (_error) {
      const message =
        _error instanceof Error
          ? _error.message
          : t("orders.errors.deleteUnknown", "Failed to delete order");
      toast.error(
        t(
          "orders.toast.deleteFailed",
          "Failed to delete order: {{message}}",
        ).replace("{{message}}", message),
        { id: toastId },
      );
    }
  };

  const exportOrdersCsv = (ordersList: Order[], type: string) => {
    if (ordersList.length === 0) {
      return toast(
        t("orders.export.empty", "No {{type}} orders to export").replace(
          "{{type}}",
          type,
        ),
      );
    }
    const rows = [
      ["Order Number", "Vendor", "Total", "Status", "Date", "Delivery Date"],
    ];
    for (const o of ordersList) {
      rows.push([
        o.orderNumber || o.id || "",
        o.vendorName || "N/A",
        o.total ? `SAR ${o.total.toLocaleString()}` : "N/A",
        o.status || "",
        o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "",
        o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "",
      ]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-orders-export-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      t("orders.export.success", "Exported {{count}} orders").replace(
        "{{count}}",
        String(ordersList.length),
      ),
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-success/10 text-success-foreground border-success/20";
      case "delivered":
        return "bg-success/10 text-success-foreground border-success/20";
      case "approved":
        return "bg-primary/10 text-primary-foreground border-primary/20";
      case "submitted":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "ordered":
        return "bg-secondary/10 text-secondary border-secondary/30";
      case "in progress":
        return "bg-primary/10 text-primary-foreground border-primary/20";
      case "draft":
        return "bg-muted text-foreground border-border";
      case "cancelled":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "pending":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  // Loading state
  if (!session) return <CardGridSkeleton count={4} />;
  if (!hasOrgContext || !orgId) {
    return (
      <div className="space-y-6">
        {supportBanner}
        {guard}
      </div>
    );
  }
  if (isLoading) return <CardGridSkeleton count={4} />;
  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        {t(
          "orders.errors.loadFailed",
          "Failed to load orders: {{message}}",
        ).replace("{{message}}", error.message)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {supportBanner}
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("nav.orders", "Orders & Purchase Orders")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "orders.pageDescription",
            "Manage purchase orders and service orders",
          )}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search", "Search orders...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("common.all", "All Status")}
              </SelectItem>
              <SelectItem value="draft">
                {t("status.draft", "Draft")}
              </SelectItem>
              <SelectItem value="submitted">
                {t("status.submitted", "Submitted")}
              </SelectItem>
              <SelectItem value="approved">
                {t("status.approved", "Approved")}
              </SelectItem>
              <SelectItem value="completed">
                {t("status.completed", "Completed")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="purchase">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t("orders.tabs.purchase", "Purchase Orders")} (
            {purchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="service" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t("orders.tabs.service", "Service Orders")} ({serviceOrders.length}
            )
          </TabsTrigger>
        </TabsList>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Purchase Orders</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportOrdersCsv(purchaseOrders, "purchase")}
            >
              <Download className="h-4 w-4 me-2" />
              {t("common.export", "Export")}
            </Button>
          </div>

          {purchaseOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No purchase orders found
                </p>
                <Button onClick={() => router.push("/marketplace")}>
                  Create Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {purchaseOrders.map((order: Order) => (
                <Card
                  key={order.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {order.orderNumber || `Order ${order.id.slice(-8)}`}
                          </h3>
                          <Badge className={getStatusColor(order.status || "")}>
                            {order.status || "PENDING"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">
                              {t("order.vendor", "Vendor")}:
                            </span>
                            {order.vendorName || "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {t("order.date", "Order Date")}:{" "}
                            {order.createdAt ? (
                              <ClientDate
                                date={order.createdAt}
                                format="date-only"
                              />
                            ) : (
                              "N/A"
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            {t("order.total", "Total")}: SAR{" "}
                            {order.total ? order.total.toLocaleString() : "0"}
                          </div>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-foreground mb-2">
                              {t("order.items", "Items")}:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {order.items.slice(0, 5).map((item, idx) => (
                                <Badge key={`item-${idx}`} variant="outline">
                                  {item.name || `Item ${idx + 1}`}{" "}
                                  {item.quantity ? `x${item.quantity}` : ""}
                                </Badge>
                              ))}
                              {order.items.length > 5 && (
                                <Badge variant="outline">
                                  +{order.items.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {order.deliveryDate && (
                              <>
                                <Calendar className="h-4 w-4" />
                                {t("order.delivery", "Delivery")}:{" "}
                                <ClientDate
                                  date={order.deliveryDate}
                                  format="date-only"
                                />
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(`/marketplace/orders/${order.id}`)
                              }
                            >
                              <Eye className="h-4 w-4 me-2" />
                              {t("common.view", "View")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/marketplace/orders/${order.id}/edit`,
                                )
                              }
                            >
                              <Edit className="h-4 w-4 me-2" />
                              {t("common.edit", "Edit")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                handleDelete(
                                  order.id,
                                  order.orderNumber || order.id,
                                )
                              }
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
          )}
        </TabsContent>

        {/* Service Orders Tab */}
        <TabsContent value="service" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Service Orders</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportOrdersCsv(serviceOrders, "service")}
            >
              <Download className="h-4 w-4 me-2" />
              {t("common.export", "Export")}
            </Button>
          </div>

          {serviceOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No service orders found
                </p>
                <Button onClick={() => router.push("/marketplace")}>
                  Create Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {serviceOrders.map((order: Order) => (
                <Card
                  key={order.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {order.orderNumber ||
                              `Service Order ${order.id.slice(-8)}`}
                          </h3>
                          <Badge className={getStatusColor(order.status || "")}>
                            {order.status || "PENDING"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">
                              {t("order.vendor", "Vendor")}:
                            </span>
                            {order.vendorName || "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {t("order.date", "Order Date")}:{" "}
                            {order.createdAt ? (
                              <ClientDate
                                date={order.createdAt}
                                format="date-only"
                              />
                            ) : (
                              "N/A"
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            {t("order.amount", "Amount")}: SAR{" "}
                            {order.total ? order.total.toLocaleString() : "0"}
                          </div>
                        </div>

                        {order.description && (
                          <p className="text-muted-foreground mb-4">
                            {order.description}
                          </p>
                        )}

                        {order.location && (
                          <div className="text-sm text-muted-foreground mb-4">
                            <span className="font-medium">Location:</span>{" "}
                            {order.location}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/marketplace/orders/${order.id}`)
                            }
                          >
                            <Eye className="h-4 w-4 me-2" />
                            {t("common.view", "View")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/marketplace/orders/${order.id}/edit`,
                              )
                            }
                          >
                            <Edit className="h-4 w-4 me-2" />
                            {t("common.edit", "Edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              handleDelete(
                                order.id,
                                order.orderNumber || order.id,
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t("common.delete", "Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
