'use client';

import React, { useState, useEffect } from 'react';
import { walletService, type Wallet, type WalletTransaction } from '../../lib/wallet-service';
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react';

interface WalletDashboardProps {
  userId: string;
}

export function WalletDashboard({ userId }: WalletDashboardProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, [userId]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load wallet and transactions in parallel
      const [walletData, transactionsData] = await Promise.all([
        walletService.getWallet(userId),
        walletService.getTransactions(userId, 10)
      ]);

      setWallet(walletData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setError('Failed to load wallet information');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: WalletTransaction['transaction_type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-400" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-400" />;
      case 'tip_received':
        return <TrendingUp className="h-4 w-4 text-blue-400" />;
      case 'tip_sent':
        return <TrendingDown className="h-4 w-4 text-purple-400" />;
      case 'payout':
        return <WalletIcon className="h-4 w-4 text-green-400" />;
      case 'refund':
        return <ArrowDownLeft className="h-4 w-4 text-yellow-400" />;
      default:
        return <WalletIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusIcon = (status: WalletTransaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <WalletIcon className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-semibold">Digital Wallet</h3>
              <p className="text-blue-200 text-sm">Your SoundBridge earnings</p>
            </div>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-blue-200">Available Balance</span>
            <span className="text-2xl font-bold">
              {showBalance ? walletService.formatCurrency(wallet?.balance || 0, wallet?.currency || 'USD') : '••••••'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-200">Currency</span>
            <span className="font-medium">{wallet?.currency || 'USD'}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors text-left">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Plus className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Add Funds</h4>
              <p className="text-gray-400 text-sm">Deposit money to wallet</p>
            </div>
          </div>
        </button>

        <button className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors text-left">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Minus className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Withdraw</h4>
              <p className="text-gray-400 text-sm">Cash out to bank account</p>
            </div>
          </div>
        </button>

        <button className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors text-left">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <WalletIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Manage</h4>
              <p className="text-gray-400 text-sm">Withdrawal methods</p>
            </div>
          </div>
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          <p className="text-gray-400 text-sm">Your latest wallet activity</p>
        </div>
        
        <div className="divide-y divide-gray-700">
          {transactions.length === 0 ? (
            <div className="p-6 text-center">
              <WalletIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No transactions yet</p>
              <p className="text-gray-500 text-sm">Your wallet activity will appear here</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-700 rounded-lg">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {walletService.getTransactionTypeDisplay(transaction.transaction_type)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {transaction.description || 'Wallet transaction'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${
                        transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{walletService.formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                      {getStatusIcon(transaction.status)}
                    </div>
                    <p className="text-gray-500 text-xs capitalize">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
