"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFormState } from "@/contexts/FormStateContext";
import { useRouter } from "next/navigation";
import { Money, decimal } from "@/lib/finance/decimal";
import ClientDate from "@/components/ClientDate";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { logger } from "@/lib/logger";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
// ============================================================================
// INTERFACES
// ============================================================================

interface IInvoiceAllocation {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  amountDue: number;
  amountAllocated: number;
  selected: boolean;
}

interface IChartAccount {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: string;
}

interface IAvailableInvoice {
  id: string;
  invoiceNumber: string;
  customer: { name: string };
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountDue: number;
}

export default function NewPaymentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { registerForm, unregisterForm } = useFormState();
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({
    moduleId: "finance",
  });
  const missingOrg = !hasOrgContext || !orgId;

  // Core payment fields
  const [paymentType, setPaymentType] = useState<string>("RECEIVED");
  const [paymentDate, setPaymentDate] = useState<string>(""); // ✅ HYDRATION FIX: Initialize empty
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("SAR");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Party details
  const [partyType, setPartyType] = useState<string>("TENANT");
  const [partyId] = useState<string>("");
  const [partyName, setPartyName] = useState<string>("");

  // Method-specific fields - Bank Transfer
  const [bankName, setBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");
  const [swiftCode, setSwiftCode] = useState<string>("");
  const [iban, setIban] = useState<string>("");

  // Method-specific fields - Cheque
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [chequeBankName, setChequeBankName] = useState<string>("");
  const [drawerName, setDrawerName] = useState<string>("");

  // Method-specific fields - Card
  const [cardType, setCardType] = useState<string>("VISA");
  const [last4Digits, setLast4Digits] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [authorizationCode, setAuthorizationCode] = useState<string>("");

  // Cash account selection
  const [cashAccountId, setCashAccountId] = useState<string>("");

  // Invoice allocations
  const [allocations, setAllocations] = useState<IInvoiceAllocation[]>([]);
  const [, setAvailableInvoices] = useState<IAvailableInvoice[]>([]);
  const [showInvoiceAllocation, setShowInvoiceAllocation] =
    useState<boolean>(false);

  // Data lookups
  const [chartAccounts, setChartAccounts] = useState<IChartAccount[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Calculate totals using Decimal math
  const totalAllocated = React.useMemo(
    () =>
      Money.sum(
        allocations.map((a: IInvoiceAllocation) => decimal(a.amountAllocated)),
      ),
    [allocations],
  );

  const paymentAmountNum = React.useMemo(
    () => decimal(amount || "0"),
    [amount],
  );

  const unallocatedAmount = React.useMemo(
    () => paymentAmountNum.minus(totalAllocated),
    [paymentAmountNum, totalAllocated],
  );

  // ============================================================================
  // LIFECYCLE & DATA LOADING
  // ============================================================================

  // ✅ HYDRATION FIX: Set default date after client hydration
  useEffect(() => {
    if (!paymentDate) {
      setPaymentDate(new Date().toISOString().split("T")[0]);
    }
  }, [paymentDate]);

  useEffect(() => {
    const formId = "new-payment-form";
    registerForm(formId);
    return () => unregisterForm(formId);
  }, [registerForm, unregisterForm]);

  // Load chart of accounts (cash/bank accounts)
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const response = await fetch(
          "/api/finance/accounts?type=ASSET&active=true",
        );
        if (response.ok) {
          const data = await response.json();
          // Filter to cash/bank accounts only
          const cashAccounts = (data.accounts || []).filter(
            (acc: IChartAccount) =>
              acc.name.toLowerCase().includes("cash") ||
              acc.name.toLowerCase().includes("bank") ||
              acc.code.startsWith("1010") || // Common cash account codes
              acc.code.startsWith("1020"), // Common bank account codes
          );
          setChartAccounts(cashAccounts);

          // Auto-select first cash account if available
          if (cashAccounts.length > 0 && !cashAccountId) {
            setCashAccountId(cashAccounts[0].id);
          }
        }
      } catch (_error) {
        logger.error("Error loading accounts:", { error: _error });
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadAccounts().catch((err) => {
      logger.error("Unhandled error in loadAccounts", { error: err });
      setLoadingAccounts(false);
    });
  }, []);

  // Load available invoices when payment type is RECEIVED
  useEffect(() => {
    if (paymentType === "RECEIVED" && showInvoiceAllocation) {
      loadAvailableInvoices();
    }
  }, [paymentType, showInvoiceAllocation]);

  const loadAvailableInvoices = () => {
    (async () => {
      try {
        setLoadingInvoices(true);
        // Load unpaid/partially paid invoices
        const response = await fetch(
          "/api/finance/invoices?status=POSTED&hasBalance=true",
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableInvoices(data.invoices || []);

          // Initialize allocations from available invoices
          const newAllocations: IInvoiceAllocation[] = (
            data.invoices || []
          ).map((inv: IAvailableInvoice) => ({
            id: inv.id,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customer?.name || "Unknown",
            invoiceDate: inv.issueDate,
            dueDate: inv.dueDate,
            totalAmount: inv.totalAmount,
            amountDue: inv.amountDue,
            amountAllocated: 0,
            selected: false,
          }));
          setAllocations(newAllocations);
        }
      } catch (_error) {
        logger.error("Error loading invoices:", { error: _error });
        setErrors({ ...errors, invoices: "Failed to load invoices" });
      } finally {
        setLoadingInvoices(false);
      }
    })().catch((err) => {
      logger.error("Unhandled error in loadAvailableInvoices", { error: err });
      setErrors({ ...errors, invoices: "Failed to load invoices" });
      setLoadingInvoices(false);
    });
  };

  // ============================================================================
  // INVOICE ALLOCATION MANAGEMENT
  // ============================================================================

  const toggleInvoiceSelection = (id: string) => {
    setAllocations(
      allocations.map((a: IInvoiceAllocation) => {
        if (a.id === id) {
          const newAllocated = !a.selected
            ? Money.toNumber(
                Money.min(
                  decimal(a.amountDue),
                  Money.add(unallocatedAmount, a.amountAllocated),
                ),
              )
            : 0;
          return { ...a, selected: !a.selected, amountAllocated: newAllocated };
        }
        return a;
      }),
    );
  };

  const updateAllocationAmount = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAllocations(
      allocations.map((a: IInvoiceAllocation) => {
        if (a.id === id) {
          // Cap at invoice amount due using Decimal for precision
          const cappedValue = Money.toNumber(
            Money.min(decimal(numValue), decimal(a.amountDue)),
          );
          return {
            ...a,
            amountAllocated: cappedValue,
            selected: cappedValue > 0,
          };
        }
        return a;
      }),
    );
  };

  const allocateEqually = () => {
    const selectedAllocations = allocations.filter(
      (a: IInvoiceAllocation) => a.selected,
    );
    if (selectedAllocations.length === 0) return;

    const perInvoice = Money.divide(
      paymentAmountNum,
      selectedAllocations.length,
    );
    setAllocations(
      allocations.map((a: IInvoiceAllocation) => {
        if (a.selected) {
          const allocated = Money.toNumber(
            Money.min(perInvoice, decimal(a.amountDue)),
          );
          return { ...a, amountAllocated: allocated };
        }
        return a;
      }),
    );
  };

  const allocateByPriority = () => {
    // Allocate by due date (oldest first)
    const selectedInvoices = allocations
      .filter((a) => a.selected)
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );

    // Process selected invoices in priority order (oldest first)
    let remaining = paymentAmountNum;
    const allocatedMap = new Map<string, number>();

    for (const invoice of selectedInvoices) {
      const toAllocate = Money.toNumber(
        Money.min(remaining, decimal(invoice.amountDue)),
      );
      allocatedMap.set(invoice.invoiceId, toAllocate);
      remaining = remaining.minus(decimal(toAllocate));
      if (!remaining.isPositive()) break;
    }

    // Update all allocations with priority-based amounts
    const updated = allocations.map((a: IInvoiceAllocation) => {
      if (a.selected && allocatedMap.has(a.invoiceId)) {
        return { ...a, amountAllocated: allocatedMap.get(a.invoiceId) || 0 };
      }
      return a;
    });
    setAllocations(updated);
  };

  const clearAllocations = () => {
    setAllocations(
      allocations.map((a: IInvoiceAllocation) => ({
        ...a,
        selected: false,
        amountAllocated: 0,
      })),
    );
  };

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!paymentDate) newErrors.paymentDate = "Payment date is required";
    if (!amount || !paymentAmountNum.isPositive())
      newErrors.amount = "Amount must be greater than 0";
    if (!partyName) newErrors.partyName = "Party name is required";
    if (!cashAccountId)
      newErrors.cashAccountId = "Cash/Bank account is required";

    // Payment method specific validations
    if (paymentMethod === "BANK_TRANSFER") {
      if (!bankName) newErrors.bankName = "Bank name is required";
      if (!accountNumber)
        newErrors.accountNumber = "Account number is required";
    }

    if (paymentMethod === "CHEQUE") {
      if (!chequeNumber) newErrors.chequeNumber = "Cheque number is required";
      if (!chequeDate) newErrors.chequeDate = "Cheque date is required";
      if (!chequeBankName) newErrors.chequeBankName = "Bank name is required";
    }

    if (paymentMethod === "CARD") {
      if (!last4Digits) newErrors.last4Digits = "Last 4 digits are required";
      if (last4Digits && !/^\d{4}$/.test(last4Digits)) {
        newErrors.last4Digits = "Must be exactly 4 digits";
      }
    }

    // Allocation validation - use Decimal comparison methods
    if (totalAllocated.greaterThan(paymentAmountNum)) {
      newErrors.allocations =
        "Total allocated amount cannot exceed payment amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    (async () => {
      try {
        // Build method-specific details
        const bankDetails =
          paymentMethod === "BANK_TRANSFER"
            ? {
                bankName,
                accountNumber,
                accountHolder,
                swiftCode,
                iban,
              }
            : undefined;

        const chequeDetails =
          paymentMethod === "CHEQUE"
            ? {
                chequeNumber,
                chequeDate: new Date(chequeDate),
                bankName: chequeBankName,
                drawerName,
              }
            : undefined;

        const cardDetails =
          paymentMethod === "CARD"
            ? {
                cardType,
                last4Digits,
                transactionId,
                authorizationCode,
              }
            : undefined;

        // Build allocations array (only selected invoices with amounts)
        const invoiceAllocations = allocations
          .filter(
            (a: IInvoiceAllocation) => a.selected && a.amountAllocated > 0,
          )
          .map((a: IInvoiceAllocation) => ({
            invoiceId: a.invoiceId,
            invoiceNumber: a.invoiceNumber,
            amount: a.amountAllocated,
          }));

        const payload = {
          paymentType,
          amount: Money.toNumber(paymentAmountNum),
          currency,
          paymentMethod,
          paymentDate: new Date(paymentDate),
          partyType,
          partyId: partyId || undefined,
          partyName,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
          cashAccountId,
          bankDetails,
          chequeDetails,
          cardDetails,
          allocations: invoiceAllocations,
          unallocatedAmount: Money.toNumber(unallocatedAmount),
          status: "POSTED", // Auto-post payment
        };

        const response = await fetch("/api/finance/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          logger.info("Payment created:", { data });

          // Show success message (you can add toast notification here)
          router.push("/finance/payments");
        } else {
          const errorData = await response.json();
          setErrors({ submit: errorData.error || "Failed to create payment" });
        }
      } catch (_error) {
        logger.error("Error creating payment:", { error: _error });
        setErrors({ submit: "An unexpected error occurred" });
      } finally {
        setIsSubmitting(false);
      }
    })().catch((err) => {
      logger.error("Unhandled error in handleSubmit", { error: err });
      setErrors({ submit: "An unexpected error occurred" });
      setIsSubmitting(false);
    });
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderMethodSpecificFields = () => {
    switch (paymentMethod) {
      case "BANK_TRANSFER":
        return (
          <div className="space-y-4 p-4 bg-primary/10 rounded-2xl">
            <h3 className="font-medium text-primary">
              {t("Bank Transfer Details")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Bank Name")} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl ${errors.bankName ? "border-destructive" : "border-border"}`}
                />
                {errors.bankName && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.bankName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Account Number")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl ${errors.accountNumber ? "border-destructive" : "border-border"}`}
                />
                {errors.accountNumber && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.accountNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Account Holder")}
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("SWIFT Code")}
                </label>
                <input
                  type="text"
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("IBAN")}
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                  placeholder="SA1234567890123456789012"
                />
              </div>
            </div>
          </div>
        );

      case "CHEQUE":
        return (
          <div className="space-y-4 p-4 bg-secondary/10 rounded-2xl">
            <h3 className="font-medium text-secondary">
              {t("Cheque Details")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Cheque Number")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl ${errors.chequeNumber ? "border-destructive" : "border-border"}`}
                />
                {errors.chequeNumber && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.chequeNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Cheque Date")} <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl ${errors.chequeDate ? "border-destructive" : "border-border"}`}
                />
                {errors.chequeDate && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.chequeDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Bank Name")} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={chequeBankName}
                  onChange={(e) => setChequeBankName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl ${errors.chequeBankName ? "border-destructive" : "border-border"}`}
                />
                {errors.chequeBankName && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.chequeBankName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Drawer Name")}
                </label>
                <input
                  type="text"
                  value={drawerName}
                  onChange={(e) => setDrawerName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                  placeholder={t("Name on cheque")}
                />
              </div>
            </div>
          </div>
        );

      case "CARD":
        return (
          <div className="space-y-4 p-4 bg-success/10 rounded-2xl">
            <h3 className="font-medium text-success">
              {t("Card Payment Details")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Card Type")}
                </label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                >
                  <option value="VISA">Visa</option>
                  <option value="MASTERCARD">Mastercard</option>
                  <option value="AMEX">American Express</option>
                  <option value="MADA">Mada</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Last 4 Digits")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={last4Digits}
                  onChange={(e) => setLast4Digits(e.target.value)}
                  maxLength={4}
                  pattern="\d{4}"
                  className={`w-full px-3 py-2 border rounded-2xl ${errors.last4Digits ? "border-destructive" : "border-border"}`}
                  placeholder="1234"
                />
                {errors.last4Digits && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.last4Digits}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Transaction ID")}
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Authorization Code")}
                </label>
                <input
                  type="text"
                  value={authorizationCode}
                  onChange={(e) => setAuthorizationCode(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (missingOrg) {
    return (
      <div className="space-y-6">
        <ModuleViewTabs moduleId="finance" />
        {guard}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      {supportBanner}
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{t("New Payment")}</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-muted-foreground hover:text-foreground"
            disabled={isSubmitting}
          >
            {t("Cancel")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Payment Details Card */}
          <div className="bg-card shadow-sm rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">
              {t("Payment Details")}
            </h2>

            {/* Payment Type & Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Payment Type")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                >
                  <option value="RECEIVED">{t("Payment Received")}</option>
                  <option value="MADE">{t("Payment Made")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Payment Date")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl ${errors.paymentDate ? "border-destructive" : "border-border"}`}
                  required
                />
                {errors.paymentDate && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.paymentDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Reference Number")}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                  placeholder={t("Optional")}
                />
              </div>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Amount")} <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl ${errors.amount ? "border-destructive" : "border-border"}`}
                  required
                />
                {errors.amount && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.amount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("Currency")} <span className="text-destructive">*</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl"
                >
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("Payment Method")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-2xl"
              >
                <option value="CASH">{t("Cash")}</option>
                <option value="CARD">{t("Credit/Debit Card")}</option>
                <option value="BANK_TRANSFER">{t("Bank Transfer")}</option>
                <option value="CHEQUE">{t("Cheque")}</option>
                <option value="ONLINE">{t("Online Payment")}</option>
                <option value="OTHER">{t("Other")}</option>
              </select>
            </div>

            {/* Cash/Bank Account Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("Deposit To Account")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <select
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-2xl ${errors.cashAccountId ? "border-destructive" : "border-border"}`}
                disabled={loadingAccounts}
              >
                <option value="">
                  {loadingAccounts ? t("Loading...") : t("Select Account")}
                </option>
                {chartAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
              {errors.cashAccountId && (
                <p className="text-xs text-destructive mt-1">
                  {errors.cashAccountId}
                </p>
              )}
            </div>

            {/* Method-specific fields */}
            {renderMethodSpecificFields()}

            {/* Party Details */}
            <div className="pt-4 border-t">
              <h3 className="font-medium text-foreground mb-3">
                {paymentType === "RECEIVED" ? t("Received From") : t("Paid To")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t("Party Type")}
                  </label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-2xl"
                  >
                    <option value="TENANT">{t("Tenant")}</option>
                    <option value="CUSTOMER">{t("Customer")}</option>
                    <option value="VENDOR">{t("Vendor")}</option>
                    <option value="SUPPLIER">{t("Supplier")}</option>
                    <option value="OWNER">{t("Owner")}</option>
                    <option value="OTHER">{t("Other")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t("Party Name")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-2xl ${errors.partyName ? "border-destructive" : "border-border"}`}
                    required
                  />
                  {errors.partyName && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.partyName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("Notes")}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-2xl"
                placeholder={t("Optional payment notes...")}
              />
            </div>
          </div>

          {/* Invoice Allocation Card (for RECEIVED payments only) */}
          {paymentType === "RECEIVED" && (
            <div className="bg-card shadow-sm rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-xl font-semibold">
                  {t("Invoice Allocation")}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setShowInvoiceAllocation(!showInvoiceAllocation)
                  }
                  className="px-4 py-2 text-sm bg-primary/10 text-primary rounded-2xl hover:bg-primary/20"
                >
                  {showInvoiceAllocation
                    ? t("Hide Invoices")
                    : t("Allocate to Invoices")}
                </button>
              </div>

              {showInvoiceAllocation && (
                <>
                  {loadingInvoices ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {t("Loading invoices...")}
                      </p>
                    </div>
                  ) : allocations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {t("No unpaid invoices found")}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Allocation Actions */}
                      <div className="flex gap-2 pb-3 border-b">
                        <button
                          type="button"
                          onClick={allocateEqually}
                          className="px-3 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted/80"
                          disabled={
                            allocations.filter((a) => a.selected).length === 0
                          }
                        >
                          {t("Allocate Equally")}
                        </button>
                        <button
                          type="button"
                          onClick={allocateByPriority}
                          className="px-3 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted/80"
                          disabled={
                            allocations.filter((a) => a.selected).length === 0
                          }
                        >
                          {t("By Due Date")}
                        </button>
                        <button
                          type="button"
                          onClick={clearAllocations}
                          className="px-3 py-1 text-sm bg-destructive/10 text-destructive rounded hover:bg-destructive/20"
                        >
                          {t("Clear All")}
                        </button>
                      </div>

                      {/* Allocations Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground uppercase">
                                {t("Select")}
                              </th>
                              <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground uppercase">
                                {t("Invoice #")}
                              </th>
                              <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground uppercase">
                                {t("Customer")}
                              </th>
                              <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground uppercase">
                                {t("Due Date")}
                              </th>
                              <th className="px-3 py-2 text-end text-xs font-medium text-muted-foreground uppercase">
                                {t("Amount Due")}
                              </th>
                              <th className="px-3 py-2 text-end text-xs font-medium text-muted-foreground uppercase">
                                {t("Allocate")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {allocations.map((allocation) => (
                              <tr
                                key={allocation.id}
                                className={
                                  allocation.selected ? "bg-primary/10" : ""
                                }
                              >
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={allocation.selected}
                                    onChange={() =>
                                      toggleInvoiceSelection(allocation.id)
                                    }
                                    className="w-4 h-4 text-primary rounded"
                                  />
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-foreground">
                                  {allocation.invoiceNumber}
                                </td>
                                <td className="px-3 py-2 text-sm text-foreground">
                                  {allocation.customerName}
                                </td>
                                <td className="px-3 py-2 text-sm text-foreground">
                                  <ClientDate
                                    date={allocation.dueDate}
                                    format="date-only"
                                  />
                                </td>
                                <td className="px-3 py-2 text-sm text-end text-foreground">
                                  {allocation.amountDue.toFixed(2)} {currency}
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={allocation.amountDue}
                                    value={allocation.amountAllocated}
                                    onChange={(e) =>
                                      updateAllocationAmount(
                                        allocation.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1 text-sm text-end border border-border rounded"
                                    disabled={!allocation.selected}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Allocation Summary */}
                      <div className="pt-3 border-t">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="bg-muted p-3 rounded">
                            <p className="text-muted-foreground">
                              {t("Payment Amount")}
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              {Money.toString(paymentAmountNum)} {currency}
                            </p>
                          </div>
                          <div className="bg-primary/10 p-3 rounded">
                            <p className="text-muted-foreground">
                              {t("Allocated")}
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {Money.toString(totalAllocated)} {currency}
                            </p>
                          </div>
                          <div
                            className={`p-3 rounded ${unallocatedAmount.isNegative() ? "bg-destructive/10" : "bg-success/10"}`}
                          >
                            <p className="text-muted-foreground">
                              {t("Unallocated")}
                            </p>
                            <p
                              className={`text-lg font-bold ${unallocatedAmount.isNegative() ? "text-destructive" : "text-success"}`}
                            >
                              {Money.toString(unallocatedAmount)} {currency}
                            </p>
                          </div>
                        </div>
                        {errors.allocations && (
                          <p className="text-sm text-destructive mt-2">
                            {errors.allocations}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Error Display */}
          {errors.submit && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
              <p className="text-sm text-destructive">{errors.submit}</p>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 bg-card shadow-sm rounded-2xl p-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-border rounded-2xl text-foreground hover:bg-muted"
              disabled={isSubmitting}
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || Object.keys(errors).length > 0}
            >
              {isSubmitting ? t("Creating...") : t("Create Payment")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
