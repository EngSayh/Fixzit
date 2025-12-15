"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Mail,
  Lock,
  Building2,
  Phone,
  Globe,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";
import { BrandLogoWithCard } from "@/components/brand";

// ✅ FIXED: Import config instead of redefining
import { SIGNUP_USER_TYPES } from "@/config/signup.config";
import { STORAGE_KEYS, APP_DEFAULTS } from "@/config/constants";

// ✅ FIXED: Import standard components instead of custom dropdowns
import LanguageSelector from "@/components/i18n/LanguageSelector";
import CurrencySelector from "@/components/i18n/CurrencySelector";

// Field-level error system
import {
  type FieldErrors as StandardFieldErrors,
  validateAuthFields,
  extractFieldErrors,
  focusField,
} from "@/lib/errors/field-errors";
import { FormField } from "@/components/ui/form-field";

export default function SignupPage() {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    userType: "personal",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    newsletter: true,
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<StandardFieldErrors>({});
  const [error, setError] = useState(""); // General error
  const [success, setSuccess] = useState(false);
  // ✅ REMOVED: showLangDropdown, showCurrencyDropdown, selectedLang, selectedCurrency state
  // Standard components handle their own state internally

  const router = useRouter();

  // ✅ REMOVED: useEffect for loading preferences - components handle internally
  // ✅ REMOVED: handleLanguageChange - LanguageSelector handles internally
  // ✅ REMOVED: handleCurrencyChange - CurrencySelector handles internally

  // Handle input changes
  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear errors when user starts typing
    if (error) setError("");
    if (fieldErrors[field as keyof StandardFieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Form validation with field-level errors
  const validateForm = (): boolean => {
    const errors: StandardFieldErrors = {};

    // Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = t("signup.validation.firstNameRequired", "First name is required");
    }
    if (!formData.lastName.trim()) {
      errors.lastName = t("signup.validation.lastNameRequired", "Last name is required");
    }

    // Use validateAuthFields for standardized validation
    const authErrors = validateAuthFields({
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    // Merge errors
    Object.assign(errors, authErrors);

    // Add company name validation for corporate accounts
    if (formData.userType === "corporate" && !formData.companyName.trim()) {
      errors.orgName = t(
        "signup.validation.companyRequired",
        "Company name is required for corporate accounts"
      );
    }

    // Add terms and conditions validation
    if (!formData.termsAccepted) {
      setError(t(
        "signup.validation.termsRequired",
        "Please accept the terms and conditions"
      ));
      return false;
    }

    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus the first error field
      const firstErrorField = Object.keys(errors)[0];
      focusField(firstErrorField);
      return false;
    }

    return true;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // ✅ FIXED: Get language/currency from localStorage (managed by standard components)
      const preferredLanguage =
        localStorage.getItem(STORAGE_KEYS.language) || APP_DEFAULTS.language;
      const preferredCurrency =
        localStorage.getItem(STORAGE_KEYS.currency) || APP_DEFAULTS.currency;

      const signupData = {
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`,
        preferredLanguage,
        preferredCurrency,
      };

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Try to extract field-level errors from API response
        if (data.field && data.code) {
          const errors = extractFieldErrors(data);
          setFieldErrors(errors);
          focusField(data.field);
        } else {
          // Fall back to general error
          setError(data.error || "Signup failed");
        }
        throw new Error(data.error || "Signup failed");
      }

      if (data.ok) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      // If we haven't already set field-level errors, set general error
      if (Object.keys(fieldErrors).length === 0) {
        setError(err instanceof Error ? err.message : "Signup failed");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-success/10 dark:bg-success/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t("signup.success.title", "Account Created Successfully!")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                "signup.success.message",
                "Welcome to Fixzit Enterprise! Your account has been created. Please check your email to verify your account, then sign in.",
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                "signup.success.redirecting",
                "Redirecting you to the login page...",
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-success to-accent flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <BrandLogoWithCard 
                size="xl" 
                alt="Fixzit Logo"
                fetchOrgLogo={false}
                data-testid="signup-logo"
              />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {t("signup.branding.title", "Join Fixzit Enterprise")}
            </h1>
            <p className="text-xl text-white/90 mb-8">
              {t(
                "signup.branding.subtitle",
                "Create your account and start managing your facilities and marketplace operations",
              )}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold">
                  {t("signup.features.facility.title", "Facility Management")}
                </h3>
                <p className="text-white/80 text-sm">
                  {t(
                    "signup.features.facility.desc",
                    "Streamline your operations",
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-semibold">
                  {t("signup.features.marketplace.title", "Marketplace")}
                </h3>
                <p className="text-white/80 text-sm">
                  {t(
                    "signup.features.marketplace.desc",
                    "Connect with trusted vendors",
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-semibold">
                  {t("signup.features.support.title", "Support")}
                </h3>
                <p className="text-white/80 text-sm">
                  {t("signup.features.support.desc", "24/7 customer service")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Top Bar with Language and Currency */}
          <div className="flex items-center justify-between mb-8">
            {/* ✅ FIXED: Use standard LanguageSelector and CurrencySelector components */}
            <div className="flex items-center gap-2">
              <LanguageSelector variant="compact" />
              <CurrencySelector variant="compact" />
            </div>

            <Link
              href="/login"
              className="text-white/80 hover:text-white text-sm flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              {t("signup.backToLogin", "Back to Login")}
            </Link>
          </div>

          {/* Signup Form */}
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t("signup.form.title", "Create Your Account")}
              </h2>
              <p className="text-muted-foreground">
                {t(
                  "signup.form.subtitle",
                  "Join Fixzit Enterprise today. We'll send a verification email after signup.",
                )}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* User Type Selection */}
              <div>
                <Label
                  htmlFor="userType"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t("signup.fields.accountType", "Account Type")}
                </Label>
                <Select
                  value={formData.userType}
                  onValueChange={(value) => handleChange("userType", value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* ✅ FIXED: Use imported SIGNUP_USER_TYPES with t() for labels */}
                    {SIGNUP_USER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)} - {t(type.descriptionKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="firstName"
                  label={t("signup.fields.firstName", "First Name")}
                  required
                  type="text"
                  value={formData.firstName}
                  onChange={(val) => handleChange("firstName", val)}
                  error={fieldErrors.firstName}
                  placeholder={t(
                    "signup.placeholders.firstName",
                    "Enter your first name"
                  )}
                  icon={User}
                />
                <FormField
                  name="lastName"
                  label={t("signup.fields.lastName", "Last Name")}
                  required
                  type="text"
                  value={formData.lastName}
                  onChange={(val) => handleChange("lastName", val)}
                  error={fieldErrors.lastName}
                  placeholder={t(
                    "signup.placeholders.lastName",
                    "Enter your last name"
                  )}
                  icon={User}
                />
              </div>

              {/* Email Field */}
              <FormField
                name="email"
                label={t("signup.fields.email", "Email Address")}
                required
                type="email"
                value={formData.email}
                onChange={(val) => handleChange("email", val)}
                error={fieldErrors.email}
                placeholder={t(
                  "signup.placeholders.email",
                  "Enter your email address"
                )}
                autoComplete="email"
                icon={Mail}
              />

              {/* Phone Field */}
              <FormField
                name="phone"
                label={t("signup.fields.phone", "Phone Number")}
                required
                type="tel"
                value={formData.phone}
                onChange={(val) => handleChange("phone", val)}
                error={fieldErrors.phone}
                placeholder={t(
                  "signup.placeholders.phone",
                  "+966 XX XXX XXXX"
                )}
                autoComplete="tel"
                icon={Phone}
              />

              {/* Company Name (for corporate accounts) */}
              {formData.userType === "corporate" && (
                <FormField
                  name="companyName"
                  label={t("signup.fields.companyName", "Company Name")}
                  required
                  type="text"
                  value={formData.companyName}
                  onChange={(val) => handleChange("companyName", val)}
                  error={fieldErrors.orgName}
                  placeholder={t(
                    "signup.placeholders.companyName",
                    "Enter your company name"
                  )}
                  autoComplete="organization"
                  icon={Building2}
                />
              )}

              {/* Password Fields */}
              <div className="space-y-4">
                <FormField
                  name="password"
                  label={t("signup.fields.password", "Password")}
                  required
                  type="password"
                  value={formData.password}
                  onChange={(val) => handleChange("password", val)}
                  error={fieldErrors.password}
                  placeholder={t(
                    "signup.placeholders.password",
                    "Create a strong password"
                  )}
                  autoComplete="new-password"
                  showPasswordToggle
                  icon={Lock}
                  helpText={t(
                    "signup.passwordHelp",
                    "At least 8 characters with letters, numbers, and symbols"
                  )}
                />

                <FormField
                  name="confirmPassword"
                  label={t("signup.fields.confirmPassword", "Confirm Password")}
                  required
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(val) => handleChange("confirmPassword", val)}
                  error={fieldErrors.confirmPassword}
                  placeholder={t(
                    "signup.placeholders.confirmPassword",
                    "Confirm your password"
                  )}
                  autoComplete="new-password"
                  showPasswordToggle
                  icon={Lock}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 dark:bg-destructive/10 border border-border rounded-2xl text-destructive dark:text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Terms and Newsletter */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) =>
                      handleChange("termsAccepted", e.target.checked)
                    }
                    className="mt-1 h-4 w-4 text-primary border-border rounded focus:ring-primary"
                    required
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("signup.terms.agree", "I agree to the")}{" "}
                    <Link
                      href="/terms"
                      className="text-primary hover:text-primary transition-colors"
                    >
                      {t("signup.terms.service", "Terms of Service")}
                    </Link>{" "}
                    {t("signup.terms.and", "and")}{" "}
                    <Link
                      href="/privacy"
                      className="text-primary hover:text-primary transition-colors"
                    >
                      {t("signup.terms.privacy", "Privacy Policy")}
                    </Link>
                    *
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.newsletter}
                    onChange={(e) =>
                      handleChange("newsletter", e.target.checked)
                    }
                    className="mt-1 h-4 w-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t(
                      "signup.newsletter",
                      "I'd like to receive updates and promotional emails about Fixzit Enterprise",
                    )}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("signup.button.creating", "Creating Account...")}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    {t("signup.button.create", "Create Account")}
                  </div>
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {t("signup.login.prompt", "Already have an account?")}{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary font-medium transition-colors"
                >
                  {t("signup.login.link", "Sign in here")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
