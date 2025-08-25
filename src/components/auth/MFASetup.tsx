'use client';

import React, { useState, useEffect } from 'react';
import { authService, MFASettings } from '@/lib/auth-service';
import { Shield, Smartphone, Mail, Key, CheckCircle, AlertCircle } from 'lucide-react';

interface MFASetupProps {
  userId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function MFASetup({ userId, onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState<'select' | 'setup' | 'verify' | 'complete'>('select');
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email' | 'authenticator' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrCode, setQrCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const methods = [
    {
      id: 'authenticator' as const,
      name: 'Authenticator App',
      description: 'Use Google Authenticator, Authy, or similar apps',
      icon: Smartphone,
      recommended: true
    },
    {
      id: 'sms' as const,
      name: 'SMS',
      description: 'Receive codes via text message',
      icon: Smartphone
    },
    {
      id: 'email' as const,
      name: 'Email',
      description: 'Receive codes via email',
      icon: Mail
    }
  ];

  const handleMethodSelect = async (method: 'sms' | 'email' | 'authenticator') => {
    setSelectedMethod(method);
    setStep('setup');
    setIsLoading(true);
    setError('');

    try {
      const result = await authService.setupMFA(userId, method);
      
      if (result.success) {
        if (method === 'authenticator' && result.secret) {
          // Generate QR code for authenticator app
          const qrData = `otpauth://totp/SoundBridge:${userId}?secret=${result.secret}&issuer=SoundBridge`;
          setQrCode(qrData);
        }
        setStep('verify');
      } else {
        setError(result.error || 'Failed to setup MFA');
        setStep('select');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await authService.verifyMFA(userId, verificationCode);
      
      if (result.success) {
        setSuccess('MFA setup completed successfully!');
        setStep('complete');
        
        // Generate backup codes
        const codes = Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 8).toUpperCase()
        );
        setBackupCodes(codes);
        
        if (onComplete) {
          setTimeout(onComplete, 2000);
        }
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCodeVerification = async (code: string) => {
    // Verify backup code logic
    if (backupCodes.includes(code.toUpperCase())) {
      setSuccess('Backup code verified successfully!');
      if (onComplete) {
        setTimeout(onComplete, 1000);
      }
    } else {
      setError('Invalid backup code');
    }
  };

  if (step === 'complete') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">MFA Setup Complete!</h2>
          <p className="text-gray-600 mb-6">Your account is now protected with multi-factor authentication.</p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Backup Codes</h3>
            <p className="text-sm text-gray-600 mb-3">
              Save these backup codes in a secure location. You can use them to access your account if you lose your MFA device.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-white p-2 border rounded text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={onComplete}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Up Two-Factor Authentication</h2>
        <p className="text-gray-600">Add an extra layer of security to your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-4">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              disabled={isLoading}
              className={`w-full p-4 border rounded-lg text-left hover:border-blue-300 transition-colors ${
                method.recommended ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center">
                <method.icon className="w-6 h-6 text-gray-600 mr-3" />
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="font-semibold text-gray-900">{method.name}</h3>
                    {method.recommended && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                </div>
              </div>
            </button>
          ))}
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full mt-4 py-2 px-4 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {step === 'setup' && selectedMethod === 'authenticator' && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-4">Set Up Authenticator App</h3>
            <p className="text-sm text-gray-600 mb-4">
              1. Open your authenticator app (Google Authenticator, Authy, etc.)<br/>
              2. Scan the QR code below or enter the secret key manually<br/>
              3. Enter the 6-digit code from your app
            </p>
            
            {qrCode && (
              <div className="bg-white p-4 border rounded-lg mb-4">
                {/* QR Code would be rendered here */}
                <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 text-sm">QR Code</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-4">Verify Your Setup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the 6-digit code from your {selectedMethod === 'authenticator' ? 'authenticator app' : selectedMethod}
            </p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest"
              maxLength={6}
            />
            
            <button
              onClick={handleVerification}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
            
            <button
              onClick={() => setStep('select')}
              className="w-full py-2 px-4 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Method Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
