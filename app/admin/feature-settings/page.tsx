'use client';

import React, { useState } from 'react';
import { FeatureToggle, FeatureToggleGroup } from '@/components/ui/feature-toggle';

/**
 * Feature flags configuration type
 */
interface FeatureFlags {
  // Module 2: Customer & User Lifecycle
  referralProgram: boolean;
  familyManagement: boolean;
  hrModule: boolean;
  vacationRequests: boolean;
  
  // Module 3: Legal & Contract Management
  electronicContracts: boolean;
  electronicAttorneys: boolean;
  
  // Module 4: Financial & Accounting
  autoPayments: boolean;
  paymentLinks: boolean;
  receiptVouchers: boolean;
  ejarWallet: boolean;
  
  // Module 5: Service & Maintenance
  serviceRatings: boolean;
  warrantyTracker: boolean;
  sparePartsApproval: boolean;
  emergencyMaintenance: boolean;
  
  // Module 6: Marketplace & Project Bidding
  projectBidding: boolean;
  vendorVerification: boolean;
  onlineStore: boolean;
  
  // Module 7: System & Administration
  auditLogging: boolean;
  twoFactorAuth: boolean;
  apiAccess: boolean;
  dataExport: boolean;
  
  // Cross-Platform Features
  mobileApp: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

/**
 * Admin Feature Settings Page
 * 
 * Allows Super Admin to enable/disable platform features using iOS-style toggles
 */
export default function FeatureSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState<string[]>([]);
  
  // Initialize feature flags (in production, fetch from API)
  const [features, setFeatures] = useState<FeatureFlags>({
    // Module 2: Customer & User Lifecycle
    referralProgram: false,
    familyManagement: false,
    hrModule: true,
    vacationRequests: true,
    
    // Module 3: Legal & Contract Management
    electronicContracts: true,
    electronicAttorneys: false,
    
    // Module 4: Financial & Accounting
    autoPayments: true,
    paymentLinks: true,
    receiptVouchers: false,
    ejarWallet: false,
    
    // Module 5: Service & Maintenance
    serviceRatings: true,
    warrantyTracker: false,
    sparePartsApproval: true,
    emergencyMaintenance: true,
    
    // Module 6: Marketplace & Project Bidding
    projectBidding: false,
    vendorVerification: true,
    onlineStore: true,
    
    // Module 7: System & Administration
    auditLogging: true,
    twoFactorAuth: false,
    apiAccess: false,
    dataExport: true,
    
    // Cross-Platform Features
    mobileApp: false,
    pushNotifications: true,
    smsNotifications: true,
    whatsappNotifications: false,
  });

  /**
   * Handle feature toggle change
   */
  const handleFeatureChange = async (featureKey: keyof FeatureFlags, enabled: boolean) => {
    // Add to loading state
    setLoadingFeatures(prev => [...prev, featureKey]);
    
    try {
      // Simulate API call to update feature flag
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      setFeatures(prev => ({
        ...prev,
        [featureKey]: enabled
      }));
      
      // In production, save to database:
      // await fetch('/api/admin/feature-flags', {
      //   method: 'PUT',
      //   body: JSON.stringify({ key: featureKey, enabled })
      // });
      
    } catch (error) {
      console.error('Failed to update feature:', error);
      // Show error toast
    } finally {
      // Remove from loading state
      setLoadingFeatures(prev => prev.filter(k => k !== featureKey));
    }
  };

  /**
   * Handle locked feature click (upgrade required)
   */
  const handleLockedFeatureClick = () => {
    alert('This feature is available in the Enterprise plan. Contact sales@fixzit.sa to upgrade.');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Feature Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Enable or disable platform features. Changes take effect immediately.
        </p>
      </div>

      {/* Customer & User Lifecycle */}
      <FeatureToggleGroup
        title="Customer & User Management"
        description="Features related to customer lifecycle, family management, and HR"
      >
        <FeatureToggle
          id="referral-program"
          label="Referral Program"
          description="Allow users to refer others and earn rewards"
          enabled={features.referralProgram}
          onChange={(enabled) => handleFeatureChange('referralProgram', enabled)}
          loading={loadingFeatures.includes('referralProgram')}
          badge="New"
        />
        
        <FeatureToggle
          id="family-management"
          label="Family Management"
          description="Enable family member invitations and shared access"
          enabled={features.familyManagement}
          onChange={(enabled) => handleFeatureChange('familyManagement', enabled)}
          loading={loadingFeatures.includes('familyManagement')}
          badge="Beta"
        />
        
        <FeatureToggle
          id="hr-module"
          label="HR Module"
          description="Employee management and vacation tracking"
          enabled={features.hrModule}
          onChange={(enabled) => handleFeatureChange('hrModule', enabled)}
          loading={loadingFeatures.includes('hrModule')}
        />
        
        <FeatureToggle
          id="vacation-requests"
          label="Vacation Requests"
          description="Allow employees to submit vacation requests"
          enabled={features.vacationRequests}
          onChange={(enabled) => handleFeatureChange('vacationRequests', enabled)}
          loading={loadingFeatures.includes('vacationRequests')}
        />
      </FeatureToggleGroup>

      {/* Legal & Contract Management */}
      <FeatureToggleGroup
        title="Legal & Contracts"
        description="Contract management and legal document features"
      >
        <FeatureToggle
          id="electronic-contracts"
          label="Electronic Contracts"
          description="Enable digital contract signing via Ejar"
          enabled={features.electronicContracts}
          onChange={(enabled) => handleFeatureChange('electronicContracts', enabled)}
          loading={loadingFeatures.includes('electronicContracts')}
        />
        
        <FeatureToggle
          id="electronic-attorneys"
          label="Electronic Attorneys"
          description="Power of Attorney management system"
          enabled={features.electronicAttorneys}
          onChange={(enabled) => handleFeatureChange('electronicAttorneys', enabled)}
          loading={loadingFeatures.includes('electronicAttorneys')}
          badge="Coming Soon"
        />
      </FeatureToggleGroup>

      {/* Financial & Accounting */}
      <FeatureToggleGroup
        title="Financial & Accounting"
        description="Payment processing, invoicing, and financial features"
      >
        <FeatureToggle
          id="auto-payments"
          label="Auto Payments"
          description="Automatic payment processing via Stripe/Tap"
          enabled={features.autoPayments}
          onChange={(enabled) => handleFeatureChange('autoPayments', enabled)}
          loading={loadingFeatures.includes('autoPayments')}
        />
        
        <FeatureToggle
          id="payment-links"
          label="Payment Links"
          description="Generate payment links for tenants"
          enabled={features.paymentLinks}
          onChange={(enabled) => handleFeatureChange('paymentLinks', enabled)}
          loading={loadingFeatures.includes('paymentLinks')}
        />
        
        <FeatureToggle
          id="receipt-vouchers"
          label="Receipt Vouchers with QR"
          description="Generate receipt vouchers with QR codes"
          enabled={features.receiptVouchers}
          onChange={(enabled) => handleFeatureChange('receiptVouchers', enabled)}
          loading={loadingFeatures.includes('receiptVouchers')}
          badge="New"
        />
        
        <FeatureToggle
          id="ejar-wallet"
          label="Ejar Wallet Integration"
          description="Connect with Ejar digital wallet"
          enabled={features.ejarWallet}
          onChange={(enabled) => handleFeatureChange('ejarWallet', enabled)}
          loading={loadingFeatures.includes('ejarWallet')}
          locked={true}
          onLockedClick={handleLockedFeatureClick}
        />
      </FeatureToggleGroup>

      {/* Service & Maintenance */}
      <FeatureToggleGroup
        title="Service & Maintenance"
        description="Maintenance request management and service provider features"
      >
        <FeatureToggle
          id="service-ratings"
          label="Service Ratings"
          description="Allow customers to rate service providers"
          enabled={features.serviceRatings}
          onChange={(enabled) => handleFeatureChange('serviceRatings', enabled)}
          loading={loadingFeatures.includes('serviceRatings')}
        />
        
        <FeatureToggle
          id="warranty-tracker"
          label="Warranty Tracker"
          description="Track appliance and equipment warranties"
          enabled={features.warrantyTracker}
          onChange={(enabled) => handleFeatureChange('warrantyTracker', enabled)}
          loading={loadingFeatures.includes('warrantyTracker')}
          badge="Beta"
        />
        
        <FeatureToggle
          id="spare-parts-approval"
          label="Spare Parts Approval"
          description="Require tenant approval for spare parts purchases"
          enabled={features.sparePartsApproval}
          onChange={(enabled) => handleFeatureChange('sparePartsApproval', enabled)}
          loading={loadingFeatures.includes('sparePartsApproval')}
        />
        
        <FeatureToggle
          id="emergency-maintenance"
          label="Emergency Maintenance"
          description="24/7 emergency maintenance requests"
          enabled={features.emergencyMaintenance}
          onChange={(enabled) => handleFeatureChange('emergencyMaintenance', enabled)}
          loading={loadingFeatures.includes('emergencyMaintenance')}
        />
      </FeatureToggleGroup>

      {/* Marketplace & Project Bidding */}
      <FeatureToggleGroup
        title="Marketplace & Projects"
        description="Project bidding, vendor management, and e-commerce"
      >
        <FeatureToggle
          id="project-bidding"
          label="Project Bidding System"
          description="Allow contractors to bid on projects"
          enabled={features.projectBidding}
          onChange={(enabled) => handleFeatureChange('projectBidding', enabled)}
          loading={loadingFeatures.includes('projectBidding')}
          badge="New"
        />
        
        <FeatureToggle
          id="vendor-verification"
          label="Vendor Verification"
          description="Background checks and document verification for vendors"
          enabled={features.vendorVerification}
          onChange={(enabled) => handleFeatureChange('vendorVerification', enabled)}
          loading={loadingFeatures.includes('vendorVerification')}
        />
        
        <FeatureToggle
          id="online-store"
          label="Online Store (Souq)"
          description="Public e-commerce store for products and services"
          enabled={features.onlineStore}
          onChange={(enabled) => handleFeatureChange('onlineStore', enabled)}
          loading={loadingFeatures.includes('onlineStore')}
        />
      </FeatureToggleGroup>

      {/* System & Administration */}
      <FeatureToggleGroup
        title="System & Security"
        description="Administrative and security features"
      >
        <FeatureToggle
          id="audit-logging"
          label="Audit Logging"
          description="Track all database changes and user actions"
          enabled={features.auditLogging}
          onChange={(enabled) => handleFeatureChange('auditLogging', enabled)}
          loading={loadingFeatures.includes('auditLogging')}
          danger={!features.auditLogging}
        />
        
        <FeatureToggle
          id="two-factor-auth"
          label="Two-Factor Authentication"
          description="Require 2FA for admin accounts"
          enabled={features.twoFactorAuth}
          onChange={(enabled) => handleFeatureChange('twoFactorAuth', enabled)}
          loading={loadingFeatures.includes('twoFactorAuth')}
          badge="Recommended"
        />
        
        <FeatureToggle
          id="api-access"
          label="API Access"
          description="Enable third-party API integrations"
          enabled={features.apiAccess}
          onChange={(enabled) => handleFeatureChange('apiAccess', enabled)}
          loading={loadingFeatures.includes('apiAccess')}
          locked={true}
          onLockedClick={handleLockedFeatureClick}
        />
        
        <FeatureToggle
          id="data-export"
          label="Data Export"
          description="Allow users to export their data"
          enabled={features.dataExport}
          onChange={(enabled) => handleFeatureChange('dataExport', enabled)}
          loading={loadingFeatures.includes('dataExport')}
        />
      </FeatureToggleGroup>

      {/* Cross-Platform Features */}
      <FeatureToggleGroup
        title="Cross-Platform Features"
        description="Mobile app and notification settings"
      >
        <FeatureToggle
          id="mobile-app"
          label="Mobile App Access"
          description="Enable iOS and Android mobile applications"
          enabled={features.mobileApp}
          onChange={(enabled) => handleFeatureChange('mobileApp', enabled)}
          loading={loadingFeatures.includes('mobileApp')}
          badge="Coming Soon"
        />
        
        <FeatureToggle
          id="push-notifications"
          label="Push Notifications"
          description="Send push notifications to mobile devices"
          enabled={features.pushNotifications}
          onChange={(enabled) => handleFeatureChange('pushNotifications', enabled)}
          loading={loadingFeatures.includes('pushNotifications')}
        />
        
        <FeatureToggle
          id="sms-notifications"
          label="SMS Notifications"
          description="Send SMS notifications via Twilio/Unifonic"
          enabled={features.smsNotifications}
          onChange={(enabled) => handleFeatureChange('smsNotifications', enabled)}
          loading={loadingFeatures.includes('smsNotifications')}
        />
        
        <FeatureToggle
          id="whatsapp-notifications"
          label="WhatsApp Notifications"
          description="Send notifications via WhatsApp Business API"
          enabled={features.whatsappNotifications}
          onChange={(enabled) => handleFeatureChange('whatsappNotifications', enabled)}
          loading={loadingFeatures.includes('whatsappNotifications')}
          locked={true}
          onLockedClick={handleLockedFeatureClick}
        />
      </FeatureToggleGroup>

      {/* Save Button (optional, changes are auto-saved) */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Changes are saved automatically
        </p>
      </div>
    </div>
  );
}
