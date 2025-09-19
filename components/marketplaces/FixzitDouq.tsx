import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Filter,
  Grid,
  List,
  ShoppingCart,
  Package,
  Truck,
  Star,
  Heart,
  Share,
  Phone,
  Mail,
  Calendar,
  Eye,
  Camera,
  DollarSign,
  TrendingUp,
  Award,
  Clock,
  User,
  MessageCircle,
  Download,
  Upload,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  FileText,
  Zap,
  Shield,
  MapPin,
} from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  unit: string;
  basePrice: number;
  currency: string;
  images: string[];
  specifications: Record<string, any>;
  vendor: {
    id: string;
    name: string;
    company: string;
    rating: number;
    verified: boolean;
    location: string;
    responseTime: number; // hours
  };
  availability: {
    inStock: boolean;
    quantity: number;
    leadTime: number; // days
    minimumOrder: number;
  };
  certifications: string[];
  warranty: {
    period: number; // months
    coverage: string;
  };
  delivery: {
    available: boolean;
    cost: number;
    timeframe: string;
  };
  rating: number;
  reviews: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RFQItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  specifications: Record<string, any>;
  notes: string;
}

interface RFQ {
  id: string;
  title: string;
  description: string;
  items: RFQItem[];
  deliveryLocation: {
    propertyId: string;
    propertyName: string;
    address: string;
    contactPerson: string;
    phone: string;
  };
  requirements: {
    deliveryDate: Date;
    paymentTerms: string;
    qualityStandards: string[];
    certificationRequired: boolean;
  };
  status: 'draft' | 'published' | 'bidding' | 'awarded' | 'completed' | 'cancelled';
  bids: RFQBid[];
  createdAt: Date;
  closingDate: Date;
}

interface RFQBid {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  totalAmount: number;
  currency: string;
  items: Array<{
    serviceId: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    deliveryTime: number;
    notes: string;
  }>;
  terms: {
    paymentTerms: string;
    deliveryTerms: string;
    warrantyPeriod: number;
    validityPeriod: number; // days
  };
  attachments: string[];
  submittedAt: Date;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
}

export const FixzitDouq: React.FC = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceItem[]>([]);
  const [rfqBasket, setRfqBasket] = useState<RFQItem[]>([]);
  const [myRFQs, setMyRFQs] = useState<RFQ[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServices();
    loadMyRFQs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [services, searchQuery, selectedCategory]);

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/fixzit-douq/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices(getDemoServices());
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyRFQs = async () => {
    try {
      const response = await fetch('/api/fixzit-douq/my-rfqs');
      if (response.ok) {
        const data = await response.json();
        setMyRFQs(data.rfqs || []);
      }
    } catch (error) {
      console.error('Failed to load RFQs:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...services];

    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    setFilteredServices(filtered);
  };

  const addToRFQ = (service: ServiceItem, quantity: number = 1) => {
    const existingItem = rfqBasket.find(item => item.serviceId === service.id);
    
    if (existingItem) {
      setRfqBasket(prev => prev.map(item =>
        item.serviceId === service.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setRfqBasket(prev => [...prev, {
        serviceId: service.id,
        serviceName: service.name,
        quantity,
        specifications: {},
        notes: ''
      }]);
    }
  };

  const removeFromRFQ = (serviceId: string) => {
    setRfqBasket(prev => prev.filter(item => item.serviceId !== serviceId));
  };

  const updateRFQQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromRFQ(serviceId);
      return;
    }

    setRfqBasket(prev => prev.map(item =>
      item.serviceId === serviceId
        ? { ...item, quantity }
        : item
    ));
  };

  const submitRFQ = async (rfqData: Partial<RFQ>) => {
    try {
      const response = await fetch('/api/fixzit-douq/rfqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rfqData,
          items: rfqBasket
        }),
      });

      if (response.ok) {
        setRfqBasket([]);
        await loadMyRFQs();
        console.log('RFQ submitted successfully');
      }
    } catch (error) {
      console.error('Failed to submit RFQ:', error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const ServiceCard: React.FC<{ service: ServiceItem }> = ({ service }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <div className="aspect-video bg-gray-200 flex items-center justify-center">
          <Package className="h-12 w-12 text-gray-400" />
        </div>
        
        <div className="absolute top-3 left-3">
          <Badge variant={service.availability.inStock ? 'default' : 'secondary'}>
            {service.availability.inStock ? 'In Stock' : 'Pre-order'}
          </Badge>
        </div>
        
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-white/80">
            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
            {service.rating}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{service.name}</h3>
            <p className="text-sm text-gray-600">{service.category} • {service.subcategory}</p>
          </div>

          <p className="text-sm text-gray-700 line-clamp-2">{service.description}</p>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-xl text-blue-600">
                {formatPrice(service.basePrice, service.currency)}
              </div>
              <div className="text-sm text-gray-600">per {service.unit}</div>
            </div>
            <div className="text-right text-sm">
              <div className="text-gray-600">Min Order:</div>
              <div className="font-medium">{service.availability.minimumOrder} {service.unit}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
              <span className="font-medium">{service.vendor.name}</span>
              {service.vendor.verified && (
                <Shield className="h-3 w-3 text-green-500" />
              )}
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{service.availability.leadTime}d lead time</span>
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <Button 
              className="flex-1"
              onClick={() => addToRFQ(service)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to RFQ
            </Button>
            <Button variant="outline">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RFQBasket = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>RFQ Basket ({rfqBasket.length})</span>
          <Button variant="outline" size="sm" onClick={() => setRfqBasket([])}>
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rfqBasket.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No items in RFQ basket</p>
            <p className="text-sm">Add services to create an RFQ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rfqBasket.map((item) => {
              const service = services.find(s => s.id === item.serviceId);
              return (
                <div key={item.serviceId} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium">{item.serviceName}</p>
                    <p className="text-sm text-gray-600">
                      {service && formatPrice(service.basePrice, service.currency)} per {service?.unit}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateRFQQuantity(item.serviceId, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-12 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateRFQQuantity(item.serviceId, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromRFQ(item.serviceId)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              );
            })}
            
            <Separator />
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Create RFQ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Request for Quotation</DialogTitle>
                  <DialogDescription>
                    Submit your RFQ to receive competitive bids from verified vendors
                  </DialogDescription>
                </DialogHeader>
                <RFQForm onSubmit={submitRFQ} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const RFQForm: React.FC<{
    onSubmit: (rfqData: Partial<RFQ>) => void;
  }> = ({ onSubmit }) => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      deliveryDate: '',
      paymentTerms: '30_days',
      certificationRequired: false,
      propertyId: '',
      contactPerson: '',
      phone: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        title: formData.title,
        description: formData.description,
        deliveryLocation: {
          propertyId: formData.propertyId,
          propertyName: 'Selected Property', // Would be fetched
          address: 'Property Address', // Would be fetched
          contactPerson: formData.contactPerson,
          phone: formData.phone
        },
        requirements: {
          deliveryDate: new Date(formData.deliveryDate),
          paymentTerms: formData.paymentTerms,
          qualityStandards: [],
          certificationRequired: formData.certificationRequired
        },
        closingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">RFQ Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., HVAC Maintenance Services for Metro Tower"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Detailed description of your requirements..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="deliveryDate">Required Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Select 
              value={formData.paymentTerms} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="15_days">Net 15 Days</SelectItem>
                <SelectItem value="30_days">Net 30 Days</SelectItem>
                <SelectItem value="45_days">Net 45 Days</SelectItem>
                <SelectItem value="60_days">Net 60 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline">
            Save as Draft
          </Button>
          <Button type="submit">
            Publish RFQ
          </Button>
        </div>
      </form>
    );
  };

  const CatalogTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search services, materials, and equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="hvac">HVAC Services</SelectItem>
            <SelectItem value="plumbing">Plumbing</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="cleaning">Cleaning</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="landscaping">Landscaping</SelectItem>
            <SelectItem value="materials">Construction Materials</SelectItem>
            <SelectItem value="equipment">Equipment Rental</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex border border-gray-200 rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading services...</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );

  const RFQsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My RFQs</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New RFQ
        </Button>
      </div>

      <div className="space-y-4">
        {myRFQs.map((rfq) => (
          <Card key={rfq.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{rfq.title}</h3>
                  <p className="text-sm text-gray-600">{rfq.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={rfq.status === 'published' ? 'default' : 'secondary'}>
                    {rfq.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {rfq.bids.length} bids
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-sm">
                  <span className="text-gray-600">Items:</span>
                  <span className="ml-1 font-medium">{rfq.items.length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Closing Date:</span>
                  <span className="ml-1 font-medium">{format(rfq.closingDate, 'MMM dd, yyyy')}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Delivery:</span>
                  <span className="ml-1 font-medium">{rfq.deliveryLocation.propertyName}</span>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Compare Bids ({rfq.bids.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const OrdersTab = () => (
    <div className="space-y-6">
      <div className="text-center py-12">
        <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Order Management</h3>
        <p className="text-gray-600">Track your orders and deliveries</p>
      </div>
    </div>
  );

  const getDemoServices = (): ServiceItem[] => [
    {
      id: '1',
      name: 'HVAC Maintenance Service',
      description: 'Comprehensive HVAC system maintenance including cleaning, inspection, and minor repairs',
      category: 'hvac',
      subcategory: 'maintenance',
      unit: 'unit',
      basePrice: 500,
      currency: 'SAR',
      images: [],
      specifications: {
        serviceType: 'maintenance',
        duration: '2-4 hours',
        includes: ['Filter replacement', 'Coil cleaning', 'Performance check']
      },
      vendor: {
        id: 'vendor1',
        name: 'Ahmad HVAC Services',
        company: 'Cool Air Solutions',
        rating: 4.8,
        verified: true,
        location: 'Riyadh',
        responseTime: 2
      },
      availability: {
        inStock: true,
        quantity: 100,
        leadTime: 1,
        minimumOrder: 1
      },
      certifications: ['SASO', 'ISO 9001'],
      warranty: {
        period: 6,
        coverage: 'Parts and labor'
      },
      delivery: {
        available: true,
        cost: 50,
        timeframe: 'Same day'
      },
      rating: 4.8,
      reviews: 156,
      createdAt: new Date('2025-09-01'),
      updatedAt: new Date('2025-09-18')
    },
    // Add more demo services...
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Fixzit Douq</h1>
                <p className="text-sm text-gray-600">Materials & Services Marketplace</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline">
                <Package className="h-3 w-3 mr-1" />
                {filteredServices.length} Services
              </Badge>
              <Badge variant="default" className="bg-orange-600">
                <ShoppingCart className="h-3 w-3 mr-1" />
                RFQ: {rfqBasket.length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="catalog">
                  <Package className="h-4 w-4 mr-2" />
                  Service Catalog
                </TabsTrigger>
                <TabsTrigger value="rfqs">
                  <FileText className="h-4 w-4 mr-2" />
                  My RFQs ({myRFQs.length})
                </TabsTrigger>
                <TabsTrigger value="orders">
                  <Truck className="h-4 w-4 mr-2" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="vendors">
                  <Award className="h-4 w-4 mr-2" />
                  Vendors
                </TabsTrigger>
              </TabsList>

              <TabsContent value="catalog">
                <CatalogTab />
              </TabsContent>

              <TabsContent value="rfqs">
                <RFQsTab />
              </TabsContent>

              <TabsContent value="orders">
                <OrdersTab />
              </TabsContent>

              <TabsContent value="vendors">
                <div className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Vendor Directory</h3>
                  <p className="text-gray-600">Browse and manage your preferred vendors</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* RFQ Basket Sidebar */}
          <div className="w-80 flex-shrink-0">
            <RFQBasket />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixzitDouq;