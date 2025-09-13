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

interface NotificationSettings {
  email: {
    newFollowers: boolean;
    newLikes: boolean;
    newComments: boolean;
    newMessages: boolean;
    eventReminders: boolean;
    weeklyDigest: boolean;
  };
  push: {
    newFollowers: boolean;
    newLikes: boolean;
    newComments: boolean;
    newMessages: boolean;
    eventReminders: boolean;
  };
  inApp: {
    newFollowers: boolean;
    newLikes: boolean;
    newComments: boolean;
    newMessages: boolean;
    eventReminders: boolean;
  };
}

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      newFollowers: true,
      newLikes: true,
      newComments: true,
      newMessages: true,
      eventReminders: true,
      weeklyDigest: false
    },
    push: {
      newFollowers: true,
      newLikes: true,
      newComments: false,
      newMessages: true,
      eventReminders: true
    },
    inApp: {
      newFollowers: true,
      newLikes: true,
      newComments: true,
      newMessages: true,
      eventReminders: true
    }
  });

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
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert('New passwords do not match');
        return;
      }
      console.log('Changing password:', passwordData);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      // Show success message
    } catch (error) {
      console.error('Error changing password:', error);
      // Show error message
    }
  };

  const handleToggleTwoFactor = async () => {
    try {
      setSecuritySettings(prev => ({
        ...prev,
        twoFactorEnabled: !prev.twoFactorEnabled
      }));
      // Here you would typically make an API call to enable/disable 2FA
      console.log('Toggling 2FA:', !securitySettings.twoFactorEnabled);
    } catch (error) {
      console.error('Error toggling 2FA:', error);
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
  };

  const handleNotificationChange = (type: keyof NotificationSettings, setting: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [setting]: value
      }
    }));
  };

  const handlePrivacyChange = (setting: keyof PrivacySettings, value: any) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
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
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input pr-10"
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input pr-10"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={passwordData.confirmPassword}
              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
            />
          </div>
          <button onClick={handleChangePassword} className="btn-primary">
            <Key size={16} />
            Change Password
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
      {/* Two-Factor Authentication */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Two-Factor Authentication</h3>
          <button
            onClick={handleToggleTwoFactor}
            className={`btn-toggle ${securitySettings.twoFactorEnabled ? 'enabled' : ''}`}
          >
            {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-gray-400">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
          {!securitySettings.twoFactorEnabled && (
            <button className="btn-primary">
              <Shield size={16} />
              Set Up Two-Factor Authentication
            </button>
          )}
        </div>
      </div>

      {/* Login Alerts */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Login Alerts</h3>
          <button
            onClick={() => setSecuritySettings(prev => ({ ...prev, loginAlerts: !prev.loginAlerts }))}
            className={`btn-toggle ${securitySettings.loginAlerts ? 'enabled' : ''}`}
          >
            {securitySettings.loginAlerts ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <p className="text-gray-400">
          Get notified when someone logs into your account from a new device or location.
        </p>
      </div>

      {/* Session Management */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Session Management</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Active Sessions</div>
              <div className="text-sm text-gray-400">{securitySettings.activeSessions} devices</div>
            </div>
            <button className="btn-secondary">View All</button>
          </div>
          <div className="form-group">
            <label className="form-label">Session Timeout (minutes)</label>
            <select
              className="form-input"
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={0}>Never</option>
            </select>
          </div>
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

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Email Notifications</h3>
        </div>
        <div className="space-y-4">
          {Object.entries(notificationSettings.email).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
                <div className="text-sm text-gray-400">
                  Receive email notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </div>
              </div>
              <button
                onClick={() => handleNotificationChange('email', key, !value)}
                className={`btn-toggle ${value ? 'enabled' : ''}`}
              >
                {value ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Push Notifications</h3>
        </div>
        <div className="space-y-4">
          {Object.entries(notificationSettings.push).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
                <div className="text-sm text-gray-400">
                  Receive push notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </div>
              </div>
              <button
                onClick={() => handleNotificationChange('push', key, !value)}
                className={`btn-toggle ${value ? 'enabled' : ''}`}
              >
                {value ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">In-App Notifications</h3>
        </div>
        <div className="space-y-4">
          {Object.entries(notificationSettings.inApp).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
                <div className="text-sm text-gray-400">
                  Show in-app notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </div>
              </div>
              <button
                onClick={() => handleNotificationChange('inApp', key, !value)}
                className={`btn-toggle ${value ? 'enabled' : ''}`}
              >
                {value ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      {/* Profile Privacy */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Profile Privacy</h3>
        </div>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Profile Visibility</label>
            <select
              className="form-input"
              value={privacySettings.profileVisibility}
              onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
            >
              <option value="public">Public</option>
              <option value="followers">Followers Only</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Show Email</div>
              <div className="text-sm text-gray-400">Display your email on your profile</div>
            </div>
            <button
              onClick={() => handlePrivacyChange('showEmail', !privacySettings.showEmail)}
              className={`btn-toggle ${privacySettings.showEmail ? 'enabled' : ''}`}
            >
              {privacySettings.showEmail ? 'Public' : 'Private'}
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
            >
              {privacySettings.showPhone ? 'Public' : 'Private'}
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
            >
              {privacySettings.allowMessages ? 'Allowed' : 'Blocked'}
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
            >
              {privacySettings.allowComments ? 'Allowed' : 'Blocked'}
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
            >
              {privacySettings.showOnlineStatus ? 'Visible' : 'Hidden'}
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
            >
              {privacySettings.showListeningActivity ? 'Visible' : 'Hidden'}
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
            onClick={() => setActiveTab('notifications')}
            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          >
            <Bell size={16} />
            Notifications
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
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
          {activeTab === 'app' && renderAppTab()}
        </div>
      </main>
    </div>
  );
}
