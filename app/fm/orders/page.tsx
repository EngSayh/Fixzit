'use client';

import { useState, useMemo } from &apos;react&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Badge } from &apos;@/src/components/ui/badge&apos;;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/src/components/ui/tabs&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import {
  Search, Plus, Filter, Download, Eye, Edit, Trash2,
  ShoppingCart, DollarSign, Calendar, Package, Truck
} from &apos;lucide-react&apos;;

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendor: string;
  total: string;
  date: string;
  status: &apos;Draft&apos; | &apos;Submitted&apos; | &apos;Approved&apos; | &apos;Ordered&apos; | &apos;Delivered&apos; | &apos;Cancelled&apos;;
  items: string[];
  deliveryDate: string;
  priority: &apos;Low&apos; | &apos;Medium&apos; | &apos;High&apos;;
}

interface ServiceOrder {
  id: string;
  orderNumber: string;
  service: string;
  vendor: string;
  amount: string;
  date: string;
  status: &apos;Requested&apos; | &apos;Approved&apos; | &apos;In Progress&apos; | &apos;Completed&apos; | &apos;Cancelled&apos;;
  description: string;
  location: string;
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState(&apos;');
  const [statusFilter, setStatusFilter] = useState(&apos;all&apos;);

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: &apos;PO-001&apos;,
      orderNumber: &apos;PO-2025-001&apos;,
      vendor: &apos;CoolAir Co.&apos;,
      total: &apos;24,000&apos;,
      date: &apos;2025-09-12&apos;,
      status: &apos;Approved&apos;,
      items: [&apos;AC Maintenance - Tower A&apos;, &apos;Filter Replacement x 10&apos;],
      deliveryDate: &apos;2025-09-20&apos;,
      priority: &apos;Medium&apos;
    },
    {
      id: &apos;PO-002&apos;,
      orderNumber: &apos;PO-2025-002&apos;,
      vendor: &apos;Spark Electric&apos;,
      total: &apos;15,500&apos;,
      date: &apos;2025-09-10&apos;,
      status: &apos;Delivered&apos;,
      items: [&apos;Electrical Inspection&apos;, &apos;Outlet Installation x 5&apos;],
      deliveryDate: &apos;2025-09-15&apos;,
      priority: &apos;High&apos;
    },
    {
      id: &apos;PO-003&apos;,
      orderNumber: &apos;PO-2025-003&apos;,
      vendor: &apos;AquaFlow&apos;,
      total: &apos;8,750&apos;,
      date: &apos;2025-09-08&apos;,
      status: &apos;Draft&apos;,
      items: [&apos;Plumbing Repairs&apos;, &apos;Pipe Replacement&apos;],
      deliveryDate: &apos;2025-09-25&apos;,
      priority: &apos;Low&apos;
    }
  ];

  const serviceOrders: ServiceOrder[] = [
    {
      id: &apos;SO-001&apos;,
      orderNumber: &apos;SO-2025-001&apos;,
      service: &apos;AC Maintenance&apos;,
      vendor: &apos;CoolAir Co.&apos;,
      amount: &apos;3,500&apos;,
      date: &apos;2025-09-12&apos;,
      status: &apos;In Progress&apos;,
      description: &apos;Monthly AC maintenance for Tower A&apos;,
      location: &apos;Tower A - Floors 1-5&apos;
    },
    {
      id: &apos;SO-002&apos;,
      orderNumber: &apos;SO-2025-002&apos;,
      service: &apos;Cleaning Services&apos;,
      vendor: &apos;CleanPro Services&apos;,
      amount: &apos;2,800&apos;,
      date: &apos;2025-09-11&apos;,
      status: &apos;Completed&apos;,
      description: &apos;Weekly cleaning service for common areas&apos;,
      location: &apos;Building 1 - Common Areas&apos;
    }
  ];

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.vendor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === &apos;all&apos; || order.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case &apos;completed&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;delivered&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;approved&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      case 'submitted&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;ordered&apos;: return &apos;bg-purple-100 text-purple-800 border-purple-200&apos;;
      case &apos;in progress&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      case &apos;draft&apos;: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
      case &apos;cancelled&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;requested&apos;: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('nav.orders&apos;, &apos;Orders & Purchase Orders&apos;)}</h1>
        <p className="text-gray-600">{t('orders.pageDescription&apos;, &apos;Manage purchase orders and service orders&apos;)}</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('common.search&apos;, &apos;Search orders...&apos;)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all&apos;, &apos;All Status&apos;)}</SelectItem>
              <SelectItem value="draft">{t('status.draft&apos;, &apos;Draft&apos;)}</SelectItem>
              <SelectItem value="submitted">{t('status.submitted&apos;, &apos;Submitted&apos;)}</SelectItem>
              <SelectItem value="approved">{t('status.approved&apos;, &apos;Approved&apos;)}</SelectItem>
              <SelectItem value="ordered">{t('status.ordered&apos;, &apos;Ordered&apos;)}</SelectItem>
              <SelectItem value="delivered">{t('status.delivered&apos;, &apos;Delivered&apos;)}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export&apos;, &apos;Export&apos;)}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="purchase-orders">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t('orders.purchaseOrders&apos;, &apos;Purchase Orders&apos;)}
          </TabsTrigger>
          <TabsTrigger value="service-orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('orders.serviceOrders&apos;, &apos;Service Orders&apos;)}
          </TabsTrigger>
        </TabsList>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="mt-6">
          <div className="space-y-4">
            {filteredPurchaseOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {t('orders.purchaseOrder&apos;, &apos;PO&apos;)} {order.orderNumber}
                        </h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        <Badge variant="outline">
                          {order.priority} {t('orders.priority&apos;, &apos;Priority&apos;)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('orders.vendor&apos;, &apos;Vendor&apos;)}:</span>
                          {order.vendor}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {t('orders.orderDate&apos;, &apos;Order Date&apos;)}: {new Date(order.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          {t('orders.total&apos;, &apos;Total&apos;)}: SAR {order.total}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">{t('orders.items&apos;, &apos;Items&apos;)}:</h4>
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item) => (
                            <Badge key={item} variant="outline">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Truck className="h-4 w-4" />
                          {t('orders.delivery&apos;, &apos;Delivery&apos;)}: {new Date(order.deliveryDate).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view&apos;, &apos;View&apos;)}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit&apos;, &apos;Edit&apos;)}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete&apos;, &apos;Delete&apos;)}
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

        {/* Service Orders Tab */}
        <TabsContent value="service-orders" className="mt-6">
          <div className="space-y-4">
            {serviceOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {t('orders.serviceOrder&apos;, &apos;SO&apos;)} {order.orderNumber}
                        </h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('orders.service&apos;, &apos;Service&apos;)}:</span>
                          {order.service}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('orders.vendor&apos;, &apos;Vendor&apos;)}:</span>
                          {order.vendor}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          {t('orders.amount&apos;, &apos;Amount&apos;)}: SAR {order.amount}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">{t('orders.description&apos;, &apos;Description&apos;)}:</h4>
                        <p className="text-gray-600 text-sm">{order.description}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('orders.location&apos;, &apos;Location&apos;)}:</span>
                          {order.location}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view&apos;, &apos;View&apos;)}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit&apos;, &apos;Edit&apos;)}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t(&apos;common.delete&apos;, &apos;Delete&apos;)}
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
    </div>
  );
}
