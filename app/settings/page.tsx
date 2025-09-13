'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { dashboardService } from '@/src/lib/dashboard-service';
import {
  User,
  Settings,
  Bell,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Globe,
  Palette,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Monitor,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Edit3,
  Camera,
  Key,
  Smartphone,
  Shield as ShieldIcon,
  Activity,
  Zap,
  Database,
  HardDrive,
  Wifi,
  WifiOff,
  Users,
  MessageSquare,
  Heart,
  Share2,
  Calendar,
  MapPin,
  Clock,
  Star,
  Award,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Flag,
  HelpCircle,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus
} from 'lucide-react';

// NotificationSettings interface removed - now handled by dedicated notifications page

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
  sessionTimeout: number;
  passwordLastChanged: string;
  activeSessions: number;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'followers';
  showEmail: boolean;
  showPhone: boolean;
  allowMessages: boolean;
  allowComments: boolean;
  showOnlineStatus: boolean;
  showListeningActivity: boolean;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [is2FASetupOpen, setIs2FASetupOpen] = useState(false);
  const [is2FASetupLoading, setIs2FASetupLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [is2FAVerifying, setIs2FAVerifying] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [twoFASuccess, setTwoFASuccess] = useState(false);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const [isLoginAlertsLoading, setIsLoginAlertsLoading] = useState(false);
  const [loginAlertsError, setLoginAlertsError] = useState<string | null>(null);
  const [recentLogins, setRecentLogins] = useState<any[]>([]);
  const [isRecentLoginsLoading, setIsRecentLoginsLoading] = useState(false);
  const [showRecentLogins, setShowRecentLogins] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<any[]>([]);
  const [isSessionDetailsLoading, setIsSessionDetailsLoading] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [isSessionTimeoutLoading, setIsSessionTimeoutLoading] = useState(false);
  const [sessionTimeoutError, setSessionTimeoutError] = useState<string | null>(null);
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  const [accountData, setAccountData] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    displayName: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    language: 'English',
    timezone: 'UTC',
    currency: 'GBP'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // notificationSettings state removed - now handled by dedicated notifications page

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: 30,
    passwordLastChanged: '2024-01-15',
    activeSessions: 2
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    allowComments: true,
    showOnlineStatus: true,
    showListeningActivity: true
  });

  const [appSettings, setAppSettings] = useState({
    theme: 'dark',
    autoPlay: true,
    audioQuality: 'high',
    downloadQuality: 'high',
    autoSync: true,
    dataUsage: 'unlimited'
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      setAccountData(prev => ({
        ...prev,
        email: user.email || '',
        phone: user.phone || ''
      }));
      
      // Load session details on mount
      handleLoadSessionDetails();
      
      // Load privacy settings on mount
      handleLoadPrivacySettings();
    }
  }, [user]);

  const handleSaveAccount = async () => {
    try {
      console.log('Saving account settings:', accountData);
      setIsEditing(false);
      // Show success message
    } catch (error) {
      console.error('Error saving account settings:', error);
      // Show error message
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsChangingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(false);

      // Client-side validation
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setPasswordError('All password fields are required');
        setIsChangingPassword(false);
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match');
        setIsChangingPassword(false);
        return;
      }

      if (passwordData.newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        setIsChangingPassword(false);
        return;
      }

      // Call the API endpoint
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPasswordError(data.error || 'Failed to change password');
        setIsChangingPassword(false);
        return;
      }

      // Success
      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setPasswordSuccess(false);
      }, 5000);

    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSetupTwoFactor = async () => {
    try {
      setIs2FASetupLoading(true);
      setTwoFAError(null);
      setQrCodeUrl(null);
      setTwoFASecret(null);

      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setTwoFAError(data.error || 'Failed to setup 2FA');
        setIs2FASetupLoading(false);
        return;
      }

      setQrCodeUrl(data.qrCode);
      setTwoFASecret(data.secret);
      setIs2FASetupOpen(true);
      setIs2FASetupLoading(false);

    } catch (error) {
      console.error('Error setting up 2FA:', error);
      setTwoFAError('An unexpected error occurred. Please try again.');
      setIs2FASetupLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    try {
      setIs2FAVerifying(true);
      setTwoFAError(null);
      setTwoFASuccess(false);

      if (!twoFAToken || !twoFASecret) {
        setTwoFAError('Please enter the verification code');
        setIs2FAVerifying(false);
        return;
      }

      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: twoFAToken,
          secret: twoFASecret
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setTwoFAError(data.error || 'Failed to verify 2FA code');
        setIs2FAVerifying(false);
        return;
      }

      // Enable 2FA
      await handleToggleTwoFactor(true);
      setTwoFASuccess(true);
      setIs2FASetupOpen(false);
      setTwoFAToken('');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setTwoFASuccess(false);
      }, 5000);

    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setTwoFAError('An unexpected error occurred. Please try again.');
    } finally {
      setIs2FAVerifying(false);
    }
  };

  const handleToggleTwoFactor = async (enabled?: boolean) => {
    try {
      const newStatus = enabled !== undefined ? enabled : !securitySettings.twoFactorEnabled;
      
      const response = await fetch('/api/auth/2fa/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: newStatus
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to update 2FA status:', data.error);
        return;
      }

      setSecuritySettings(prev => ({
        ...prev,
        twoFactorEnabled: newStatus
      }));

      console.log('2FA status updated:', newStatus);
    } catch (error) {
      console.error('Error toggling 2FA:', error);
    }
  };

  const handleCancelTwoFactorSetup = () => {
    setIs2FASetupOpen(false);
    setQrCodeUrl(null);
    setTwoFASecret(null);
    setTwoFAToken('');
    setTwoFAError(null);
  };

  const handleToggleLoginAlerts = async () => {
    try {
      setIsLoginAlertsLoading(true);
      setLoginAlertsError(null);

      const newStatus = !loginAlertsEnabled;

      const response = await fetch('/api/auth/login-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: newStatus,
          emailNotifications: newStatus,
          pushNotifications: newStatus
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setLoginAlertsError(data.error || 'Failed to update login alerts');
        setIsLoginAlertsLoading(false);
        return;
      }

      setLoginAlertsEnabled(newStatus);
      setIsLoginAlertsLoading(false);

    } catch (error) {
      console.error('Error toggling login alerts:', error);
      setLoginAlertsError('An unexpected error occurred. Please try again.');
      setIsLoginAlertsLoading(false);
    }
  };

  const handleViewRecentLogins = async () => {
    try {
      setIsRecentLoginsLoading(true);
      setShowRecentLogins(true);

      const response = await fetch('/api/auth/recent-logins');

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to fetch recent logins:', data.error);
        return;
      }

      setRecentLogins(data.sessions);
      setIsRecentLoginsLoading(false);

    } catch (error) {
      console.error('Error fetching recent logins:', error);
      setIsRecentLoginsLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/auth/recent-logins', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to terminate session:', data.error);
        return;
      }

      // Remove the session from the list
      setRecentLogins(prev => prev.filter(session => session.id !== sessionId));
      setSessionDetails(prev => prev.filter(session => session.id !== sessionId));

    } catch (error) {
      console.error('Error terminating session:', error);
    }
  };

  const handleLoadSessionDetails = async () => {
    try {
      setIsSessionDetailsLoading(true);
      setSessionTimeoutError(null);

      const response = await fetch('/api/auth/session-details');

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSessionTimeoutError(data.error || 'Failed to load session details');
        setIsSessionDetailsLoading(false);
        return;
      }

      setSessionDetails(data.sessions);
      setIsSessionDetailsLoading(false);

    } catch (error) {
      console.error('Error loading session details:', error);
      setSessionTimeoutError('An unexpected error occurred. Please try again.');
      setIsSessionDetailsLoading(false);
    }
  };

  const handleUpdateSessionTimeout = async (newTimeout: number) => {
    try {
      setIsSessionTimeoutLoading(true);
      setSessionTimeoutError(null);

      const response = await fetch('/api/auth/session-timeout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeoutMinutes: newTimeout,
          autoLogout: true,
          warningTime: 5
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSessionTimeoutError(data.error || 'Failed to update session timeout');
        setIsSessionTimeoutLoading(false);
        return;
      }

      setSessionTimeout(newTimeout);
      setIsSessionTimeoutLoading(false);

    } catch (error) {
      console.error('Error updating session timeout:', error);
      setSessionTimeoutError('An unexpected error occurred. Please try again.');
      setIsSessionTimeoutLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!isDeletingAccount) {
      setIsDeletingAccount(true);
      return;
    }

    try {
      if (!user) {
        console.error('No user found');
        setIsDeletingAccount(false);
        return;
      }

      console.log('🗑️ Deleting account for user:', user.id);
      
      const { error } = await dashboardService.deleteUserAccount(user.id);
      
      if (error) {
        console.error('Error deleting account:', error);
        alert(`Failed to delete account: ${error}`);
        setIsDeletingAccount(false);
        return;
      }

      console.log('✅ Account deleted successfully');
      
      // Sign out and redirect
      await signOut();
      router.push('/');
      
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setAccountData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error message when user starts typing
    if (passwordError) {
      setPasswordError(null);
    }
  };

  // handleNotificationChange function removed - now handled by dedicated notifications page

  const handleLoadPrivacySettings = async () => {
    try {
      setIsPrivacyLoading(true);
      setPrivacyError(null);

      const response = await fetch('/api/user/privacy-settings');

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to load privacy settings:', data.error);
        setIsPrivacyLoading(false);
        return;
      }

      setPrivacySettings(data.settings);
      setIsPrivacyLoading(false);

    } catch (error) {
      console.error('Error loading privacy settings:', error);
      setIsPrivacyLoading(false);
    }
  };

  const handlePrivacyChange = async (setting: keyof PrivacySettings, value: any) => {
    try {
      setIsPrivacyLoading(true);
      setPrivacyError(null);
      setPrivacySuccess(false);

      // Update local state immediately for better UX
      setPrivacySettings(prev => ({
        ...prev,
        [setting]: value
      }));

      const updatedSettings = {
        ...privacySettings,
        [setting]: value
      };

      const response = await fetch('/api/user/privacy-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPrivacyError(data.error || 'Failed to update privacy settings');
        // Revert local state on error
        setPrivacySettings(privacySettings);
        setIsPrivacyLoading(false);
        return;
      }

      setPrivacySettings(data.settings);
      setPrivacySuccess(true);
      setIsPrivacyLoading(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setPrivacySuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error updating privacy settings:', error);
      setPrivacyError('An unexpected error occurred. Please try again.');
      // Revert local state on error
      setPrivacySettings(privacySettings);
      setIsPrivacyLoading(false);
    }
  };

  const handleAppSettingChange = (setting: string, value: any) => {
    setAppSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Profile Information</h3>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="btn-primary">
              <Edit3 size={16} />
              Edit
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              value={accountData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={accountData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={accountData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              className="form-input"
              value={accountData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              className="form-textarea"
              value={accountData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              disabled={!isEditing}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={accountData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input
              type="url"
              className="form-input"
              value={accountData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          {isEditing && (
            <div className="flex gap-3">
              <button onClick={handleSaveAccount} className="btn-primary">
                <Save size={16} />
                Save Changes
              </button>
              <button onClick={() => setIsEditing(false)} className="btn-secondary">
                <X size={16} />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Change Password</h3>
        </div>
        <div className="space-y-4">
          {/* Error Message */}
          {passwordError && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-300 text-sm">{passwordError}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {passwordSuccess && (
            <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-300 text-sm">Password changed successfully!</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input pr-10"
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                disabled={isChangingPassword}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isChangingPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="form-input pr-10"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                disabled={isChangingPassword}
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isChangingPassword}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Password must be at least 8 characters long
            </p>
          </div>
          
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div className="relative">
            <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input pr-10"
              value={passwordData.confirmPassword}
              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                disabled={isChangingPassword}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isChangingPassword}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
          </div>
          </div>
          
          <button 
            onClick={handleChangePassword} 
            className="btn-primary w-full flex items-center justify-center space-x-2"
            disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            {isChangingPassword ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Changing Password...</span>
              </>
            ) : (
              <>
            <Key size={16} />
                <span>Change Password</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Preferences</h3>
        </div>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Language</label>
            <select
              className="form-input"
              value={accountData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Portuguese">Portuguese</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Timezone</label>
            <select
              className="form-input"
              value={accountData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
            >
              <option value="UTC">UTC</option>
              <option value="GMT">GMT</option>
              <option value="EST">EST</option>
              <option value="PST">PST</option>
              <option value="CET">CET</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              className="form-input"
              value={accountData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
            >
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="NGN">NGN (₦)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Notification Preferences</h3>
          <Link href="/notifications" className="btn-primary">
            <Bell size={16} />
            Manage All Notifications
          </Link>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-700/20 rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium text-white">Quick Overview</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400">Email Notifications:</span>
                <span className="text-green-400 ml-2">Enabled</span>
              </div>
              <div>
                <span className="text-gray-400">Push Notifications:</span>
                <span className="text-green-400 ml-2">Enabled</span>
              </div>
              <div>
                <span className="text-gray-400">In-App Notifications:</span>
                <span className="text-green-400 ml-2">Enabled</span>
              </div>
              <div>
                <span className="text-gray-400">Event Reminders:</span>
                <span className="text-green-400 ml-2">Enabled</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 pt-2">
              Click "Manage All Notifications" to customize your notification preferences, 
              set quiet hours, and configure location-based notifications.
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-500">
        <div className="card-header">
          <h3 className="card-title text-red-500">Danger Zone</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Delete Account</div>
              <div className="text-sm text-gray-400">
                Permanently delete your account and all associated data
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              className={`btn-danger ${isDeletingAccount ? 'confirming' : ''}`}
            >
              {isDeletingAccount ? (
                <>
                  <AlertTriangle size={16} />
                  Click again to confirm
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      {/* Success Message */}
      {twoFASuccess && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-300 text-sm">Two-Factor Authentication enabled successfully!</span>
          </div>
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Two-Factor Authentication</h3>
          <button
            onClick={() => handleToggleTwoFactor()}
            className={`btn-toggle ${securitySettings.twoFactorEnabled ? 'enabled' : ''}`}
            disabled={is2FASetupOpen}
          >
            {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-gray-400">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
          
          {/* Error Message */}
          {twoFAError && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-300 text-sm">{twoFAError}</span>
              </div>
            </div>
          )}

          {!securitySettings.twoFactorEnabled && !is2FASetupOpen && (
            <button 
              onClick={handleSetupTwoFactor}
              className="btn-primary"
              disabled={is2FASetupLoading}
            >
              {is2FASetupLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Setting up 2FA...</span>
                </>
              ) : (
                <>
              <Shield size={16} />
              Set Up Two-Factor Authentication
                </>
              )}
            </button>
          )}

          {/* 2FA Setup Modal */}
          {is2FASetupOpen && (
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">Set Up Two-Factor Authentication</h4>
                <button
                  onClick={handleCancelTwoFactorSetup}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
        </div>
              
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                </p>
                
                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 bg-white p-2 rounded-lg" />
                  </div>
                )}
                
                {twoFASecret && (
                  <div className="space-y-2">
                    <p className="text-gray-300 text-sm">Or enter this code manually:</p>
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <code className="text-white font-mono text-sm break-all">{twoFASecret}</code>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="form-label">Enter verification code from your app:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={twoFAToken}
                    onChange={(e) => {
                      setTwoFAToken(e.target.value);
                      if (twoFAError) {
                        setTwoFAError(null);
                      }
                    }}
                    placeholder="000000"
                    maxLength={6}
                    disabled={is2FAVerifying}
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleVerifyTwoFactor}
                    className="btn-primary flex-1"
                    disabled={is2FAVerifying || !twoFAToken}
                  >
                    {is2FAVerifying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span>Verify & Enable</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelTwoFactorSetup}
                    className="btn-secondary"
                    disabled={is2FAVerifying}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Login Alerts */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Login Alerts</h3>
          <button
            onClick={handleToggleLoginAlerts}
            className={`btn-toggle ${loginAlertsEnabled ? 'enabled' : ''}`}
            disabled={isLoginAlertsLoading}
          >
            {isLoginAlertsLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : loginAlertsEnabled ? (
              'Enabled'
            ) : (
              'Disabled'
            )}
          </button>
        </div>
        <div className="space-y-4">
        <p className="text-gray-400">
          Get notified when someone logs into your account from a new device or location.
        </p>
          
          {/* Error Message */}
          {loginAlertsError && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-300 text-sm">{loginAlertsError}</span>
              </div>
            </div>
          )}

          {loginAlertsEnabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Active Sessions</div>
                  <div className="text-sm text-gray-400">Manage your active login sessions</div>
                </div>
                <button 
                  onClick={handleViewRecentLogins}
                  className="btn-secondary"
                  disabled={isRecentLoginsLoading}
                >
                  {isRecentLoginsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    'View All'
                  )}
                </button>
              </div>

              {/* Recent Logins Modal */}
              {showRecentLogins && (
                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-white">Active Sessions</h4>
                    <button
                      onClick={() => setShowRecentLogins(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(sessionDetails.length > 0 ? sessionDetails : recentLogins).map((session) => (
                      <div key={session.id} className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${session.isCurrent ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                            <div>
                              <div className="font-medium text-white">{session.device || session.browser}</div>
                              <div className="text-sm text-gray-400">{session.location}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-300">
                              {new Date(session.loginTime || session.timestamp).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(session.loginTime || session.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-400">IP:</span>
                            <span className="text-white ml-1">{session.ipAddress}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white ml-1">{session.sessionDuration || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Browser:</span>
                            <span className="text-white ml-1">{session.browser || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">OS:</span>
                            <span className="text-white ml-1">{session.os || 'Unknown'}</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Last activity: {new Date(session.lastActivity || session.timestamp).toLocaleString()}
                        </div>
                        
                        {!session.isCurrent && (
                          <button
                            onClick={() => handleTerminateSession(session.id)}
                            className="btn-danger text-xs px-3 py-1"
                          >
                            Terminate Session
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Session Management */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Session Management</h3>
        </div>
        <div className="space-y-4">
          {/* Error Message */}
          {sessionTimeoutError && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-300 text-sm">{sessionTimeoutError}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Active Sessions</div>
              <div className="text-sm text-gray-400">
                {sessionDetails.length > 0 ? sessionDetails.filter(s => s.isCurrent).length : 0} devices
              </div>
            </div>
            <button 
              onClick={handleViewRecentLogins}
              className="btn-secondary"
              disabled={isRecentLoginsLoading || isSessionDetailsLoading}
            >
              {(isRecentLoginsLoading || isSessionDetailsLoading) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </>
              ) : (
                'View All'
              )}
            </button>
          </div>

          {/* Session Details Preview */}
          {sessionDetails.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-white">Recent Sessions</div>
              {sessionDetails.slice(0, 2).map((session) => (
                <div key={session.id} className="bg-gray-700/30 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${session.isCurrent ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <span className="text-white text-sm">{session.device}</span>
                    </div>
                    <span className="text-xs text-gray-400">{session.sessionDuration}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {session.location} • {session.ipAddress}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last active: {new Date(session.lastActivity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Session Timeout (minutes)</label>
            <select
              className="form-input"
              value={sessionTimeout}
              onChange={(e) => {
                const newTimeout = parseInt(e.target.value);
                setSessionTimeout(newTimeout);
                handleUpdateSessionTimeout(newTimeout);
              }}
              disabled={isSessionTimeoutLoading}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={0}>Never</option>
            </select>
            {isSessionTimeoutLoading && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span className="text-xs text-gray-400">Updating timeout...</span>
              </div>
            )}
          </div>

          {/* Session Statistics */}
          {sessionDetails.length > 0 && (
            <div className="bg-gray-700/20 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-white">Session Statistics</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Total Sessions:</span>
                  <span className="text-white ml-2">{sessionDetails.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Active Now:</span>
                  <span className="text-green-400 ml-2">{sessionDetails.filter(s => s.isCurrent).length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Longest Session:</span>
                  <span className="text-white ml-2">
                    {sessionDetails.reduce((max, session) => {
                      const duration = session.sessionDuration;
                      return duration > max ? duration : max;
                    }, '0h 0m')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Current Timeout:</span>
                  <span className="text-white ml-2">{sessionTimeout} min</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Password Information</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Last changed:</span>
            <span className="text-white">{securitySettings.passwordLastChanged}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Password strength:</span>
            <span className="text-green-500">Strong</span>
          </div>
        </div>
      </div>
    </div>
  );

  // renderNotificationsTab function removed - now handled by dedicated notifications page

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      {/* Success Message */}
      {privacySuccess && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-300 text-sm">Privacy settings updated successfully!</span>
          </div>
        </div>
      )}

      {/* Profile Privacy */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Profile Privacy</h3>
        </div>
        <div className="space-y-4">
          {/* Error Message */}
          {privacyError && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-300 text-sm">{privacyError}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Profile Visibility</label>
            <select
              className="form-input"
              value={privacySettings.profileVisibility}
              onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
              disabled={isPrivacyLoading}
            >
              <option value="public">Public - Anyone can view your profile</option>
              <option value="followers">Followers Only - Only your followers can view your profile</option>
              <option value="private">Private - Only you can view your profile</option>
            </select>
            {isPrivacyLoading && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span className="text-xs text-gray-400">Updating privacy settings...</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Show Email</div>
              <div className="text-sm text-gray-400">Display your email on your profile</div>
            </div>
            <button
              onClick={() => handlePrivacyChange('showEmail', !privacySettings.showEmail)}
              className={`btn-toggle ${privacySettings.showEmail ? 'enabled' : ''}`}
              disabled={isPrivacyLoading}
            >
              {isPrivacyLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : privacySettings.showEmail ? (
                'Public'
              ) : (
                'Private'
              )}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Show Phone</div>
              <div className="text-sm text-gray-400">Display your phone number on your profile</div>
            </div>
            <button
              onClick={() => handlePrivacyChange('showPhone', !privacySettings.showPhone)}
              className={`btn-toggle ${privacySettings.showPhone ? 'enabled' : ''}`}
              disabled={isPrivacyLoading}
            >
              {isPrivacyLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : privacySettings.showPhone ? (
                'Public'
              ) : (
                'Private'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Interaction Privacy */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Interaction Privacy</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Allow Messages</div>
              <div className="text-sm text-gray-400">Let other users send you messages</div>
            </div>
            <button
              onClick={() => handlePrivacyChange('allowMessages', !privacySettings.allowMessages)}
              className={`btn-toggle ${privacySettings.allowMessages ? 'enabled' : ''}`}
              disabled={isPrivacyLoading}
            >
              {isPrivacyLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : privacySettings.allowMessages ? (
                'Allowed'
              ) : (
                'Blocked'
              )}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Allow Comments</div>
              <div className="text-sm text-gray-400">Let other users comment on your content</div>
            </div>
            <button
              onClick={() => handlePrivacyChange('allowComments', !privacySettings.allowComments)}
              className={`btn-toggle ${privacySettings.allowComments ? 'enabled' : ''}`}
              disabled={isPrivacyLoading}
            >
              {isPrivacyLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : privacySettings.allowComments ? (
                'Allowed'
              ) : (
                'Blocked'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Activity Privacy */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Activity Privacy</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Show Online Status</div>
              <div className="text-sm text-gray-400">Let others see when you're online</div>
            </div>
            <button
              onClick={() => handlePrivacyChange('showOnlineStatus', !privacySettings.showOnlineStatus)}
              className={`btn-toggle ${privacySettings.showOnlineStatus ? 'enabled' : ''}`}
              disabled={isPrivacyLoading}
            >
              {isPrivacyLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : privacySettings.showOnlineStatus ? (
                'Visible'
              ) : (
                'Hidden'
              )}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Show Listening Activity</div>
              <div className="text-sm text-gray-400">Let others see what you're listening to</div>
            </div>
            <button
              onClick={() => handlePrivacyChange('showListeningActivity', !privacySettings.showListeningActivity)}
              className={`btn-toggle ${privacySettings.showListeningActivity ? 'enabled' : ''}`}
              disabled={isPrivacyLoading}
            >
              {isPrivacyLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : privacySettings.showListeningActivity ? (
                'Visible'
              ) : (
                'Hidden'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppTab = () => (
    <div className="space-y-6">
      {/* Appearance */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Theme</label>
            <select
              className="form-input"
              value={appSettings.theme}
              onChange={(e) => handleAppSettingChange('theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audio Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Audio Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Auto-play</div>
              <div className="text-sm text-gray-400">Automatically play tracks when selected</div>
            </div>
            <button
              onClick={() => handleAppSettingChange('autoPlay', !appSettings.autoPlay)}
              className={`btn-toggle ${appSettings.autoPlay ? 'enabled' : ''}`}
            >
              {appSettings.autoPlay ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Audio Quality</label>
            <select
              className="form-input"
              value={appSettings.audioQuality}
              onChange={(e) => handleAppSettingChange('audioQuality', e.target.value)}
            >
              <option value="low">Low (64kbps)</option>
              <option value="medium">Medium (128kbps)</option>
              <option value="high">High (320kbps)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data & Storage */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Data & Storage</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Auto-sync</div>
              <div className="text-sm text-gray-400">Automatically sync your data across devices</div>
            </div>
            <button
              onClick={() => handleAppSettingChange('autoSync', !appSettings.autoSync)}
              className={`btn-toggle ${appSettings.autoSync ? 'enabled' : ''}`}
            >
              {appSettings.autoSync ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Data Usage</label>
            <select
              className="form-input"
              value={appSettings.dataUsage}
              onChange={(e) => handleAppSettingChange('dataUsage', e.target.value)}
            >
              <option value="low">Low (WiFi only)</option>
              <option value="medium">Medium (WiFi + Cellular)</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
        </div>
      </div>

    </div>
  );


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Main Content */}
      <main className="main-container">
        {/* Settings Header */}
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your account preferences and security settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('account')}
            className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
          >
            <User size={16} />
            Account
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          >
            <Shield size={16} />
            Security
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
          >
            <Lock size={16} />
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('app')}
            className={`tab-button ${activeTab === 'app' ? 'active' : ''}`}
          >
            <Settings size={16} />
            App
          </button>
          <a
            href="/settings/social-connections"
            className="tab-button"
            style={{ textDecoration: 'none' }}
          >
            <Share2 size={16} />
            Social Connections
          </a>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'account' && renderAccountTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
          {activeTab === 'app' && renderAppTab()}
        </div>
      </main>
    </div>
  );
}
