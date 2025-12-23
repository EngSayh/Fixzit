/**
 * Settlement Statement View Component
 * Display detailed settlement statement
 */

"use client";

import React from "react";
import { logger } from "@/lib/logger";
import { Card } from "@/components/ui/card";
import { Download, FileText } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

interface SettlementStatement {
  statementId: string;
  period: { start: Date; end: Date };
  summary: {
    totalOrders: number;
    grossSales: number;
    platformCommissions: number;
    gatewayFees: number;
    vat: number;
    refunds: number;
    chargebacks: number;
    reserves: number;
    netPayout: number;
  };
  transactions: Array<{
    transactionId: string;
    orderId: string;
    type: string;
    amount: number;
    timestamp: Date;
    description: string;
  }>;
  status: string;
  generatedAt: Date;
  paidAt?: Date;
}

interface SettlementStatementViewProps {
  statement: SettlementStatement;
}

export function SettlementStatementView({
  statement,
}: SettlementStatementViewProps) {
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-SA")} ر.س`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const downloadPDF = async () => {
    try {
      const { exportToPDF } = await import("@/lib/export-utils");

      // Prepare statement data for PDF
      const summaryData = [
        {
          item: "Gross Sales",
          amount: `${statement.summary.grossSales.toFixed(2)} SAR`,
        },
        {
          item: "Platform Commission",
          amount: `-${statement.summary.platformCommissions.toFixed(2)} SAR`,
        },
        {
          item: "Gateway Fees",
          amount: `-${statement.summary.gatewayFees.toFixed(2)} SAR`,
        },
        {
          item: "VAT on Commission",
          amount: `-${statement.summary.vat.toFixed(2)} SAR`,
        },
        {
          item: "Refunds",
          amount: `-${statement.summary.refunds.toFixed(2)} SAR`,
        },
        {
          item: "Chargebacks",
          amount: `-${statement.summary.chargebacks.toFixed(2)} SAR`,
        },
        {
          item: "Reserves",
          amount: `-${statement.summary.reserves.toFixed(2)} SAR`,
        },
        {
          item: "Net Payout",
          amount: `${statement.summary.netPayout.toFixed(2)} SAR`,
        },
      ];

      const filename = `statement-${statement.statementId}.pdf`;
      await exportToPDF(
        summaryData,
        [
          { key: "item", label: "Item" },
          { key: "amount", label: "Amount" },
        ],
        filename,
        {
          title: "Settlement Statement",
          subtitle: `Statement ID: ${statement.statementId} | Period: ${new Date(statement.period.start).toLocaleDateString()} - ${new Date(statement.period.end).toLocaleDateString()}`,
          orientation: "portrait",
        },
      );

      logger.info("Settlement statement downloaded", {
        statementId: statement.statementId,
        filename,
      });
    } catch (error) {
      logger.error("Failed to download statement", {
        error,
        statementId: statement.statementId,
      });
      alert("Failed to download statement. Please try again.");
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">
              كشف التسوية (Settlement Statement)
            </h2>
          </div>
          <p className="text-sm text-gray-600">#{statement.statementId}</p>
          <p className="text-sm text-gray-600">
            الفترة: {formatDate(statement.period.start)} -{" "}
            {formatDate(statement.period.end)}
          </p>
        </div>
        <Button onClick={downloadPDF} variant="outline">
          <Download className="h-4 w-4 me-2" />
          تحميل PDF (Download)
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-success/5 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">إجمالي المبيعات</p>
          <p className="text-xl font-bold text-success">
            {formatCurrency(statement.summary.grossSales)}
          </p>
        </div>
        <div className="p-4 bg-destructive/5 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">العمولات</p>
          <p className="text-xl font-bold text-destructive">
            -{formatCurrency(statement.summary.platformCommissions)}
          </p>
        </div>
        <div className="p-4 bg-warning/5 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">الرسوم والضرائب</p>
          <p className="text-xl font-bold text-warning">
            -
            {formatCurrency(
              statement.summary.gatewayFees + statement.summary.vat,
            )}
          </p>
        </div>
        <div className="p-4 bg-primary/5 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">صافي الدفعة</p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(statement.summary.netPayout)}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-2 mb-6">
        <h3 className="font-semibold mb-3">تفصيل الحساب (Breakdown)</h3>
        <div className="flex justify-between py-2 border-b">
          <span>إجمالي الطلبات (Total Orders)</span>
          <span>{statement.summary.totalOrders}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span>إجمالي المبيعات (Gross Sales)</span>
          <span className="font-medium text-success">
            {formatCurrency(statement.summary.grossSales)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b text-destructive">
          <span>عمولة المنصة 10% (Platform Commission)</span>
          <span>-{formatCurrency(statement.summary.platformCommissions)}</span>
        </div>
        <div className="flex justify-between py-2 border-b text-destructive">
          <span>رسوم بوابة الدفع 2.5% (Gateway Fees)</span>
          <span>-{formatCurrency(statement.summary.gatewayFees)}</span>
        </div>
        <div className="flex justify-between py-2 border-b text-destructive">
          <span>ضريبة القيمة المضافة 15% (VAT)</span>
          <span>-{formatCurrency(statement.summary.vat)}</span>
        </div>
        {statement.summary.refunds > 0 && (
          <div className="flex justify-between py-2 border-b text-destructive">
            <span>الاستردادات (Refunds)</span>
            <span>-{formatCurrency(statement.summary.refunds)}</span>
          </div>
        )}
        {statement.summary.reserves > 0 && (
          <div className="flex justify-between py-2 border-b text-warning">
            <span>المحجوز للمرتجعات 20% (Reserves)</span>
            <span>-{formatCurrency(statement.summary.reserves)}</span>
          </div>
        )}
        <div className="flex justify-between py-3 border-t-2 text-lg font-bold">
          <span>صافي الدفعة (Net Payout)</span>
          <span className="text-primary">
            {formatCurrency(statement.summary.netPayout)}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-600">الحالة (Status)</p>
          <p className="font-semibold capitalize">{statement.status}</p>
        </div>
        {statement.paidAt && (
          <div className="text-end">
            <p className="text-sm text-gray-600">تاريخ الدفع (Paid Date)</p>
            <p className="font-semibold">{formatDate(statement.paidAt)}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
