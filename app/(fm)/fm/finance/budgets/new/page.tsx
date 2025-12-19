"use client";

import React, { useState } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useFormState } from "@/contexts/FormStateContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { BudgetMath, Money } from "@/lib/finance/decimal";
import type { BudgetCategory } from "@/lib/finance/schemas";
import type Decimal from "decimal.js";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

export default function NewBudgetPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { registerForm, unregisterForm } = useFormState();
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({
    moduleId: "finance",
  });
  const missingOrg = !hasOrgContext || !orgId;

  // Form state
  const [budgetName, setBudgetName] = useState("");
  const [periodType, setPeriodType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [propertyId, setPropertyId] = useState("all");
  const [budgetOwner, setBudgetOwner] = useState("");
  const [categories, setCategories] = useState<BudgetCategory[]>([
    { id: "1", category: "", amount: 0, percentage: 0 },
  ]);
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [requireApprovals, setRequireApprovals] = useState(false);
  const [allowCarryover, setAllowCarryover] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate budget summary using Decimal math (prevents floating-point errors)
  const totalBudget: Decimal = React.useMemo(
    () => BudgetMath.calculateTotal(categories),
    [categories],
  );

  const allocatedBudget: Decimal = React.useMemo(
    () => BudgetMath.calculateAllocated(categories),
    [categories],
  );

  const remainingBudget: Decimal = React.useMemo(
    () => BudgetMath.calculateRemaining(totalBudget, allocatedBudget),
    [totalBudget, allocatedBudget],
  );

  // Register form for tracking (no initial fields needed - will track via updateField calls)
  React.useEffect(() => {
    const formId = "new-budget-form";
    registerForm(formId);
    return () => unregisterForm(formId);
  }, [registerForm, unregisterForm]);

  // Add new category row
  const handleAddCategory = () => {
    const newId = (
      Math.max(...categories.map((c: { id: string }) => parseInt(c.id, 10))) + 1
    ).toString();
    setCategories([
      ...categories,
      { id: newId, category: "", amount: 0, percentage: 0 },
    ]);
  };

  // Remove category row
  const handleRemoveCategory = (id: string) => {
    if (categories.length > 1) {
      setCategories(categories.filter((c) => c.id !== id));
    }
  };

  // Update category field
  const handleCategoryChange = (
    id: string,
    field: keyof BudgetCategory,
    value: string | number,
  ) => {
    setCategories((prevCategories) => {
      const nextCategories = prevCategories.map((cat) =>
        cat.id === id ? { ...cat, [field]: value } : cat,
      );

      if (field !== "amount" && field !== "percentage") {
        return nextCategories;
      }

      const nextTotal = BudgetMath.calculateTotal(nextCategories);

      if (nextTotal.isZero()) {
        return nextCategories;
      }

      return nextCategories.map((cat) => {
        if (cat.id !== id) {
          return cat;
        }

        if (field === "amount") {
          const percentageDec = BudgetMath.percentageFromAmount(
            cat.amount,
            nextTotal,
          );
          return {
            ...cat,
            percentage: Math.round(Money.toNumber(percentageDec)),
          };
        }

        const amountDec = BudgetMath.amountFromPercentage(
          nextTotal,
          cat.percentage,
        );
        return { ...cat, amount: Money.toNumber(Money.round(amountDec)) };
      });
    });
  };

  // Save as draft
  const handleSaveDraft = () => {
    (async () => {
      try {
        setIsSubmitting(true);
        const response = await fetch("/api/finance/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            budgetName,
            periodType,
            startDate,
            endDate,
            propertyId: propertyId === "all" ? null : propertyId,
            budgetOwner,
            categories: categories.filter((c) => c.category),
            settings: { enableAlerts, requireApprovals, allowCarryover },
            description,
            status: "draft",
          }),
        });

        if (!response.ok) throw new Error("Failed to save draft");

        const data = await response.json();
        toast.success(
          t("finance.budget.draftSaved", "Budget draft saved successfully"),
        );
        if (data?.id) {
          router.push(`/finance/budgets/${data.id}`);
        }
      } catch (_error) {
        logger.error("Error saving budget draft", { error: _error });
        toast.error(t("common.error", "An error occurred"));
      } finally {
        setIsSubmitting(false);
      }
    })().catch((err) => {
      logger.error("Unhandled error in handleSaveDraft", { error: err });
      toast.error(t("common.error", "An error occurred"));
      setIsSubmitting(false);
    });
  };

  // Create budget
  const handleSubmit = () => {
    // Validation
    if (!budgetName.trim()) {
      toast.error(t("finance.budget.nameRequired", "Budget name is required"));
      return;
    }
    if (!periodType) {
      toast.error(
        t("finance.budget.periodRequired", "Budget period is required"),
      );
      return;
    }
    if (!startDate || !endDate) {
      toast.error(
        t("finance.budget.datesRequired", "Start and end dates are required"),
      );
      return;
    }
    if (categories.filter((c) => c.category).length === 0) {
      toast.error(
        t(
          "finance.budget.categoriesRequired",
          "At least one category is required",
        ),
      );
      return;
    }

    const toastId = toast.loading(
      t("finance.budget.creating", "Creating budget..."),
    );

    (async () => {
      try {
        setIsSubmitting(true);
        const response = await fetch("/api/finance/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            budgetName,
            periodType,
            startDate,
            endDate,
            propertyId: propertyId === "all" ? null : propertyId,
            budgetOwner,
            categories: categories.filter((c) => c.category),
            settings: { enableAlerts, requireApprovals, allowCarryover },
            description,
            status: "active",
          }),
        });

        if (!response.ok) throw new Error("Failed to create budget");

        const data = await response.json();
        toast.success(
          t("finance.budget.created", "Budget created successfully"),
          { id: toastId },
        );
        if (data?.id) {
          router.push(`/finance/budgets/${data.id}`);
        }
      } catch (_error) {
        logger.error("Error creating budget", { error: _error });
        toast.error(t("common.error", "An error occurred"), { id: toastId });
      } finally {
        setIsSubmitting(false);
      }
    })().catch((err) => {
      logger.error("Unhandled error in handleSubmit", { error: err });
      toast.error(t("common.error", "An error occurred"), { id: toastId });
      setIsSubmitting(false);
    });
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("finance.budget.newBudget", "New Budget")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "finance.budget.subtitle",
              "Create a new budget for expense tracking and control",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="btn-secondary"
          >
            {t("common.save", "Save Draft")}
          </button>
          <button type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {t("finance.budget.createBudget", "Create Budget")}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.budget.details", "Budget Details")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.budget.budgetName", "Budget Name")} *
                </label>
                <input
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder={t(
                    "finance.budget.namePlaceholder",
                    "Q1 2025 Maintenance Budget",
                  )}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.budget.budgetPeriod", "Budget Period")} *
                </label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">
                    {t("finance.budget.selectPeriod", "Select Period")}
                  </option>
                  <option value="monthly">
                    {t("finance.budget.monthly", "Monthly")}
                  </option>
                  <option value="quarterly">
                    {t("finance.budget.quarterly", "Quarterly")}
                  </option>
                  <option value="semi-annual">
                    {t("finance.budget.semiAnnual", "Semi-Annual")}
                  </option>
                  <option value="annual">
                    {t("finance.budget.annual", "Annual")}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.budget.startDate", "Start Date")} *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.budget.endDate", "End Date")} *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("workOrders.property", "Property")}
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">
                    {t("finance.allProperties", "All Properties")}
                  </option>
                  <option value="tower-a">Tower A</option>
                  <option value="tower-b">Tower B</option>
                  <option value="villa-complex">Villa Complex</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("finance.budget.budgetOwner", "Budget Owner")}
                </label>
                <select
                  value={budgetOwner}
                  onChange={(e) => setBudgetOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">
                    {t("finance.budget.selectOwner", "Select Owner")}
                  </option>
                  <option value="property-manager">
                    {t("finance.budget.propertyManager", "Property Manager")}
                  </option>
                  <option value="maintenance-manager">
                    {t(
                      "finance.budget.maintenanceManager",
                      "Maintenance Manager",
                    )}
                  </option>
                  <option value="finance-manager">
                    {t("finance.budget.financeManager", "Finance Manager")}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t(
                "finance.budget.categoriesAmounts",
                "Budget Categories & Amounts",
              )}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-foreground border-b pb-2">
                <div className="col-span-6">
                  {t("finance.budget.category", "Category")}
                </div>
                <div className="col-span-3">
                  {t("finance.budget.budgetedAmount", "Budgeted Amount")}
                </div>
                <div className="col-span-2">
                  {t("finance.budget.percentage", "Percentage")}
                </div>
                <div className="col-span-1">
                  {t("common.actions", "Actions")}
                </div>
              </div>

              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-6">
                    <select
                      value={cat.category}
                      onChange={(e) =>
                        handleCategoryChange(cat.id, "category", e.target.value)
                      }
                      className="w-full px-2 py-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">
                        {t("finance.budget.selectCategory", "Select Category")}
                      </option>
                      <option value="maintenance">
                        {t(
                          "finance.expense.maintenance",
                          "Maintenance & Repairs",
                        )}
                      </option>
                      <option value="utilities">
                        {t("finance.expense.utilities", "Utilities")}
                      </option>
                      <option value="insurance">
                        {t("finance.expense.insurance", "Insurance")}
                      </option>
                      <option value="property-management">
                        {t(
                          "finance.budget.propertyManagement",
                          "Property Management",
                        )}
                      </option>
                      <option value="security">
                        {t("finance.budget.security", "Security")}
                      </option>
                      <option value="landscaping">
                        {t("finance.budget.landscaping", "Landscaping")}
                      </option>
                      <option value="administrative">
                        {t("finance.budget.administrative", "Administrative")}
                      </option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={cat.amount || ""}
                        onChange={(e) =>
                          handleCategoryChange(
                            cat.id,
                            "amount",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                        className="w-full px-2 py-2 pe-12 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <span className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        SAR
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={cat.percentage || ""}
                      onChange={(e) =>
                        handleCategoryChange(
                          cat.id,
                          "percentage",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0"
                      className="w-full px-2 py-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-1">
                    <button type="button"
                      onClick={() => handleRemoveCategory(cat.id)}
                      disabled={categories.length === 1}
                      className="text-destructive hover:text-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}

              <button type="button"
                onClick={handleAddCategory}
                className="w-full py-2 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              >
                + {t("finance.budget.addCategory", "Add Category")}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.budget.budgetSettings", "Budget Settings")}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="alerts"
                  checked={enableAlerts}
                  onChange={(e) => setEnableAlerts(e.target.checked)}
                  className="me-3 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <label htmlFor="alerts" className="text-sm text-foreground">
                  {t(
                    "finance.budget.enableAlerts",
                    "Enable budget alerts when spending exceeds 80% of category budget",
                  )}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="approvals"
                  checked={requireApprovals}
                  onChange={(e) => setRequireApprovals(e.target.checked)}
                  className="me-3 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <label htmlFor="approvals" className="text-sm text-foreground">
                  {t(
                    "finance.budget.requireApprovals",
                    "Require approval for expenses exceeding SAR 5,000",
                  )}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="carryover"
                  checked={allowCarryover}
                  onChange={(e) => setAllowCarryover(e.target.checked)}
                  className="me-3 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <label htmlFor="carryover" className="text-sm text-foreground">
                  {t(
                    "finance.budget.allowCarryover",
                    "Allow unused budget to carry over to next period",
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.budget.notesDescription", "Notes & Description")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("finance.budget.budgetDescription", "Budget Description")}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "finance.budget.descriptionPlaceholder",
                  "Describe the purpose and scope of this budget...",
                )}
                className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.budget.budgetSummary", "Budget Summary")}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("finance.budget.totalBudget", "Total Budget")}
                </span>
                <span className="font-medium">
                  SAR {Money.toString(totalBudget)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("finance.budget.allocated", "Allocated")}
                </span>
                <span className="font-medium">
                  SAR {Money.toString(allocatedBudget)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("finance.budget.remaining", "Remaining")}
                </span>
                <span className="font-medium">
                  SAR {Money.toString(remainingBudget)}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>{t("finance.budget.available", "Available")}</span>
                <span>SAR {Money.toString(remainingBudget)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.budget.budgetTemplate", "Budget Template")}
            </h3>
            <div className="space-y-2">
              <button type="button" className="w-full btn-ghost text-start">
                📋{" "}
                {t("finance.budget.copyPrevious", "Copy from Previous Budget")}
              </button>
              <button type="button" className="w-full btn-ghost text-start">
                📊 {t("finance.budget.useTemplate", "Use Standard Template")}
              </button>
              <button type="button" className="w-full btn-ghost text-start">
                🔄 {t("finance.budget.importExcel", "Import from Excel")}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("finance.budget.existingBudgets", "Existing Budgets")}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <div>
                  <p className="text-sm font-medium">Q4 2024 Budget</p>
                  <p className="text-xs text-muted-foreground">Oct-Dec 2024</p>
                </div>
                <span className="text-sm font-medium">SAR 500K</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <div>
                  <p className="text-sm font-medium">Q3 2024 Budget</p>
                  <p className="text-xs text-muted-foreground">Jul-Sep 2024</p>
                </div>
                <span className="text-sm font-medium">SAR 480K</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <div>
                  <p className="text-sm font-medium">Q2 2024 Budget</p>
                  <p className="text-xs text-muted-foreground">Apr-Jun 2024</p>
                </div>
                <span className="text-sm font-medium">SAR 520K</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {t("workOrders.quickActions", "Quick Actions")}
            </h3>
            <div className="space-y-2">
              <button type="button" className="w-full btn-ghost text-start">
                📊{" "}
                {t("finance.budget.budgetVsActual", "Budget vs Actual Report")}
              </button>
              <button type="button" className="w-full btn-ghost text-start">
                💰 {t("finance.expense.tracking", "Expense Tracking")}
              </button>
              <button type="button" className="w-full btn-ghost text-start">
                📋 {t("finance.budget.templates", "Budget Templates")}
              </button>
            </div>
          </div>

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
                <span className="text-muted-foreground ms-auto">1m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary/20 rounded-full"></div>
                <span className="text-muted-foreground">
                  {t("finance.budget.periodSet", "Budget period set")}
                </span>
                <span className="text-muted-foreground ms-auto">3m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
