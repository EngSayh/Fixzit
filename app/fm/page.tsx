'use client';

import { useState, useMemo, useEffect } from &apos;react&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { useUnsavedChanges, UnsavedChangesWarning, SaveConfirmation } from &apos;@/src/hooks/useUnsavedChanges&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Badge } from &apos;@/src/components/ui/badge&apos;;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/src/components/ui/tabs&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import {
  Search, Plus, Filter, Download, Eye, Edit, Trash2,
  Star, Phone, Mail, MapPin, Calendar, DollarSign
} from &apos;lucide-react&apos;;


interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: string;
  status: &apos;Active&apos; | &apos;Pending&apos; | &apos;Inactive&apos;;
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
  status: &apos;Open&apos; | &apos;Draft&apos; | &apos;Closed&apos; | &apos;Awarded&apos;;
  budget: string;
  description: string;
  bids: number;
}

interface PurchaseOrder {
  id: string;
  vendor: string;
  total: string;
  date: string;
  status: &apos;Issued&apos; | &apos;Received&apos; | &apos;Cancelled&apos; | &apos;Pending&apos;;
  items: string[];
  deliveryDate: string;
}

export default function FMPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState(&apos;');
  const [statusFilter, setStatusFilter] = useState(&apos;all&apos;);

  // Unsaved changes management
  const {
    hasUnsavedChanges,
    showWarning,
    showSaveConfirm,
    markDirty,
    markClean,
    handleNavigation,
    handleSave,
    handleDiscard,
    handleStay
  } = useUnsavedChanges({
    message: t(&apos;unsaved.message&apos;, &apos;You have unsaved changes. Are you sure you want to leave without saving?&apos;),
    saveMessage: t(&apos;unsaved.saved&apos;, &apos;Your changes have been saved successfully.&apos;),
    cancelMessage: t(&apos;unsaved.cancelled&apos;, &apos;Changes were not saved.&apos;),
    onSave: async () => {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  // Track initial values for unsaved changes detection
  useEffect(() => {
    markClean(); // Initialize as clean
  }, []); // Only run once on mount

  // Handle search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    markDirty(); // Mark as dirty when search changes
  };

  // Handle status filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    markDirty(); // Mark as dirty when filter changes
  };

  const vendors: Vendor[] = [
    {
      id: &apos;V001&apos;,
      name: &apos;CoolAir Co.&apos;,
      category: &apos;AC Repair&apos;,
      rating: &apos;4.7&apos;,
      status: &apos;Active&apos;,
      contact: &apos;+966 50 123 4567&apos;,
      email: &apos;info@coolair.com&apos;,
      location: &apos;Riyadh&apos;,
      services: [&apos;AC Installation&apos;, &apos;AC Maintenance&apos;, &apos;AC Repair&apos;],
      responseTime: &apos;< 2 hours&apos;
    },
    {
      id: &apos;V002&apos;,
      name: &apos;Spark Electric&apos;,
      category: &apos;Electrical&apos;,
      rating: &apos;4.4&apos;,
      status: &apos;Active&apos;,
      contact: &apos;+966 50 987 6543&apos;,
      email: &apos;contact@sparkelectric.com&apos;,
      location: &apos;Jeddah&apos;,
      services: [&apos;Electrical Installation&apos;, &apos;Maintenance&apos;, &apos;Emergency Repairs&apos;],
      responseTime: &apos;< 4 hours&apos;
    },
    {
      id: &apos;V003&apos;,
      name: &apos;AquaFlow&apos;,
      category: &apos;Plumbing&apos;,
      rating: &apos;4.1&apos;,
      status: &apos;Pending&apos;,
      contact: &apos;+966 50 555 0123&apos;,
      email: 'service@aquaflow.com&apos;,
      location: &apos;Dammam&apos;,
      services: [&apos;Plumbing Installation&apos;, &apos;Pipe Repair&apos;, &apos;Drainage&apos;],
      responseTime: &apos;< 6 hours&apos;
    }
  ];

  const rfqs: RFQ[] = [
    {
      id: &apos;RFQ-1024&apos;,
      title: &apos;Annual AC Maintenance Contract&apos;,
      category: &apos;AC Repair&apos;,
      dueDate: &apos;2025-10-01&apos;,
      status: &apos;Open&apos;,
      budget: &apos;SAR 50,000&apos;,
      description: &apos;Annual maintenance contract for 50 AC units across 3 buildings&apos;,
      bids: 3
    },
    {
      id: &apos;RFQ-1025&apos;,
      title: &apos;Mall Cleaning Services&apos;,
      category: &apos;Cleaning&apos;,
      dueDate: &apos;2025-10-10&apos;,
      status: &apos;Draft&apos;,
      budget: &apos;SAR 120,000&apos;,
      description: &apos;Daily cleaning services for shopping mall including common areas&apos;,
      bids: 0
    },
    {
      id: &apos;RFQ-1026&apos;,
      title: &apos;Office Renovation&apos;,
      category: &apos;Construction&apos;,
      dueDate: &apos;2025-09-30&apos;,
      status: &apos;Open&apos;,
      budget: &apos;SAR 200,000&apos;,
      description: &apos;Complete office renovation including electrical and plumbing work&apos;,
      bids: 5
    }
  ];

  const orders: PurchaseOrder[] = [
    {
      id: &apos;PO-8812&apos;,
      vendor: &apos;CoolAir Co.&apos;,
      total: &apos;24,000&apos;,
      date: &apos;2025-09-12&apos;,
      status: &apos;Issued&apos;,
      items: [&apos;AC Maintenance - Tower A&apos;, &apos;Filter Replacement x 10&apos;],
      deliveryDate: &apos;2025-09-20&apos;
    },
    {
      id: &apos;PO-8813&apos;,
      vendor: &apos;Spark Electric&apos;,
      total: &apos;15,500&apos;,
      date: &apos;2025-09-10&apos;,
      status: &apos;Received&apos;,
      items: [&apos;Electrical Inspection&apos;, &apos;Outlet Installation x 5&apos;],
      deliveryDate: &apos;2025-09-15&apos;
    }
  ];

  // Filter data based on search and status
  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === &apos;all&apos; || vendor.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchTerm, statusFilter]);

  const filteredRFQs = useMemo(() => {
    return rfqs.filter(rfq => {
      const matchesSearch = rfq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rfq.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === &apos;all&apos; || rfq.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [rfqs, searchTerm, statusFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === &apos;all&apos; || order.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case &apos;active&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;pending&apos;: return &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;;
      case &apos;inactive&apos;: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
      case &apos;open&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      case &apos;draft&apos;: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
      case &apos;closed&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      case &apos;awarded&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;issued&apos;: return &apos;bg-blue-100 text-blue-800 border-blue-200&apos;;
      case &apos;received&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;cancelled&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('nav.fm&apos;, &apos;Facility Management&apos;)}</h1>
        <p className="text-gray-600">{t('fm.description&apos;, &apos;Manage your facility operations, vendors, and procurement&apos;)}</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('common.search&apos;, &apos;Search...&apos;)}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all&apos;, &apos;All Status&apos;)}</SelectItem>
              <SelectItem value="active">{t('status.active&apos;, &apos;Active&apos;)}</SelectItem>
              <SelectItem value="pending">{t('status.pending&apos;, &apos;Pending&apos;)}</SelectItem>
              <SelectItem value="open">{t('status.open&apos;, &apos;Open&apos;)}</SelectItem>
              <SelectItem value="draft">{t('status.draft&apos;, &apos;Draft&apos;)}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {t('common.save&apos;, &apos;Save&apos;)}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export&apos;, &apos;Export&apos;)}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            📋 {t('fm.tabs.catalog&apos;, &apos;Catalog&apos;)}
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            👥 {t('fm.tabs.vendors&apos;, &apos;Vendors&apos;)}
          </TabsTrigger>
          <TabsTrigger value="rfqs" className="flex items-center gap-2">
            📄 {t('fm.tabs.rfqs&apos;, &apos;RFQs & Bids&apos;)}
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            📦 {t('fm.tabs.orders&apos;, &apos;Orders & POs&apos;)}
          </TabsTrigger>
        </TabsList>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: &apos;AC Repair&apos;, icon: &apos;❄️&apos;, count: 12, color: &apos;bg-blue-500&apos;, key: &apos;ac&apos; },
              { name: &apos;Plumbing&apos;, icon: &apos;🔧&apos;, count: 8, color: &apos;bg-green-500&apos;, key: &apos;plumbing&apos; },
              { name: &apos;Cleaning&apos;, icon: &apos;🧹&apos;, count: 15, color: &apos;bg-yellow-500&apos;, key: &apos;cleaning&apos; },
              { name: &apos;Electrical&apos;, icon: &apos;⚡', count: 10, color: &apos;bg-purple-500&apos;, key: &apos;electrical&apos; },
              { name: &apos;Painting&apos;, icon: &apos;🎨&apos;, count: 6, color: &apos;bg-pink-500&apos;, key: &apos;painting&apos; },
              { name: &apos;Elevators&apos;, icon: &apos;🛗&apos;, count: 4, color: &apos;bg-indigo-500&apos;, key: &apos;elevators&apos; },
            ].map((service) => (
              <Card key={service.key} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 ${service.color} rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4`}>
                    {service.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{service.count} {t('common.vendors&apos;, &apos;vendors available&apos;)}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    {t('common.view&apos;, &apos;View Vendors&apos;)}
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
              <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                        <Badge className={getStatusColor(vendor.status)}>
                          {vendor.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{vendor.rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('vendor.category&apos;, &apos;Category&apos;)}:</span>
                          {vendor.category}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          {vendor.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          {vendor.contact}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          {vendor.email}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">{t('vendor.services&apos;, &apos;Services&apos;)}:</h4>
                        <div className="flex flex-wrap gap-2">
                          {vendor.services.map((service) => (
                            <Badge key={service} variant="outline">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('vendor.responseTime&apos;, &apos;Response Time&apos;)}:</span>
                          {vendor.responseTime}
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

        {/* RFQs & Bids Tab */}
        <TabsContent value="rfqs" className="mt-6">
          <div className="space-y-4">
            {filteredRFQs.map((rfq) => (
              <Card key={rfq.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{rfq.title}</h3>
                        <Badge className={getStatusColor(rfq.status)}>
                          {rfq.status}
                        </Badge>
                        <Badge variant="outline">{rfq.bids} {t('rfq.bids&apos;, &apos;bids&apos;)}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('rfq.category&apos;, &apos;Category&apos;)}:</span>
                          {rfq.category}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {t('rfq.due&apos;, &apos;Due&apos;)}: {new Date(rfq.dueDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          {t('rfq.budget&apos;, &apos;Budget&apos;)}: {rfq.budget}
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4">{rfq.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {t('rfq.id&apos;, &apos;RFQ ID&apos;)}: {rfq.id}
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

        {/* Orders & POs Tab */}
        <TabsContent value="orders" className="mt-6">
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{t('order.po&apos;, &apos;PO&apos;)} {order.id}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{t('order.vendor&apos;, &apos;Vendor&apos;)}:</span>
                          {order.vendor}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {t('order.date&apos;, &apos;Order Date&apos;)}: {new Date(order.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          {t('order.total&apos;, &apos;Total&apos;)}: SAR {order.total}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">{t('order.items&apos;, &apos;Items&apos;)}:</h4>
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
                          <Calendar className="h-4 w-4" />
                          {t('order.delivery&apos;, &apos;Delivery&apos;)}: {new Date(order.deliveryDate).toLocaleDateString()}
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

      {/* Unsaved Changes Warning Dialog */}
      <UnsavedChangesWarning
        isOpen={showWarning}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onStay={handleStay}
        title={t(&apos;unsaved.warningTitle&apos;, &apos;Unsaved Changes&apos;)}
        message={t(&apos;unsaved.warningMessage&apos;, &apos;You have unsaved changes. Would you like to save them before leaving?&apos;)}
        saveText={t(&apos;unsaved.saveChanges&apos;, &apos;Save Changes&apos;)}
        discardText={t(&apos;unsaved.discardChanges&apos;, &apos;Discard Changes&apos;)}
        stayText={t(&apos;unsaved.stayHere&apos;, &apos;Stay Here&apos;)}
      />

      {/* Save Confirmation Dialog */}
      <SaveConfirmation
        isOpen={showSaveConfirm}
        onConfirm={handleSave}
        onCancel={handleStay}
        title={t(&apos;unsaved.saveTitle&apos;, &apos;Save Changes&apos;)}
        message={t(&apos;unsaved.saveMessage&apos;, &apos;Are you sure you want to save these changes?&apos;)}
        confirmText={t(&apos;unsaved.save&apos;, &apos;Save&apos;)}
        cancelText={t(&apos;unsaved.cancel&apos;, &apos;Cancel&apos;)}
      />
    </div>
  );
}
