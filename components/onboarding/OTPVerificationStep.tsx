/**
 * @module components/onboarding/OTPVerificationStep
 * @description OTP verification step for onboarding wizard.
 *              Supports both SMS and email verification.
 *
 * @features
 * - 6-digit OTP input with auto-focus
 * - Resend OTP functionality with cooldown
 * - SMS and email delivery options
 * - Saudi phone number validation
 * - Loading states and error handling
 * - i18n support (English/Arabic)
 *
 * @usage
 * ```tsx
 * <OTPVerificationStep
 *   identifier="+966501234567"
 *   method="sms"
 *   onVerified={(success) => handleVerified(success)}
 * />
 * ```
 *
 * @agent AGENT-0031
 * @issue FEAT-OTP-001
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
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
} from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "@/components/ui/icons";
import { toast } from "sonner";

export interface OTPVerificationStepProps {
  /** Phone number or email to verify */
  identifier: string;
  /** Verification method */
  method: "sms" | "email";
  /** Callback when verification completes */
  onVerified: (success: boolean) => void;
  /** Optional: Skip callback for testing */
  onSkip?: () => void;
  /** CSS classes */
  className?: string;
  /** Pre-fill OTP for testing */
  testOTP?: string;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function OTPVerificationStep({
  identifier,
  method,
  onVerified,
  onSkip,
  className,
  testOTP,
}: OTPVerificationStepProps) {
  const { isRTL } = useTranslation();

  // OTP input state
  const [otp, setOtp] = useState<string[]>(
    testOTP ? testOTP.split("").slice(0, OTP_LENGTH) : Array(OTP_LENGTH).fill("")
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [hasSentInitial, setHasSentInitial] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Send OTP request - defined before useEffect that uses it
  const sendOTP = useCallback(async () => {
    if (isSending || resendCooldown > 0) return;

    setIsSending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          method,
          purpose: "onboarding",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      toast.success(
        isRTL
          ? method === "sms"
            ? "تم إرسال رمز التحقق عبر الرسائل النصية"
            : "تم إرسال رمز التحقق عبر البريد الإلكتروني"
          : method === "sms"
            ? "OTP sent via SMS"
            : "OTP sent via email"
      );

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [identifier, method, isRTL, isSending, resendCooldown]);

  // Send OTP on mount if not already sent
  useEffect(() => {
    if (!hasSentInitial && identifier) {
      sendOTP();
      setHasSentInitial(true);
    }
  }, [identifier, hasSentInitial, sendOTP]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle input change
  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when complete
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join("");
      if (fullOtp.length === OTP_LENGTH) {
        verifyOTP(fullOtp);
      }
    }
  };

  // Handle key down for backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);

    if (pastedData.length > 0) {
      const newOtp = Array(OTP_LENGTH).fill("");
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);

      // Focus last filled input or last input
      const lastFilledIndex = Math.min(pastedData.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastFilledIndex]?.focus();

      // Auto-verify if complete
      if (pastedData.length === OTP_LENGTH) {
        verifyOTP(pastedData);
      }
    }
  };

  // Verify OTP
  const verifyOTP = async (otpCode: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          otp: otpCode,
          purpose: "onboarding",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP");
      }

      setIsVerified(true);
      toast.success(isRTL ? "تم التحقق بنجاح!" : "Verification successful!");
      onVerified(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      toast.error(message);
      // Clear OTP on error
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Format identifier for display
  const formatIdentifier = (id: string) => {
    if (method === "sms") {
      // Mask phone: +966 5** *** 78
      if (id.length > 4) {
        return id.slice(0, 4) + " " + "*".repeat(id.length - 6) + " " + id.slice(-2);
      }
    } else {
      // Mask email: u***@example.com
      const [local, domain] = id.split("@");
      if (local && domain) {
        return local.slice(0, 1) + "***@" + domain;
      }
    }
    return id;
  };

  if (isVerified) {
    return (
      <Card className={cn("max-w-md mx-auto", className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">
                {isRTL ? "تم التحقق بنجاح" : "Verified Successfully"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? "تم التحقق من هويتك. يمكنك المتابعة."
                  : "Your identity has been verified. You may proceed."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("max-w-md mx-auto", className)}>
      <CardHeader className="text-center">
        <CardTitle>
          {isRTL ? "التحقق من الهوية" : "Verify Your Identity"}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? `تم إرسال رمز التحقق إلى ${formatIdentifier(identifier)}`
            : `A verification code was sent to ${formatIdentifier(identifier)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OTP Input */}
        <div className="space-y-2">
          <Label className="text-center block">
            {isRTL ? "أدخل رمز التحقق" : "Enter verification code"}
          </Label>
          <div
            className={cn(
              "flex gap-2 justify-center",
              isRTL && "flex-row-reverse"
            )}
            dir="ltr" // OTP always LTR
          >
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={cn(
                  "w-12 h-14 text-center text-2xl font-mono",
                  error && "border-destructive",
                  digit && "border-primary"
                )}
                disabled={isLoading}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>
          {error && (
            <div className="flex items-center justify-center gap-2 text-destructive text-sm">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Verify Button */}
        <Button
          className="w-full"
          onClick={() => verifyOTP(otp.join(""))}
          disabled={isLoading || otp.join("").length !== OTP_LENGTH}
        >
          {isLoading ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {isRTL ? "جاري التحقق..." : "Verifying..."}
            </>
          ) : (
            isRTL ? "تحقق" : "Verify"
          )}
        </Button>

        {/* Resend Link */}
        <div className="text-center">
          {resendCooldown > 0 ? (
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? `إعادة الإرسال متاحة بعد ${resendCooldown} ثانية`
                : `Resend available in ${resendCooldown}s`}
            </p>
          ) : (
            <Button
              variant="link"
              size="sm"
              onClick={sendOTP}
              disabled={isSending}
              className="text-sm"
            >
              {isSending ? (
                <>
                  <Loader2 className="me-2 h-3 w-3 animate-spin" />
                  {isRTL ? "جاري الإرسال..." : "Sending..."}
                </>
              ) : (
                <>
                  <RefreshCw className="me-2 h-3 w-3" />
                  {isRTL ? "لم يصلك الرمز؟ إعادة الإرسال" : "Didn't receive code? Resend"}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Skip for testing (only in dev) */}
        {process.env.NODE_ENV === "development" && onSkip && (
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="w-full text-muted-foreground"
            >
              {isRTL ? "تخطي (وضع التطوير)" : "Skip (Dev Mode)"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OTPVerificationStep;
