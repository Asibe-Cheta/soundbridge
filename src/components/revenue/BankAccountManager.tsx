'use client';

import React, { useState, useEffect } from 'react';
import { revenueService } from '../../lib/revenue-service';
import type { CreatorBankAccount, BankAccountFormData } from '../../lib/types/revenue';
import {
  Building2,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

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
      const account = await revenueService.getBankAccount(userId);
      setBankAccount(account);
      
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await revenueService.setBankAccount(userId, formData);
      
      if (result.success) {
        setSuccess('Bank account information saved successfully!');
        setIsEditing(false);
        await loadBankAccount(); // Reload to get updated data
      } else {
        setError(result.error || 'Failed to save bank account information');
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
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
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button>
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

      {/* Bank Account Information */}
      {bankAccount ? (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
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
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Bank of America"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="123456789"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Routing Number</label>
                <input
                  type="text"
                  value={formData.routing_number}
                  onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Account Type</label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value as 'checking' | 'savings' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </>
              )}
            </button>
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
