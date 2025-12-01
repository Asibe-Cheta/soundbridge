'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { ArrowRight, ArrowLeft, Shield, Lock, Loader2, AlertCircle, Check } from 'lucide-react';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

interface PaymentCollectionProps {
  isOpen: boolean;
  onSuccess: () => void;
  onBack: () => void;
}

export function PaymentCollection({ isOpen, onSuccess, onBack }: PaymentCollectionProps) {
  const { setCurrentStep } = useOnboarding();
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardholderName: ''
  });
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    setFormData(prev => ({ ...prev, cardExpiry: formatted }));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setFormData(prev => ({ ...prev, cardCvv: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: apiError } = await fetchJsonWithAuth('/api/onboarding/upgrade-pro', {
        method: 'POST',
        body: JSON.stringify({
          cardNumber: formData.cardNumber.replace(/\s/g, ''),
          cardExpiry: formData.cardExpiry,
          cardCvv: formData.cardCvv,
          cardholderName: formData.cardholderName,
          period: period
        })
      });

      if (apiError || !data?.success) {
        setError(apiError?.message || data?.message || 'Payment processing failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success - proceed to welcome confirmation
      setCurrentStep('welcomeConfirmation');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="relative w-full max-w-2xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowRight className="text-white/70 hover:text-white rotate-180" size={20} />
            </button>
            <span className="text-sm text-white/70">Finalizing...</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
            Upgrade to Pro - Risk Free
          </h2>

          <p className="text-white/80 text-center mb-6">
            You'll be charged £{period === 'monthly' ? '9.99' : '99.00'} today to start your Pro subscription.
            If you're not satisfied within 7 days, simply request a refund from your billing settings for a full refund - no questions asked.
          </p>

          {/* Billing Period Selection */}
          <div className="mb-6 flex gap-4 justify-center">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                period === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Monthly - £9.99/mo
            </button>
            <button
              onClick={() => setPeriod('annual')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                period === 'annual'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Annual - £99/yr
              <span className="ml-2 text-xs">Save £20</span>
            </button>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Card Number
              </label>
              <input
                type="text"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                maxLength={19}
                required
              />
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={formData.cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  value={formData.cardCvv}
                  onChange={handleCvvChange}
                  placeholder="123"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                  maxLength={3}
                  required
                />
              </div>
            </div>

            {/* Cardholder Name */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                value={formData.cardholderName}
                onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
                placeholder="Full Name"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            {/* Trust Badges */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Shield size={16} />
                <span>7-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Check size={16} />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Lock size={16} />
                <span>Secure payment via Stripe</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-red-400 font-semibold mb-1">Payment Error</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-white/10 text-white/50 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Upgrade to Pro
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {/* Back to Free Option */}
            <button
              type="button"
              onClick={onBack}
              className="w-full text-center text-white/70 hover:text-white text-sm transition-colors"
            >
              ← Back to Free plan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
