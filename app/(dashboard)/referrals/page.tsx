'use client';

import React, { useState, useEffect } from 'react';
import { NavigationButtons } from '@/components/ui/navigation-buttons';

interface ReferralCode {
  _id: string;
  code: string;
  shortUrl: string;
  reward: {
    type: string;
    referrerAmount: number;
    referredAmount: number;
    currency: string;
  };
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    totalRewardsEarned: number;
    totalRewardsPaid: number;
    conversionRate: number;
  };
  status: string;
  createdAt: Date;
}

interface Referral {
  referredEmail: string;
  referredAt: Date;
  convertedAt?: Date;
  rewardEarned: number;
  rewardStatus: string;
}

export default function ReferralProgramPage() {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/referrals/my-code');
      const data = await response.json();
      setReferralCode(data.code);
      setReferrals(data.referrals || []);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      const response = await fetch('/api/referrals/generate', {
        method: 'POST',
      });
      const data = await response.json();
      setReferralCode(data.code);
    } catch (error) {
      console.error('Failed to generate referral code:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    if (referralCode) {
      const message = `Join Fixzit and get ${referralCode.reward.referredAmount} ${referralCode.reward.currency}! Use my referral code: ${referralCode.code} or visit ${referralCode.shortUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const shareViaEmail = () => {
    if (referralCode) {
      const subject = 'Join Fixzit and Get a Reward!';
      const body = `I'm using Fixzit for property management and I think you'd love it too!\n\nSign up using my referral code: ${referralCode.code}\nOr visit: ${referralCode.shortUrl}\n\nYou'll get ${referralCode.reward.referredAmount} ${referralCode.reward.currency} when you sign up!`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <NavigationButtons showBack showHome />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Referral Program
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Earn rewards by referring friends and family to Fixzit
        </p>
      </div>

      {!referralCode ? (
        /* Generate Code CTA */
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Start Earning Rewards!</h2>
          <p className="mb-6">
            Get your unique referral code and earn money when your friends sign up
          </p>
          <button
            onClick={generateCode}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Generate My Referral Code
          </button>
        </div>
      ) : (
        <>
          {/* Referral Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: Code */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Your Referral Code</h2>
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="text-3xl font-bold tracking-wider mb-4">
                    {referralCode.code}
                  </div>
                  <div className="text-sm opacity-90 mb-4">
                    {referralCode.shortUrl}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(referralCode.code)}
                      className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
                    >
                      {copied ? '✓ Copied!' : 'Copy Code'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(referralCode.shortUrl)}
                      className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Rewards */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Rewards</h2>
                <div className="space-y-3">
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-sm opacity-90">You Get</div>
                    <div className="text-2xl font-bold">
                      {referralCode.reward.referrerAmount} {referralCode.reward.currency}
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-sm opacity-90">They Get</div>
                    <div className="text-2xl font-bold">
                      {referralCode.reward.referredAmount} {referralCode.reward.currency}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <h3 className="text-lg font-semibold mb-3">Share via</h3>
              <div className="flex gap-3">
                <button
                  onClick={shareViaWhatsApp}
                  className="flex-1 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={shareViaEmail}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Referrals</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {referralCode.stats.totalReferrals}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">Successful</div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {referralCode.stats.successfulReferrals}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Earned</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">
                {referralCode.stats.totalRewardsEarned} <span className="text-lg">{referralCode.reward.currency}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</div>
              <div className="text-3xl font-bold text-purple-600 mt-2">
                {referralCode.stats.conversionRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Referrals Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Referrals
              </h2>
            </div>
            {referrals.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                No referrals yet. Start sharing your code!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Referred At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Reward
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {referrals.map((referral, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {referral.referredEmail}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(referral.referredAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            referral.rewardStatus === 'PAID'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : referral.rewardStatus === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {referral.rewardStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {referral.rewardEarned} {referralCode.reward.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <NavigationButtons showBack showHome />
    </div>
  );
}
