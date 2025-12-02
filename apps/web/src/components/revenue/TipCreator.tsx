'use client';

import React, { useState } from 'react';

// TypeScript declarations for payment APIs
declare global {
  interface Window {
    ApplePaySession?: {
      canMakePayments(): boolean;
    };
    google?: {
      payments?: any;
    };
  }
}
import { revenueService } from '../../lib/revenue-service';
import type { TipFormData } from '../../lib/types/revenue';
import { Gift, Heart, Send, DollarSign, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, X, CreditCard, Smartphone, Shield } from 'lucide-react';

interface TipCreatorProps {
  creatorId: string;
  creatorName: string;
  onTipSent?: (amount: number) => void;
  userTier?: 'free' | 'pro';
}

const SUGGESTED_AMOUNTS = [5, 10, 25, 50, 100];

type PaymentMethod = 'card' | 'apple_pay' | 'google_pay';

const PAYMENT_METHODS = [
  {
    id: 'card' as PaymentMethod,
    name: 'Card',
    icon: CreditCard,
    description: 'Credit or debit card',
    color: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    hoverColor: 'hover:bg-blue-500/30 hover:border-blue-500/70'
  },
  {
    id: 'apple_pay' as PaymentMethod,
    name: 'Apple Pay',
    icon: Smartphone,
    description: 'Pay with Apple Pay',
    color: 'bg-black/20 border-gray-600 text-white',
    hoverColor: 'hover:bg-gray-700/30 hover:border-gray-500'
  },
  {
    id: 'google_pay' as PaymentMethod,
    name: 'Google Pay',
    icon: Shield,
    description: 'Pay with Google Pay',
    color: 'bg-blue-600/20 border-blue-600/50 text-blue-300',
    hoverColor: 'hover:bg-blue-600/30 hover:border-blue-600/70'
  }
];

export function TipCreator({ creatorId, creatorName, onTipSent, userTier = 'free' }: TipCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tipData, setTipData] = useState<TipFormData>({
    amount: 10,
    message: '',
    is_anonymous: false
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>(['card']);
  
  // Tier-based features
  const [showTipGoal, setShowTipGoal] = useState(false);
  const [tipGoalAmount, setTipGoalAmount] = useState(100);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [tipRewards, setTipRewards] = useState(false);

  // Tier-based feature helpers
  const getPlatformFee = (amount: number) => {
    const feePercentage = userTier === 'free' ? 0.10 : userTier === 'pro' ? 0.08 : 0.05;
    return Math.round(amount * feePercentage * 100) / 100;
  };

  const getCreatorReceives = (amount: number) => {
    return Math.round((amount - getPlatformFee(amount)) * 100) / 100;
  };

  const hasProFeatures = userTier === 'pro' || userTier === 'enterprise';
  const hasEnterpriseFeatures = userTier === 'enterprise';

  // Detect available payment methods when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const detectPaymentMethods = async () => {
        const availableMethods: PaymentMethod[] = ['card']; // Card is always available
        
        try {
          // Check for Apple Pay availability (works on Safari and iOS)
          if (typeof window !== 'undefined' && window.ApplePaySession && typeof window.ApplePaySession.canMakePayments === 'function') {
            const canMakePayments = window.ApplePaySession.canMakePayments();
            if (canMakePayments) {
              availableMethods.push('apple_pay');
              console.log('Apple Pay detected and available');
            } else {
              console.log('Apple Pay detected but not available on this device');
            }
          } else {
            console.log('Apple Pay not supported on this browser/device');
          }
          
          // Check for Google Pay availability (works on Chrome and Android)
          if (typeof window !== 'undefined' && window.google && window.google.payments && window.google.payments.api) {
            availableMethods.push('google_pay');
            console.log('Google Pay detected and available');
          }
        } catch (error) {
          console.log('Payment method detection error:', error);
        }
        
        console.log('Available payment methods:', availableMethods);
        setAvailablePaymentMethods(availableMethods);
        
        // Set default payment method to first available
        if (availableMethods.length > 0 && !availableMethods.includes(selectedPaymentMethod)) {
          setSelectedPaymentMethod(availableMethods[0]);
        }
      };
      
      detectPaymentMethods();
    }
  }, [isOpen, selectedPaymentMethod]);

  const handleSendTip = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(null);

      // Step 1: Create payment intent
      console.log('Creating payment intent for:', { creatorId, tipData, userTier, paymentMethod: selectedPaymentMethod });
      const result = await revenueService.sendTip(creatorId, tipData, userTier, selectedPaymentMethod);
      
      console.log('Payment intent result:', result);
      
      if (!result.success || !result.paymentIntentId || !result.clientSecret) {
        setError(result.error || 'Failed to create payment');
        return;
      }

      // Step 2: Process payment with Stripe
      console.log('Loading Stripe...');
      const stripe = await import('@stripe/stripe-js').then(({ loadStripe }) => 
        loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      );

      if (!stripe) {
        console.error('Stripe not loaded');
        setError('Payment system not available');
        return;
      }

      console.log('Confirming payment with Stripe...');
      
      let stripeError;
      
      if (selectedPaymentMethod === 'apple_pay') {
        // Handle Apple Pay - redirect to Stripe Checkout which handles Apple Pay properly
        try {
          // Check if we're on iOS/Safari and Apple Pay is available
          if (typeof window !== 'undefined' && window.ApplePaySession && window.ApplePaySession.canMakePayments()) {
            // For Apple Pay, redirect to Stripe Checkout which handles Apple Pay sessions properly
            console.log('Apple Pay available, redirecting to Stripe Checkout...');
            window.location.href = `${window.location.origin}/payment?payment_intent=${result.paymentIntentId}&client_secret=${result.clientSecret}`;
            return;
          } else {
            // Fallback for non-Apple Pay devices - redirect to payment page
            console.log('Apple Pay not available, redirecting to payment page...');
            window.location.href = `${window.location.origin}/payment?payment_intent=${result.paymentIntentId}&client_secret=${result.clientSecret}`;
            return;
          }
        } catch (applePayError) {
          console.error('Apple Pay error:', applePayError);
          setError('Apple Pay is not available on this device. Please use card payment instead.');
          return;
        }
      } else if (selectedPaymentMethod === 'google_pay') {
        // Handle Google Pay - redirect to Stripe Checkout which handles Google Pay properly
        try {
          // Check if Google Pay is available
          if (typeof window !== 'undefined' && window.google && window.google.payments && window.google.payments.api) {
            console.log('Google Pay available, redirecting to Stripe Checkout...');
            window.location.href = `${window.location.origin}/payment?payment_intent=${result.paymentIntentId}&client_secret=${result.clientSecret}`;
            return;
          } else {
            // Fallback for non-Google Pay devices - redirect to payment page
            console.log('Google Pay not available, redirecting to payment page...');
            window.location.href = `${window.location.origin}/payment?payment_intent=${result.paymentIntentId}&client_secret=${result.clientSecret}`;
            return;
          }
        } catch (googlePayError) {
          console.error('Google Pay error:', googlePayError);
          setError('Google Pay is not available on this device. Please use card payment instead.');
          return;
        }
      } else {
        // Handle regular card payment - redirect to Stripe Checkout
        console.log('Redirecting to Stripe Checkout for card payment...');
        
        // For now, we'll redirect to a payment page that can handle the payment intent
        // In a full implementation, you'd want to use Stripe Elements or redirect to checkout
        window.location.href = `${window.location.origin}/payment?payment_intent=${result.paymentIntentId}&client_secret=${result.clientSecret}`;
        return;
      }

      console.log('Stripe payment result:', stripeError);

      if (stripeError) {
        console.error('Stripe payment error:', stripeError);
        setError(stripeError.message || 'Payment failed');
        return;
      }

      // Step 3: Confirm tip in our system
      console.log('Confirming tip in system...');
      const confirmResult = await revenueService.confirmTip(result.paymentIntentId);
      
      console.log('Confirm result:', confirmResult);
      
      if (confirmResult.success) {
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
        setError(confirmResult.error || 'Failed to confirm tip');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] overflow-y-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-pink-500/20 rounded-lg">
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-pink-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Send a Tip</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Show your support for {creatorName}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
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
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {SUGGESTED_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setTipData({ ...tipData, amount })}
                className={`p-2 sm:p-3 rounded-lg border transition-colors text-sm sm:text-base ${
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
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              value={tipData.amount}
              onChange={(e) => setTipData({ ...tipData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500 text-sm sm:text-base"
              placeholder="Enter custom amount"
            />
          </div>

          {/* Fee Breakdown */}
          <div className="mt-3 p-2.5 sm:p-3 bg-gray-700/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tip Amount:</span>
              <span className="text-white">${tipData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Platform Fee ({userTier === 'free' ? '10%' : userTier === 'pro' ? '8%' : '5%'}):</span>
              <span className="text-gray-400">-${getPlatformFee(tipData.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-1 border-t border-gray-600">
              <span className="text-gray-300">Creator Receives:</span>
              <span className="text-green-400">${getCreatorReceives(tipData.amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Pro Features - Tip Goals */}
        {hasProFeatures && (
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <label className="block text-gray-400 text-xs sm:text-sm">Tip Goal Progress</label>
              <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">PRO</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-300">Goal: ${tipGoalAmount}</span>
                <span className="text-sm text-blue-300">${tipData.amount} / ${tipGoalAmount}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((tipData.amount / tipGoalAmount) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-400 mt-1">
                {tipData.amount >= tipGoalAmount ? 'Goal reached! 🎉' : `$${(tipGoalAmount - tipData.amount).toFixed(2)} to go`}
              </p>
            </div>
          </div>
        )}

        {/* Enterprise Features - Tip Rewards */}
        {hasEnterpriseFeatures && (
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <label className="block text-gray-400 text-xs sm:text-sm">Tip Rewards</label>
              <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded">ENTERPRISE</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="tipRewards"
                  checked={tipRewards}
                  onChange={(e) => setTipRewards(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="tipRewards" className="text-sm text-purple-300">
                  Unlock exclusive content for this tip
                </label>
              </div>
              {tipRewards && (
                <p className="text-xs text-purple-400">
                  Creator will receive a notification to share exclusive content with you
                </p>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-gray-400 text-sm mb-2">Message (Optional)</label>
          <textarea
            value={tipData.message}
            onChange={(e) => setTipData({ ...tipData, message: e.target.value })}
            placeholder="Leave a message for the creator..."
            className="w-full px-3 py-2.5 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500 resize-none text-sm sm:text-base"
            rows={2}
            maxLength={200}
          />
          <p className="text-gray-400 text-xs mt-1">
            {tipData.message.length}/200 characters
          </p>
        </div>

        {/* Anonymous Option */}
        <div className="mb-4 sm:mb-6">
          <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tipData.is_anonymous}
              onChange={(e) => setTipData({ ...tipData, is_anonymous: e.target.checked })}
              className="w-4 h-4 text-pink-500 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
            />
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {tipData.is_anonymous ? (
                <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              ) : (
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              )}
              <span className="text-gray-300 text-sm sm:text-base">Send anonymously</span>
            </div>
          </label>
        </div>

        {/* Upgrade Prompt for Free Users */}
        {userTier === 'free' && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">UPGRADE</span>
              <span className="text-xs sm:text-sm text-blue-300 font-medium">Unlock Advanced Tip Features</span>
            </div>
            <p className="text-xs text-blue-400 mb-2">
              Upgrade to Pro for lower platform fees (8% vs 10%), tip analytics, goals, and rewards!
            </p>
            <button className="text-xs text-blue-300 hover:text-blue-200 underline">
              Learn More →
            </button>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-gray-400 text-sm mb-3">Payment Method</label>
          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            {PAYMENT_METHODS.filter(method => availablePaymentMethods.includes(method.id)).map((method) => {
              const IconComponent = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`p-3 rounded-lg border transition-all duration-200 flex items-center space-x-3 text-left ${
                    selectedPaymentMethod === method.id
                      ? `${method.color} border-opacity-100`
                      : `border-gray-600 bg-gray-700/50 text-white ${method.hoverColor}`
                  }`}
                >
                  <IconComponent className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{method.name}</div>
                    <div className="text-xs text-gray-400">{method.description}</div>
                  </div>
                  {selectedPaymentMethod === method.id && (
                    <div className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="text-xs sm:text-sm text-gray-400 order-2 sm:order-1">
            Platform fee: {formatCurrency(getPlatformFee(tipData.amount))} ({userTier === 'free' ? '10%' : userTier === 'pro' ? '8%' : '5%'})
          </div>
          <button
            onClick={handleSendTip}
            disabled={sending || tipData.amount <= 0}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:from-pink-600 hover:to-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 order-1 sm:order-2 text-sm sm:text-base"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send {formatCurrency(tipData.amount)} with {PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod)?.name}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
