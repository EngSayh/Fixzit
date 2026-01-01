"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFormState } from "@/contexts/FormStateContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Money, decimal } from "@/lib/finance/decimal";
import type Decimal from "decimal.js";

// ============================================================================
// INTERFACES
// ============================================================================

interface IInvoiceLineItem {
  id: string;
  description: string;
  category: string;
  accountId: string;
  accountCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxType: string;
  taxRate: number;
  taxAmount: number;
  total: number;
}

interface IPaymentAllocation {
  paymentId: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  method: string;
  status: string;
}

interface IChartAccount {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: string;
}

export default function NewInvoicePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { registerForm, unregisterForm } = useFormState();

  // Core form state
  const [invoiceType, setInvoiceType] = useState<string>("SALES");
  const [issueDate, setIssueDate] = useState<string>(""); // ✅ HYDRATION FIX: Initialize empty, set in useEffect
  const [dueDate, setDueDate] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [description] = useState<string>(""); // Not used in this simplified form, kept for future enhancements
  const [notes, setNotes] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30");
  const [currency, setCurrency] = useState<string>("SAR");

  // Line items state
  const [lineItems, setLineItems] = useState<IInvoiceLineItem[]>([
    {
      id: "1",
      description: "",
      category: "RENTAL",
      accountId: "",
      accountCode: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxType: "VAT",
      taxRate: 0.15,
      taxAmount: 0,
      total: 0,
    },
  ]);

  // Payment allocations (for tracking payments against this invoice)
  const [paymentAllocations] = useState<IPaymentAllocation[]>([]);

  // Data lookups
  const [chartAccounts, setChartAccounts] = useState<IChartAccount[]>([]);

  // Journal posting state
  const [autoPostJournal, setAutoPostJournal] = useState<boolean>(true);
  const [journalPosted, setJournalPosted] = useState<boolean>(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Calculate totals using Decimal math (prevents floating-point errors)
  const subtotal: Decimal = React.useMemo(() => {
    const lineAmounts = lineItems.map((item) =>
      Money.subtract(
        Money.multiply(item.quantity, item.unitPrice),
        item.discount,
      ),
    );
    // Keep in Decimal space - don't convert to number before summing
    return Money.sum(lineAmounts);
  }, [lineItems]);

  const totalDiscount: Decimal = React.useMemo(
    () => Money.sum(lineItems.map((item) => item.discount)),
    [lineItems],
  );

  const totalTax: Decimal = React.useMemo(
    () => Money.sum(lineItems.map((item) => item.taxAmount)),
    [lineItems],
  );

  const totalAmount: Decimal = React.useMemo(
    () => subtotal.plus(totalTax),
    [subtotal, totalTax],
  );

  const totalPaid: Decimal = React.useMemo(
    () =>
      Money.sum(paymentAllocations.map((p: { amount: number }) => p.amount)),
    [paymentAllocations],
  );

  const amountDue: Decimal = React.useMemo(
    () => totalAmount.minus(totalPaid),
    [totalAmount, totalPaid],
  );

  // VAT breakdown by rate (using Decimal for precise calculations)
  const vatBreakdown = React.useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        if (item.taxType === "VAT" && item.taxAmount > 0) {
          const key = `${item.taxRate * 100}%`;
          if (!acc[key]) {
            acc[key] = {
              rate: item.taxRate,
              amount: decimal(0),
              base: decimal(0),
            };
          }
          acc[key].amount = acc[key].amount.plus(item.taxAmount);
          const baseAmount = Money.subtract(
            Money.multiply(item.quantity, item.unitPrice),
            item.discount,
          );
          acc[key].base = acc[key].base.plus(baseAmount);
        }
        return acc;
      },
      {} as Record<string, { rate: number; amount: Decimal; base: Decimal }>,
    );
  }, [lineItems]);

  // ============================================================================
  // LIFECYCLE & DATA LOADING
  // ============================================================================

  // ✅ HYDRATION FIX: Set default date after client hydration
  useEffect(() => {
    if (!issueDate) {
      setIssueDate(new Date().toISOString().split("T")[0]);
    }
  }, [issueDate]);

  useEffect(() => {
    const formId = "new-invoice-form";
    registerForm(formId);
    return () => unregisterForm(formId);
  }, [registerForm, unregisterForm]);

  // Load chart of accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const response = await fetch("/api/finance/accounts");
        if (response.ok) {
          const data = await response.json();
          setChartAccounts(data.accounts || []);
        }
      } catch (error) {
        logger.error("Error loading accounts:", { error });
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadAccounts();
  }, []);

  // ============================================================================
  // LINE ITEMS MANAGEMENT
  // ============================================================================

  const addLineItem = () => {
    const newItem: IInvoiceLineItem = {
      id: Date.now().toString(),
      description: "",
      category: "RENTAL",
      accountId: "",
      accountCode: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxType: "VAT",
      taxRate: 0.15,
      taxAmount: 0,
      total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (
    id: string,
    field: keyof IInvoiceLineItem,
    value: string | number | boolean,
  ) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Recalculate amounts
        const itemSubtotal = updated.quantity * updated.unitPrice;
        const discountedAmount = itemSubtotal - updated.discount;

        if (
          field === "quantity" ||
          field === "unitPrice" ||
          field === "discount" ||
          field === "taxRate" ||
          field === "taxType"
        ) {
          if (updated.taxType === "VAT") {
            updated.taxAmount = discountedAmount * updated.taxRate;
          } else if (updated.taxType === "EXEMPT") {
            updated.taxAmount = 0;
            updated.taxRate = 0;
          } else {
            updated.taxAmount = 0;
          }
          updated.total = discountedAmount + updated.taxAmount;
        }

        // Update account code when account changes
        if (field === "accountId") {
          const account = chartAccounts.find((a) => a.id === value);
          if (account) {
            updated.accountCode = account.code;
          }
        }

        return updated;
      }),
    );
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!issueDate) {
      newErrors.issueDate = t(
        "finance.invoice.issueDateRequired",
        "Issue date is required",
      );
    }

    if (!dueDate) {
      newErrors.dueDate = t(
        "finance.invoice.dueDateRequired",
        "Due date is required",
      );
    }

    if (!customerName.trim()) {
      newErrors.customerName = t(
        "finance.invoice.customerRequired",
        "Customer name is required",
      );
    }

    if (lineItems.length === 0) {
      newErrors.lineItems = t(
        "finance.invoice.lineItemsRequired",
        "At least one line item is required",
      );
    }

    // Validate each line item
    lineItems.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`lineItem.${index}.description`] = t(
          "finance.invoice.lineItemDescRequired",
          "Description required",
        );
      }
      if (item.quantity <= 0) {
        newErrors[`lineItem.${index}.quantity`] = t(
          "finance.invoice.lineItemQtyInvalid",
          "Quantity must be > 0",
        );
      }
      if (item.unitPrice <= 0) {
        newErrors[`lineItem.${index}.unitPrice`] = t(
          "finance.invoice.lineItemPriceInvalid",
          "Price must be > 0",
        );
      }
      if (!item.accountId) {
        newErrors[`lineItem.${index}.accountId`] = t(
          "finance.invoice.accountRequired",
          "Revenue account required",
        );
      }
    });

    if (!totalAmount.isPositive()) {
      newErrors.totalAmount = t(
        "finance.invoice.totalInvalid",
        "Total amount must be greater than zero",
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSaveDraft = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const payload = {
        type: invoiceType,
        status: "DRAFT",
        issueDate,
        dueDate,
        recipient: {
          customerId: customerId || undefined,
          name: customerName,
          address: billingAddress,
        },
        description,
        notes,
        payment: {
          terms: paymentTerms,
        },
        currency,
        items: lineItems.map((item) => ({
          description: item.description,
          category: item.category,
          accountId: item.accountId || undefined,
          accountCode: item.accountCode || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: {
            type: item.taxType,
            rate: item.taxRate,
            amount: item.taxAmount,
          },
          total: item.total,
        })),
        subtotal: Money.toNumber(subtotal),
        discounts: totalDiscount.isPositive()
          ? [
              {
                type: "LINE_ITEM",
                amount: Money.toNumber(totalDiscount),
                description: "Line item discounts",
              },
            ]
          : [],
        taxes: Object.entries(vatBreakdown).map(([key, val]) => ({
          type: "VAT",
          rate: val.rate,
          amount: Money.toNumber(val.amount),
          category: key,
        })),
        total: Money.toNumber(totalAmount),
      };

      const response = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save draft");
      }

      const data = await response.json();
      toast.success(
        t("finance.invoice.draftSaved", "Invoice draft saved successfully"),
      );
      if (data?.invoice?.id) {
        router.push(`/finance/invoices/${data.invoice.id}`);
      }
    } catch (error) {
      logger.error("Error saving draft:", { error });
      toast.error(t("common.error", "An error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const payload = {
        type: invoiceType,
        status: "SENT",
        issueDate,
        dueDate,
        recipient: {
          customerId: customerId || undefined,
          name: customerName,
          address: billingAddress,
        },
        description,
        notes,
        payment: {
          terms: paymentTerms,
        },
        currency,
        items: lineItems.map((item) => ({
          description: item.description,
          category: item.category,
          accountId: item.accountId || undefined,
          accountCode: item.accountCode || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: {
            type: item.taxType,
            rate: item.taxRate,
            amount: item.taxAmount,
          },
          total: item.total,
        })),
        subtotal: Money.toNumber(subtotal),
        discounts: totalDiscount.isPositive()
          ? [
              {
                type: "LINE_ITEM",
                amount: Money.toNumber(totalDiscount),
                description: "Line item discounts",
              },
            ]
          : [],
        taxes: Object.entries(vatBreakdown).map(([key, val]) => ({
          type: "VAT",
          rate: val.rate,
          amount: Money.toNumber(val.amount),
          category: key,
        })),
        totalAmount: Money.toNumber(totalAmount),
        autoPostJournal,
      };

      const response = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create invoice");
      }

      const data = await response.json();

      if (data?.journal) {
        setJournalPosted(true);
      }

      toast.success(
        t("finance.invoice.created", "Invoice created successfully"),
      );
      if (data?.invoice?.id) {
        router.push(`/finance/invoices/${data.invoice.id}`);
      }
    } catch (error) {
      logger.error("Error creating invoice:", { error });
      toast.error(t("common.error", "An error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };
  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("finance.invoice.newInvoice", "New Invoice")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "finance.invoice.subtitle",
              "Create invoice with automatic journal posting",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="btn-secondary"
            aria-label={t("common.save", "Save Draft")}
          >
            💾 {t("common.save", "Save Draft")}
          </button>
          <button type="button"
            onClick={handleCreateInvoice}
            disabled={isSubmitting}
            className="btn-primary"
            aria-label={t("finance.invoice.createInvoice", "Create Invoice")}
          >
            ✓ {t("finance.invoice.createInvoice", "Create Invoice")}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.invoice.details", "Invoice Details")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.invoice.type", "Invoice Type")} *
                </label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="SALES">
                    {t("finance.invoice.sales", "Sales")}
                  </option>
                  <option value="RENTAL">
                    {t("finance.invoice.rental", "Rental")}
                  </option>
                  <option value="SERVICE">
                    {t("finance.invoice.service", "Service")}
                  </option>
                  <option value="MAINTENANCE">
                    {t("finance.invoice.maintenance", "Maintenance")}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.invoice.issueDate", "Issue Date")} *
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent ${errors.issueDate ? "border-destructive" : "border-border"}`}
                />
                {errors.issueDate && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.issueDate}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.invoice.dueDate", "Due Date")} *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent ${errors.dueDate ? "border-destructive" : "border-border"}`}
                />
                {errors.dueDate && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.dueDate}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.currency", "Currency")}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.invoice.billTo", "Bill To")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.customer", "Customer")} *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    if (e.target.value) {
                      setCustomerName(
                        e.target.options[e.target.selectedIndex].text,
                      );
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent ${errors.customerName ? "border-destructive" : "border-border"}`}
                >
                  <option value="">
                    {t("finance.selectCustomer", "Select Customer")}
                  </option>
                  <option value="cust1">John Smith - Tower A</option>
                  <option value="cust2">Sarah Johnson - Tower B</option>
                  <option value="cust3">Ahmed Al-Rashid - Villa 9</option>
                </select>
                {errors.customerName && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.customerName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.invoice.customerName", "Customer Name")}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t(
                    "finance.invoice.customerNamePlaceholder",
                    "Enter customer name",
                  )}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.invoice.billingAddress", "Billing Address")}
                </label>
                <textarea
                  rows={3}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder={t(
                    "finance.invoice.billingAddressPlaceholder",
                    "Enter billing address...",
                  )}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* LINE ITEMS WITH COA INTEGRATION */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {t("finance.invoice.itemsServices", "Items & Services")}
              </h3>
              <button type="button" onClick={addLineItem} className="btn-sm btn-primary" aria-label={t("finance.invoice.addItem", "Add Item")}>
                + {t("finance.invoice.addItem", "Add Item")}
              </button>
            </div>

            {errors.lineItems && (
              <p className="text-destructive text-sm mb-2">
                {errors.lineItems}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-2 text-start">
                      {t("finance.invoice.description", "Description")}
                    </th>
                    <th className="px-2 py-2 text-start">
                      {t("finance.invoice.revenueAccount", "Revenue Account")}
                    </th>
                    <th className="px-2 py-2 text-end">
                      {t("finance.invoice.qty", "Qty")}
                    </th>
                    <th className="px-2 py-2 text-end">
                      {t("finance.invoice.rate", "Rate")}
                    </th>
                    <th className="px-2 py-2 text-end">
                      {t("finance.invoice.discount", "Discount")}
                    </th>
                    <th className="px-2 py-2 text-center">
                      {t("finance.invoice.taxType", "Tax Type")}
                    </th>
                    <th className="px-2 py-2 text-end">
                      {t("finance.invoice.total", "Total")}
                    </th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder={t(
                            "finance.invoice.itemDescription",
                            "Item description",
                          )}
                          className={`w-full px-2 py-1 text-sm border rounded ${errors[`lineItem.${index}.description`] ? "border-destructive" : "border-border"}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={item.accountId}
                          onChange={(e) =>
                            updateLineItem(item.id, "accountId", e.target.value)
                          }
                          className={`w-full px-2 py-1 text-sm border rounded ${errors[`lineItem.${index}.accountId`] ? "border-destructive" : "border-border"}`}
                          disabled={loadingAccounts}
                        >
                          <option value="">
                            {loadingAccounts
                              ? t("common.loading", "Loading...")
                              : t("finance.selectAccount", "Select Account")}
                          </option>
                          {chartAccounts
                            .filter((a) => a.type === "REVENUE")
                            .map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "quantity",
                              parseFloat(e.target.value) || 1,
                            )
                          }
                          min="1"
                          step="1"
                          className={`w-16 px-2 py-1 text-sm text-end border rounded ${errors[`lineItem.${index}.quantity`] ? "border-destructive" : "border-border"}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          min="0"
                          step="0.01"
                          className={`w-24 px-2 py-1 text-sm text-end border rounded ${errors[`lineItem.${index}.unitPrice`] ? "border-destructive" : "border-border"}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "discount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          min="0"
                          step="0.01"
                          className="w-20 px-2 py-1 text-sm text-end border border-border rounded"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={item.taxType}
                          onChange={(e) =>
                            updateLineItem(item.id, "taxType", e.target.value)
                          }
                          className="w-24 px-2 py-1 text-sm border border-border rounded"
                        >
                          <option value="VAT">VAT 15%</option>
                          <option value="EXEMPT">
                            {t("finance.invoice.exempt", "Exempt")}
                          </option>
                        </select>
                      </td>
                      <td className="px-2 py-2 text-end font-medium">
                        {currency} {item.total.toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        {lineItems.length > 1 && (
                          <button type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="text-destructive hover:text-destructive"
                            title={t("common.remove", "Remove")}
                            aria-label={t("common.remove", "Remove")}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ENHANCED VAT BREAKDOWN */}
          {Object.keys(vatBreakdown).length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">
                {t("finance.invoice.vatBreakdown", "VAT Breakdown")}
              </h3>
              <div className="space-y-2">
                {Object.entries(vatBreakdown).map(([rate, data]) => (
                  <div
                    key={rate}
                    className="flex justify-between items-center py-2 border-b"
                  >
                    <div>
                      <span className="font-medium">
                        {t("finance.vat", "VAT")} {rate}
                      </span>
                      <span className="text-sm text-muted-foreground ms-2">
                        ({t("finance.invoice.on", "on")} {currency}{" "}
                        {Money.toString(data.base)})
                      </span>
                    </div>
                    <span className="font-medium">
                      {currency} {Money.toString(data.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-semibold">
                  <span>{t("finance.invoice.totalVAT", "Total VAT")}</span>
                  <span>
                    {currency} {Money.toString(totalTax)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* JOURNAL POSTING OPTIONS */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.invoice.journalPosting", "Journal Posting")}
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto-post-journal"
                checked={autoPostJournal}
                onChange={(e) => setAutoPostJournal(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="auto-post-journal" className="text-sm">
                {t(
                  "finance.invoice.autoPostJournal",
                  "Automatically post journal entry when invoice is created",
                )}
              </label>
            </div>
            {autoPostJournal && (
              <div className="mt-3 p-3 bg-primary/10 rounded-2xl text-sm">
                <p className="text-primary-foreground">
                  ℹ️{" "}
                  {t(
                    "finance.invoice.journalPostingInfo",
                    "Journal entry will be created automatically with DR: Accounts Receivable, CR: Revenue accounts based on line items.",
                  )}
                </p>
              </div>
            )}
            {journalPosted && (
              <div className="mt-3 p-3 bg-success/10 rounded-2xl text-sm">
                <p className="text-success-foreground">
                  ✓{" "}
                  {t(
                    "finance.invoice.journalPosted",
                    "Journal entry posted successfully",
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Notes & Terms */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.invoice.notesTerms", "Notes & Terms")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.invoice.paymentTerms", "Payment Terms")}
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="Net 30">
                    {t("finance.invoice.net30", "Net 30 days")}
                  </option>
                  <option value="Net 15">
                    {t("finance.invoice.net15", "Net 15 days")}
                  </option>
                  <option value="Net 7">
                    {t("finance.invoice.net7", "Net 7 days")}
                  </option>
                  <option value="Due on Receipt">
                    {t("finance.invoice.dueOnReceipt", "Due on receipt")}
                  </option>
                  <option value="COD">
                    {t("finance.invoice.cod", "Cash on delivery")}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.invoice.invoiceNotes", "Invoice Notes")}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t(
                    "finance.invoice.notesPlaceholder",
                    "Add notes or payment instructions...",
                  )}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.invoice.summary", "Invoice Summary")}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("finance.subtotal", "Subtotal")}
                </span>
                <span className="font-medium">
                  {currency} {Money.toString(subtotal)}
                </span>
              </div>
              {totalDiscount.isPositive() && (
                <div className="flex justify-between text-destructive">
                  <span>{t("finance.discount", "Discount")}</span>
                  <span>
                    -{currency} {Money.toString(totalDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("finance.vat", "VAT")}
                </span>
                <span className="font-medium">
                  {currency} {Money.toString(totalTax)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-foreground font-semibold">
                  {t("finance.total", "Total")}
                </span>
                <span className="font-bold text-lg">
                  {currency} {Money.toString(totalAmount)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {lineItems.length} {t("finance.invoice.items", "item(s)")}
              </div>
            </div>
          </div>

          {/* PAYMENT TRACKING */}
          {paymentAllocations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">
                {t("finance.invoice.paymentTracking", "Payment Tracking")}
              </h3>
              <div className="space-y-3">
                {paymentAllocations.map((payment) => (
                  <div
                    key={payment.paymentId}
                    className="flex justify-between items-center p-2 bg-muted rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {payment.paymentNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.paymentDate} • {payment.method}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-success">
                      +{currency} {payment.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">
                      {t("finance.invoice.totalPaid", "Total Paid")}
                    </span>
                    <span className="text-sm font-medium text-success">
                      {currency} {Money.toString(totalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">
                      {t("finance.invoice.amountDue", "Amount Due")}
                    </span>
                    <span className="text-sm font-bold">
                      {currency} {Money.toString(amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("workOrders.quickActions", "Quick Actions")}
            </h3>
            <div className="space-y-2">
              <button type="button" className="w-full btn-ghost text-start" aria-label={t("finance.invoice.createFromTemplate", "Create from Template")}>
                📋{" "}
                {t(
                  "finance.invoice.createFromTemplate",
                  "Create from Template",
                )}
              </button>
              <button type="button" className="w-full btn-ghost text-start" aria-label={t("finance.invoice.costCalculator", "View Cost Calculator")}>
                📊 {t("finance.invoice.costCalculator", "View Cost Calculator")}
              </button>
              <button type="button" className="w-full btn-ghost text-start" aria-label={t("finance.invoice.paymentSchedule", "Payment Schedule")}>
                💰 {t("finance.invoice.paymentSchedule", "Payment Schedule")}
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.recentActivity", "Recent Activity")}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success/20 rounded-full"></div>
                <span className="text-muted-foreground">
                  {t("finance.formAutoSaved", "Form auto-saved")}
                </span>
                <span className="text-muted-foreground ms-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary/20 rounded-full"></div>
                <span className="text-muted-foreground">
                  {t("finance.invoice.customerSelected", "Customer selected")}
                </span>
                <span className="text-muted-foreground ms-auto">5m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
