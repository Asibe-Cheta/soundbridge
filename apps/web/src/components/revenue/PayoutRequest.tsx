'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Calendar,
  TrendingUp,
  Info
} from 'lucide-react';

interface PayoutEligibility {
  available_balance: number;
  pending_requests: number;
  min_payout: number;
  can_request_payout: boolean;
  withdrawable_amount: number;
}

interface PayoutRequest {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  admin_notes?: string;
  rejection_reason?: string;
}

const STATUS_COLORS = {
  pending: 'text-yellow-400 bg-yellow-500/20',
  approved: 'text-blue-400 bg-blue-500/20',
  processing: 'text-purple-400 bg-purple-500/20',
  completed: 'text-green-400 bg-green-500/20',
  rejected: 'text-red-400 bg-red-500/20',
  failed: 'text-red-400 bg-red-500/20'
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  processing: TrendingUp,
  completed: CheckCircle,
  rejected: XCircle,
  failed: XCircle
};

export function PayoutRequest() {
  const [eligibility, setEligibility] = useState<PayoutEligibility | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPayoutData();
  }, []);

  const loadPayoutData = async () => {
    try {
      setLoading(true);
      
      // Load eligibility and history in parallel
      const [eligibilityRes, historyRes] = await Promise.all([
        fetch('/api/payouts/eligibility'),
        fetch('/api/payouts/history')
      ]);

      if (eligibilityRes.ok) {
        const eligibilityData = await eligibilityRes.json();
        setEligibility(eligibilityData.eligibility);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setPayoutHistory(historyData.payouts || []);
      }
    } catch (error) {
      console.error('Error loading payout data:', error);
      setError('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(requestAmount);
    
    if (!amount || amount < 25) {
      setError('Minimum withdrawal amount is $25.00');
      return;
    }

    if (!eligibility?.can_request_payout) {
      setError('Insufficient balance or pending requests');
      return;
    }

    try {
      setRequesting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'USD'
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Payout request for $${amount.toFixed(2)} submitted successfully!`);
        setRequestAmount('');
        loadPayoutData(); // Reload data
      } else {
        setError(result.error || 'Failed to create payout request');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      setError('Failed to request payout');
    } finally {
      setRequesting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payout Eligibility Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Payout Request</h3>
            <p className="text-gray-400 text-sm">Request withdrawal of your earnings</p>
          </div>
        </div>

        {eligibility && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-400">Available Balance</span>
              </div>
              <div className="text-xl font-semibold text-white">
                {formatCurrency(eligibility.available_balance)}
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Pending Requests</span>
              </div>
              <div className="text-xl font-semibold text-white">
                {formatCurrency(eligibility.pending_requests)}
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-400">Withdrawable</span>
              </div>
              <div className="text-xl font-semibold text-white">
                {formatCurrency(eligibility.withdrawable_amount)}
              </div>
            </div>
          </div>
        )}

        {/* Payout Request Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Withdrawal Amount (Minimum: $25.00)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                min="25"
                step="0.01"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder="Enter amount to withdraw"
                className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500"
                disabled={!eligibility?.can_request_payout}
              />
            </div>
          </div>

          {eligibility && !eligibility.can_request_payout && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Info className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-300">
                {eligibility.withdrawable_amount < 25 
                  ? `Insufficient balance. You need $${(25 - eligibility.withdrawable_amount).toFixed(2)} more to request a payout.`
                  : 'You have pending payout requests. Please wait for them to be processed.'
                }
              </span>
            </div>
          )}

          <button
            onClick={handleRequestPayout}
            disabled={requesting || !eligibility?.can_request_payout || !requestAmount}
            className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:from-pink-600 hover:to-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {requesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Requesting...</span>
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4" />
                <span>Request Payout</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-300">{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center space-x-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-300">{success}</span>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Payout History</h3>
            <p className="text-gray-400 text-sm">Track your withdrawal requests</p>
          </div>
        </div>

        {payoutHistory.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No payout requests yet</p>
            <p className="text-gray-500 text-sm">Your withdrawal requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payoutHistory.map((payout) => {
              const StatusIcon = STATUS_ICONS[payout.status];
              return (
                <div key={payout.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${STATUS_COLORS[payout.status]}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {formatCurrency(payout.amount)}
                        </div>
                        <div className="text-sm text-gray-400">
                          Requested {formatDate(payout.requested_at)}
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[payout.status]}`}>
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </div>
                  </div>
                  
                  {payout.admin_notes && (
                    <div className="mt-2 p-2 bg-gray-600/50 rounded text-sm text-gray-300">
                      <strong>Admin Notes:</strong> {payout.admin_notes}
                    </div>
                  )}
                  
                  {payout.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-300">
                      <strong>Rejection Reason:</strong> {payout.rejection_reason}
                    </div>
                  )}
                  
                  {payout.completed_at && (
                    <div className="mt-2 text-sm text-gray-400">
                      Completed {formatDate(payout.completed_at)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
