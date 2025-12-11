'use client';

import React, { useState, useEffect } from 'react';
import { revenueService } from '../../lib/revenue-service';
import { walletService } from '../../lib/wallet-service';
import { CountryAwareBankForm } from '../wallet/CountryAwareBankForm';
import type { CreatorBankAccount, BankAccountFormData } from '../../lib/types/revenue';
import { Building2, CreditCard, Shield, CheckCircle, AlertCircle, Edit, Save, X, Loader2, Eye, EyeOff, Wallet, RefreshCw, Info } from 'lucide-react';

interface BankAccountManagerProps {
  userId: string;
}

export function BankAccountManager({ userId }: BankAccountManagerProps) {
  const [bankAccount, setBankAccount] = useState<CreatorBankAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showWalletInfo, setShowWalletInfo] = useState(false);

  const [formData, setFormData] = useState<BankAccountFormData>({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    currency: 'USD'
  });

  useEffect(() => {
    loadBankAccount();
  }, [userId]);

  const loadBankAccount = async () => {
    try {
      setLoading(true);
      
      // Load bank account and wallet balance in parallel
      const [account, balance] = await Promise.all([
        revenueService.getBankAccount(userId),
        walletService.getBalance(userId)
      ]);
      
      setBankAccount(account);
      setWalletBalance(balance);
      
      if (account) {
        setFormData({
          account_holder_name: account.account_holder_name,
          bank_name: account.bank_name,
          account_number: account.account_number_encrypted, // In real app, decrypt this
          routing_number: account.routing_number_encrypted, // In real app, decrypt this
          account_type: account.account_type,
          currency: account.currency
        });
      }
    } catch (error) {
      console.error('Error loading bank account:', error);
      setError('Failed to load bank account information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // CRITICAL FIX: First save bank details to database
      const result = await revenueService.setBankAccount(userId, formData);

      if (!result.success) {
        setError(result.error || 'Failed to save bank account information');
        return;
      }

      // CRITICAL FIX: Then create Stripe Connect account if it doesn't exist
      // Check if user already has a Stripe Connect account
      const currentAccount = await revenueService.getBankAccount(userId);

      if (!currentAccount?.stripe_account_id) {
        // No Stripe Connect account exists, create one
        console.log('Creating Stripe Connect account after saving bank details...');

        // Get user's country from form or detect it
        let userCountry = formData.country || 'US';
        if (!formData.country) {
          try {
            const ipResponse = await fetch('https://ipapi.co/json/');
            const ipData = await ipResponse.json();
            if (ipData.country_code) {
              userCountry = ipData.country_code;
            }
          } catch (error) {
            console.log('Could not detect country, using US default');
          }
        }

        const stripeResponse = await fetch('/api/stripe/connect/create-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // CRITICAL FIX: Include cookies for authentication
          body: JSON.stringify({ country: userCountry }),
        });

        const stripeResult = await stripeResponse.json();

        if (stripeResponse.ok && stripeResult.success) {
          // Successfully created Stripe Connect account
          setSuccess('Bank account saved and Stripe Connect account created! Redirecting to complete setup...');

          // Redirect to Stripe onboarding
          setTimeout(() => {
            window.location.href = stripeResult.onboardingUrl;
          }, 2000);
        } else {
          // Stripe Connect creation failed, but bank details are saved
          setError(`Bank details saved, but Stripe Connect setup failed: ${stripeResult.error}. You can try the "Set Up with Stripe Connect" button again.`);
          setIsEditing(false);
          await loadBankAccount();
        }
      } else {
        // Stripe Connect account already exists, just saved bank details
        setSuccess('Bank account information saved successfully!');
        setIsEditing(false);
        await loadBankAccount();
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleSetupStripeConnect = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Get user's country from browser or default to US
      let userCountry = 'US';
      try {
        // Try to detect country from IP
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        if (ipData.country_code) {
          userCountry = ipData.country_code;
        }
      } catch (error) {
        console.log('Could not detect country, using US default');
      }

      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL FIX: Include cookies for authentication
        body: JSON.stringify({
          country: userCountry,
          setupMode: 'deferred' // INSTANT SETUP: User can start earning immediately, verify later when withdrawing
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.skipOnboarding) {
          // Deferred mode: Show success message and reload
          setSuccess(result.message || 'Stripe Connect account created! You can start earning immediately.');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          // Immediate mode: Redirect to Stripe onboarding
          window.location.href = result.onboardingUrl;
        }
      } else {
        if (result.action === 'setup_platform_profile' && result.url) {
          setError(result.error || 'Additional setup required before completing Stripe onboarding.');
        } else {
          setError(result.error || 'Failed to set up Stripe Connect account');
        }
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteVerification = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Get user's country from browser or default to US
      let userCountry = 'US';
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        if (ipData.country_code) {
          userCountry = ipData.country_code;
        }
      } catch (error) {
        console.log('Could not detect country, using US default');
      }

      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          country: userCountry,
          setupMode: 'immediate' // IMMEDIATE MODE: Complete verification now
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Redirect to Stripe onboarding
        window.location.href = result.onboardingUrl;
      } else {
        setError(result.error || 'Failed to start verification');
      }
    } catch (error) {
      console.error('Error starting verification:', error);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    
    // Reset form data to current account data
    if (bankAccount) {
      setFormData({
        account_holder_name: bankAccount.account_holder_name,
        bank_name: bankAccount.bank_name,
        account_number: bankAccount.account_number_encrypted,
        routing_number: bankAccount.routing_number_encrypted,
        account_type: bankAccount.account_type,
        currency: bankAccount.currency
      });
    }
  };

  const handleResetBankAccount = async () => {
    if (!confirm('Are you sure you want to reset your bank account? This will clear your current Stripe Connect setup and allow you to start fresh.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/bank-account/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess('Bank account reset successfully! You can now set up a new account.');
        await loadBankAccount(); // Reload to get updated data
      } else {
        setError(result.error || 'Failed to reset bank account');
      }
    } catch (error) {
      console.error('Error resetting bank account:', error);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-400 bg-green-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'failed':
      case 'rejected':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'failed':
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Bank Account</h3>
          <p className="text-gray-400 text-sm">
            Manage your bank account for payouts
          </p>
        </div>
        {bankAccount && !isEditing && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleResetBankAccount}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  <span>Reset</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-900/50 border border-green-500 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Wallet Information */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Wallet className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-semibold">Digital Wallet</h3>
              <p className="text-purple-200 text-sm">Your SoundBridge earnings</p>
            </div>
          </div>
          <button
            onClick={() => setShowWalletInfo(!showWalletInfo)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-purple-200">Available Balance</span>
            <span className="text-2xl font-bold">
              {walletService.formatCurrency(walletBalance, 'USD')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-200">Status</span>
            <span className="font-medium">
              {walletBalance > 0 ? 'Active' : 'Empty'}
            </span>
          </div>
        </div>

        {showWalletInfo && (
          <div className="mt-4 p-4 bg-white/10 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-purple-300 mt-0.5" />
              <div className="text-sm">
                <p className="text-purple-200 font-medium mb-1">How it works:</p>
                <ul className="text-purple-100 space-y-1">
                  <li>• Tips and earnings go to your wallet when bank details are pending</li>
                  <li>• Withdraw to your bank account once verified</li>
                  <li>• Secure and instant transfers</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bank Account Information */}
      {bankAccount ? (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          {/* Stripe Connect Warning if not set up */}
          {bankAccount && !bankAccount.stripe_account_id && (
            <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-300 mb-1">Stripe Connect Not Set Up</h4>
                  <p className="text-yellow-200 text-sm mb-3">
                    Your bank details are saved, but you need to complete Stripe Connect setup to receive payouts.
                    Earnings will be stored in your digital wallet until setup is complete.
                  </p>
                  <button
                    onClick={handleSetupStripeConnect}
                    disabled={saving}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Setting up...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        <span>Complete Stripe Connect Setup</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Complete Verification Button (for pending Stripe accounts) */}
          {bankAccount && bankAccount.stripe_account_id && bankAccount.verification_status === 'pending' && (
            <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-300 mb-1">Complete Verification to Withdraw</h4>
                  <p className="text-blue-200 text-sm mb-3">
                    You can start earning immediately! Complete verification now to withdraw funds anytime, or do it later when you're ready to cash out.
                  </p>
                  <button
                    onClick={() => handleCompleteVerification()}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>Complete Verification Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Verification Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${getVerificationStatusColor(bankAccount.verification_status)}`}>
                  {getVerificationStatusIcon(bankAccount.verification_status)}
                </div>
                <div>
                  <p className="text-white font-medium">Verification Status</p>
                  <p className="text-gray-400 text-sm capitalize">
                    {bankAccount.verification_status}
                  </p>
                </div>
              </div>
              {bankAccount.is_verified && (
                <div className="flex items-center space-x-2 text-green-400">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Verified</span>
                </div>
              )}
            </div>

            {/* Account Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Account Holder</p>
                <p className="text-white font-medium">{bankAccount.account_holder_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Bank Name</p>
                <p className="text-white font-medium">{bankAccount.bank_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Account Type</p>
                <p className="text-white font-medium capitalize">{bankAccount.account_type}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Currency</p>
                <p className="text-white font-medium">{bankAccount.currency}</p>
              </div>
            </div>

            {/* Account Number (Masked) */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-gray-400 text-sm">Account Number</p>
                <p className="text-white font-medium">
                  {showAccountDetails ? formData.account_number : `****${formData.account_number.slice(-4)}`}
                </p>
              </div>
              <button
                onClick={() => setShowAccountDetails(!showAccountDetails)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {showAccountDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No Bank Account Added</h4>
            <p className="text-gray-400 mb-6">
              Add your bank account details to start receiving payouts
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Bank Account
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-medium text-white mb-6">
            {bankAccount ? 'Edit Bank Account' : 'Add Bank Account'}
          </h4>
          
          <CountryAwareBankForm
            onSave={handleSave}
            onCancel={handleCancel}
            initialData={formData}
          />
        </div>
      )}

      {/* Stripe Connect Setup */}
      {!bankAccount && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-center space-y-4">
            <div className="p-4 bg-blue-500/20 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Building2 className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Set Up Payout Account</h3>
              <p className="text-gray-400 text-sm mb-4">
                Connect your bank account to receive payouts from your earnings. 
                We use Stripe Connect for secure and reliable payments.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleSetupStripeConnect}
                disabled={saving}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Setting up...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Set Up with Stripe Connect</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setIsEditing(true)}
                disabled={saving}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Building2 className="h-4 w-4" />
                <span>Manual Bank Account Setup</span>
              </button>
            </div>

            {/* Wallet Information */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <Wallet className="h-5 w-5 text-purple-400 mt-0.5" />
                <div className="text-left">
                  <h4 className="font-medium text-purple-300 text-sm">Digital Wallet Available</h4>
                  <p className="text-purple-200 text-xs mt-1">
                    While your bank account is being verified, tips and earnings will be stored in your secure digital wallet. 
                    You can withdraw funds once your bank account is verified.
                  </p>
                  <div className="mt-2 text-xs text-purple-200">
                    <span className="font-medium">Current Balance: </span>
                    {walletService.formatCurrency(walletBalance, 'USD')}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="text-left">
                  <h4 className="font-medium text-blue-300 text-sm">Why Stripe Connect?</h4>
                  <ul className="text-blue-200 text-xs mt-1 space-y-1">
                    <li>• Secure and trusted payment processing</li>
                    <li>• Faster payouts (1-2 business days)</li>
                    <li>• Lower fees compared to manual transfers</li>
                    <li>• Automatic tax reporting and compliance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-300">Security Notice</h4>
            <p className="text-blue-200 text-sm mt-1">
              Your bank account information is encrypted and stored securely. 
              We use industry-standard encryption to protect your sensitive data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
