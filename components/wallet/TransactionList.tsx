/**
 * TransactionList - Wallet transaction history
 * 
 * @description Displays wallet transaction history with filtering,
 * pagination, and export capabilities.
 * 
 * @features
 * - Transaction type filtering
 * - Date range filtering
 * - Infinite scroll pagination
 * - Transaction details
 * - Status indicators
 * - RTL-first layout
 */
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Check,
  X,
  Filter,
  Download,
  ChevronDown,
  type LucideIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { TogglePills } from "@/components/shared/TogglePills";

// ============================================================================
// TYPES
// ============================================================================

export type TransactionType = 
  | "top_up"
  | "ad_fee"
  | "subscription"
  | "refund"
  | "withdrawal"
  | "commission"
  | "bonus"
  | "service_fee";

export type TransactionStatus = "pending" | "completed" | "failed" | "cancelled";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // in halalas
  balance_after: number; // in halalas
  status: TransactionStatus;
  reference?: string;
  description?: string;
  description_ar?: string;
  gateway?: string;
  created_at: string;
}

export interface TransactionListProps {
  /** List of transactions */
  transactions: Transaction[];
  /** Whether more transactions are available */
  hasMore?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback to load more transactions */
  onLoadMore?: () => void;
  /** Callback when filter changes */
  onFilterChange?: (filters: { types?: TransactionType[]; dateRange?: [Date, Date] }) => void;
  /** Callback to export transactions */
  onExport?: () => void;
  /** Current locale */
  locale?: "ar" | "en";
  /** Custom class name */
  className?: string;
  /** Show filter controls */
  showFilters?: boolean;
  /** Max height with scroll */
  maxHeight?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TRANSACTION_LABELS: Record<TransactionType, { ar: string; en: string }> = {
  top_up: { ar: "شحن رصيد", en: "Top Up" },
  ad_fee: { ar: "رسوم إعلان", en: "Ad Fee" },
  subscription: { ar: "اشتراك", en: "Subscription" },
  refund: { ar: "استرداد", en: "Refund" },
  withdrawal: { ar: "سحب", en: "Withdrawal" },
  commission: { ar: "عمولة", en: "Commission" },
  bonus: { ar: "مكافأة", en: "Bonus" },
  service_fee: { ar: "رسوم خدمة", en: "Service Fee" },
};

const STATUS_CONFIG: Record<TransactionStatus, { 
  icon: LucideIcon;
  color: string;
  label: { ar: string; en: string };
}> = {
  pending: {
    icon: Clock,
    color: "text-amber-500",
    label: { ar: "قيد المعالجة", en: "Pending" },
  },
  completed: {
    icon: Check,
    color: "text-green-500",
    label: { ar: "مكتمل", en: "Completed" },
  },
  failed: {
    icon: X,
    color: "text-red-500",
    label: { ar: "فشل", en: "Failed" },
  },
  cancelled: {
    icon: X,
    color: "text-neutral-400",
    label: { ar: "ملغي", en: "Cancelled" },
  },
};

const CREDIT_TYPES: TransactionType[] = ["top_up", "refund", "bonus"];

// ============================================================================
// COMPONENT
// ============================================================================

export function TransactionList({
  transactions,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  onFilterChange,
  onExport,
  locale = "ar",
  className,
  showFilters = true,
  maxHeight = "500px",
}: TransactionListProps) {
  const isRTL = locale === "ar";
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const handleTypeFilter = (types: string[]) => {
    setSelectedTypes(types);
    onFilterChange?.({ types: types as TransactionType[] });
  };

  const isCredit = (type: TransactionType): boolean => {
    return CREDIT_TYPES.includes(type);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter options for toggle pills
  const filterOptions = [
    { value: "top_up", label: "Top Up", label_ar: "شحن" },
    { value: "ad_fee", label: "Ads", label_ar: "إعلانات" },
    { value: "subscription", label: "Subscription", label_ar: "اشتراك" },
    { value: "refund", label: "Refunds", label_ar: "استردادات" },
  ];

  return (
    <div className={cn("rounded-xl border bg-white", className)} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      {showFilters && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-neutral-800">
              {isRTL ? "سجل المعاملات" : "Transaction History"}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Filter className="w-4 h-4 me-1" />
                {isRTL ? "فلترة" : "Filter"}
                <ChevronDown className={cn(
                  "w-4 h-4 ms-1 transition-transform",
                  showFilterPanel && "rotate-180"
                )} />
              </Button>
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter panel */}
          {showFilterPanel && (
            <div className="pt-3 border-t">
              <TogglePills
                options={filterOptions}
                value={selectedTypes}
                onChange={handleTypeFilter}
                multiple
                locale={locale}
                size="sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Transaction list */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-neutral-500">
              {isRTL ? "لا توجد معاملات" : "No transactions"}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {transactions.map((tx) => {
              const credit = isCredit(tx.type);
              const statusConfig = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
              const StatusIcon: LucideIcon = statusConfig.icon;
              
              return (
                <li key={tx.id} className="p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "p-2 rounded-full",
                      credit ? "bg-green-100" : "bg-red-100"
                    )}>
                      {credit ? (
                        <ArrowDownCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-800">
                          {TRANSACTION_LABELS[tx.type]?.[locale === "ar" ? "ar" : "en"] ?? tx.type}
                        </p>
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                      </div>
                      
                      {(tx.description || tx.description_ar) && (
                        <p className="text-sm text-neutral-500 truncate">
                          {isRTL && tx.description_ar ? tx.description_ar : tx.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-neutral-400 mt-1">
                        {formatDate(tx.created_at)}
                        {tx.reference && (
                          <span className="ms-2">#{tx.reference}</span>
                        )}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-end">
                      <p className={cn(
                        "font-semibold",
                        credit ? "text-green-600" : "text-red-600"
                      )}>
                        {credit ? "+" : "-"}
                        <PriceDisplay
                          amount={tx.amount}
                          useHalalas
                          locale={locale}
                          size="sm"
                          showCurrency={false}
                        />
                        <span className="text-xs ms-1">
                          {isRTL ? "ر.س" : "SAR"}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-400">
                        {isRTL ? "الرصيد:" : "Bal:"}{" "}
                        {(tx.balance_after / 100).toLocaleString(isRTL ? "ar-SA" : "en-SA")}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading
                ? (isRTL ? "جاري التحميل..." : "Loading...")
                : (isRTL ? "تحميل المزيد" : "Load More")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionList;
