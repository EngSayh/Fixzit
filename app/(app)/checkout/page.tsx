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
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";

const PLANS: Record<string, { name: string; pricePerUser: number }> = {
  standard: { name: "Standard", pricePerUser: 99 },
  premium: { name: "Premium", pricePerUser: 199 },
  enterprise: { name: "Enterprise", pricePerUser: 299 },
};

function CheckoutContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = searchParams?.get("plan") || "standard";
  const users = parseInt(searchParams?.get("users") || "1", 10);
  const plan = PLANS[planId] || PLANS.standard;

  const subtotal = plan.pricePerUser * users;
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"account" | "payment" | "success">("account");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const handleChange = (field: string, value: string) => {
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
    if (formData.password.length < 8) {
      setError(t("checkout.errors.passwordLength", "Password must be at least 8 characters"));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t("checkout.errors.passwordMatch", "Passwords do not match"));
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
          password: formData.password,
          companyName: formData.companyName,
          userType: "corporate",
        }),
      });

      if (!signupResponse.ok) {
        const data = await signupResponse.json();
        throw new Error(data.error || "Failed to create account");
      }

      // Create subscription
      const subscriptionResponse = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          seats: users,
          billing_cycle: "monthly",
        }),
      });

      if (!subscriptionResponse.ok) {
        const data = await subscriptionResponse.json();
        throw new Error(data.error || "Failed to create subscription");
      }

      // Simulate payment processing (in production, integrate with TAP or Stripe)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStep("success");
    } catch (err) {
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
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t("checkout.cardNumber", "Card Number")}
                      </Label>
                      <Input
                        placeholder="4111 1111 1111 1111"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                        maxLength={19}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("checkout.expiry", "Expiry Date")}</Label>
                        <Input
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                            if (val.length >= 2) val = val.slice(0, 2) + "/" + val.slice(2);
                            setExpiry(val);
                          }}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("checkout.cvv", "CVV")}</Label>
                        <Input
                          placeholder="123"
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          maxLength={4}
                        />
                      </div>
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
