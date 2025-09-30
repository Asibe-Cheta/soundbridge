'use client';

import React, { useState, useEffect } from 'react';
import { walletService, type WithdrawalMethod } from '../../lib/wallet-service';
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  AlertCircle,
  Banknote,
  CreditCard,
  Wallet,
  Bitcoin,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

interface WithdrawalManagerProps {
  userId: string;
  onWithdrawalRequest?: (amount: number, methodId: string) => void;
}

export function WithdrawalManager({ userId, onWithdrawalRequest }: WithdrawalManagerProps) {
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadWithdrawalMethods();
  }, [userId]);

  const loadWithdrawalMethods = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/wallet/withdrawal-methods', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load withdrawal methods');
      }

      const data = await response.json();
      setWithdrawalMethods(data.methods || []);
    } catch (error) {
      console.error('Error loading withdrawal methods:', error);
      setError('Failed to load withdrawal methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async (methodData: any) => {
    try {
      setError(null);

      const response = await fetch('/api/wallet/withdrawal-methods', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(methodData)
      });

      const result = await response.json();

      if (result.success) {
        await loadWithdrawalMethods();
        setShowAddMethod(false);
      } else {
        setError(result.error || 'Failed to add withdrawal method');
      }
    } catch (error) {
      console.error('Error adding withdrawal method:', error);
      setError('Failed to add withdrawal method');
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this withdrawal method?')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/wallet/withdrawal-methods/${methodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });

      if (response.ok) {
        await loadWithdrawalMethods();
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete withdrawal method');
      }
    } catch (error) {
      console.error('Error deleting withdrawal method:', error);
      setError('Failed to delete withdrawal method');
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'bank_transfer':
        return <Banknote className="h-5 w-5 text-blue-400" />;
      case 'paypal':
        return <CreditCard className="h-5 w-5 text-yellow-400" />;
      case 'crypto':
        return <Bitcoin className="h-5 w-5 text-orange-400" />;
      case 'prepaid_card':
        return <Wallet className="h-5 w-5 text-purple-400" />;
      default:
        return <Wallet className="h-5 w-5 text-gray-400" />;
    }
  };

  const getMethodTypeDisplay = (type: string) => {
    const typeMap = {
      bank_transfer: 'Bank Transfer',
      paypal: 'PayPal',
      crypto: 'Cryptocurrency',
      prepaid_card: 'Prepaid Card'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const getVerificationStatus = (method: WithdrawalMethod) => {
    if (method.is_verified) {
      return (
        <div className="flex items-center space-x-1 text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Verified</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1 text-yellow-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Pending Verification</span>
        </div>
      );
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
          <h3 className="text-lg font-semibold text-white">Withdrawal Methods</h3>
          <p className="text-gray-400 text-sm">
            Manage how you receive your earnings
          </p>
        </div>
        <button
          onClick={() => setShowAddMethod(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Method</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Withdrawal Methods List */}
      {withdrawalMethods.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">No Withdrawal Methods</h4>
          <p className="text-gray-400 mb-6">
            Add a withdrawal method to start receiving your earnings
          </p>
          <button
            onClick={() => setShowAddMethod(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Withdrawal Method
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawalMethods.map((method) => (
            <div key={method.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gray-700 rounded-lg">
                    {getMethodIcon(method.method_type)}
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{method.method_name}</h4>
                    <p className="text-gray-400 text-sm">
                      {getMethodTypeDisplay(method.method_type)}
                    </p>
                    {getVerificationStatus(method)}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedMethod(method)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMethod(method.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Method Details */}
              {selectedMethod?.id === method.id && (
                <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Method Type</span>
                      <span className="text-white text-sm">
                        {getMethodTypeDisplay(method.method_type)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Status</span>
                      {getVerificationStatus(method)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Added</span>
                      <span className="text-white text-sm">
                        {new Date(method.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Security Notice */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Shield className="h-4 w-4 text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-300 font-medium">Security Notice</p>
                        <p className="text-blue-200 text-xs">
                          Your withdrawal details are encrypted and stored securely. 
                          We never share your financial information with third parties.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Method Modal */}
      {showAddMethod && (
        <AddWithdrawalMethodModal
          onClose={() => setShowAddMethod(false)}
          onAdd={handleAddMethod}
        />
      )}
    </div>
  );
}

// Add Withdrawal Method Modal Component
function AddWithdrawalMethodModal({ 
  onClose, 
  onAdd 
}: { 
  onClose: () => void; 
  onAdd: (data: any) => void; 
}) {
  const [methodType, setMethodType] = useState<string>('');
  const [methodName, setMethodName] = useState('');
  const [bankDetails, setBankDetails] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    currency: 'USD'
  });
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState({
    address: '',
    currency: 'BTC',
    network: 'Bitcoin'
  });
  const [cardDetails, setCardDetails] = useState({
    card_number: '',
    card_holder_name: '',
    expiry_date: '',
    cvv: ''
  });

  const handleSubmit = () => {
    if (!methodType || !methodName) {
      alert('Please fill in all required fields');
      return;
    }

    const methodData = {
      method_type: methodType,
      method_name: methodName,
      ...(methodType === 'bank_transfer' && { bank_details: bankDetails }),
      ...(methodType === 'paypal' && { paypal_email: paypalEmail }),
      ...(methodType === 'crypto' && { crypto_address: cryptoAddress }),
      ...(methodType === 'prepaid_card' && { card_details: cardDetails })
    };

    onAdd(methodData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Add Withdrawal Method</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Method Type Selection */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Withdrawal Method</label>
            <select
              value={methodType}
              onChange={(e) => setMethodType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select method...</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="crypto">Cryptocurrency</option>
              <option value="prepaid_card">Prepaid Card</option>
            </select>
          </div>

          {/* Method Name */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Method Name</label>
            <input
              type="text"
              value={methodName}
              onChange={(e) => setMethodName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., My Bank Account"
            />
          </div>

          {/* Bank Transfer Details */}
          {methodType === 'bank_transfer' && (
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Account Holder Name</label>
                <input
                  type="text"
                  value={bankDetails.account_holder_name}
                  onChange={(e) => setBankDetails({...bankDetails, account_holder_name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Bank Name</label>
                <input
                  type="text"
                  value={bankDetails.bank_name}
                  onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Bank of America"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Account Number</label>
                  <input
                    type="text"
                    value={bankDetails.account_number}
                    onChange={(e) => setBankDetails({...bankDetails, account_number: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Routing Number</label>
                  <input
                    type="text"
                    value={bankDetails.routing_number}
                    onChange={(e) => setBankDetails({...bankDetails, routing_number: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="123456789"
                    maxLength={9}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PayPal Details */}
          {methodType === 'paypal' && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">PayPal Email</label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="your-email@example.com"
              />
            </div>
          )}

          {/* Crypto Details */}
          {methodType === 'crypto' && (
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Crypto Address</label>
                <input
                  type="text"
                  value={cryptoAddress.address}
                  onChange={(e) => setCryptoAddress({...cryptoAddress, address: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Currency</label>
                  <select
                    value={cryptoAddress.currency}
                    onChange={(e) => setCryptoAddress({...cryptoAddress, currency: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                    <option value="USDT">Tether (USDT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Network</label>
                  <input
                    type="text"
                    value={cryptoAddress.network}
                    onChange={(e) => setCryptoAddress({...cryptoAddress, network: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Bitcoin"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Prepaid Card Details */}
          {methodType === 'prepaid_card' && (
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Card Number</label>
                <input
                  type="text"
                  value={cardDetails.card_number}
                  onChange={(e) => setCardDetails({...cardDetails, card_number: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Card Holder Name</label>
                <input
                  type="text"
                  value={cardDetails.card_holder_name}
                  onChange={(e) => setCardDetails({...cardDetails, card_holder_name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Expiry Date</label>
                  <input
                    type="text"
                    value={cardDetails.expiry_date}
                    onChange={(e) => setCardDetails({...cardDetails, expiry_date: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">CVV</label>
                  <input
                    type="text"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-300 font-medium">Security Notice</p>
                <p className="text-blue-200 text-xs">
                  Your withdrawal details are encrypted and stored securely. 
                  We use industry-standard encryption to protect your financial information.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Method
          </button>
        </div>
      </div>
    </div>
  );
}
