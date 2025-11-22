'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Smartphone, 
  Key, 
  Copy, 
  Check, 
  X, 
  AlertCircle,
  Clock,
  Lock,
  RefreshCw,
  ArrowLeft,
  Download,
  ChevronLeft,
  HelpCircle,
  Info,
  ExternalLink
} from 'lucide-react';

interface TwoFactorStatus {
  enabled: boolean;
  method: string | null;
  configuredAt: string | null;
  backupCodesRemaining: number;
  needsRegenerateBackupCodes: boolean;
  recentActivity: Array<{
    action: string;
    method: string;
    success: boolean;
    created_at: string;
    ip_address?: string;
  }>;
}

interface SetupData {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

interface BackupCodes {
  codes: string[];
}

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // State
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Setup flow state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  
  // Backup codes state
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  
  // Disable flow state
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [isDisablingConfirm, setIsDisablingConfirm] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // Load 2FA status
  useEffect(() => {
    if (user) {
      loadStatus();
    }
  }, [user]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/2fa/status', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.status === 401) {
        // Not authenticated - redirect to login
        console.error('Not authenticated, redirecting to login');
        router.push('/login?redirect=/settings/security');
        return;
      }

      if (data.success) {
        setStatus(data);
      } else {
        setError(data.error || 'Failed to load 2FA status');
      }
    } catch (err) {
      console.error('Error loading 2FA status:', err);
      setError('Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  };

  // Start 2FA setup
  const handleStartSetup = async () => {
    try {
      setIsSettingUp(true);
      setError(null);
      setVerifyError(null);

      const response = await fetch('/api/user/2fa/setup-totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.data) {
        setSetupData(data.data);
      } else {
        setError(data.error || 'Failed to start 2FA setup');
        setIsSettingUp(false);
      }
    } catch (err) {
      console.error('Error starting 2FA setup:', err);
      setError('Failed to start 2FA setup');
      setIsSettingUp(false);
    }
  };

  // Verify and complete setup
  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setVerifyError('Please enter a 6-digit code');
      return;
    }

    try {
      setIsVerifying(true);
      setVerifyError(null);

      const response = await fetch('/api/user/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code: verificationCode })
      });

      const data = await response.json();

      if (data.success) {
        // Show backup codes
        if (data.data?.backupCodes) {
          setBackupCodes(data.data.backupCodes);
          setShowBackupCodes(true);
        }
        
        // Reload status
        await loadStatus();
        
        // Reset setup state
        setIsSettingUp(false);
        setSetupData(null);
        setVerificationCode('');
      } else {
        setVerifyError(data.error || 'Invalid code. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setVerifyError('Failed to verify code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Disable 2FA
  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!disableCode || disableCode.length !== 6) {
      setDisableError('Please enter a 6-digit code');
      return;
    }

    try {
      setIsDisablingConfirm(true);
      setDisableError(null);

      const response = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code: disableCode })
      });

      const data = await response.json();

      if (data.success) {
        // Reload status
        await loadStatus();
        
        // Reset disable state
        setIsDisabling(false);
        setDisableCode('');
      } else {
        setDisableError(data.error || 'Invalid code. Please try again.');
      }
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      setDisableError('Failed to disable 2FA');
    } finally {
      setIsDisablingConfirm(false);
    }
  };

  // Regenerate backup codes
  const handleRegenerateBackupCodes = async () => {
    try {
      const response = await fetch('/api/user/2fa/regenerate-backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.data?.backupCodes) {
        setBackupCodes(data.data.backupCodes);
        setShowBackupCodes(true);
        await loadStatus();
      } else {
        setError(data.error || 'Failed to regenerate backup codes');
      }
    } catch (err) {
      console.error('Error regenerating backup codes:', err);
      setError('Failed to regenerate backup codes');
    }
  };

  // Copy backup codes
  const handleCopyBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  // Download backup codes
  const handleDownloadBackupCodes = () => {
    if (backupCodes) {
      const blob = new Blob(
        [`SoundBridge Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe! Each can only be used once.`],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soundbridge-backup-codes-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading security settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Back to Settings</span>
          </button>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Shield className="text-pink-400" size={32} />
              <h1 className="text-3xl font-bold text-white">Security Settings</h1>
            </div>
            <button
              onClick={() => {
                const helpSection = document.getElementById('help-section');
                if (helpSection) {
                  helpSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-400 font-medium transition-colors"
            >
              <HelpCircle size={18} />
              <span className="hidden sm:inline">How to Set Up 2FA</span>
              <span className="sm:hidden">Help</span>
            </button>
          </div>
          <p className="text-white/70">Protect your account with two-factor authentication</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* 2FA Status Card */}
        {status && !isSettingUp && !showBackupCodes && !isDisabling && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${status.enabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                  {status.enabled ? (
                    <ShieldCheck className="text-green-400" size={24} />
                  ) : (
                    <ShieldAlert className="text-gray-400" size={24} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-white/70 text-sm">
                    {status.enabled
                      ? 'Your account is protected with 2FA'
                      : 'Add an extra layer of security to your account'}
                  </p>
                </div>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                status.enabled
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {status.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {status.enabled ? (
              <>
                {/* Enabled Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="text-white/50" size={16} />
                      <span className="text-white/70 text-sm">Configured</span>
                    </div>
                    <p className="text-white font-medium">
                      {status.configuredAt
                        ? new Date(status.configuredAt).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="text-white/50" size={16} />
                      <span className="text-white/70 text-sm">Backup Codes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${
                        status.backupCodesRemaining <= 2
                          ? 'text-red-400'
                          : status.backupCodesRemaining <= 5
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}>
                        {status.backupCodesRemaining} remaining
                      </p>
                      {status.needsRegenerateBackupCodes && (
                        <AlertCircle className="text-yellow-400" size={16} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Warning for low backup codes */}
                {status.needsRegenerateBackupCodes && (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <p className="text-yellow-400 font-medium">Low backup codes</p>
                        <p className="text-yellow-300 text-sm mt-1">
                          You have {status.backupCodesRemaining} backup codes remaining. Generate new codes to ensure account recovery.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleRegenerateBackupCodes}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-400 font-medium transition-colors"
                  >
                    <RefreshCw size={18} />
                    <span>Regenerate Backup Codes</span>
                  </button>

                  <button
                    onClick={() => setIsDisabling(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-400 font-medium transition-colors"
                  >
                    <ShieldAlert size={18} />
                    <span>Disable 2FA</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Disabled - Show Benefits */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <Check className="text-green-400 flex-shrink-0 mt-1" size={20} />
                    <p className="text-white/90">Protect your account from unauthorized access</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="text-green-400 flex-shrink-0 mt-1" size={20} />
                    <p className="text-white/90">Secure your content and earnings</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="text-green-400 flex-shrink-0 mt-1" size={20} />
                    <p className="text-white/90">Peace of mind with an extra security layer</p>
                  </div>
                </div>

                <button
                  onClick={handleStartSetup}
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} />
                  <span>Enable Two-Factor Authentication</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Setup Flow */}
        {isSettingUp && setupData && !showBackupCodes && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="mb-6">
              <button
                onClick={() => {
                  setIsSettingUp(false);
                  setSetupData(null);
                  setVerificationCode('');
                  setVerifyError(null);
                }}
                className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Cancel Setup</span>
              </button>
              
              <h2 className="text-2xl font-bold text-white mb-2">Set Up Two-Factor Authentication</h2>
              <p className="text-white/70">Follow these steps to enable 2FA on your account</p>
            </div>

            {/* Important Notice */}
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-blue-400 font-medium mb-1">New QR Code Required</p>
                  <p className="text-blue-300 text-sm">
                    Each time you set up 2FA, a <strong>new unique secret</strong> is generated. 
                    If you previously had 2FA enabled, you must <strong>remove the old SoundBridge entry</strong> from your authenticator app 
                    and scan this new QR code. Old codes will not work.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1: Scan QR Code */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
                  1
                </div>
                <h3 className="text-lg font-bold text-white">Scan QR Code</h3>
              </div>
              
              <p className="text-white/70 mb-4">
                Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
              </p>

              <div className="bg-white p-6 rounded-xl w-fit mx-auto mb-4">
                <img src={setupData.qrCode} alt="2FA QR Code" className="w-64 h-64" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-white/70 text-sm mb-2">Can't scan? Enter this code manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white/5 px-4 py-2 rounded-lg text-white font-mono text-sm break-all">
                    {setupData.secret}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(setupData.secret);
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Copy className="text-white" size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Verify Code */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
                  2
                </div>
                <h3 className="text-lg font-bold text-white">Verify Code</h3>
              </div>

              <p className="text-white/70 mb-4">
                Enter the 6-digit code from your authenticator app:
              </p>

              <form onSubmit={handleVerifySetup} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                      setVerifyError(null);
                    }}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-pink-500/50"
                    maxLength={6}
                    autoFocus
                  />
                  {verifyError && (
                    <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {verifyError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      <span>Verify and Enable 2FA</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Backup Codes Display */}
        {showBackupCodes && backupCodes && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Key className="text-yellow-400" size={28} />
                <h2 className="text-2xl font-bold text-white">Save Your Backup Codes</h2>
              </div>
              <p className="text-white/70">
                These codes can be used to access your account if you lose your authenticator device. Each code can only be used once.
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-yellow-400 font-medium">Important!</p>
                  <p className="text-yellow-300 text-sm mt-1">
                    Save these codes in a secure location. You won't be able to see them again.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-3">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="bg-white/5 px-4 py-3 rounded-lg"
                  >
                    <code className="text-white font-mono text-sm">{code}</code>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyBackupCodes}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-colors"
              >
                {copiedCodes ? (
                  <>
                    <Check size={20} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    <span>Copy Codes</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadBackupCodes}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-colors"
              >
                <Download size={20} />
                <span>Download as Text File</span>
              </button>

              <button
                onClick={() => {
                  setShowBackupCodes(false);
                  setBackupCodes(null);
                }}
                className="ml-auto px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-xl text-white font-medium transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Disable 2FA Flow */}
        {isDisabling && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="mb-6">
              <button
                onClick={() => {
                  setIsDisabling(false);
                  setDisableCode('');
                  setDisableError(null);
                }}
                className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Cancel</span>
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <ShieldAlert className="text-red-400" size={28} />
                <h2 className="text-2xl font-bold text-white">Disable Two-Factor Authentication</h2>
              </div>
              <p className="text-white/70">
                Enter a code from your authenticator app to disable 2FA
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-red-400 font-medium">Warning</p>
                  <p className="text-red-300 text-sm mt-1">
                    Disabling 2FA will make your account less secure. Your backup codes will also be deleted.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleDisable} className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  Enter 6-digit code
                </label>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setDisableCode(value);
                    setDisableError(null);
                  }}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-red-500/50"
                  maxLength={6}
                  autoFocus
                />
                {disableError && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {disableError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDisabling(false);
                    setDisableCode('');
                    setDisableError(null);
                  }}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isDisablingConfirm || disableCode.length !== 6}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isDisablingConfirm ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Disabling...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={20} />
                      <span>Disable 2FA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recent Activity */}
        {status && status.enabled && status.recentActivity && status.recentActivity.length > 0 && !isSettingUp && !showBackupCodes && !isDisabling && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="text-white/70" size={24} />
              <h2 className="text-xl font-bold text-white">Recent 2FA Activity</h2>
            </div>

            <div className="space-y-3">
              {status.recentActivity.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      activity.success ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {activity.success ? (
                        <Check className="text-green-400" size={16} />
                      ) : (
                        <X className="text-red-400" size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      {activity.ip_address && (
                        <p className="text-white/50 text-sm">{activity.ip_address}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-white/50 text-sm">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div id="help-section" className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="text-blue-400" size={28} />
            <h2 className="text-2xl font-bold text-white">How to Set Up Two-Factor Authentication</h2>
          </div>

          <div className="space-y-6">
            {/* Cross-Device Setup Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-blue-400 font-bold text-lg mb-2">Important: Cross-Device Setup</h3>
                  <p className="text-blue-300 mb-3">
                    To scan the QR code, you need <strong>two devices</strong>:
                  </p>
                  <ul className="space-y-2 text-blue-300">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span><strong>Device 1:</strong> Your computer (where you're viewing this page) OR another phone</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span><strong>Device 2:</strong> Your phone with Google Authenticator installed</span>
                    </li>
                  </ul>
                  <p className="text-blue-300 mt-3">
                    <strong>Why?</strong> You can't scan a QR code displayed on your phone with the same phone. You need to view the QR code on one device and scan it with your phone's camera.
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-Step Guide */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Step-by-Step Instructions</h3>
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold mb-2">Download an Authenticator App</h4>
                    <p className="text-white/70 mb-2">Install one of these apps on your phone:</p>
                    <ul className="space-y-1 text-white/70">
                      <li className="flex items-center gap-2">
                        <Smartphone size={16} className="text-pink-400" />
                        <span>Google Authenticator (iOS/Android)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Smartphone size={16} className="text-pink-400" />
                        <span>Authy (iOS/Android)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Smartphone size={16} className="text-pink-400" />
                        <span>Microsoft Authenticator (iOS/Android)</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold mb-2">Enable 2FA on This Page</h4>
                    <p className="text-white/70 mb-2">
                      Make sure you're viewing this page on a device where you can easily see the screen (computer, tablet, or another phone).
                    </p>
                    <p className="text-white/70">
                      Click the <strong>"Enable Two-Factor Authentication"</strong> button above.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold mb-2">Scan the QR Code</h4>
                    <p className="text-white/70 mb-2">
                      On your phone, open your authenticator app and:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-white/70 ml-4">
                      <li>Tap the <strong>"+"</strong> or <strong>"Add"</strong> button</li>
                      <li>Select <strong>"Scan a QR code"</strong></li>
                      <li>Point your phone camera at the QR code on this screen</li>
                      <li>Wait for "SoundBridge" to appear in your authenticator app</li>
                    </ol>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold mb-2">Verify the Code</h4>
                    <p className="text-white/70 mb-2">
                      After scanning, your authenticator app will show a 6-digit code that changes every 30 seconds.
                    </p>
                    <p className="text-white/70">
                      Enter this code on this page to complete the setup.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    5
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold mb-2">Save Your Backup Codes</h4>
                    <p className="text-white/70 mb-2">
                      You'll receive 10 backup codes. <strong>Save them immediately!</strong>
                    </p>
                    <ul className="space-y-1 text-white/70">
                      <li className="flex items-center gap-2">
                        <Download size={16} className="text-green-400" />
                        <span>Download them as a text file</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Copy size={16} className="text-green-400" />
                        <span>Copy and paste into a secure password manager</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Key size={16} className="text-green-400" />
                        <span>Write them down and store in a safe place</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Using 2FA Across Devices */}
            <div className="bg-purple-500/10 border border-purple-500/50 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Smartphone className="text-purple-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-purple-400 font-bold text-lg mb-2">Using 2FA on Multiple Devices</h3>
                  <p className="text-purple-300 mb-3">
                    Once you set up 2FA using this web app, the same authenticator app works everywhere:
                  </p>
                  <ul className="space-y-2 text-purple-300">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">✓</span>
                      <span><strong>Web App:</strong> When logging in from any browser, open Google Authenticator on your phone to get the code</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">✓</span>
                      <span><strong>Mobile App:</strong> When logging in on the SoundBridge mobile app, use the same Google Authenticator code</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">✓</span>
                      <span><strong>One Setup, Everywhere:</strong> You only need to scan the QR code once, and it works for all devices</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Warnings */}
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-red-400 font-bold text-lg mb-2">⚠️ Important Warnings</h3>
                  <ul className="space-y-3 text-red-300">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">1.</span>
                      <div>
                        <strong>Don't Lose Your Phone:</strong> If you lose access to your authenticator app, you'll need your backup codes to log in. Without them, you could be locked out permanently.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">2.</span>
                      <div>
                        <strong>Save Backup Codes Immediately:</strong> You can only see your backup codes once after setup. If you skip saving them, you'll need to regenerate new ones while logged in.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">3.</span>
                      <div>
                        <strong>Each Backup Code Works Once:</strong> Once you use a backup code to log in, it becomes invalid. Always regenerate new codes when you're running low.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">4.</span>
                      <div>
                        <strong>Keep Codes Secure:</strong> Treat backup codes like passwords. Anyone with your backup codes can bypass 2FA and access your account.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1 font-bold">5.</span>
                      <div>
                        <strong>Changing Phones?</strong> Before wiping your old phone, either:
                        <ul className="mt-2 ml-4 space-y-1">
                          <li>• Transfer your authenticator app to your new phone (most apps support this)</li>
                          <li>• Disable 2FA on SoundBridge, then re-enable it on your new phone</li>
                          <li>• Have your backup codes ready to log in with your new phone</li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-bold text-lg mb-3">Troubleshooting</h3>
              <div className="space-y-3 text-white/70">
                <div>
                  <p className="font-bold text-white mb-1">❓ Can't scan the QR code?</p>
                  <p>Use the manual entry option. Copy the secret key and enter it manually in your authenticator app.</p>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">❓ Code not working?</p>
                  <p>Make sure your phone's time is set correctly. Authenticator codes are time-based and won't work if your phone's clock is off.</p>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">❓ Lost your phone?</p>
                  <p>Use one of your backup codes to log in. Once logged in, you can disable 2FA and set it up again with a new device.</p>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">❓ Used all backup codes?</p>
                  <p>Log in with your authenticator app and regenerate new backup codes immediately from this page.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

