'use client';
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  LogIn,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";
import { signIn } from "next-auth/react";
import { logger } from "@/lib/logger";

interface FormErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  // Focus on first error when validation fails
  useEffect(() => {
    if (errors.identifier) {
      document.getElementById("identifier")?.focus();
    } else if (errors.password) {
      document.getElementById("password")?.focus();
    } else if (errors.general) {
      document.getElementById("general-error")?.focus();
    }
  }, [errors]);

  // Clear error for specific field
  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate identifier (email or employee number)
  const validateIdentifier = (value: string): string | null => {
    if (!value.trim()) {
      return t(
        "login.errors.identifierRequired",
        "Email or employee number is required",
      );
    }

    // Robust email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(value.trim());
    const isEmployeeNumber = /^EMP\d+$/i.test(value.trim());

    if (!isEmail && !isEmployeeNumber) {
      return t(
        "login.errors.identifierInvalid",
        "Enter a valid email or employee number (e.g., EMP001)",
      );
    }

    return null;
  };

  // Validate password
  const validatePassword = (value: string): string | null => {
    if (!value) {
      return t("login.errors.passwordRequired", "Password is required");
    }
    if (value.length < 6) {
      return t(
        "login.errors.passwordTooShort",
        "Password must be at least 6 characters",
      );
    }
    return null;
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const identifierError = validateIdentifier(identifier);
    if (identifierError) newErrors.identifier = identifierError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Use NextAuth signIn with credentials provider
      const result = await signIn("credentials", {
        identifier: identifier.trim(),
        password,
        rememberMe,
        redirect: false, // Handle redirect manually
      });

      if (result?.error) {
        // Handle login errors from NextAuth
        if (result.error === "CredentialsSignin") {
          setErrors({
            general: t(
              "login.errors.invalidCredentials",
              "Invalid email/employee number or password",
            ),
          });
        } else {
          setErrors({
            general: t(
              "login.errors.loginFailed",
              "Login failed. Please try again.",
            ),
          });
        }
        setLoading(false);
        return;
      }

      // Success - NextAuth has created the session
      if (result?.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect to dashboard
          router.push("/fm/dashboard");
        }
      }
    } catch (err) {
      import("../../lib/logger")
        .then(({ logError }) => {
          logError("Login error", err as Error, {
            component: "LoginForm",
            action: "handleLogin",
            // PII removed: identifier field may contain email/employee number
          });
        })
        .catch((logErr) =>
          logger.error("Failed to load logger:", { error: logErr }),
        );
      setErrors({
        general: t(
          "login.errors.networkError",
          "Network error. Please check your connection and try again.",
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      noValidate
      aria-label="Login form"
    >
      {/* Email or Employee Number Field */}
      <div>
        <label
          htmlFor="identifier"
          className="block text-sm font-medium text-foreground mb-2"
        >
          {t("login.identifier", "Email or Employee Number")}
          <span className="text-destructive ms-1" aria-label="required">
            *
          </span>
        </label>
        <div className="relative">
          <Mail
            className={`absolute ${isRTL ? "end-3" : "start-3"} top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground`}
            aria-hidden="true"
          />
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username email"
            placeholder={t(
              "login.identifierPlaceholder",
              "you@example.com or EMP001",
            )}
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              clearError("identifier");
              clearError("general");
            }}
            className={`${isRTL ? "pe-10" : "ps-10"} h-12 ${
              errors.identifier
                ? "border-destructive focus:ring-destructive"
                : ""
            }`}
            aria-invalid={!!errors.identifier}
            aria-describedby={
              errors.identifier ? "identifier-error" : "identifier-hint"
            }
            aria-required="true"
            disabled={loading}
            required
          />
        </div>
        <p id="identifier-hint" className="mt-1 text-xs text-muted-foreground">
          {t(
            "login.identifierHint",
            "Enter your email address or employee number (EMP001, EMP002, etc.)",
          )}
        </p>
        {errors.identifier && (
          <p
            id="identifier-error"
            className="mt-1 text-sm text-destructive-foreground flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {errors.identifier}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground"
          >
            {t("common.password", "Password")}
            <span className="text-destructive ms-1" aria-label="required">
              *
            </span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            {t("common.forgotPassword", "Forgot?")}
          </Link>
        </div>
        <div className="relative">
          <Lock
            className={`absolute ${isRTL ? "end-3" : "start-3"} top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground`}
            aria-hidden="true"
          />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("login.passwordPlaceholder", "Enter your password")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
              clearError("general");
            }}
            className={`${isRTL ? "pe-10 ps-10" : "ps-10 pe-10"} h-12 ${
              errors.password ? "border-destructive focus:ring-destructive" : ""
            }`}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-required="true"
            disabled={loading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute ${isRTL ? "start-3" : "end-3"} top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded`}
            aria-label={
              showPassword
                ? t("login.hidePassword", "Hide password")
                : t("login.showPassword", "Show password")
            }
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p
            id="password-error"
            className="mt-1 text-sm text-destructive-foreground flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {errors.password}
          </p>
        )}
      </div>

      {/* Remember Me */}
      <div
        className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <input
          type="checkbox"
          id="rememberMe"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
          disabled={loading}
        />
        <label
          htmlFor="rememberMe"
          className="text-sm text-foreground cursor-pointer select-none"
        >
          {t("login.rememberMe", "Remember me for 30 days")}
        </label>
      </div>

      {/* General Error Message */}
      {errors.general && (
        <div
          id="general-error"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          tabIndex={-1}
          className={`flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive-foreground focus:outline-none ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm">{errors.general}</span>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading || !identifier || !password}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-busy={loading}
      >
        {loading ? (
          <div
            className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <Loader2
              className="w-5 h-5 animate-spin"
              role="status"
              aria-label="Loading"
            />
            <span>{t("login.signingIn", "Signing In...")}</span>
          </div>
        ) : (
          <div
            className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <LogIn className="h-5 w-5" aria-hidden="true" />
            <span>{t("login.signIn", "Sign In")}</span>
          </div>
        )}
      </Button>
    </form>
  );
}
