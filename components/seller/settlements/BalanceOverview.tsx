/**
 * Balance Overview Component
 *
 * Displays seller's balance with available, reserved, and pending amounts.
 * Shows payout schedule and quick withdrawal action.
 */

"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Clock, Lock, TrendingUp } from "lucide-react";

interface BalanceOverviewProps {
  balance: {
    available: number;
    reserved: number;
    pending: number;
    totalEarnings: number;
    lastPayoutDate?: Date;
    nextPayoutDate?: Date;
  };
  onWithdraw: () => void;
}

export function BalanceOverview({ balance, onWithdraw }: BalanceOverviewProps) {
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-SA")} ر.س`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Available Balance */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">
              الرصيد المتاح (Available)
            </h3>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-bold text-success">
            {formatCurrency(balance.available)}
          </p>
          <p className="text-xs text-gray-500">
            جاهز للسحب (Ready to withdraw)
          </p>
        </div>
        <Button
          onClick={onWithdraw}
          disabled={balance.available < 500}
          className="w-full mt-4"
          variant="default"
        >
          {balance.available < 500
            ? "الحد الأدنى 500 ر.س (Min 500 SAR)"
            : "طلب سحب (Request Withdrawal)"}
        </Button>
      </Card>

      {/* Reserved Balance */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Lock className="h-5 w-5 text-warning" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">
              الرصيد المحجوز (Reserved)
            </h3>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-bold text-warning">
            {formatCurrency(balance.reserved)}
          </p>
          <p className="text-xs text-gray-500">
            محجوز للمرتجعات (Held for returns - 7-14 days)
          </p>
        </div>
      </Card>

      {/* Pending Balance */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">
              الرصيد المعلق (Pending)
            </h3>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-bold text-primary">
            {formatCurrency(balance.pending)}
          </p>
          <p className="text-xs text-gray-500">
            طلبات قيد التسليم (Orders in transit)
          </p>
        </div>
      </Card>

      {/* Total Earnings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-secondary/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-secondary-foreground" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">
              إجمالي الأرباح (Total Earnings)
            </h3>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-bold text-secondary-foreground">
            {formatCurrency(balance.totalEarnings)}
          </p>
          <p className="text-xs text-gray-500">منذ البداية (All time)</p>
        </div>
      </Card>

      {/* Payout Schedule */}
      <Card className="p-6 col-span-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              جدول المدفوعات (Payout Schedule)
            </h3>
            <div className="flex items-center gap-8 text-sm">
              {balance.lastPayoutDate && (
                <div>
                  <span className="text-gray-600">
                    آخر دفعة (Last payout):{" "}
                  </span>
                  <span className="font-medium">
                    {formatDate(balance.lastPayoutDate)}
                  </span>
                </div>
              )}
              {balance.nextPayoutDate && (
                <div>
                  <span className="text-gray-600">
                    الدفعة القادمة (Next payout):{" "}
                  </span>
                  <span className="font-medium text-primary">
                    {formatDate(balance.nextPayoutDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-end text-sm text-gray-500">
            <p>الدفعات تتم كل جمعة (Payouts every Friday)</p>
            <p>الحد الأدنى للسحب: 500 ر.س (Minimum: 500 SAR)</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
