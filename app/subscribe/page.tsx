'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Users, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface Module {
  code: string;
  name: string;
  description: string;
  isCore: boolean;
  billingCategory: 'per_seat' | 'per_tenant';
}

interface PriceTier {
  moduleId: string;
  seatsMin: number;
  seatsMax: number;
  pricePerSeatMonthly: number;
  flatMonthly?: number;
  currency: string;
}

interface QuoteResult {
  seatTotal: number;
  monthly: number;
  annualTotal: number;
  annualDiscountPct: number;
  items: Array<{
    module: string;
    seatCount: number;
    unitPriceMonthly: number;
    lineMonthly: number;
    billingCategory: string;
  }>;
  currency: string;
  contactSales?: boolean;
  reason?: string;
}

export default function SubscribePage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [prices, setPrices] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Form state
  const [customerType, setCustomerType] = useState<'ORG' | 'OWNER'>('ORG');
  const [seats, setSeats] = useState(5);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedModules, setSelectedModules] = useState<string[]>(['FM_CORE']);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'SA'
  });

  // Load modules and pricing
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/billing/catalog');
        const data = await response.json();
        setModules(data.modules || []);
        setPrices(data.prices || []);
      } catch (error) {
        console.error('Failed to load catalog:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate quote when dependencies change
  useEffect(() => {
    if (modules.length > 0 && selectedModules.length > 0) {
      calculateQuote();
    }
  }, [selectedModules, seats, billingCycle, modules]);

  const calculateQuote = async () => {
    try {
      const response = await fetch('/api/billing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedModules.map(code => ({ moduleCode: code, seatCount: seats })),
          billingCycle,
          seatTotal: seats
        })
      });
      const result = await response.json();
      setQuote(result);
    } catch (error) {
      console.error('Failed to calculate quote:', error);
    }
  };

  const handleModuleToggle = (moduleCode: string, isCore: boolean) => {
    if (isCore) return; // Core modules can't be deselected
    
    setSelectedModules(prev => 
      prev.includes(moduleCode) 
        ? prev.filter(code => code !== moduleCode)
        : [...prev, moduleCode]
    );
  };

  const handleSubscribe = async () => {
    if (!quote || !customerInfo.name || !customerInfo.email) {
      alert('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            type: customerType,
            name: customerInfo.name,
            billingEmail: customerInfo.email,
            country: customerInfo.country,
            currency: 'USD'
          },
          planType: customerType === 'ORG' ? 'CORPORATE_FM' : 'OWNER_FM',
          items: selectedModules.map(code => ({ moduleCode: code, seatCount: seats })),
          seatTotal: seats,
          billingCycle,
          paytabsRegion: 'KSA',
          returnUrl: `${window.location.origin}/subscribe/success`,
          callbackUrl: `${window.location.origin}/api/billing/callback/paytabs`
        })
      });

      const result = await response.json();
      
      if (result.paytabs?.redirect_url) {
        window.location.href = result.paytabs.redirect_url;
      } else {
        alert('Error creating payment: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to create subscription. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getModulePrice = (moduleCode: string) => {
    const module = modules.find(m => m.code === moduleCode);
    if (!module) return 0;
    
    const tier = prices.find(p => 
      p.moduleId === module._id && 
      seats >= p.seatsMin && 
      seats <= p.seatsMax
    );
    
    if (module.billingCategory === 'per_tenant') {
      return tier?.flatMonthly || 0;
    }
    
    return tier?.pricePerSeatMonthly || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Subscribe to Fixzit Facility Management
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose your plan and modules to get started with comprehensive facility management
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Customer Type
                </CardTitle>
                <CardDescription>
                  Select whether you're a property management company or property owner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      customerType === 'ORG' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setCustomerType('ORG')}
                  >
                    <h3 className="font-semibold">Property Management Company</h3>
                    <p className="text-sm text-gray-600">Manage multiple properties for clients</p>
                  </div>
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      customerType === 'OWNER' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setCustomerType('OWNER')}
                  >
                    <h3 className="font-semibold">Property Owner</h3>
                    <p className="text-sm text-gray-600">Manage your own properties</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  We'll use this information for billing and account management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Company/Owner Name *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter company or owner name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Billing Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="billing@company.com"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+966 50 123 4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={customerInfo.country} onValueChange={(value) => setCustomerInfo(prev => ({ ...prev, country: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SA">Saudi Arabia</SelectItem>
                        <SelectItem value="AE">UAE</SelectItem>
                        <SelectItem value="EG">Egypt</SelectItem>
                        <SelectItem value="OM">Oman</SelectItem>
                        <SelectItem value="JO">Jordan</SelectItem>
                        <SelectItem value="KW">Kuwait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seats and Billing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Seats & Billing
                </CardTitle>
                <CardDescription>
                  Choose the number of users and billing cycle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="seats">Number of Seats</Label>
                    <Input
                      id="seats"
                      type="number"
                      min="1"
                      max="200"
                      value={seats}
                      onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                    />
                    {seats > 200 && (
                      <p className="text-sm text-amber-600 mt-1">
                        For more than 200 seats, please contact our sales team
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Billing Cycle</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="monthly"
                          checked={billingCycle === 'monthly'}
                          onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
                        />
                        <span>Monthly</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="annual"
                          checked={billingCycle === 'annual'}
                          onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
                        />
                        <span>Annual (15% discount)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Module Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Modules</CardTitle>
                <CardDescription>
                  Choose the modules you need for your facility management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {modules.map((module) => (
                    <div
                      key={module.code}
                      className={`p-4 border rounded-lg ${
                        module.isCore || selectedModules.includes(module.code)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={module.isCore || selectedModules.includes(module.code)}
                          disabled={module.isCore}
                          onCheckedChange={() => handleModuleToggle(module.code, module.isCore)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{module.name}</h3>
                            <Badge variant={module.isCore ? 'default' : 'secondary'}>
                              {module.isCore ? 'Core' : 'Add-on'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                          <p className="text-sm font-medium text-blue-600 mt-2">
                            {module.billingCategory === 'per_tenant' 
                              ? `$${getModulePrice(module.code)}/tenant/month`
                              : `$${getModulePrice(module.code)}/seat/month`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote?.contactSales ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-amber-800">Contact Sales</h3>
                    <p className="text-sm text-amber-600 mt-2">
                      For more than 200 seats, please contact our sales team for custom pricing.
                    </p>
                    <Button className="mt-4" asChild>
                      <a href="mailto:sales@fixzit.app">Contact Sales</a>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {quote?.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.module} ({item.seatCount} seats)</span>
                          <span>${item.lineMonthly.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Monthly Total</span>
                        <span>${quote?.monthly.toFixed(2)}</span>
                      </div>
                      
                      {billingCycle === 'annual' && (
                        <>
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Annual Discount ({quote?.annualDiscountPct}%)</span>
                            <span>-${((quote?.monthly || 0) * 12 * (quote?.annualDiscountPct || 0) / 100).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-lg">
                            <span>Annual Total</span>
                            <span>${quote?.annualTotal.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleSubscribe}
                      disabled={processing || !quote || !customerInfo.name || !customerInfo.email}
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Subscribe Now
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      You'll be redirected to PayTabs for secure payment processing
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}