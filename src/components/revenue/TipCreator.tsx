'use client';

import React, { useState } from 'react';
import { revenueService } from '../../lib/revenue-service';
import type { TipFormData } from '../../lib/types/revenue';
import {
  Gift,
  Heart,
  Send,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  X
} from 'lucide-react';

interface TipCreatorProps {
  creatorId: string;
  creatorName: string;
  onTipSent?: (amount: number) => void;
}

const SUGGESTED_AMOUNTS = [5, 10, 25, 50, 100];

export function TipCreator({ creatorId, creatorName, onTipSent }: TipCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tipData, setTipData] = useState<TipFormData>({
    amount: 10,
    message: '',
    is_anonymous: false
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendTip = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(null);

      const result = await revenueService.sendTip(creatorId, tipData);
      
      if (result.success) {
        setSuccess(`Tip of $${tipData.amount} sent successfully!`);
        if (onTipSent) {
          onTipSent(tipData.amount);
        }
        
        // Reset form
        setTipData({
          amount: 10,
          message: '',
          is_anonymous: false
        });
        
        // Close modal after a delay
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(null);
        }, 2000);
      } else {
        setError(result.error || 'Failed to send tip');
      }
    } catch (error) {
      console.error('Error sending tip:', error);
      setError('An unexpected error occurred');
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:from-pink-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Gift className="h-4 w-4" />
        <span>Tip {creatorName}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Gift className="h-6 w-6 text-pink-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Send a Tip</h3>
              <p className="text-gray-400 text-sm">Show your support for {creatorName}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Tip Amount */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-3">Tip Amount</label>
          
          {/* Suggested Amounts */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {SUGGESTED_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setTipData({ ...tipData, amount })}
                className={`p-3 rounded-lg border transition-colors ${
                  tipData.amount === amount
                    ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                    : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                }`}
              >
                {formatCurrency(amount)}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              value={tipData.amount}
              onChange={(e) => setTipData({ ...tipData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500"
              placeholder="Enter custom amount"
            />
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Message (Optional)</label>
          <textarea
            value={tipData.message}
            onChange={(e) => setTipData({ ...tipData, message: e.target.value })}
            placeholder="Leave a message for the creator..."
            className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500 resize-none"
            rows={3}
            maxLength={200}
          />
          <p className="text-gray-400 text-xs mt-1">
            {tipData.message.length}/200 characters
          </p>
        </div>

        {/* Anonymous Option */}
        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tipData.is_anonymous}
              onChange={(e) => setTipData({ ...tipData, is_anonymous: e.target.checked })}
              className="w-4 h-4 text-pink-500 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
            />
            <div className="flex items-center space-x-2">
              {tipData.is_anonymous ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-gray-300">Send anonymously</span>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Platform fee: {formatCurrency(tipData.amount * 0.05)} (5%)
          </div>
          <button
            onClick={handleSendTip}
            disabled={sending || tipData.amount <= 0}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:from-pink-600 hover:to-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send {formatCurrency(tipData.amount)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
