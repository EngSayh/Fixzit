"use client";

import React from "react";
import type { IReceipt } from "./types";

type ExpenseReceiptsUploaderProps = {
  receipts: IReceipt[];
  onReceiptsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveReceipt: (id: string) => void;
  t: (key: string, fallback: string) => string;
};

/**
 * Expense Receipts Uploader Component
 * Handles multiple receipt file uploads with previews
 */
export function ExpenseReceiptsUploader({
  receipts,
  onReceiptsChange,
  onRemoveReceipt,
  t,
}: ExpenseReceiptsUploaderProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">
        {t("finance.expense.receipts", "Receipts & Attachments")}
      </h3>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={onReceiptsChange}
              className="hidden"
            />
            <span className="inline-flex items-center px-4 py-2 border border-border rounded-2xl text-sm font-medium hover:bg-muted transition-colors">
              📎 {t("finance.expense.uploadReceipts", "Upload Receipts")}
            </span>
          </label>
          <span className="text-sm text-muted-foreground">
            {t(
              "finance.expense.receiptFormats",
              "Supports images and PDFs (max 10MB each)"
            )}
          </span>
        </div>

        {receipts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="relative group border border-border rounded-lg overflow-hidden"
              >
                {receipt.file.type.startsWith("image/") ? (
                  // Using native img for blob URL previews (next/image doesn't support blob URLs)
                  <img
                    src={receipt.preview}
                    alt="Receipt"
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-muted">
                    <span className="text-2xl">📄</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => onRemoveReceipt(receipt.id)}
                    className="text-white text-sm px-2 py-1 bg-destructive rounded"
                  >
                    ✕ {t("common.remove", "Remove")}
                  </button>
                </div>
                <div className="p-2 text-xs truncate text-muted-foreground">
                  {receipt.file.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
