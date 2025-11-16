/**
 * Transaction History Component
 * 
 * Displays seller's transaction history with filters and pagination.
 */

'use client';

import React, { useState } from 'react';
import logger from '@/lib/logger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter,
  Download,
  Calendar
} from 'lucide-react';

interface Transaction {
  transactionId: string;
  orderId?: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: Date;
}

interface TransactionHistoryProps {
  sellerId: string;
}

const TRANSACTION_TYPES = [
  { value: 'all', label: 'الكل (All)' },
  { value: 'sale', label: 'مبيعات (Sales)' },
  { value: 'refund', label: 'استرداد (Refunds)' },
  { value: 'commission', label: 'عمولة (Commission)' },
  { value: 'gateway_fee', label: 'رسوم الدفع (Gateway Fees)' },
  { value: 'vat', label: 'ضريبة القيمة المضافة (VAT)' },
  { value: 'reserve_hold', label: 'حجز (Reserve Hold)' },
  { value: 'reserve_release', label: 'إطلاق الحجز (Reserve Release)' },
  { value: 'withdrawal', label: 'سحب (Withdrawal)' },
  { value: 'adjustment', label: 'تعديل (Adjustment)' },
];

export function TransactionHistory({ sellerId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 1,
  });

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sellerId,
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });

      if (filters.type !== 'all') {
        params.append('type', filters.type);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await fetch(`/api/souq/settlements/transactions?${params}`);
      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const formatCurrency = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount.toLocaleString('ar-SA')} ر.س`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount >= 0) {
      return <ArrowUpCircle className="h-5 w-5 text-success" />;
    } else {
      return <ArrowDownCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return TRANSACTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const exportToCSV = () => {
    // TODO: Implement CSV export
    logger.info('Exporting transactions to CSV...');
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          سجل المعاملات (Transaction History)
        </h2>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          تصدير (Export CSV)
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            نوع المعاملة (Type)
          </label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            className="w-full border rounded-lg px-3 py-2"
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            من تاريخ (Start Date)
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            إلى تاريخ (End Date)
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div className="flex items-end">
          <Button
            onClick={() => setFilters({ type: 'all', startDate: '', endDate: '', page: 1, limit: 50 })}
            variant="outline"
            className="w-full"
          >
            <Filter className="h-4 w-4 mr-2" />
            إعادة تعيين (Reset)
          </Button>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">جاري التحميل... (Loading...)</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد معاملات (No transactions found)</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((txn) => (
            <div
              key={txn.transactionId}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                {getTransactionIcon(txn.type, txn.amount)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTypeLabel(txn.type)}</span>
                    {txn.orderId && (
                      <span className="text-xs text-gray-500">#{txn.orderId}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{txn.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(txn.createdAt)}</p>
                </div>
              </div>

              <div className="text-right">
                <p
                  className={`text-lg font-bold ${
                    txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(txn.amount)}
                </p>
                <p className="text-xs text-gray-500">
                  الرصيد: {formatCurrency(txn.balanceAfter)} (Balance)
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            variant="outline"
            size="sm"
          >
            السابق (Previous)
          </Button>
          <span className="text-sm text-gray-600">
            صفحة {pagination.page} من {pagination.pages} (Page {pagination.page} of {pagination.pages})
          </span>
          <Button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={filters.page === pagination.pages}
            variant="outline"
            size="sm"
          >
            التالي (Next)
          </Button>
        </div>
      )}
    </Card>
  );
}
