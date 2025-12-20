"use client";

import React from "react";
import type { IBudgetInfo } from "./types";

type ExpenseBudgetPanelProps = {
  budgetInfo: IBudgetInfo[];
  t: (key: string, fallback: string) => string;
  getCategoryLabel: (category: string) => string;
};

/**
 * Expense Budget Panel Component
 * Shows budget utilization for expense categories
 */
export function ExpenseBudgetPanel({
  budgetInfo,
  t,
  getCategoryLabel,
}: ExpenseBudgetPanelProps) {
  if (budgetInfo.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">
        {t("finance.expense.budgetImpact", "Budget Impact")}
      </h3>
      <div className="space-y-4">
        {budgetInfo.map((budget) => (
          <div key={budget.budgetId} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {getCategoryLabel(budget.category)}
              </span>
              <span
                className={
                  budget.percentage > 90
                    ? "text-destructive"
                    : budget.percentage > 75
                      ? "text-amber-500"
                      : "text-green-600"
                }
              >
                {budget.percentage.toFixed(1)}%{" "}
                {t("finance.expense.used", "used")}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  budget.percentage > 90
                    ? "bg-destructive"
                    : budget.percentage > 75
                      ? "bg-amber-500"
                      : "bg-green-600"
                }`}
                style={{ width: `${Math.min(budget.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {t("finance.expense.spent", "Spent")}:{" "}
                {budget.spentAmount.toLocaleString()} SAR
              </span>
              <span>
                {t("finance.expense.budget", "Budget")}:{" "}
                {budget.budgetedAmount.toLocaleString()} SAR
              </span>
            </div>
            {budget.percentage > 90 && (
              <p className="text-xs text-destructive">
                ⚠️{" "}
                {t(
                  "finance.expense.budgetWarning",
                  "Budget threshold exceeded!"
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
