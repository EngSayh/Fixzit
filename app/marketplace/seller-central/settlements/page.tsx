/**
 * Seller Settlements Page
 * Main dashboard for seller payouts and balance
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BalanceOverview } from '@/components/seller/settlements/BalanceOverview';
import { TransactionHistory } from '@/components/seller/settlements/TransactionHistory';
import { WithdrawalForm } from '@/components/seller/settlements/WithdrawalForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SellerSettlementsPage() {
  const [balance, setBalance] = useState({
    available: 0,
    reserved: 0,
    pending: 0,
    totalEarnings: 0,
    lastPayoutDate: undefined,
    nextPayoutDate: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/souq/settlements/balance');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalSuccess = () => {
    setShowWithdrawalForm(false);
    fetchBalance();
    alert('تم إرسال طلب السحب بنجاح! (Withdrawal request submitted successfully!)');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">جاري التحميل... (Loading...)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        التسويات والمدفوعات (Settlements & Payouts)
      </h1>

      {/* Balance Overview */}
      <div className="mb-6">
        <BalanceOverview
          balance={balance}
          onWithdraw={() => setShowWithdrawalForm(!showWithdrawalForm)}
        />
      </div>

      {/* Withdrawal Form (if triggered) */}
      {showWithdrawalForm && (
        <div className="mb-6">
          <WithdrawalForm
            sellerId="current-seller-id" // TODO: Get from session
            availableBalance={balance.available}
            onSuccess={handleWithdrawalSuccess}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">
            المعاملات (Transactions)
          </TabsTrigger>
          <TabsTrigger value="statements">
            كشوف الحساب (Statements)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <TransactionHistory sellerId="current-seller-id" />
        </TabsContent>

        <TabsContent value="statements" className="mt-6">
          <div className="text-center py-12 text-gray-500">
            <p>قريباً: سجل كشوف الحساب (Coming soon: Settlement statements history)</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
