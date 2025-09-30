'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Plus, Filter, Download, Eye, Edit, Trash2,
  ShoppingCart, DollarSign, Calendar, Package, Truck
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendor: string;
  total: string;
  date: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Ordered' | 'Delivered' | 'Cancelled';
  items: string[];
  deliveryDate: string;
  priority: 'Low' | 'Medium' | 'High';
}

interface ServiceOrder {
  id: string;
  orderNumber: string;
  service: string;
  vendor: string;
  amount: string;
  date: string;
  status: 'Requested' | 'Approved' | 'In Progress' | 'Completed' | 'Cancelled';
  description: string;
  location: string;
}

const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-001',
    orderNumber: 'PO-2025-001',
    vendor: 'CoolAir Co.',
    total: '24,000',
    date: '2025-09-12',
    status: 'Approved',
    items: ['AC Maintenance - Tower A', 'Filter Replacement x 10'],
    deliveryDate: '2025-09-20',
    priority: 'Medium'
  },
  {
    id: 'PO-002',
    orderNumber: 'PO-2025-002',
    vendor: 'Spark Electric',
    total: '15,500',
    date: '2025-09-10',
    status: 'Delivered',
    items: ['Electrical Inspection', 'Outlet Installation x 5'],
    deliveryDate: '2025-09-15',
    priority: 'High'
  },
  {
    id: 'PO-003',
    orderNumber: 'PO-2025-003',
    vendor: 'AquaFlow',
    total: '8,750',
    date: '2025-09-08',
    status: 'Draft',
    items: ['Plumbing Repairs', 'Pipe Replacement'],
    deliveryDate: '2025-09-25',
    priority: 'Low'
  }
];

const SERVICE_ORDERS: ServiceOrder[] = [
  {
    id: 'SO-001',
    orderNumber: 'SO-2025-001',
    service: 'AC Maintenance',
    vendor: 'CoolAir Co.',
    amount: '3,500',
    date: '2025-09-12',
    status: 'In Progress',
    description: 'Monthly AC maintenance for Tower A',
    location: 'Tower A - Floors 1-5'
  },
  {
    id: 'SO-002',
    orderNumber: 'SO-2025-002',
    service: 'Cleaning Services',
    vendor: 'CleanPro Services',
    amount: '2,800',
    date: '2025-09-11',
    status: 'Completed',
    description: 'Weekly cleaning service for common areas',
    location: 'Building 1 - Common Areas'
  }
];

export default function OrdersPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const purchaseOrders = PURCHASE_ORDERS;
  const serviceOrders = SERVICE_ORDERS;

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.vendor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'submitted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ordered': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'requested': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('nav.orders', 'Orders & Purchase Orders')}</h1>
        <p className="text-gray-600">{t('orders.pageDescription', 'Manage purchase orders and service orders')}</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('common.search', 'Search orders...')}
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
              <SelectItem value="all">{t('common.all', 'All Status')}</SelectItem>
              <SelectItem value="draft">{t('status.draft', 'Draft')}</SelectItem>
              <SelectItem value="submitted">{t('status.submitted', 'Submitted')}</SelectItem>
              <SelectItem value="approved">{t('status.approved', 'Approved')}</SelectItem>
              <SelectItem value="ordered">{t('status.ordered', 'Ordered')}</SelectItem>
              <SelectItem value="delivered">{t('status.delivered', 'Delivered')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export', 'Export')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="purchase-orders">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t('orders.purchaseOrders', 'Purchase Orders')}
          </TabsTrigger>
          <TabsTrigger value="service-orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('orders.serviceOrders', 'Service Orders')}
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
                          {t('orders.purchaseOrder', 'PO')} {order.orderNumber}
                        </h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        <Badge variant="outline">
                          {order.priority} {t('orders.priority', 'Priority')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('orders.vendor', 'Vendor')}:</span>
                          {order.vendor}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {t('orders.orderDate', 'Order Date')}: {new Date(order.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          {t('orders.total', 'Total')}: SAR {order.total}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">{t('orders.items', 'Items')}:</h4>
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
                          {t('orders.delivery', 'Delivery')}: {new Date(order.deliveryDate).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view', 'View')}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit', 'Edit')}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete', 'Delete')}
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
                          {t('orders.serviceOrder', 'SO')} {order.orderNumber}
                        </h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('orders.service', 'Service')}:</span>
                          {order.service}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('orders.vendor', 'Vendor')}:</span>
                          {order.vendor}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          {t('orders.amount', 'Amount')}: SAR {order.amount}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">{t('orders.description', 'Description')}:</h4>
                        <p className="text-gray-600 text-sm">{order.description}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('orders.location', 'Location')}:</span>
                          {order.location}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view', 'View')}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit', 'Edit')}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete', 'Delete')}
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

