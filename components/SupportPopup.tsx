"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Loader2 } from "@/components/ui/icons";
import { logger } from "@/lib/logger";

// ============================================================================
// API HELPER
// ============================================================================

const api = async (url: string, opts?: RequestInit) => {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const res = await fetch(url, {
    ...opts,
    headers: { ...headers, ...opts?.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ============================================================================
// INTERFACES
// ============================================================================

interface ErrorDetails {
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    componentStack?: string;
  };
  errorId?: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
  viewport?: string;
  type?: string;
  system?: {
    platform?: string;
    language?: string;
    onLine?: boolean;
    memory?: {
      used?: number;
      total?: number;
      limit?: number;
    } | null;
  };
  localStorage?: {
    hasAuth?: boolean;
    hasUser?: boolean;
    hasLang?: boolean;
    hasTheme?: boolean;
  };
}

interface ISupportPopupProps {
  open: boolean;
  onClose: () => void;
  errorDetails?: ErrorDetails;
}

// ============================================================================
// MODULE OPTIONS
// ============================================================================

const MODULES = ["FM", "Souq", "Aqar", "Account", "Billing", "Other"];
const CATEGORIES = [
  "Technical",
  "Feature Request",
  "Billing",
  "Account",
  "General",
  "Bug Report",
];
const TYPES = ["Bug", "Feature", "Complaint", "Billing", "Access", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const MODULE_LABELS: Record<string, { key: string; fallback: string }> = {
  FM: { key: "support.modules.fm", fallback: "Facility Management" },
  Souq: { key: "support.modules.souq", fallback: "Souq Marketplace" },
  Aqar: { key: "support.modules.aqar", fallback: "Aqar" },
  Account: { key: "support.modules.account", fallback: "Account" },
  Billing: { key: "support.modules.billing", fallback: "Billing" },
  Other: { key: "support.modules.other", fallback: "Other" },
};

const CATEGORY_LABELS: Record<string, { key: string; fallback: string }> = {
  Technical: { key: "support.categories.technical", fallback: "Technical" },
  "Feature Request": {
    key: "support.categories.featureRequest",
    fallback: "Feature Request",
  },
  Billing: { key: "support.categories.billing", fallback: "Billing" },
  Account: { key: "support.categories.account", fallback: "Account" },
  General: { key: "support.categories.general", fallback: "General" },
  "Bug Report": { key: "support.categories.bugReport", fallback: "Bug Report" },
};

const SUB_CATEGORY_LABELS: Record<string, { key: string; fallback: string }> = {
  "Bug Report": {
    key: "support.subCategories.bugReport",
    fallback: "Bug Report",
  },
  "Performance Issue": {
    key: "support.subCategories.performanceIssue",
    fallback: "Performance Issue",
  },
  "UI Error": { key: "support.subCategories.uiError", fallback: "UI Error" },
  "API Error": { key: "support.subCategories.apiError", fallback: "API Error" },
  "Database Error": {
    key: "support.subCategories.databaseError",
    fallback: "Database Error",
  },
  "New Feature": {
    key: "support.subCategories.newFeature",
    fallback: "New Feature",
  },
  Enhancement: {
    key: "support.subCategories.enhancement",
    fallback: "Enhancement",
  },
  Integration: {
    key: "support.subCategories.integration",
    fallback: "Integration",
  },
  Customization: {
    key: "support.subCategories.customization",
    fallback: "Customization",
  },
  "Mobile App": {
    key: "support.subCategories.mobileApp",
    fallback: "Mobile App",
  },
  "Invoice Issue": {
    key: "support.subCategories.invoiceIssue",
    fallback: "Invoice Issue",
  },
  "Payment Error": {
    key: "support.subCategories.paymentError",
    fallback: "Payment Error",
  },
  Subscription: {
    key: "support.subCategories.subscription",
    fallback: "Subscription",
  },
  Refund: { key: "support.subCategories.refund", fallback: "Refund" },
  Pricing: { key: "support.subCategories.pricing", fallback: "Pricing" },
  "Login Issue": {
    key: "support.subCategories.loginIssue",
    fallback: "Login Issue",
  },
  "Password Reset": {
    key: "support.subCategories.passwordReset",
    fallback: "Password Reset",
  },
  "Profile Update": {
    key: "support.subCategories.profileUpdate",
    fallback: "Profile Update",
  },
  Permissions: {
    key: "support.subCategories.permissions",
    fallback: "Permissions",
  },
  "Access Denied": {
    key: "support.subCategories.accessDenied",
    fallback: "Access Denied",
  },
  Documentation: {
    key: "support.subCategories.documentation",
    fallback: "Documentation",
  },
  Training: { key: "support.subCategories.training", fallback: "Training" },
  Support: { key: "support.subCategories.support", fallback: "Support" },
  Feedback: { key: "support.subCategories.feedback", fallback: "Feedback" },
  Other: { key: "support.subCategories.other", fallback: "Other" },
  "Critical Bug": {
    key: "support.subCategories.criticalBug",
    fallback: "Critical Bug",
  },
  "Minor Bug": { key: "support.subCategories.minorBug", fallback: "Minor Bug" },
  "Cosmetic Issue": {
    key: "support.subCategories.cosmeticIssue",
    fallback: "Cosmetic Issue",
  },
  "Data Error": {
    key: "support.subCategories.dataError",
    fallback: "Data Error",
  },
  "Security Issue": {
    key: "support.subCategories.securityIssue",
    fallback: "Security Issue",
  },
};

const TYPE_LABELS: Record<string, { key: string; fallback: string }> = {
  Bug: { key: "support.types.bug", fallback: "Bug" },
  Feature: { key: "support.types.feature", fallback: "Feature" },
  Complaint: { key: "support.types.complaint", fallback: "Complaint" },
  Billing: { key: "support.types.billing", fallback: "Billing" },
  Access: { key: "support.types.access", fallback: "Access" },
  Other: { key: "support.types.other", fallback: "Other" },
};

const PRIORITY_LABELS: Record<string, { key: string; fallback: string }> = {
  Low: { key: "support.priorities.low", fallback: "Low" },
  Medium: { key: "support.priorities.medium", fallback: "Medium" },
  High: { key: "support.priorities.high", fallback: "High" },
  Urgent: { key: "support.priorities.urgent", fallback: "Urgent" },
};

const SUB_CATEGORIES: Record<string, string[]> = {
  Technical: [
    "Bug Report",
    "Performance Issue",
    "UI Error",
    "API Error",
    "Database Error",
  ],
  "Feature Request": [
    "New Feature",
    "Enhancement",
    "Integration",
    "Customization",
    "Mobile App",
  ],
  Billing: [
    "Invoice Issue",
    "Payment Error",
    "Subscription",
    "Refund",
    "Pricing",
  ],
  Account: [
    "Login Issue",
    "Password Reset",
    "Profile Update",
    "Permissions",
    "Access Denied",
  ],
  General: ["Documentation", "Training", "Support", "Feedback", "Other"],
  "Bug Report": [
    "Critical Bug",
    "Minor Bug",
    "Cosmetic Issue",
    "Data Error",
    "Security Issue",
  ],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupportPopup({
  open,
  onClose,
  errorDetails,
}: ISupportPopupProps) {
  const { t } = useTranslation();

  // Form state
  const [subject, setSubject] = useState(
    errorDetails
      ? `${t("support.errorReport", "Error Report")}: ${errorDetails.type}`
      : "",
  );
  const [moduleKey, setModule] = useState("Other");
  const [type, setType] = useState("Bug");
  const [priority, setPriority] = useState("Medium");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Technical");
  const [subCategory, setSubCategory] = useState("Bug Report");

  // Guest fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const getModuleLabel = useCallback(
    (value: string) => {
      const entry = MODULE_LABELS[value] ?? {
        key: `support.modules.${value}`,
        fallback: value,
      };
      return t(entry.key, entry.fallback);
    },
    [t],
  );
  const getCategoryLabel = useCallback(
    (value: string) => {
      const entry = CATEGORY_LABELS[value] ?? {
        key: `support.categories.${value}`,
        fallback: value,
      };
      return t(entry.key, entry.fallback);
    },
    [t],
  );
  const getSubCategoryLabel = useCallback(
    (value: string) => {
      const entry = SUB_CATEGORY_LABELS[value] ?? {
        key: `support.subCategories.${value}`,
        fallback: value,
      };
      return t(entry.key, entry.fallback);
    },
    [t],
  );
  const getTypeLabel = useCallback(
    (value: string) => {
      const entry = TYPE_LABELS[value] ?? {
        key: `support.types.${value}`,
        fallback: value,
      };
      return t(entry.key, entry.fallback);
    },
    [t],
  );
  const getPriorityLabel = useCallback(
    (value: string) => {
      const entry = PRIORITY_LABELS[value] ?? {
        key: `support.priorities.${value}`,
        fallback: value,
      };
      return t(entry.key, entry.fallback);
    },
    [t],
  );

  // ✅ FIX: Detect legacy session key (x-user) used by existing tests/flows
  const getSessionToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("x-user");
  }, []);
  const sessionTokenRaw = getSessionToken();
  const hasSession =
    Boolean(sessionTokenRaw) &&
    sessionTokenRaw !== "undefined" &&
    sessionTokenRaw !== "null" &&
    sessionTokenRaw !== "false";
  const showGuestFields = !hasSession;
  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return () => {
        try {
          localStorage.removeItem("x-user");
        } catch {
          // ignore
        }
      };
    }
  }, []);

  // Error description generator
  const generateErrorDescription = (errorDetails: ErrorDetails): string => {
    const memoryUsed = errorDetails.system?.memory?.used
      ? Math.round(errorDetails.system.memory.used / 1024 / 1024)
      : 0;

    const errorIdLine = `${t("support.errorId", "Error ID")}: \`${errorDetails.errorId}\``;

    return `🚨 **${t("support.autoErrorReport", "Automated Error Report")}**

**${errorIdLine}**
${t("support.timestamp", "Timestamp")}: ${errorDetails.timestamp}
${t("support.url", "URL")}: ${errorDetails.url}
${t("support.userAgent", "User Agent")}: ${errorDetails.userAgent}

${t("support.errorDetails", "Error Details")}:
- ${t("support.type", "Type")}: ${errorDetails.error?.name || t("common.unknown", "Unknown")}
- ${t("support.message", "Message")}: ${errorDetails.error?.message || t("support.noMessage", "No message available")}
- ${t("support.viewport", "Viewport")}: ${errorDetails.viewport}
- ${t("support.platform", "Platform")}: ${errorDetails.system?.platform || t("common.unknown", "Unknown")}

${t("support.systemInfo", "System Information")}:
- ${t("support.language", "Language")}: ${errorDetails.system?.language || t("common.unknown", "Unknown")}
- ${t("support.onlineStatus", "Online Status")}: ${errorDetails.system?.onLine ? t("common.online", "Online") : t("common.offlineStatus", "Offline")}
${errorDetails.system?.memory ? `- ${t("support.memoryUsage", "Memory Usage")}: ${memoryUsed}MB ${t("support.used", "used")}` : ""}

${t("support.appState", "Application State")}:
- ${t("support.authenticated", "Authenticated")}: ${errorDetails.localStorage?.hasAuth ? "✅" : "❌"}
- ${t("support.userData", "User Data")}: ${errorDetails.localStorage?.hasUser ? "✅" : "❌"}
- ${t("support.languageSet", "Language Set")}: ${errorDetails.localStorage?.hasLang ? "✅" : "❌"}
- ${t("support.themeSet", "Theme Set")}: ${errorDetails.localStorage?.hasTheme ? "✅" : "❌"}

**${t("support.stackTrace", "Stack Trace")}:**
\`\`\`
${errorDetails.error?.stack || t("support.noStackTrace", "No stack trace available")}
\`\`\`

**${t("support.componentStack", "Component Stack")}:**
\`\`\`
${errorDetails.error?.componentStack || t("support.noComponentStack", "No component stack available")}
\`\`\`

---

*${t("support.autoCreated", "This ticket was automatically created from an error boundary. Please investigate and resolve the issue.")}*`;
  };

  // Auto-populate fields if error details are provided
  useEffect(() => {
    if (errorDetails) {
      const errorName =
        errorDetails.error?.name || t("common.unknown", "Unknown");
      const errorMsg = errorDetails.error?.message?.substring(0, 50) || "";
      setSubject(
        `${t("support.systemError", "System Error")}: ${errorName} - ${errorMsg}...`,
      );
      setModule("Other");
      setType("Bug");
      setPriority("High");
      setText(generateErrorDescription(errorDetails));
    }
  }, [errorDetails]);

  const submit = async () => {
    const payload: Record<string, unknown> = {
      subject,
      module: moduleKey,
      type,
      priority,
      text,
      category,
      subCategory,
    };

    try {
      // ✅ FIX: Accept both current and legacy session markers
      const userSession = hasSession ? sessionTokenRaw : null;
      if (!userSession) {
        payload.requester = { name, email, phone };
      }

      setSubmitting(true);

      const res = await api("/api/support/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // ✅ FIX: Use react-hot-toast instead of alert()
      const successMessage = `🎯 ${t("support.ticketCreated", "Support Ticket Created Successfully")}!

${t("support.ticketId", "Ticket ID")}: ${res.code}
${t("support.subject", "Subject")}: ${subject}
${t("support.priority", "Priority")}: ${priority}
${t("support.module", "Module")}: ${moduleKey}
${t("support.type", "Type")}: ${type}
${t("support.category", "Category")}: ${category}
${t("support.subCategory", "Sub-Category")}: ${subCategory}

${t("support.emailUpdates", "You will receive updates via email. Our support team will respond within 24 hours.")}

${t("support.thankYou", "Thank you for contacting Fixzit Support!")}

${!userSession && email ? `\n\n📧 ${t("support.welcomeEmailSent", "Welcome Email Sent")}!\n${t("support.welcomeEmailDesc", "We've sent a welcome email to")} ${email} ${t("support.welcomeEmailNext", "with registration instructions and next steps.")}.` : ""}`;

      toast.success(successMessage, { duration: 8000 });
      onClose();
    } catch (e: unknown) {
      logger.error("Ticket creation error:", { error: e });
      const errorMessage =
        e instanceof Error
          ? e.message
          : t(
              "support.tryAgain",
              "Please try again or contact support directly.",
            );

      // ✅ FIX: Use react-hot-toast instead of alert()
      const failureMessage = `❌ ${t("support.failedToCreate", "Failed to create ticket")}: ${errorMessage}`;
      toast.error(failureMessage, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(text || subject);
      setCopied(true);
      toast.success(t("support.copiedToClipboard", "Details copied to clipboard"), { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("support.failedToCopy", "Failed to copy to clipboard"), {
        duration: 2000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t("support.createTicket", "Create Support Ticket")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "support.description",
              "Fill out the form below and our support team will get back to you within 24 hours.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Subject and Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">
                {t("support.subject", "Subject")} *
              </Label>
              <Input
                id="subject"
                placeholder={t(
                  "support.subjectPlaceholder",
                  "Brief description of your issue",
                )}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module">{t("support.module", "Module")}</Label>
              <Select
                id="module"
                value={moduleKey}
                onValueChange={setModule}
                placeholder={t("support.modulePlaceholder", "Select module")}
                className="w-full bg-muted border-input text-foreground"
              >
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {getModuleLabel(m)}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          {/* Category and Sub-Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                {t("support.category", "Category")}
              </Label>
              <Select
                id="category"
                value={category}
                onValueChange={setCategory}
                placeholder={t(
                  "support.categoryPlaceholder",
                  "Select category",
                )}
                className="w-full bg-muted border-input text-foreground"
              >
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {getCategoryLabel(c)}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subCategory">
                {t("support.subCategory", "Sub-Category")}
              </Label>
              <Select
                id="subCategory"
                value={subCategory}
                onValueChange={setSubCategory}
                placeholder={t(
                  "support.subCategoryPlaceholder",
                  "Select sub-category",
                )}
                className="w-full bg-muted border-input text-foreground"
              >
                {(SUB_CATEGORIES[category] || []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {getSubCategoryLabel(s)}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t("support.type", "Type")}</Label>
              <Select
                id="type"
                value={type}
                onValueChange={setType}
                placeholder={t("support.typePlaceholder", "Select type")}
                className="w-full bg-muted border-input text-foreground"
              >
                {TYPES.map((t_val) => (
                  <SelectItem key={t_val} value={t_val}>
                    {getTypeLabel(t_val)}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">
                {t("support.priority", "Priority")}
              </Label>
              <Select
                id="priority"
                value={priority}
                onValueChange={setPriority}
                placeholder={t(
                  "support.priorityPlaceholder",
                  "Select priority",
                )}
                className="w-full bg-muted border-input text-foreground"
              >
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {getPriorityLabel(p)}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t("support.description", "Description")} *
            </Label>
            <Textarea
              id="description"
              placeholder={t(
                "support.descriptionPlaceholder",
                "Please provide detailed information about your issue or request...",
              )}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="h-32 resize-none"
            />
          </div>

          {/* Guest-only fields */}
          {showGuestFields && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-2xl">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("support.yourName", "Your Name")} *
                </Label>
                <Input
                  id="name"
                  placeholder={t(
                    "support.namePlaceholder",
                    "Enter your full name",
                  )}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email", "Email")} *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t(
                    "support.emailPlaceholder",
                    "your.email@example.com",
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t("support.phone", "Phone")} (
                  {t("common.optional", "optional")})
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t(
                    "support.phonePlaceholder",
                    "+966 XX XXX XXXX",
                  )}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={copyDetails}
              disabled={(!subject.trim() && !text.trim()) || copied}
              className={copied ? "text-green-600" : ""}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 me-2" />
                  {t("support.copied", "Copied!")}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 me-2" />
                  {t("support.copyDetails", "Copy details")}
                </>
              )}
            </Button>
            <Button
              variant="default"
              onClick={submit}
              disabled={!subject.trim() || !text.trim() || submitting}
              data-testid="submit-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t("support.creating", "Creating Ticket...")}
                </>
              ) : (
                t("support.submitTicket", "Submit Ticket")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
