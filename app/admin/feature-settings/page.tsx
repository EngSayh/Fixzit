"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FeatureToggle,
  FeatureToggleGroup,
} from "@/components/ui/feature-toggle";
import { FeatureToggleGroupSkeleton } from "@/components/ui/feature-toggle-skeleton";
import { UpgradeModal } from "@/components/admin/UpgradeModal";
import toast from "react-hot-toast";

import { logger } from "@/lib/logger";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
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
  const { data: session, status } = useSession();
  const auto = useAutoTranslator("admin.featureSettings");
  const [loading, setLoading] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState<string>("");

  // Initialize with null to handle loading state explicitly
  const [features, setFeatures] = useState<FeatureFlags | null>(null);

  /**
   * Fetch feature flags from API on mount
   */
  useEffect(() => {
    const fetchFeatureFlags = async () => {
      try {
        const response = await fetch("/api/admin/feature-flags");
        if (!response.ok) {
          throw new Error("Failed to fetch feature flags");
        }
        const data = await response.json();
        setFeatures(data.features || data);
        setError(null); // Clear any previous errors
      } catch (err) {
        logger.error(
          "Failed to fetch feature flags",
          err instanceof Error ? err : new Error(String(err)),
          { route: "/admin/feature-settings" },
        );
        // Proper Error instance check with fallback
        const errorMessage =
          err instanceof Error
            ? err.message
            : "An unknown error occurred while loading feature settings";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatureFlags();
  }, []);

  /**
   * Handle feature toggle change
   */
  const handleFeatureChange = async (
    featureKey: keyof FeatureFlags,
    enabled: boolean,
  ) => {
    if (!features) return; // Guard against null state

    // Store previous value for rollback on error
    const previousValue = features[featureKey];

    // Optimistic update - update UI immediately
    setFeatures((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [featureKey]: enabled,
      };
    });

    // Add to loading state
    setLoadingFeatures((prev) => [...prev, featureKey]);

    try {
      // Save to backend API
      const response = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: featureKey,
          enabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to update feature: ${response.statusText}`,
        );
      }

      // Show success toast with feature name
      const featureName = featureKey
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      toast.success(
        `${featureName} ${enabled ? "enabled" : "disabled"} successfully`,
      );

      // Note: We don't overwrite all features to avoid race conditions
      // The optimistic update is kept unless there's an error
    } catch (err) {
      logger.error(
        "Failed to update feature",
        err instanceof Error ? err : new Error(String(err)),
        { route: "/admin/feature-settings", featureKey, enabled },
      );
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while updating feature";

      // Rollback to previous value on error
      setFeatures((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [featureKey]: previousValue,
        };
      });

      // Show error toast
      toast.error(errorMessage);
    } finally {
      // Remove from loading state
      setLoadingFeatures((prev) => prev.filter((k) => k !== featureKey));
    }
  };

  /**
   * Handle locked feature click (upgrade required)
   * Opens modal instead of alert for better UX
   */
  const handleLockedFeatureClick = (featureName: string) => {
    setLockedFeatureName(featureName);
    setUpgradeModalOpen(true);
  };

  // Check authentication and authorization
  if (status === "loading") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <div className="h-8 bg-muted dark:bg-gray-700 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-muted dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
        </div>
        <FeatureToggleGroupSkeleton />
      </div>
    );
  }

  // Check if user is authenticated
  if (status === "unauthenticated" || !session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-warning/10 dark:bg-warning/10 border border-warning/20 dark:border-warning/30 rounded-2xl p-6">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-warning dark:text-warning mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ms-3">
              <h3 className="text-lg font-medium text-warning-foreground dark:text-warning-foreground">
                {auto("Authentication Required", "authRequired.title")}
              </h3>
              <p className="mt-2 text-sm text-warning dark:text-warning">
                {auto(
                  "You must be logged in to access Feature Settings.",
                  "authRequired.description",
                )}
              </p>
              <a
                href="/login"
                className="mt-4 inline-block px-4 py-2 bg-warning text-white rounded hover:bg-warning/90"
              >
                {auto("Go to Login", "authRequired.cta")}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is Super Admin
  if (session.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-destructive/10 dark:bg-destructive/10 border border-destructive/20 dark:border-destructive/30 rounded-2xl p-6">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-destructive dark:text-destructive mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ms-3">
              <h3 className="text-lg font-medium text-destructive-foreground dark:text-destructive-foreground">
                {auto("Access Denied", "accessDenied.title")}
              </h3>
              <p className="mt-2 text-sm text-destructive dark:text-destructive">
                {auto(
                  "You do not have permission to access Feature Settings. This page is restricted to Super Admin users only.",
                  "accessDenied.description",
                )}
              </p>
              <p className="mt-2 text-sm text-destructive dark:text-destructive">
                {auto("Your role", "accessDenied.roleLabel")}:{" "}
                <strong>{session.user?.role || "Unknown"}</strong>
              </p>
              <a
                href="/dashboard"
                className="mt-4 inline-block px-4 py-2 bg-destructive text-white rounded hover:bg-destructive/90"
              >
                {auto("Return to Dashboard", "accessDenied.cta")}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show skeleton loaders during initial load
  if (loading || !features) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <div className="h-8 bg-muted dark:bg-gray-700 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-muted dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
        </div>
        <FeatureToggleGroupSkeleton />
        <FeatureToggleGroupSkeleton />
        <FeatureToggleGroupSkeleton />
        <FeatureToggleGroupSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 dark:bg-destructive/10 border border-destructive/20 dark:border-destructive/30 rounded-2xl p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-destructive dark:text-destructive mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ms-3 flex-1">
              <h3 className="text-sm font-medium text-destructive-foreground dark:text-destructive-foreground">
                {auto("Error Loading Feature Settings", "errors.loadTitle")}
              </h3>
              <p className="mt-1 text-sm text-destructive dark:text-destructive">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-sm font-medium text-destructive dark:text-destructive hover:text-destructive dark:hover:text-destructive"
              >
                {auto("Retry", "errors.retry")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">
          {auto("Feature Settings", "header.title")}
        </h1>
        <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
          {auto(
            "Enable or disable platform features. Changes take effect immediately.",
            "header.subtitle",
          )}
        </p>
      </div>

      {/* Customer & User Lifecycle */}
      <FeatureToggleGroup
        title={auto("Customer & User Management", "groups.customer.title")}
        description={auto(
          "Features related to customer lifecycle, family management, and HR",
          "groups.customer.description",
        )}
      >
        <FeatureToggle
          id="referral-program"
          label={auto("Referral Program", "features.referralProgram.label")}
          description={auto(
            "Allow users to refer others and earn rewards",
            "features.referralProgram.description",
          )}
          enabled={features.referralProgram}
          onChange={(enabled) =>
            handleFeatureChange("referralProgram", enabled)
          }
          loading={loadingFeatures.includes("referralProgram")}
          badge={auto("New", "badges.new")}
        />

        <FeatureToggle
          id="family-management"
          label={auto("Family Management", "features.familyManagement.label")}
          description={auto(
            "Enable family member invitations and shared access",
            "features.familyManagement.description",
          )}
          enabled={features.familyManagement}
          onChange={(enabled) =>
            handleFeatureChange("familyManagement", enabled)
          }
          loading={loadingFeatures.includes("familyManagement")}
          badge={auto("Beta", "badges.beta")}
        />

        <FeatureToggle
          id="hr-module"
          label={auto("HR Module", "features.hrModule.label")}
          description={auto(
            "Employee management and vacation tracking",
            "features.hrModule.description",
          )}
          enabled={features.hrModule}
          onChange={(enabled) => handleFeatureChange("hrModule", enabled)}
          loading={loadingFeatures.includes("hrModule")}
        />

        <FeatureToggle
          id="vacation-requests"
          label={auto("Vacation Requests", "features.vacationRequests.label")}
          description={auto(
            "Allow employees to submit vacation requests",
            "features.vacationRequests.description",
          )}
          enabled={features.vacationRequests}
          onChange={(enabled) =>
            handleFeatureChange("vacationRequests", enabled)
          }
          loading={loadingFeatures.includes("vacationRequests")}
        />
      </FeatureToggleGroup>

      {/* Legal & Contract Management */}
      <FeatureToggleGroup
        title={auto("Legal & Contracts", "groups.legal.title")}
        description={auto(
          "Contract management and legal document features",
          "groups.legal.description",
        )}
      >
        <FeatureToggle
          id="electronic-contracts"
          label={auto(
            "Electronic Contracts",
            "features.electronicContracts.label",
          )}
          description={auto(
            "Enable digital contract signing via Ejar",
            "features.electronicContracts.description",
          )}
          enabled={features.electronicContracts}
          onChange={(enabled) =>
            handleFeatureChange("electronicContracts", enabled)
          }
          loading={loadingFeatures.includes("electronicContracts")}
        />

        <FeatureToggle
          id="electronic-attorneys"
          label={auto(
            "Electronic Attorneys",
            "features.electronicAttorneys.label",
          )}
          description={auto(
            "Power of Attorney management system",
            "features.electronicAttorneys.description",
          )}
          enabled={features.electronicAttorneys}
          onChange={(enabled) =>
            handleFeatureChange("electronicAttorneys", enabled)
          }
          loading={loadingFeatures.includes("electronicAttorneys")}
          badge={auto("Coming Soon", "badges.comingSoon")}
        />
      </FeatureToggleGroup>

      {/* Financial & Accounting */}
      <FeatureToggleGroup
        title={auto("Financial & Accounting", "groups.finance.title")}
        description={auto(
          "Payment processing, invoicing, and financial features",
          "groups.finance.description",
        )}
      >
        <FeatureToggle
          id="auto-payments"
          label={auto("Auto Payments", "features.autoPayments.label")}
          description={auto(
            "Automatic payment processing via Stripe/Tap",
            "features.autoPayments.description",
          )}
          enabled={features.autoPayments}
          onChange={(enabled) => handleFeatureChange("autoPayments", enabled)}
          loading={loadingFeatures.includes("autoPayments")}
        />

        <FeatureToggle
          id="payment-links"
          label={auto("Payment Links", "features.paymentLinks.label")}
          description={auto(
            "Generate payment links for tenants",
            "features.paymentLinks.description",
          )}
          enabled={features.paymentLinks}
          onChange={(enabled) => handleFeatureChange("paymentLinks", enabled)}
          loading={loadingFeatures.includes("paymentLinks")}
        />

        <FeatureToggle
          id="receipt-vouchers"
          label={auto(
            "Receipt Vouchers with QR",
            "features.receiptVouchers.label",
          )}
          description={auto(
            "Generate receipt vouchers with QR codes",
            "features.receiptVouchers.description",
          )}
          enabled={features.receiptVouchers}
          onChange={(enabled) =>
            handleFeatureChange("receiptVouchers", enabled)
          }
          loading={loadingFeatures.includes("receiptVouchers")}
          badge={auto("New", "badges.new")}
        />

        <FeatureToggle
          id="ejar-wallet"
          label={auto("Ejar Wallet Integration", "features.ejarWallet.label")}
          description={auto(
            "Connect with Ejar digital wallet",
            "features.ejarWallet.description",
          )}
          enabled={features.ejarWallet}
          onChange={(enabled) => handleFeatureChange("ejarWallet", enabled)}
          loading={loadingFeatures.includes("ejarWallet")}
          locked={true}
          onLockedClick={() =>
            handleLockedFeatureClick(
              auto("Ejar Wallet Integration", "features.ejarWallet.label"),
            )
          }
        />
      </FeatureToggleGroup>

      {/* Service & Maintenance */}
      <FeatureToggleGroup
        title={auto("Service & Maintenance", "groups.service.title")}
        description={auto(
          "Maintenance request management and service provider features",
          "groups.service.description",
        )}
      >
        <FeatureToggle
          id="service-ratings"
          label={auto("Service Ratings", "features.serviceRatings.label")}
          description={auto(
            "Allow customers to rate service providers",
            "features.serviceRatings.description",
          )}
          enabled={features.serviceRatings}
          onChange={(enabled) => handleFeatureChange("serviceRatings", enabled)}
          loading={loadingFeatures.includes("serviceRatings")}
        />

        <FeatureToggle
          id="warranty-tracker"
          label={auto("Warranty Tracker", "features.warrantyTracker.label")}
          description={auto(
            "Track appliance and equipment warranties",
            "features.warrantyTracker.description",
          )}
          enabled={features.warrantyTracker}
          onChange={(enabled) =>
            handleFeatureChange("warrantyTracker", enabled)
          }
          loading={loadingFeatures.includes("warrantyTracker")}
          badge={auto("Beta", "badges.beta")}
        />

        <FeatureToggle
          id="spare-parts-approval"
          label={auto(
            "Spare Parts Approval",
            "features.sparePartsApproval.label",
          )}
          description={auto(
            "Require tenant approval for spare parts purchases",
            "features.sparePartsApproval.description",
          )}
          enabled={features.sparePartsApproval}
          onChange={(enabled) =>
            handleFeatureChange("sparePartsApproval", enabled)
          }
          loading={loadingFeatures.includes("sparePartsApproval")}
        />

        <FeatureToggle
          id="emergency-maintenance"
          label={auto(
            "Emergency Maintenance",
            "features.emergencyMaintenance.label",
          )}
          description={auto(
            "24/7 emergency maintenance requests",
            "features.emergencyMaintenance.description",
          )}
          enabled={features.emergencyMaintenance}
          onChange={(enabled) =>
            handleFeatureChange("emergencyMaintenance", enabled)
          }
          loading={loadingFeatures.includes("emergencyMaintenance")}
        />
      </FeatureToggleGroup>

      {/* Marketplace & Project Bidding */}
      <FeatureToggleGroup
        title={auto("Marketplace & Projects", "groups.marketplace.title")}
        description={auto(
          "Project bidding, vendor management, and e-commerce",
          "groups.marketplace.description",
        )}
      >
        <FeatureToggle
          id="project-bidding"
          label={auto(
            "Project Bidding System",
            "features.projectBidding.label",
          )}
          description={auto(
            "Allow contractors to bid on projects",
            "features.projectBidding.description",
          )}
          enabled={features.projectBidding}
          onChange={(enabled) => handleFeatureChange("projectBidding", enabled)}
          loading={loadingFeatures.includes("projectBidding")}
          badge={auto("New", "badges.new")}
        />

        <FeatureToggle
          id="vendor-verification"
          label={auto(
            "Vendor Verification",
            "features.vendorVerification.label",
          )}
          description={auto(
            "Background checks and document verification for vendors",
            "features.vendorVerification.description",
          )}
          enabled={features.vendorVerification}
          onChange={(enabled) =>
            handleFeatureChange("vendorVerification", enabled)
          }
          loading={loadingFeatures.includes("vendorVerification")}
        />

        <FeatureToggle
          id="online-store"
          label={auto("Online Store (Souq)", "features.onlineStore.label")}
          description={auto(
            "Public e-commerce store for products and services",
            "features.onlineStore.description",
          )}
          enabled={features.onlineStore}
          onChange={(enabled) => handleFeatureChange("onlineStore", enabled)}
          loading={loadingFeatures.includes("onlineStore")}
        />
      </FeatureToggleGroup>

      {/* System & Administration */}
      <FeatureToggleGroup
        title={auto("System & Security", "groups.system.title")}
        description={auto(
          "Administrative and security features",
          "groups.system.description",
        )}
      >
        <FeatureToggle
          id="audit-logging"
          label={auto("Audit Logging", "features.auditLogging.label")}
          description={auto(
            "Track all database changes and user actions",
            "features.auditLogging.description",
          )}
          enabled={features.auditLogging}
          onChange={(enabled) => handleFeatureChange("auditLogging", enabled)}
          loading={loadingFeatures.includes("auditLogging")}
          danger={!features.auditLogging}
        />

        <FeatureToggle
          id="two-factor-auth"
          label={auto(
            "Two-Factor Authentication",
            "features.twoFactorAuth.label",
          )}
          description={auto(
            "Require 2FA for admin accounts",
            "features.twoFactorAuth.description",
          )}
          enabled={features.twoFactorAuth}
          onChange={(enabled) => handleFeatureChange("twoFactorAuth", enabled)}
          loading={loadingFeatures.includes("twoFactorAuth")}
          badge={auto("Recommended", "badges.recommended")}
        />

        <FeatureToggle
          id="api-access"
          label={auto("API Access", "features.apiAccess.label")}
          description={auto(
            "Enable third-party API integrations",
            "features.apiAccess.description",
          )}
          enabled={features.apiAccess}
          onChange={(enabled) => handleFeatureChange("apiAccess", enabled)}
          loading={loadingFeatures.includes("apiAccess")}
          locked={true}
          onLockedClick={() =>
            handleLockedFeatureClick(
              auto("API Access", "features.apiAccess.label"),
            )
          }
        />

        <FeatureToggle
          id="data-export"
          label={auto("Data Export", "features.dataExport.label")}
          description={auto(
            "Allow users to export their data",
            "features.dataExport.description",
          )}
          enabled={features.dataExport}
          onChange={(enabled) => handleFeatureChange("dataExport", enabled)}
          loading={loadingFeatures.includes("dataExport")}
        />
      </FeatureToggleGroup>

      {/* Cross-Platform Features */}
      <FeatureToggleGroup
        title={auto("Cross-Platform Features", "groups.crossPlatform.title")}
        description={auto(
          "Mobile app and notification settings",
          "groups.crossPlatform.description",
        )}
      >
        <FeatureToggle
          id="mobile-app"
          label={auto("Mobile App Access", "features.mobileApp.label")}
          description={auto(
            "Enable iOS and Android mobile applications",
            "features.mobileApp.description",
          )}
          enabled={features.mobileApp}
          onChange={(enabled) => handleFeatureChange("mobileApp", enabled)}
          loading={loadingFeatures.includes("mobileApp")}
          badge={auto("Coming Soon", "badges.comingSoon")}
        />

        <FeatureToggle
          id="push-notifications"
          label={auto("Push Notifications", "features.pushNotifications.label")}
          description={auto(
            "Send push notifications to mobile devices",
            "features.pushNotifications.description",
          )}
          enabled={features.pushNotifications}
          onChange={(enabled) =>
            handleFeatureChange("pushNotifications", enabled)
          }
          loading={loadingFeatures.includes("pushNotifications")}
        />

        <FeatureToggle
          id="sms-notifications"
          label={auto("SMS Notifications", "features.smsNotifications.label")}
          description={auto(
            "Send SMS notifications via Twilio/Unifonic",
            "features.smsNotifications.description",
          )}
          enabled={features.smsNotifications}
          onChange={(enabled) =>
            handleFeatureChange("smsNotifications", enabled)
          }
          loading={loadingFeatures.includes("smsNotifications")}
        />

        <FeatureToggle
          id="whatsapp-notifications"
          label={auto(
            "WhatsApp Notifications",
            "features.whatsappNotifications.label",
          )}
          description={auto(
            "Send notifications via WhatsApp Business API",
            "features.whatsappNotifications.description",
          )}
          enabled={features.whatsappNotifications}
          onChange={(enabled) =>
            handleFeatureChange("whatsappNotifications", enabled)
          }
          loading={loadingFeatures.includes("whatsappNotifications")}
          locked={true}
          onLockedClick={() =>
            handleLockedFeatureClick(
              auto(
                "WhatsApp Notifications",
                "features.whatsappNotifications.label",
              ),
            )
          }
        />
      </FeatureToggleGroup>

      {/* Save Button (optional, changes are auto-saved) */}
      <div className="flex justify-end pt-6 border-t border-border dark:border-gray-700">
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
          {auto("Changes are saved automatically", "footer.autoSaved")}
        </p>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={lockedFeatureName}
      />
    </div>
  );
}
