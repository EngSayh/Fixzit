'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Settings, 
  BarChart3, 
  Save,
  Plus,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface Module {
  _id: string;
  code: string;
  name: string;
  description: string;
  isCore: boolean;
  billingCategory: 'per_seat' | 'per_tenant';
}

interface PriceTier {
  _id: string;
  moduleId: string;
  seatsMin: number;
  seatsMax: number;
  pricePerSeatMonthly: number;
  flatMonthly?: number;
  currency: string;
  region: string;
}

interface DiscountRule {
  _id: string;
  code: string;
  type: 'percent' | 'amount';
  value: number;
  active: boolean;
}

interface Benchmark {
  _id: string;
  vendor: string;
  plan: string;
  pricingModel: string;
  priceMonthly: number;
  priceAnnualMonthly?: number;
  src: string;
  notes: string;
}

export default function BillingAdminPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [discountRule, setDiscountRule] = useState<DiscountRule | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [annualDiscount, setAnnualDiscount] = useState(15);
  const [editingTier, setEditingTier] = useState<PriceTier | null>(null);
  const [newTier, setNewTier] = useState({
    moduleCode: '',
    seatsMin: 1,
    seatsMax: 5,
    pricePerSeatMonthly: 0,
    flatMonthly: 0,
    currency: 'USD',
    region: 'GLOBAL'
  });
  const [newBenchmark, setNewBenchmark] = useState({
    vendor: '',
    plan: '',
    pricingModel: 'per_user_month',
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    src: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [modulesRes, tiersRes, discountRes, benchmarksRes] = await Promise.all([
        fetch('/api/billing/catalog'),
        fetch('/api/admin/price-tiers'),
        fetch('/api/admin/discounts'),
        fetch('/api/admin/benchmarks')
      ]);

      const modulesData = await modulesRes.json();
      const tiersData = await tiersRes.json();
      const discountData = await discountRes.json();
      const benchmarksData = await benchmarksRes.json();

      setModules(modulesData.modules || []);
      setPriceTiers(tiersData || []);
      setDiscountRule(discountData);
      setBenchmarks(benchmarksData || []);
      
      if (discountData?.value) {
        setAnnualDiscount(discountData.value);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: 'Failed to load billing data' });
    } finally {
      setLoading(false);
    }
  };

  const saveAnnualDiscount = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/discounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: annualDiscount })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Annual discount updated successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update annual discount' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update annual discount' });
    } finally {
      setSaving(false);
    }
  };

  const savePriceTier = async (tier: Partial<PriceTier>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/price-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tier)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Price tier updated successfully' });
        loadData();
        setEditingTier(null);
        setNewTier({
          moduleCode: '',
          seatsMin: 1,
          seatsMax: 5,
          pricePerSeatMonthly: 0,
          flatMonthly: 0,
          currency: 'USD',
          region: 'GLOBAL'
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to update price tier' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update price tier' });
    } finally {
      setSaving(false);
    }
  };

  const addBenchmark = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBenchmark)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Benchmark added successfully' });
        loadData();
        setNewBenchmark({
          vendor: '',
          plan: '',
          pricingModel: 'per_user_month',
          priceMonthly: 0,
          priceAnnualMonthly: 0,
          src: '',
          notes: ''
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to add benchmark' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add benchmark' });
    } finally {
      setSaving(false);
    }
  };

  const getModuleName = (moduleId: string) => {
    const module = modules.find(m => m._id === moduleId);
    return module?.name || 'Unknown Module';
  };

  const getModuleCode = (moduleId: string) => {
    const module = modules.find(m => m._id === moduleId);
    return module?.code || 'UNKNOWN';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription Management</h1>
          <p className="text-gray-600">Manage pricing, discounts, and market benchmarks</p>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="pricing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pricing">Pricing Tiers</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
            <TabsTrigger value="benchmarks">Market Benchmarks</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Pricing Tiers Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Module Pricing Tiers
                </CardTitle>
                <CardDescription>
                  Configure pricing for each module based on seat count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modules.map((module) => {
                    const moduleTiers = priceTiers.filter(tier => tier.moduleId === module._id);
                    return (
                      <div key={module._id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{module.name}</h3>
                            <p className="text-sm text-gray-600">{module.description}</p>
                            <Badge variant={module.isCore ? 'default' : 'secondary'} className="mt-1">
                              {module.isCore ? 'Core Module' : 'Add-on Module'}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setNewTier(prev => ({ ...prev, moduleCode: module.code }))}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Tier
                          </Button>
                        </div>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Seat Range</TableHead>
                              <TableHead>Price per Seat</TableHead>
                              <TableHead>Flat Price</TableHead>
                              <TableHead>Currency</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {moduleTiers.map((tier) => (
                              <TableRow key={tier._id}>
                                <TableCell>{tier.seatsMin} - {tier.seatsMax}</TableCell>
                                <TableCell>${tier.pricePerSeatMonthly}</TableCell>
                                <TableCell>{tier.flatMonthly ? `$${tier.flatMonthly}` : '-'}</TableCell>
                                <TableCell>{tier.currency}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingTier(tier)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discounts Tab */}
          <TabsContent value="discounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Discount Configuration
                </CardTitle>
                <CardDescription>
                  Set annual discount percentage for subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-md">
                  <Label htmlFor="annual-discount">Annual Discount Percentage</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="annual-discount"
                      type="number"
                      min="0"
                      max="50"
                      value={annualDiscount}
                      onChange={(e) => setAnnualDiscount(parseInt(e.target.value) || 0)}
                    />
                    <Button onClick={saveAnnualDiscount} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Customers who choose annual billing will receive this discount
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Market Benchmarks
                </CardTitle>
                <CardDescription>
                  Track competitor pricing to stay competitive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Benchmark */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Add New Benchmark</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendor">Vendor</Label>
                      <Input
                        id="vendor"
                        value={newBenchmark.vendor}
                        onChange={(e) => setNewBenchmark(prev => ({ ...prev, vendor: e.target.value }))}
                        placeholder="e.g., UpKeep, MaintainX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan">Plan</Label>
                      <Input
                        id="plan"
                        value={newBenchmark.plan}
                        onChange={(e) => setNewBenchmark(prev => ({ ...prev, plan: e.target.value }))}
                        placeholder="e.g., Essential, Premium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price-monthly">Monthly Price</Label>
                      <Input
                        id="price-monthly"
                        type="number"
                        value={newBenchmark.priceMonthly}
                        onChange={(e) => setNewBenchmark(prev => ({ ...prev, priceMonthly: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price-annual">Annual Price (Monthly)</Label>
                      <Input
                        id="price-annual"
                        type="number"
                        value={newBenchmark.priceAnnualMonthly}
                        onChange={(e) => setNewBenchmark(prev => ({ ...prev, priceAnnualMonthly: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="src">Source URL</Label>
                      <Input
                        id="src"
                        value={newBenchmark.src}
                        onChange={(e) => setNewBenchmark(prev => ({ ...prev, src: e.target.value }))}
                        placeholder="https://competitor.com/pricing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={newBenchmark.notes}
                        onChange={(e) => setNewBenchmark(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                  <Button onClick={addBenchmark} disabled={saving} className="mt-4">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add Benchmark
                  </Button>
                </div>

                {/* Existing Benchmarks */}
                <div>
                  <h3 className="font-semibold mb-4">Current Benchmarks</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Monthly Price</TableHead>
                        <TableHead>Annual Price</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {benchmarks.map((benchmark) => (
                        <TableRow key={benchmark._id}>
                          <TableCell className="font-medium">{benchmark.vendor}</TableCell>
                          <TableCell>{benchmark.plan}</TableCell>
                          <TableCell>${benchmark.priceMonthly}</TableCell>
                          <TableCell>${benchmark.priceAnnualMonthly || benchmark.priceMonthly}</TableCell>
                          <TableCell>
                            <a 
                              href={benchmark.src} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Source
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{modules.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {modules.filter(m => m.isCore).length} core, {modules.filter(m => !m.isCore).length} add-ons
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Price Tiers</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{priceTiers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all modules
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Benchmarks</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{benchmarks.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Competitor data points
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}