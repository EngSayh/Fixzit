"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  CreditCard,
  Shield,
  Check,
  ArrowLeft,
  Loader2,
  Building2,
  Mail,
  User,
  Lock,
  Phone,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getPlan } from "@/lib/plans";

function CheckoutContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = searchParams?.get("plan") || "standard";
  // Sanitize users param: parse, fallback to 1 if NaN or <1, clamp to sensible max
  const rawUsers = parseInt(searchParams?.get("users") || "1", 10);
  const users = Math.min(1000, Math.max(1, Number.isNaN(rawUsers) ? 1 : Math.floor(rawUsers)));
  const plan = getPlan(planId);

  // All hooks must be called before any early returns (React Hook rules)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"account" | "payment" | "success">("account");
  // Card payment fields removed - payment integration pending
  // When Stripe/TAP is integrated, use their tokenized input components

  // Guard against undefined plan (invalid planId)
  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("checkout.invalidPlan") || "Invalid Plan"}</h1>
          <p className="text-muted-foreground mb-4">{t("checkout.invalidPlanDescription") || "The selected plan does not exist."}</p>
          <Button onClick={() => router.push("/pricing")}>{t("checkout.backToPricing") || "Back to Pricing"}</Button>
        </div>
      </div>
    );
  }

  const subtotal = plan.pricePerUser * users;
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validateAccountStep = (): boolean => {
    if (!formData.firstName.trim()) {
      setError(t("checkout.errors.firstNameRequired", "First name is required"));
      return false;
    }
    if (!formData.lastName.trim()) {
      setError(t("checkout.errors.lastNameRequired", "Last name is required"));
      return false;
    }
    const emailTrimmed = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      setError(t("checkout.errors.validEmail", "Please enter a valid email"));
      return false;
    }
    if (!formData.companyName.trim()) {
      setError(t("checkout.errors.companyRequired", "Company name is required"));
      return false;
    }
    if (!formData.phone.trim()) {
      setError(t("checkout.errors.phoneRequired", "Phone number is required"));
      return false;
    }
    if (formData.password.length < 8) {
      setError(t("checkout.errors.passwordLength", "Password must be at least 8 characters"));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t("checkout.errors.passwordMatch", "Passwords do not match"));
      return false;
    }
    if (!formData.termsAccepted) {
      setError(t("checkout.errors.termsRequired", "You must accept the terms and conditions"));
      return false;
    }
    return true;
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAccountStep()) {
      setStep("payment");
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setError("");

    // Track account creation for orphan prevention
    let accountCreated = false;
    const userEmail = formData.email;

    try {
      // Create account first
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          fullName: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          companyName: formData.companyName,
          termsAccepted: formData.termsAccepted,
          userType: "corporate",
          // Flag as pending subscription to allow cleanup
          pendingSubscription: true,
        }),
      });

      if (!signupResponse.ok) {
        const data = await signupResponse.json();
        throw new Error(data.error || "Failed to create account");
      }

      accountCreated = true;

      // Create subscription
      const subscriptionResponse = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriberType: "CORPORATE",
          modules: ["FM", "PROPERTIES"],
          seats: users,
          billingCycle: "MONTHLY",
          currency: "SAR",
          customer: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
          },
        }),
      });

      if (!subscriptionResponse.ok) {
        const data = await subscriptionResponse.json();
        throw new Error(data.error || "Failed to create subscription");
      }

      // Simulate payment processing delay (only when feature flag is enabled)
      // Note: NEXT_PUBLIC_FEATURE_SIMULATE_PAYMENTS is a runtime-safe env var
      const shouldSimulatePayment = 
        process.env.NEXT_PUBLIC_FEATURE_SIMULATE_PAYMENTS === 'true';
      
      if (shouldSimulatePayment) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setStep("success");
    } catch (err) {
      // If account was created but subscription failed, cleanup to prevent orphan
      if (accountCreated) {
        try {
          await fetch("/api/auth/cleanup-pending", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail }),
          });
        } catch {
          // Cleanup failure is non-fatal, account will be cleaned by scheduled job
          // eslint-disable-next-line no-console -- Cleanup warning for debugging
          console.warn("Failed to cleanup pending account - will be handled by scheduled job");
        }
      }
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <CardTitle>{t("checkout.success.title", "Subscription Activated!")}</CardTitle>
            <CardDescription>
              {t("checkout.success.description", "Your Fixzit account is ready. Check your email for login details.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("checkout.plan", "Plan")}:</span>
                <span className="font-medium">{plan.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("checkout.users", "Users")}:</span>
                <span className="font-medium">{users}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>{t("checkout.total", "Total")}:</span>
                <span>SR {total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push("/login")}>
              {t("checkout.success.login", "Go to Login")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/pricing")}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("checkout.back", "Back to Pricing")}
        </Button>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Order Summary */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg">{t("checkout.orderSummary", "Order Summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{plan.name} {t("checkout.plan", "Plan")}</p>
                  <p className="text-sm text-muted-foreground">SR {plan.pricePerUser} × {users} {t("checkout.users", "users")}</p>
                </div>
                <Badge variant="secondary">{t("checkout.monthly", "Monthly")}</Badge>
              </div>
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t("checkout.subtotal", "Subtotal")}</span>
                  <span>SR {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("checkout.vat", "VAT (15%)")}</span>
                  <span>SR {vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>{t("checkout.total", "Total")}</span>
                  <span className="text-primary">SR {total.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4" />
                {t("checkout.securePayment", "Secure payment with TAP")}
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className={`flex items-center gap-2 ${step === "account" ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "account" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>1</div>
                  <span className="text-sm font-medium">{t("checkout.steps.account", "Account")}</span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <div className={`flex items-center gap-2 ${step === "payment" ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>2</div>
                  <span className="text-sm font-medium">{t("checkout.steps.payment", "Payment")}</span>
                </div>
              </div>
              <CardTitle>
                {step === "account" 
                  ? t("checkout.createAccount", "Create Your Account") 
                  : t("checkout.paymentDetails", "Payment Details")}
              </CardTitle>
              <CardDescription>
                {step === "account"
                  ? t("checkout.accountDesc", "Enter your details to create your Fixzit account")
                  : t("checkout.paymentDesc", "Complete your subscription with secure payment")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              {step === "account" && (
                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t("checkout.firstName", "First Name")}
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t("checkout.lastName", "Last Name")}</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("checkout.email", "Work Email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t("checkout.companyName", "Company Name")}
                    </Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleChange("companyName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t("checkout.phone", "Phone Number")}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {t("checkout.password", "Password")}
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t("checkout.confirmPassword", "Confirm Password")}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange("confirmPassword", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked) => handleChange("termsAccepted", !!checked)}
                    />
                    <Label htmlFor="termsAccepted" className="text-sm leading-relaxed cursor-pointer">
                      {t("checkout.terms", "I agree to the terms and conditions and privacy policy")}
                    </Label>
                  </div>
                  <Button type="submit" className="w-full">
                    {t("checkout.continueToPayment", "Continue to Payment")}
                  </Button>
                </form>
              )}

              {step === "payment" && (
                <div className="space-y-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">{t("checkout.accountInfo", "Account Information")}</p>
                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                    <p className="text-sm text-muted-foreground">{formData.email}</p>
                    <p className="text-sm text-muted-foreground">{formData.companyName}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Payment Integration Pending Notice */}
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        {t("checkout.paymentPending", "Payment Integration Pending")}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        {t("checkout.paymentPendingDesc", "Secure payment processing via Stripe/TAP will be available soon. For testing, use the demo flow.")}
                      </p>
                      <a 
                        href="https://docs.stripe.com/testing#cards" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t("checkout.testCardLink", "View test card numbers →")}
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("account")} className="flex-1">
                      {t("checkout.back", "Back")}
                    </Button>
                    <Button onClick={handlePayment} disabled={loading} className="flex-1">
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin me-2" />
                          {t("checkout.processing", "Processing...")}
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 me-2" />
                          {t("checkout.pay", "Pay")} SR {total.toFixed(2)}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
