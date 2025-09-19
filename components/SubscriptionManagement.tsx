import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Crown,
  TrendingUp,
  Users,
  Building,
  Zap,
  Shield,
  Check,
  X,
  AlertTriangle,
  Calendar,
  CreditCard,
  Download,
  Upload,
  Settings,
  BarChart3,
  DollarSign,
  Clock,
  Star,
  Award,
  Smartphone,
  Globe,
  Lock,
  FileText,
  Headphones,
  Lightbulb,
  Target,
  Infinity,
} from 'lucide-react';

interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  status: 'trial' | 'active' | 'cancelled' | 'suspended' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  limits: Record<string, number | string>;
  features: string[];
  usage: Record<string, number>;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
  limits: Record<string, number | string>;
  features: string[];
  popular?: boolean;
  trial?: boolean;
}

export const SubscriptionManagement: React.FC = () => {
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [usageData, setUsageData] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const [subscriptionRes, plansRes, usageRes, billingRes] = await Promise.all([
        fetch('/api/subscriptions/current'),
        fetch('/api/subscriptions/plans'),
        fetch('/api/subscriptions/usage'),
        fetch('/api/subscriptions/billing-history')
      ]);

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json();
        setCurrentSubscription(subscriptionData.subscription);
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setAvailablePlans(plansData.plans || []);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsageData(usageData);
      }

      if (billingRes.ok) {
        const billingData = await billingRes.json();
        setBillingHistory(billingData.invoices || []);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      // Load demo data
      loadDemoData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoData = () => {
    setCurrentSubscription({
      id: 'sub_demo',
      organizationId: 'org_demo',
      planId: 'professional',
      billingCycle: 'monthly',
      status: 'active',
      currentPeriodStart: new Date(2025, 8, 1),
      currentPeriodEnd: new Date(2025, 9, 1),
      limits: {
        properties: 25,
        units: 500,
        users: 10,
        workOrders: 1000,
        storage: 25,
        apiCalls: 10000,
        reports: 50
      },
      features: [
        'advanced_property_management',
        'work_order_system',
        'financial_management',
        'mobile_apps',
        'zatca_compliance'
      ],
      usage: {
        properties: 12,
        units: 156,
        users: 7,
        workOrders: 234,
        storage: 8.5,
        apiCalls: 3456,
        reports: 18
      }
    });

    setAvailablePlans([
      {
        id: 'starter',
        name: 'Starter Plan',
        description: 'Perfect for small property portfolios',
        price: { monthly: 299, annual: 2990, currency: 'SAR' },
        limits: { properties: 5, units: 50, users: 3 },
        features: ['basic_property_management', 'work_order_system'],
        trial: true
      },
      {
        id: 'professional',
        name: 'Professional Plan',
        description: 'For growing property management companies',
        price: { monthly: 799, annual: 7990, currency: 'SAR' },
        limits: { properties: 25, units: 500, users: 10 },
        features: ['advanced_property_management', 'financial_management', 'mobile_apps'],
        popular: true,
        trial: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        description: 'For large property management enterprises',
        price: { monthly: 1999, annual: 19990, currency: 'SAR' },
        limits: { properties: 100, units: 2000, users: 50 },
        features: ['complete_platform_access', 'advanced_analytics', 'iot_integration'],
        trial: true
      }
    ]);

    setUsageData({
      currentPeriod: {
        start: new Date(2025, 8, 1),
        end: new Date(2025, 9, 1)
      },
      metrics: {
        properties: { used: 12, limit: 25, percentage: 48 },
        units: { used: 156, limit: 500, percentage: 31.2 },
        users: { used: 7, limit: 10, percentage: 70 },
        workOrders: { used: 234, limit: 1000, percentage: 23.4 },
        storage: { used: 8.5, limit: 25, percentage: 34 },
        apiCalls: { used: 3456, limit: 10000, percentage: 34.56 },
        reports: { used: 18, limit: 50, percentage: 36 }
      }
    });
  };

  const formatCurrency = (amount: number | string, currency: string = 'SAR') => {
    if (amount === 'custom') return 'Custom Pricing';
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount as number);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const PlanCard: React.FC<{ plan: Plan; isCurrent?: boolean }> = ({ plan, isCurrent = false }) => (
    <Card className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''} ${isCurrent ? 'ring-2 ring-green-500' : ''}`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-600 text-white">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <Badge className="bg-green-600 text-white">
            <Check className="h-3 w-3 mr-1" />
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="pt-4">
          <div className="text-3xl font-bold">
            {formatCurrency(plan.price.monthly, plan.price.currency)}
          </div>
          <div className="text-sm text-gray-600">/month</div>
          {plan.price.annual !== 'custom' && (
            <div className="text-sm text-green-600 mt-1">
              Save {formatCurrency((plan.price.monthly as number) * 12 - (plan.price.annual as number), plan.price.currency)} annually
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Limits */}
        <div className="space-y-3 mb-6">
          <h4 className="font-semibold text-sm">Included:</h4>
          {Object.entries(plan.limits).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="capitalize">{key.replace('_', ' ')}</span>
              <span className="font-medium">
                {value === 'unlimited' ? (
                  <div className="flex items-center">
                    <Infinity className="h-4 w-4 mr-1" />
                    Unlimited
                  </div>
                ) : (
                  value.toLocaleString()
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="space-y-2 mb-6">
          <h4 className="font-semibold text-sm">Features:</h4>
          {plan.features.slice(0, 5).map((feature) => (
            <div key={feature} className="flex items-center space-x-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </div>
          ))}
          {plan.features.length > 5 && (
            <div className="text-sm text-gray-600">
              +{plan.features.length - 5} more features
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button 
          className="w-full" 
          variant={isCurrent ? 'outline' : 'default'}
          disabled={isCurrent}
          onClick={() => {
            setSelectedPlan(plan.id);
            setShowUpgradeDialog(true);
          }}
        >
          {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
        </Button>
      </CardContent>
    </Card>
  );

  const UsageOverview = () => {
    if (!usageData || !currentSubscription) return null;

    return (
      <div className="space-y-6">
        {/* Current Plan Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Subscription</span>
              <Badge className={getStatusColor(currentSubscription.status)}>
                {currentSubscription.status.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              {availablePlans.find(p => p.id === currentSubscription.planId)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentSubscription.planId.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">Current Plan</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {currentSubscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                </div>
                <div className="text-sm text-gray-600">Billing Cycle</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.ceil((currentSubscription.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000))}
                </div>
                <div className="text-sm text-gray-600">Days Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>
              Current usage against your plan limits for this billing period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(usageData.metrics).map(([metric, data]: [string, any]) => (
                <div key={metric}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{metric.replace('_', ' ')}</span>
                    <span className={`text-sm font-medium ${getUsageColor(data.percentage)}`}>
                      {data.used.toLocaleString()} / {data.limit === 'unlimited' ? '∞' : data.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(data.percentage, 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{data.percentage.toFixed(1)}% used</span>
                    {data.percentage > 80 && (
                      <span className="text-orange-600 font-medium">
                        {data.percentage > 100 ? 'Limit exceeded' : 'Approaching limit'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage Alerts */}
        {Object.values(usageData.metrics).some((data: any) => data.percentage > 80) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Usage Alert</AlertTitle>
            <AlertDescription>
              You're approaching or have exceeded limits for some features. Consider upgrading your plan to avoid service interruptions.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const PlansComparison = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Choose Your Plan</h3>
        <p className="text-gray-600">
          Upgrade or downgrade your subscription at any time. Changes take effect immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availablePlans.map((plan) => (
          <PlanCard 
            key={plan.id} 
            plan={plan} 
            isCurrent={currentSubscription?.planId === plan.id}
          />
        ))}
      </div>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                {availablePlans.map((plan) => (
                  <TableHead key={plan.id} className="text-center">
                    {plan.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { feature: 'Properties', values: ['5', '25', '100', 'Unlimited'] },
                { feature: 'Users', values: ['3', '10', '50', 'Unlimited'] },
                { feature: 'Work Orders', values: ['100/mo', '1,000/mo', '10,000/mo', 'Unlimited'] },
                { feature: 'Mobile Apps', values: ['❌', '✅', '✅', '✅'] },
                { feature: 'Advanced Analytics', values: ['❌', '❌', '✅', '✅'] },
                { feature: 'IoT Integration', values: ['❌', '❌', '✅', '✅'] },
                { feature: 'Digital Signatures', values: ['❌', '❌', '✅', '✅'] },
                { feature: 'Custom Integrations', values: ['❌', '❌', '❌', '✅'] },
                { feature: 'Dedicated Support', values: ['❌', '❌', '❌', '✅'] }
              ].map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.feature}</TableCell>
                  {row.values.map((value, valueIndex) => (
                    <TableCell key={valueIndex} className="text-center">
                      {value === '✅' ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : value === '❌' ? (
                        <X className="h-4 w-4 text-gray-400 mx-auto" />
                      ) : (
                        value
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const BillingHistory = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View and download your past invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                {
                  id: 'INV-2025-0001',
                  date: '2025-09-01',
                  amount: 799,
                  status: 'paid',
                  description: 'Professional Plan - Monthly'
                },
                {
                  id: 'INV-2025-0002',
                  date: '2025-08-01',
                  amount: 799,
                  status: 'paid',
                  description: 'Professional Plan - Monthly'
                },
                {
                  id: 'INV-2025-0003',
                  date: '2025-07-01',
                  amount: 799,
                  status: 'paid',
                  description: 'Professional Plan - Monthly'
                }
              ].map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const SubscriptionSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Settings</CardTitle>
          <CardDescription>
            Manage your subscription preferences and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing Cycle */}
          <div>
            <Label className="text-sm font-medium">Billing Cycle</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Monthly Billing</div>
                  <div className="text-sm text-gray-600">Billed every month</div>
                </div>
                <Button 
                  variant={currentSubscription?.billingCycle === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                >
                  {currentSubscription?.billingCycle === 'monthly' ? 'Current' : 'Switch'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Annual Billing</div>
                  <div className="text-sm text-gray-600">
                    Billed yearly - Save 2 months
                    <Badge variant="secondary" className="ml-2">20% Off</Badge>
                  </div>
                </div>
                <Button 
                  variant={currentSubscription?.billingCycle === 'annual' ? 'default' : 'outline'}
                  size="sm"
                >
                  {currentSubscription?.billingCycle === 'annual' ? 'Current' : 'Switch'}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Method */}
          <div>
            <Label className="text-sm font-medium">Payment Method</Label>
            <div className="mt-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">•••• •••• •••• 4242</div>
                    <div className="text-sm text-gray-600">Expires 12/2027</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications */}
          <div>
            <Label className="text-sm font-medium">Billing Notifications</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Invoice reminders</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Usage alerts</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Payment confirmations</span>
                <Badge variant="default">Enabled</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg">
              <div>
                <div className="font-medium text-red-600">Cancel Subscription</div>
                <div className="text-sm text-gray-600">
                  Cancel your subscription at the end of the current billing period
                </div>
              </div>
              <Button variant="destructive" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading subscription data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Crown className="h-8 w-8 mr-3 text-blue-600" />
            Subscription Management
          </h2>
          <p className="text-muted-foreground">
            Manage your corporate subscription, usage, and billing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Next billing: {currentSubscription?.currentPeriodEnd.toLocaleDateString()}
          </Badge>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Crown className="mr-2 h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <UsageOverview />
        </TabsContent>

        <TabsContent value="plans">
          <PlansComparison />
        </TabsContent>

        <TabsContent value="billing">
          <BillingHistory />
        </TabsContent>

        <TabsContent value="settings">
          <SubscriptionSettings />
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Subscription</DialogTitle>
            <DialogDescription>
              Upgrade to {availablePlans.find(p => p.id === selectedPlan)?.name} plan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Immediate Access</AlertTitle>
              <AlertDescription>
                Your upgrade will take effect immediately, and you'll be charged a prorated amount for the remainder of your current billing period.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                Cancel
              </Button>
              <Button>
                Confirm Upgrade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;