"use client";

import React, { useState, useEffect, useRef } from "react";
import { NavigationButtons } from "@/components/ui/navigation-buttons";
import { useTranslation } from "@/contexts/TranslationContext";
import toast from "react-hot-toast";

import { logger } from "@/lib/logger";
import ClientDate from "@/components/ClientDate";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
interface ReferralCode {
  id: string;
  code: string;
  shortUrl: string;
  reward: {
    type: string;
    referrerAmount: number;
    referredAmount: number;
    currency: string;
  };
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    totalRewardsEarned: number;
    totalRewardsPaid: number;
    conversionRate: number;
  };
  status: string;
  createdAt: Date;
  expiresAt?: Date;
  maxUses?: number;
  currentUses?: number;
}

interface Referral {
  _id?: string; // MongoDB ID for stable keys
  referredEmail: string;
  referredAt: Date;
  convertedAt?: Date;
  rewardEarned: number;
  rewardStatus: string;
}

/**
 * Masks an email address for privacy
 * @param email - The email to mask (can be null/undefined)
 * @returns Masked email like "ab***@example.com"
 */
function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "***@***.***";

  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";

  let maskedLocal: string;
  if (local.length <= 2) {
    // Very short: keep first char + asterisks
    maskedLocal = local[0] + "***";
  } else {
    // Normal: keep first 2 chars + three asterisks
    maskedLocal = local.substring(0, 2) + "***";
  }

  return `${maskedLocal}@${domain}`;
}

export default function ReferralProgramPage() {
  const { language } = useTranslation();
  const auto = useAutoTranslator("dashboard.referrals");
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchReferralData();
    return () => {
      // Cleanup: abort in-flight requests when component unmounts
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchReferralData = async () => {
    setLoading(true);
    setError(null);

    // Abort previous request if still pending
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/referrals/my-code", {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorData: { error?: string } = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parse errors, use fallback
        }
        throw new Error(
          errorData?.error ||
            `Failed to fetch referral data (${response.status})`,
        );
      }

      let data: { code?: ReferralCode; referrals?: Referral[] } = {};
      try {
        data = await response.json();
      } catch (jsonError) {
        const error =
          jsonError instanceof Error ? jsonError : new Error(String(jsonError));
        logger.error("Failed to parse referral data JSON:", error);
        throw new Error("Invalid response format from server");
      }

      setReferralCode(data.code ?? null);
      // Sort referrals by referredAt descending (newest first)
      const sortedReferrals = (data.referrals || []).sort((a, b) => {
        return (
          new Date(b.referredAt).getTime() - new Date(a.referredAt).getTime()
        );
      });
      setReferrals(sortedReferrals);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      logger.error("Failed to fetch referral data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load referral data. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Performs a code action (generate or regenerate) with proper abort handling
   * @param endpoint - The API endpoint to call
   * @param successMessage - Success toast message
   */
  const performCodeAction = async (
    endpoint: string,
    successMessage: string,
  ) => {
    setGenerating(true);
    setError(null);

    // Abort previous request if still pending
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: abortControllerRef.current.signal,
      });

      let data: { code?: ReferralCode; error?: string; message?: string } = {};
      try {
        data = await response.json();
      } catch (jsonError) {
        const error =
          jsonError instanceof Error ? jsonError : new Error(String(jsonError));
        logger.error("Failed to parse response JSON:", error);
        throw new Error("Invalid response format from server");
      }

      if (!response.ok) {
        // Use server-provided error message if available
        const errorMsg =
          data?.error ||
          data?.message ||
          `Failed to perform action (${response.status})`;
        throw new Error(errorMsg);
      }

      setReferralCode(data.code ?? null);
      toast.success(successMessage);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      logger.error("Failed to perform code action:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Operation failed. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const generateCode = async () => {
    await performCodeAction(
      "/api/referrals/generate",
      "Referral code generated successfully!",
    );
  };

  const regenerateCode = async () => {
    await performCodeAction(
      "/api/referrals/regenerate",
      "Referral code regenerated successfully!",
    );
  };

  useEffect(() => {
    return () => {
      clearCopyTimeout();
    };
  }, []);

  const clearCopyTimeout = () => {
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  };

  const copyToClipboard = async (text: string) => {
    setError(null);
    clearCopyTimeout();

    // Feature-detect clipboard API
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard!");
        copyTimeoutRef.current = window.setTimeout(
          () => setCopied(false),
          2000,
        );
        return;
      } catch (err) {
        logger.error(
          "Clipboard API write failed",
          err instanceof Error ? err : new Error(String(err)),
          { route: "/dashboard/referrals", action: "clipboard-copy" },
        );
        // fall through to DOM fallback
      }
    }

    // DOM-based fallback (synchronous)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        toast.success("Copied to clipboard!");
        copyTimeoutRef.current = window.setTimeout(
          () => setCopied(false),
          2000,
        );
      } else {
        const errorMsg = "Failed to copy to clipboard. Please copy manually.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      logger.error(
        "Fallback copy failed",
        err instanceof Error ? err : new Error(String(err)),
        { route: "/dashboard/referrals", action: "fallback-copy" },
      );
      const errorMsg = "Failed to copy to clipboard. Please copy manually.";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const shareViaWhatsApp = () => {
    if (referralCode) {
      const message = `Join Fixzit and get ${referralCode.reward.referredAmount} ${referralCode.reward.currency}! Use my referral code: ${referralCode.code} or visit ${referralCode.shortUrl}`;
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
      );
    }
  };

  const shareViaEmail = () => {
    if (referralCode) {
      const subject = "Join Fixzit and Get a Reward!";
      const body = `I'm using Fixzit for property management and I think you'd love it too!\n\nSign up using my referral code: ${referralCode.code}\nOr visit: ${referralCode.shortUrl}\n\nYou'll get ${referralCode.reward.referredAmount} ${referralCode.reward.currency} when you sign up!`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  // Helper to check if referral code is expired or depleted
  const isCodeExpiredOrDepleted = (): boolean => {
    if (!referralCode) return false;

    const now = new Date();
    const isExpired =
      referralCode.expiresAt && new Date(referralCode.expiresAt) < now;
    const isDepleted =
      referralCode.maxUses !== undefined &&
      referralCode.currentUses !== undefined &&
      referralCode.currentUses >= referralCode.maxUses;

    return !!(isExpired || isDepleted);
  };

  // Currency formatter using Intl with dynamic locale
  const formatCurrency = (amount: number, currency: string): string => {
    try {
      // Use current language locale (e.g., 'ar', 'en') for formatting
      const locale = language === "ar" ? "ar-SA" : "en-US";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Fallback if currency code is invalid
      return `${amount} ${currency}`;
    }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6" data-testid="referral-error-page">
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <svg
              className="w-6 h-6 text-destructive flex-shrink-0 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-destructive mb-2">
                {auto("Error Loading Referral Data", "errors.heading")}
              </h3>
              <p className="text-destructive mb-4" data-testid="error-message">
                {error}
              </p>
              <button type="button"
                onClick={() => {
                  setError(null);
                  fetchReferralData();
                }}
                className="bg-destructive text-white px-4 py-2 rounded-2xl hover:bg-destructive/90 transition-colors"
                data-testid="retry-button"
                aria-label="Retry loading referral data"
              >
                {auto("Try Again", "errors.retry")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6" data-testid="referral-loading">
        <div className="flex justify-center items-center h-64">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
            role="status"
            aria-label="Loading"
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-7xl mx-auto p-6 space-y-6"
      data-testid="referral-program-page"
    >
      <NavigationButtons showBack showHome />

      {/* Error Message Banner */}
      {error && (
        <div
          className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3"
          data-testid="error-banner"
        >
          <svg
            className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-destructive-foreground">{error}</p>
          </div>
          <button type="button"
            onClick={() => setError(null)}
            className="text-destructive hover:text-destructive-foreground"
            aria-label="Dismiss error"
            data-testid="dismiss-error"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">
          {auto("Referral Program", "header.title")}
        </h1>
        <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
          {auto(
            "Earn rewards by referring friends and family to Fixzit",
            "header.subtitle",
          )}
        </p>
      </div>

      {!referralCode ? (
        /* Generate Code CTA */
        <div
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
          data-testid="generate-code-cta"
        >
          <h2 className="text-2xl font-bold mb-4">
            {auto("Start Earning Rewards!", "cta.heading")}
          </h2>
          <p className="mb-6">
            {auto(
              "Get your unique referral code and earn money when your friends sign up",
              "cta.description",
            )}
          </p>
          <button type="button"
            onClick={generateCode}
            disabled={generating}
            className="bg-card text-primary px-8 py-3 rounded-2xl font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            data-testid="generate-code-button"
            aria-label="Generate referral code"
          >
            {generating ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {auto("Generating...", "cta.button.generating")}
              </>
            ) : (
              auto("Generate My Referral Code", "cta.button.idle")
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Referral Card */}
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white"
            data-testid="referral-card"
          >
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: Code */}
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  {auto("Your Referral Code", "code.heading")}
                </h2>
                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div
                    className="text-3xl font-bold tracking-wider mb-4"
                    data-testid="referral-code"
                  >
                    {referralCode.code}
                  </div>
                  <div
                    className="text-sm opacity-90 mb-4"
                    data-testid="referral-url"
                  >
                    {referralCode.shortUrl}
                  </div>
                  {isCodeExpiredOrDepleted() && (
                    <div
                      className="bg-warning/100/20 border border-warning rounded p-2 mb-4 text-sm"
                      data-testid="code-status-warning"
                    >
                      {auto(
                        "⚠️ This code has expired or reached its usage limit",
                        "codeStatus.warning",
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => copyToClipboard(referralCode.code)}
                      className="flex-1 bg-card text-primary px-4 py-2 rounded-2xl font-medium hover:bg-muted transition-colors"
                      data-testid="copy-code-button"
                      aria-label="Copy referral code to clipboard"
                    >
                      {copied
                        ? auto("✓ Copied!", "code.copySuccess")
                        : auto("Copy Code", "code.copyButton")}
                    </button>
                    <button type="button"
                      onClick={() => copyToClipboard(referralCode.shortUrl)}
                      className="flex-1 bg-card text-primary px-4 py-2 rounded-2xl font-medium hover:bg-muted transition-colors"
                      data-testid="copy-link-button"
                      aria-label="Copy referral link to clipboard"
                    >
                      {auto("Copy Link", "code.copyLink")}
                    </button>
                  </div>
                  {isCodeExpiredOrDepleted() && (
                    <button type="button"
                      onClick={regenerateCode}
                      disabled={generating}
                      className="w-full mt-3 bg-warning/100 text-white px-4 py-2 rounded-2xl font-medium hover:bg-warning transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="regenerate-code-button"
                      aria-label="Regenerate referral code"
                    >
                      {generating
                        ? auto("Regenerating...", "code.regenerating")
                        : auto("Regenerate Code", "code.regenerateButton")}
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Rewards */}
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  {auto("Rewards", "rewards.heading")}
                </h2>
                <div className="space-y-3">
                  <div
                    className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm"
                    data-testid="referrer-reward"
                  >
                    <div className="text-sm opacity-90">
                      {auto("You Get", "rewards.youGet")}
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        referralCode.reward.referrerAmount,
                        referralCode.reward.currency,
                      )}
                    </div>
                  </div>
                  <div
                    className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm"
                    data-testid="referred-reward"
                  >
                    <div className="text-sm opacity-90">
                      {auto("They Get", "rewards.theyGet")}
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        referralCode.reward.referredAmount,
                        referralCode.reward.currency,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <h3 className="text-lg font-semibold mb-3">
                {auto("Share via", "share.heading")}
              </h3>
              <div className="flex gap-3">
                <button type="button"
                  onClick={shareViaWhatsApp}
                  className="flex-1 bg-success/100 hover:bg-success px-4 py-2 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2"
                  data-testid="share-whatsapp"
                  aria-label="Share referral code via WhatsApp"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  {auto("WhatsApp", "share.whatsapp")}
                </button>
                <button type="button"
                  onClick={shareViaEmail}
                  className="flex-1 bg-primary/100 hover:bg-primary px-4 py-2 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2"
                  data-testid="share-email"
                  aria-label="Share referral code via Email"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {auto("Email", "share.email")}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div
            className="grid md:grid-cols-4 gap-4"
            data-testid="referral-stats"
          >
            <div
              className="bg-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-700 p-6"
              data-testid="stat-total-referrals"
            >
              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                Total Referrals
              </div>
              <div className="text-3xl font-bold text-foreground dark:text-white mt-2">
                {referralCode.stats.totalReferrals}
              </div>
            </div>
            <div
              className="bg-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-700 p-6"
              data-testid="stat-successful-referrals"
            >
              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                Successful
              </div>
              <div className="text-3xl font-bold text-success mt-2">
                {referralCode.stats.successfulReferrals}
              </div>
            </div>
            <div
              className="bg-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-700 p-6"
              data-testid="stat-total-earned"
            >
              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                Total Earned
              </div>
              <div className="text-3xl font-bold text-primary mt-2">
                {formatCurrency(
                  referralCode.stats.totalRewardsEarned,
                  referralCode.reward.currency,
                )}
              </div>
            </div>
            <div
              className="bg-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-700 p-6"
              data-testid="stat-conversion-rate"
            >
              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                Conversion Rate
              </div>
              <div className="text-3xl font-bold text-secondary mt-2">
                {referralCode.stats.conversionRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Referrals Table */}
          <div
            className="bg-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-700"
            data-testid="referrals-table"
          >
            <div className="p-6 border-b border-border dark:border-gray-700">
              <h2 className="text-xl font-semibold text-foreground dark:text-white">
                {auto("Your Referrals", "table.heading")}
              </h2>
            </div>
            {referrals.length === 0 ? (
              <div
                className="p-12 text-center text-muted-foreground dark:text-muted-foreground"
                data-testid="no-referrals"
              >
                No referrals yet. Start sharing your code!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border dark:divide-gray-700">
                  <thead className="bg-muted dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Referred At
                      </th>
                      <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Reward
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-gray-700">
                    {referrals.map((referral, index) => (
                      <tr
                        key={
                          referral._id || `${referral.referredEmail}-${index}`
                        }
                        data-testid={`referral-row-${index}`}
                      >
                        <td className="px-6 py-4 text-sm text-foreground dark:text-white">
                          {maskEmail(referral.referredEmail)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground dark:text-muted-foreground">
                          <ClientDate
                            date={referral.referredAt}
                            format="medium"
                            locale={language === "ar" ? "ar-SA" : "en-US"}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              referral.rewardStatus === "PAID"
                                ? "bg-success/10 text-success-foreground dark:bg-success/20 dark:text-success"
                                : referral.rewardStatus === "APPROVED"
                                  ? "bg-primary/10 text-primary-foreground dark:bg-primary dark:text-primary"
                                  : "bg-warning/10 text-warning-foreground dark:bg-warning/20 dark:text-warning-foreground"
                            }`}
                          >
                            {referral.rewardStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground dark:text-white">
                          {formatCurrency(
                            referral.rewardEarned,
                            referralCode.reward.currency,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <NavigationButtons showBack showHome />
    </div>
  );
}
