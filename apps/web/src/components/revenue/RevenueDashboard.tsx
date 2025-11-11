'use client';

import React, { useState, useEffect } from 'react';
import { revenueService } from '../../lib/revenue-service';
import type { RevenueSummary, RevenueTransaction } from '../../lib/types/revenue';
import { DollarSign, TrendingUp, TrendingDown, Download, Gift, Music, Users, Calendar, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle } from 'lucide-react';

interface RevenueDashboardProps {
  userId: string;
}

export function RevenueDashboard({ userId }: RevenueDashboardProps) {
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RevenueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRevenueData();
  }, [userId]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      const [summary, transactions] = await Promise.all([
        revenueService.getRevenueSummary(userId),
        revenueService.getRevenueTransactions(userId, 10)
      ]);
      
      setRevenueSummary(summary);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error loading revenue data:', error);
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return <Gift className="h-4 w-4" />;
      case 'track_sale':
        return <Music className="h-4 w-4" />;
      case 'subscription':
        return <Users className="h-4 w-4" />;
      case 'event_ticket':
        return <Calendar className="h-4 w-4" />;
      case 'payout':
        return <Download className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'payout':
        return 'text-green-400';
      case 'refund':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadRevenueData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!revenueSummary) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">No revenue data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Earned */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Earned</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(revenueSummary.total_earned)}
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-full">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Available Balance</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(revenueSummary.available_balance)}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">This Month</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(revenueSummary.this_month_earnings)}
              </p>
              {revenueSummary.last_month_earnings > 0 && (
                <p className="text-sm text-gray-400">
                  vs {formatCurrency(revenueSummary.last_month_earnings)} last month
                </p>
              )}
            </div>
            <div className="p-3 bg-purple-500/20 rounded-full">
              <Calendar className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Total Paid Out */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Paid Out</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(revenueSummary.total_paid_out)}
              </p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-full">
              <Download className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tips */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Gift className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Tips</p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(revenueSummary.total_tips)}
              </p>
            </div>
          </div>
        </div>

        {/* Track Sales */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Music className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Track Sales</p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(revenueSummary.total_track_sales)}
              </p>
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Subscriptions</p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(revenueSummary.total_subscriptions)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
        </div>
        <div className="p-6">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${getTransactionColor(transaction.transaction_type)} bg-gray-600`}>
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <p className="text-white font-medium capitalize">
                        {transaction.transaction_type.replace('_', ' ')}
                      </p>
                      {transaction.source_title && (
                        <p className="text-gray-400 text-sm">{transaction.source_title}</p>
                      )}
                      <p className="text-gray-400 text-xs">
                        {transaction.transaction_date ? 
                          new Date(transaction.transaction_date).toLocaleDateString() : 
                          'Unknown date'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      transaction.amount < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    {transaction.platform_fee > 0 && (
                      <p className="text-gray-400 text-sm">
                        -{formatCurrency(transaction.platform_fee)} fee
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
