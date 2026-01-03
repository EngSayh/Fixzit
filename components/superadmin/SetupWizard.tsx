"use client";

/**
 * Superadmin Setup Wizard
 * 
 * First-time setup wizard for new tenants:
 * - Step 1: Branding (logo, company name, colors)
 * - Step 2: Defaults (language, currency, timezone)
 * - Step 3: Initial admin user creation
 * 
 * Shown on first login when org.setup_complete === false
 * Sets org.setup_complete = true on completion
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check, Upload } from "@/components/ui/icons";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { BRAND_COLORS } from "@/lib/config/brand-colors";

type WizardStep = "branding" | "defaults" | "users" | "complete";

interface BrandingData {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

interface DefaultsData {
  language: string;
  currency: string;
  timezone: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export function SetupWizard() {
  const router = useRouter();
  const navigate = (href: string) => {
    if (router?.push) {
      router.push(href);
    } else {
      logger.warn("[SetupWizard] Navigation skipped - no router available", {
        component: "SetupWizard",
        href,
      });
    }
  };
  const [currentStep, setCurrentStep] = useState<WizardStep>("branding");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [branding, setBranding] = useState<BrandingData>({
    companyName: "",
    logoUrl: "",
    primaryColor: BRAND_COLORS.primary,
    secondaryColor: BRAND_COLORS.secondary,
  });

  const [defaults, setDefaults] = useState<DefaultsData>({
    language: "en",
    currency: "SAR",
    timezone: "Asia/Riyadh",
  });

  const [user, setUser] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const steps: WizardStep[] = ["branding", "defaults", "users", "complete"];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PNG and JPG logos are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Logo must be smaller than 10MB");
      return;
    }

    try {
      const presignRes = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          category: "document",
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Failed to request upload URL");
      }

      const presign = await presignRes.json();
      const putHeaders: Record<string, string> = {
        ...(presign.uploadHeaders ?? {}),
        "Content-Type": file.type || "application/octet-stream",
      };

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: putHeaders,
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("Failed to upload logo");
      }

      const publicUrl = presign.uploadUrl.split("?")[0];
      setBranding((prev) => ({ ...prev, logoUrl: publicUrl }));
      toast.success("Logo uploaded successfully");
    } catch (error) {
      logger.error("[SetupWizard] Logo upload failed", { error });
      toast.error("Logo upload failed. Please try again.");
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      // Save branding
      const brandingRes = await fetch("/api/superadmin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });

      if (!brandingRes.ok) throw new Error("Failed to save branding");

      // Save defaults
      const defaultsRes = await fetch("/api/superadmin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });

      if (!defaultsRes.ok) throw new Error("Failed to save defaults");

      // Create initial admin user
      const userRes = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user,
          role: "SUPER_ADMIN",
        }),
      });

      if (!userRes.ok) throw new Error("Failed to create user");

      // Mark setup as complete
      const completeRes = await fetch("/api/superadmin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup_complete: true }),
      });

      if (!completeRes.ok) throw new Error("Failed to mark setup complete");

      setCurrentStep("complete");
      toast.success("Setup completed successfully!");
    } catch (error) {
      logger.error("[SuperadminSetup] Setup failed", { error });
      toast.error("Setup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "branding":
        return branding.companyName.trim() !== "";
      case "defaults":
        return defaults.language && defaults.currency && defaults.timezone;
      case "users":
        return user.firstName.trim() !== "" && user.email.trim() !== "";
      case "complete":
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Fixzit</CardTitle>
          <CardDescription>
            Let's set up your organization in 3 simple steps
          </CardDescription>
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {steps.slice(0, -1).map((step, idx) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  idx <= currentStepIndex
                    ? "bg-blue-600"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {/* Step 1: Branding */}
          {currentStep === "branding" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={branding.companyName}
                  onChange={(e) =>
                    setBranding({ ...branding, companyName: e.target.value })
                  }
                  placeholder="Acme Facilities Co."
                />
              </div>

              <div>
                <Label htmlFor="logo">Company Logo</Label>
                <div className="flex items-center gap-4">
                  {branding.logoUrl && (
                    <img
                      src={branding.logoUrl}
                      alt="Logo preview"
                      className="h-16 w-16 object-contain rounded border border-slate-200 dark:border-slate-700"
                    />
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <label htmlFor="logoUpload" className="cursor-pointer">
                      <Upload className="w-4 h-4 me-2" />
                      Upload Logo
                    </label>
                  </Button>
                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding({ ...branding, primaryColor: e.target.value })
                      }
                      className="w-16 h-10 cursor-pointer"
                    />
                    <Input
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding({ ...branding, primaryColor: e.target.value })
                      }
                      placeholder={BRAND_COLORS.primary}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) =>
                        setBranding({ ...branding, secondaryColor: e.target.value })
                      }
                      className="w-16 h-10 cursor-pointer"
                    />
                    <Input
                      value={branding.secondaryColor}
                      onChange={(e) =>
                        setBranding({ ...branding, secondaryColor: e.target.value })
                      }
                      placeholder={BRAND_COLORS.secondary}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Defaults */}
          {currentStep === "defaults" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="language">Default Language</Label>
                <Select
                  value={defaults.language}
                  onValueChange={(value) =>
                    setDefaults({ ...defaults, language: value })
                  }
                  placeholder="Select language"
                >
                  <SelectTrigger id="language">
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Default Currency</Label>
                <Select
                  value={defaults.currency}
                  onValueChange={(value) =>
                    setDefaults({ ...defaults, currency: value })
                  }
                  placeholder="Select currency"
                >
                  <SelectTrigger id="currency">
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={defaults.timezone}
                  onValueChange={(value) =>
                    setDefaults({ ...defaults, timezone: value })
                  }
                  placeholder="Select timezone"
                >
                  <SelectTrigger id="timezone">
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Riyadh">Asia/Riyadh (GMT+3)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GMT+4)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Users */}
          {currentStep === "users" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create your first admin user. This user will have full access to all system features.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={user.firstName}
                    onChange={(e) =>
                      setUser({ ...user, firstName: e.target.value })
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={user.lastName}
                    onChange={(e) =>
                      setUser({ ...user, lastName: e.target.value })
                    }
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  onChange={(e) =>
                    setUser({ ...user, email: e.target.value })
                  }
                  placeholder="john.doe@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={user.phone}
                  onChange={(e) =>
                    setUser({ ...user, phone: e.target.value })
                  }
                  placeholder="+966 50 123 4567"
                />
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === "complete" && (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
                  <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold">Setup Complete!</h3>
              <p className="text-muted-foreground">
                Your organization is now ready to use. Click below to get started.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {currentStep !== "complete" && (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0 || isSubmitting}
                aria-label="Go back to previous step"
              >
                <ChevronLeft className="w-4 h-4 me-2" />
                Back
              </Button>

              {currentStep === "users" ? (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed() || isSubmitting}
                  aria-label="Complete organization setup"
                >
                  {isSubmitting ? "Completing..." : "Complete Setup"}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  aria-label="Go to next step"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ms-2" />
                </Button>
              )}
            </>
          )}

          {currentStep === "complete" && (
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full"
              aria-label="Go to dashboard"
            >
              Go to Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
