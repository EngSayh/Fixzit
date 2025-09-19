import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Building,
  Home,
  ShoppingCart,
  Truck,
  Wrench,
  User,
  Lock,
  Globe,
  Star,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Shield,
  Award,
  Zap,
  Eye,
} from 'lucide-react';

interface PortalTab {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  demoUrl: string;
  loginRequired: boolean;
  roles: string[];
}

interface DemoCredentials {
  email: string;
  password: string;
  role: string;
  description: string;
}

export const PortalLauncher: React.FC = () => {
  const [activeTab, setActiveTab] = useState('fixzit');
  const [selectedCredentials, setSelectedCredentials] = useState<DemoCredentials | null>(null);

  const portalTabs: PortalTab[] = [
    {
      id: 'fixzit',
      name: 'Fixzit App',
      description: 'Complete Facility Management Platform',
      icon: <Building className="h-6 w-6" />,
      color: 'bg-blue-600',
      features: [
        'Property Management',
        'Work Order System',
        'Financial Management',
        'Tenant Portal',
        'Mobile Apps',
        'Real-time Notifications',
        'Advanced Analytics',
        'ZATCA Compliance'
      ],
      demoUrl: '/dashboard',
      loginRequired: true,
      roles: ['admin', 'property_manager', 'finance_officer', 'tenant', 'technician']
    },
    {
      id: 'aqar_douq',
      name: 'Aqar Douq',
      description: 'Real Estate Marketplace',
      icon: <Home className="h-6 w-6" />,
      color: 'bg-green-600',
      features: [
        'Property Listings',
        'Advanced Search & Filters',
        'Virtual Tours',
        'Lead Management',
        'CRM Integration',
        'Owner Statements',
        'Market Analytics',
        'Mobile Responsive'
      ],
      demoUrl: '/aqar-douq',
      loginRequired: false,
      roles: ['public', 'agent', 'owner']
    },
    {
      id: 'fixzit_douq',
      name: 'Fixzit Douq',
      description: 'Materials & Services Marketplace',
      icon: <ShoppingCart className="h-6 w-6" />,
      color: 'bg-orange-600',
      features: [
        'Service Catalog',
        'RFQ Management',
        'Bid Comparison',
        'Order Tracking',
        'Vendor Ratings',
        'Quality Control',
        'Delivery Management',
        'Payment Integration'
      ],
      demoUrl: '/fixzit-douq',
      loginRequired: false,
      roles: ['buyer', 'vendor', 'admin']
    },
    {
      id: 'vendor',
      name: 'Vendor Portal',
      description: 'Service Provider Platform',
      icon: <Truck className="h-6 w-6" />,
      color: 'bg-purple-600',
      features: [
        'Profile Management',
        'Service Catalog',
        'RFQ Responses',
        'Order Management',
        'Performance Analytics',
        'Payment Tracking',
        'Customer Reviews',
        'Mobile App'
      ],
      demoUrl: '/vendor-portal',
      loginRequired: true,
      roles: ['vendor']
    },
    {
      id: 'technician',
      name: 'Technician Portal',
      description: 'Field Service Management',
      icon: <Wrench className="h-6 w-6" />,
      color: 'bg-red-600',
      features: [
        'My Work Orders',
        'Time Tracking',
        'Photo Documentation',
        'GPS Navigation',
        'Inventory Management',
        'Customer Communication',
        'Performance Metrics',
        'Mobile App'
      ],
      demoUrl: '/technician-portal',
      loginRequired: true,
      roles: ['technician']
    }
  ];

  const demoCredentials: Record<string, DemoCredentials[]> = {
    fixzit: [
      {
        email: 'admin@fixzit.com',
        password: 'password123',
        role: 'Super Admin',
        description: 'Full system access across all modules'
      },
      {
        email: 'manager@fixzit.com',
        password: 'password123',
        role: 'Property Manager',
        description: 'Property and maintenance management'
      },
      {
        email: 'finance@fixzit.com',
        password: 'password123',
        role: 'Finance Officer',
        description: 'Financial management and reporting'
      },
      {
        email: 'tenant@fixzit.com',
        password: 'password123',
        role: 'Tenant',
        description: 'Service requests and payments'
      },
      {
        email: 'tech@fixzit.com',
        password: 'password123',
        role: 'Technician',
        description: 'Field service and work orders'
      },
      {
        email: 'owner@fixzit.com',
        password: 'password123',
        role: 'Property Owner',
        description: 'Investment oversight and approvals'
      }
    ],
    vendor: [
      {
        email: 'vendor@fixzit.com',
        password: 'password123',
        role: 'Service Vendor',
        description: 'Service provider and supplier'
      }
    ],
    technician: [
      {
        email: 'tech@fixzit.com',
        password: 'password123',
        role: 'Field Technician',
        description: 'Mobile field service worker'
      }
    ]
  };

  const currentPortal = portalTabs.find(tab => tab.id === activeTab);

  const handleQuickLogin = (credentials: DemoCredentials) => {
    // Set form values and redirect
    window.location.href = `${currentPortal?.demoUrl}/login?email=${credentials.email}&password=${credentials.password}`;
  };

  const handleLaunchPortal = () => {
    if (currentPortal?.loginRequired) {
      window.location.href = `${currentPortal.demoUrl}/login`;
    } else {
      window.location.href = currentPortal?.demoUrl || '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">FX</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Fixzit Enterprise</h1>
                <p className="text-sm text-gray-600">Unified Platform Launcher</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Global Platform
              </Badge>
              <Badge variant="default" className="text-xs bg-green-600">
                <Shield className="h-3 w-3 mr-1" />
                Secure
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Platform Overview */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Platform
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Access specialized portals designed for your role in the Fixzit ecosystem. 
            Each platform is optimized for specific workflows and user needs.
          </p>
        </div>

        {/* Portal Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            {portalTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col items-center space-y-2 p-4 h-auto"
              >
                <div className={`p-2 rounded-lg ${tab.color} text-white`}>
                  {tab.icon}
                </div>
                <div className="text-center">
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs text-muted-foreground">{tab.description}</div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Portal Content */}
          {portalTabs.map((portal) => (
            <TabsContent key={portal.id} value={portal.id}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Portal Information */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-xl ${portal.color} text-white`}>
                          {portal.icon}
                        </div>
                        <div>
                          <CardTitle className="text-2xl">{portal.name}</CardTitle>
                          <CardDescription className="text-lg">
                            {portal.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Features Grid */}
                      <div className="mb-6">
                        <h3 className="font-semibold mb-4">Key Features</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {portal.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Screenshots/Preview */}
                      <div className="mb-6">
                        <h3 className="font-semibold mb-4">Platform Preview</h3>
                        <div className="bg-gray-100 rounded-lg p-8 text-center">
                          <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                            <Eye className="h-8 w-8 text-gray-500" />
                          </div>
                          <p className="text-gray-600">Interactive demo available after login</p>
                        </div>
                      </div>

                      {/* Launch Button */}
                      <div className="flex justify-center">
                        <Button 
                          size="lg" 
                          className={`${portal.color} hover:opacity-90 text-white px-8 py-3`}
                          onClick={handleLaunchPortal}
                        >
                          <Zap className="h-5 w-5 mr-2" />
                          Launch {portal.name}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Login/Demo Section */}
                <div className="space-y-6">
                  {/* Demo Credentials */}
                  {portal.loginRequired && demoCredentials[portal.id] && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Demo Access</CardTitle>
                        <CardDescription>
                          Try different user roles with pre-configured accounts
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {demoCredentials[portal.id].map((cred, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="font-medium">{cred.role}</div>
                                  <div className="text-sm text-gray-600">{cred.description}</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickLogin(cred)}
                                >
                                  Quick Login
                                </Button>
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {cred.email} / {cred.password}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Platform Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Platform Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Active Users</span>
                          <Badge variant="default">2,547</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Properties Managed</span>
                          <Badge variant="default">1,234</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Work Orders</span>
                          <Badge variant="default">15,678</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Uptime</span>
                          <Badge variant="default" className="bg-green-600">99.9%</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security & Compliance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Security & Compliance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="text-sm">ISO 27001 Certified</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="text-sm">ZATCA Compliant</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="text-sm">GDPR Compliant</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Lock className="h-4 w-4 text-green-600" />
                          <span className="text-sm">256-bit Encryption</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-green-600" />
                          <span className="text-sm">SOC 2 Type II</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Platform Comparison */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">Platform Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  {portalTabs.map((portal) => (
                    <th key={portal.id} className="text-center p-4 font-semibold">
                      <div className="flex flex-col items-center space-y-1">
                        <div className={`p-2 rounded-lg ${portal.color} text-white`}>
                          {portal.icon}
                        </div>
                        <span className="text-sm">{portal.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Property Management', values: ['✅', '✅', '❌', '❌', '❌'] },
                  { feature: 'Work Order System', values: ['✅', '❌', '❌', '✅', '✅'] },
                  { feature: 'Financial Management', values: ['✅', '✅', '✅', '✅', '❌'] },
                  { feature: 'Marketplace Features', values: ['❌', '✅', '✅', '✅', '❌'] },
                  { feature: 'Mobile App', values: ['✅', '✅', '✅', '✅', '✅'] },
                  { feature: 'Real-time Updates', values: ['✅', '✅', '✅', '✅', '✅'] },
                  { feature: 'ZATCA Compliance', values: ['✅', '✅', '✅', '✅', '❌'] },
                  { feature: 'Multi-language', values: ['✅', '✅', '✅', '✅', '✅'] }
                ].map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{row.feature}</td>
                    {row.values.map((value, valueIndex) => (
                      <td key={valueIndex} className="text-center p-4">
                        <span className={`text-lg ${value === '✅' ? 'text-green-600' : 'text-gray-400'}`}>
                          {value}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-gray-600 mb-6">
                Choose your platform and start exploring the comprehensive facility management ecosystem.
                All platforms are integrated and share data seamlessly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Building className="h-5 w-5 mr-2" />
                  Start with Fixzit App
                </Button>
                <Button size="lg" variant="outline">
                  <Phone className="h-5 w-5 mr-2" />
                  Schedule Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">FX</span>
                </div>
                <span className="font-bold text-lg">Fixzit Enterprise</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                The complete facility management ecosystem for the modern world.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Riyadh, Saudi Arabia</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>+966-11-123-4567</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>info@fixzit.com</span>
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <h4 className="font-semibold mb-4">Platforms</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/fixzit" className="hover:text-white transition-colors">Fixzit App</a></li>
                <li><a href="/aqar-douq" className="hover:text-white transition-colors">Aqar Douq</a></li>
                <li><a href="/fixzit-douq" className="hover:text-white transition-colors">Fixzit Douq</a></li>
                <li><a href="/vendor-portal" className="hover:text-white transition-colors">Vendor Portal</a></li>
                <li><a href="/technician-portal" className="hover:text-white transition-colors">Technician Portal</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/api" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="/support" className="hover:text-white transition-colors">Support Center</a></li>
                <li><a href="/tutorials" className="hover:text-white transition-colors">Tutorials</a></li>
                <li><a href="/status" className="hover:text-white transition-colors">System Status</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/compliance" className="hover:text-white transition-colors">Compliance</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <Separator className="my-8 bg-gray-700" />

          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} Fixzit Enterprise. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Badge variant="outline" className="text-xs bg-gray-800 border-gray-600">
                <Shield className="h-3 w-3 mr-1" />
                Enterprise Grade
              </Badge>
              <Badge variant="outline" className="text-xs bg-gray-800 border-gray-600">
                <Globe className="h-3 w-3 mr-1" />
                Saudi Compliant
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PortalLauncher;