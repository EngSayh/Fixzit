"use client";

/**
 * Withdrawal Form Component
 * Request withdrawal for available balance
 */

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";

interface WithdrawalFormProps {
  sellerId: string;
  availableBalance: number;
  onSuccess: () => void;
  statementId: string;
}

export function WithdrawalForm({
  sellerId: _sellerId,
  availableBalance,
  onSuccess,
  statementId,
}: WithdrawalFormProps) {
  const [formData, setFormData] = useState({
    amount: "",
    iban: "",
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amount = parseFloat(formData.amount);

    if (amount < 500) {
      setError("الحد الأدنى للسحب 500 ر.س (Minimum withdrawal is 500 SAR)");
      return;
    }

    if (amount > availableBalance) {
      setError("الرصيد غير كافٍ (Insufficient balance)");
      return;
    }

    if (!formData.iban.startsWith("SA") || formData.iban.length !== 24) {
      setError("رقم IBAN غير صحيح (Invalid IBAN)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/souq/settlements/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          statementId,
          bankAccount: {
            iban: formData.iban,
            accountHolderName: formData.accountHolderName,
            accountNumber: formData.accountNumber,
            bankName: formData.bankName,
          },
        }),
      });

      if (response.ok) {
        onSuccess();
        setFormData({
          amount: "",
          iban: "",
          accountHolderName: "",
          accountNumber: "",
          bankName: "",
        });
      } else {
        const data = await response.json();
        setError(data.error || "فشل طلب السحب (Withdrawal request failed)");
      }
    } catch {
      setError("حدث خطأ (An error occurred)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">طلب سحب (Request Withdrawal)</h2>

      {error && (
        <div className="mb-4 p-4 bg-destructive/5 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            المبلغ (Amount) <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min="500"
            max={availableBalance}
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            className="w-full border rounded-lg px-4 py-2"
            placeholder="500.00"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            الرصيد المتاح: {availableBalance.toLocaleString("ar-SA")} ر.س
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            IBAN <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={formData.iban}
            onChange={(e) =>
              setFormData({ ...formData, iban: e.target.value.toUpperCase() })
            }
            className="w-full border rounded-lg px-4 py-2"
            placeholder="SA1234567890123456789012"
            maxLength={24}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            اسم صاحب الحساب (Account Holder Name){" "}
            <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={formData.accountHolderName}
            onChange={(e) =>
              setFormData({ ...formData, accountHolderName: e.target.value })
            }
            className="w-full border rounded-lg px-4 py-2"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              رقم الحساب (Account Number){" "}
              <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) =>
                setFormData({ ...formData, accountNumber: e.target.value })
              }
              className="w-full border rounded-lg px-4 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              اسم البنك (Bank Name) <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) =>
                setFormData({ ...formData, bankName: e.target.value })
              }
              className="w-full border rounded-lg px-4 py-2"
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? "جاري الإرسال... (Submitting...)"
            : "طلب سحب (Submit Withdrawal)"}
        </Button>
      </form>
    </Card>
  );
}
