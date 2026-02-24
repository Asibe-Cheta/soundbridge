'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  MapPin,
  Clock,
  Mail,
  Smartphone,
  Music,
  Users,
  Heart,
  CheckCircle as Check,
  ChevronRight,
  MapPin as Map,
  Radio,
  Mic,
  Guitar,
  Drum,
  Headphones,
  Church,
  PartyPopper,
  TrendingUp,
  UserPlus,
  MessageSquare,
  Share2,
  Zap,
  Moon,
  Save,
  Loader2
} from 'lucide-react';
import { useNotificationPreferences, NotificationPreferences } from '../../src/hooks/useNotificationPreferences';

interface NotificationSettings {
  locationRadius: number;
  eventCategories: string[];
  notificationTiming: string;
  deliveryMethods: string[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  creatorActivity: boolean;
  socialNotifications: {
    follows: boolean;
    messages: boolean;
    collaborations: boolean;
    likes: boolean;
    shares: boolean;
  };
  collaborationRequests: {
    newRequests: boolean;
    requestUpdates: boolean;
    requestReminders: boolean;
    deliveryMethods: string[];
  };
}

const eventCategories = [
  { id: 'christian', name: 'Christian Events', icon: Church, color: '#059669' },
  { id: 'secular', name: 'Secular Music', icon: Music, color: '#DC2626' },
  { id: 'carnival', name: 'Carnival', icon: PartyPopper, color: '#EA580C' },
  { id: 'gospel', name: 'Gospel', icon: Church, color: '#7C3AED' },
  { id: 'afrobeats', name: 'Afrobeats', icon: Drum, color: '#EC4899' },
  { id: 'uk-drill', name: 'UK Drill', icon: TrendingUp, color: '#1F2937' },
  { id: 'highlife', name: 'Highlife', icon: Guitar, color: '#059669' },
  { id: 'jazz', name: 'Jazz', icon: Headphones, color: '#7C3AED' },
  { id: 'podcasts', name: 'Podcasts', icon: Mic, color: '#EA580C' },
  { id: 'live-music', name: 'Live Music', icon: Radio, color: '#DC2626' }
];

const timingOptions = [
  { id: 'immediate', label: 'Immediate', description: 'Get notified as soon as events are posted' },
  { id: '1-day', label: '1 Day Before', description: 'Receive notifications 24 hours before events' },
  { id: '3-days', label: '3 Days Before', description: 'Get notified 3 days in advance' },
  { id: '1-week', label: '1 Week Before', description: 'Weekly digest of upcoming events' }
];

const deliveryMethods = [
  { id: 'push', label: 'Push Notifications', icon: Bell, description: 'Instant notifications on your device' },
  { id: 'email', label: 'Email', icon: Mail, description: 'Daily or weekly email summaries' },
  { id: 'sms', label: 'SMS', icon: Smartphone, description: 'Text messages for urgent updates' }
];

export default function NotificationPreferencesPage() {
  const { preferences, loading, error, savePreferences, refreshPreferences } = useNotificationPreferences();
  const [activeSection, setActiveSection] = useState('location');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [urgentGigNotificationsEnabled, setUrgentGigNotificationsEnabled] = useState(true);
  const [urgentGigActionButtonsEnabled, setUrgentGigActionButtonsEnabled] = useState(true);
  const [urgentGigsPrefsLoading, setUrgentGigsPrefsLoading] = useState(false);
  const [urgentGigsPrefsSaving, setUrgentGigsPrefsSaving] = useState(false);

  // Use preferences from hook, with fallback defaults
  const settings: NotificationPreferences = preferences || {
    locationRadius: 10,
    eventCategories: ['christian', 'gospel', 'afrobeats'],
    notificationTiming: '1-day',
    deliveryMethods: ['push', 'email'],
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    },
    creatorActivity: true,
    socialNotifications: {
      follows: true,
      messages: true,
      collaborations: true,
      likes: false,
      shares: false
    },
    collaborationRequests: {
      newRequests: true,
      requestUpdates: true,
      requestReminders: true,
      deliveryMethods: ['push', 'email']
    }
  };

  // Save settings with auto-save functionality
  const saveSettings = async (section: string, data: any) => {
    setSaving(true);
    setSaveStatus('idle');
    
    try {
      const success = await savePreferences(section, data);
      if (success) {
        setSaveStatus('success');
        setSaveMessage(`${section} preferences saved successfully!`);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setSaveMessage('Failed to save preferences');
        setTimeout(() => setSaveStatus('idle'), 5000);
      }
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage('Error saving preferences');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (key: keyof NotificationPreferences, value: unknown) => {
    const newData = { [key]: value };
    await saveSettings('general', newData);
  };

  const updateSocialSettings = async (key: keyof NotificationPreferences['socialNotifications'], value: boolean) => {
    const newSocialNotifications = { ...settings.socialNotifications, [key]: value };
    await saveSettings('social', { socialNotifications: newSocialNotifications });
  };

  const updateCollaborationSettings = async (key: keyof NotificationPreferences['collaborationRequests'], value: boolean | string[]) => {
    const newCollaborationRequests = { ...settings.collaborationRequests, [key]: value };
    await saveSettings('collaboration-requests', { collaborationRequests: newCollaborationRequests });
  };

  const toggleCategory = async (categoryId: string) => {
    const newCategories = settings.eventCategories.includes(categoryId)
      ? settings.eventCategories.filter(id => id !== categoryId)
      : [...settings.eventCategories, categoryId];
    await saveSettings('categories', { eventCategories: newCategories });
  };

  const toggleDeliveryMethod = async (methodId: string) => {
    const newMethods = settings.deliveryMethods.includes(methodId)
      ? settings.deliveryMethods.filter(id => id !== methodId)
      : [...settings.deliveryMethods, methodId];
    await saveSettings('delivery', { deliveryMethods: newMethods });
  };

  // Load urgent gig prefs from /api/user/notification-preferences (mobile-aligned)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setUrgentGigsPrefsLoading(true);
      try {
        const res = await fetch('/api/user/notification-preferences');
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data) {
          setUrgentGigNotificationsEnabled(data.urgentGigNotificationsEnabled !== false);
          setUrgentGigActionButtonsEnabled(data.urgentGigActionButtonsEnabled !== false);
        }
      } finally {
        if (!cancelled) setUrgentGigsPrefsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const updateUrgentGigPref = async (key: 'urgentGigNotificationsEnabled' | 'urgentGigActionButtonsEnabled', value: boolean) => {
    const nextAlerts = key === 'urgentGigNotificationsEnabled' ? value : urgentGigNotificationsEnabled;
    const nextButtons = key === 'urgentGigActionButtonsEnabled' ? value : (nextAlerts ? urgentGigActionButtonsEnabled : false);
    setUrgentGigNotificationsEnabled(nextAlerts);
    setUrgentGigActionButtonsEnabled(nextButtons);
    setUrgentGigsPrefsSaving(true);
    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urgentGigNotificationsEnabled: nextAlerts,
          urgentGigActionButtonsEnabled: nextButtons,
        }),
      });
      if (!res.ok) {
        setUrgentGigNotificationsEnabled(urgentGigNotificationsEnabled);
        setUrgentGigActionButtonsEnabled(urgentGigActionButtonsEnabled);
      }
    } finally {
      setUrgentGigsPrefsSaving(false);
    }
  };

  const renderUrgentGigsSettings = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Zap size={20} />
        Urgent Gigs
      </h3>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>
        Control notifications for urgent gig opportunities and in-notification action buttons.
      </p>
      {urgentGigsPrefsLoading ? (
        <div style={{ color: '#999', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div>
              <div style={{ color: 'white', fontWeight: '600' }}>Urgent Gig Alerts</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Receive notifications when new urgent gigs match your availability</div>
            </div>
            <button
              onClick={() => updateUrgentGigPref('urgentGigNotificationsEnabled', !urgentGigNotificationsEnabled)}
              disabled={urgentGigsPrefsSaving}
              style={{
                width: '50px',
                height: '24px',
                background: urgentGigNotificationsEnabled ? 'linear-gradient(45deg, #DC2626, #EC4899)' : '#333',
                borderRadius: '12px',
                border: 'none',
                cursor: urgentGigsPrefsSaving ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: urgentGigNotificationsEnabled ? '26px' : '2px',
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '50%',
                transition: 'all 0.3s ease'
              }} />
            </button>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            background: !urgentGigNotificationsEnabled ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            opacity: !urgentGigNotificationsEnabled ? 0.6 : 1
          }}>
            <div>
              <div style={{ color: 'white', fontWeight: '600' }}>Notification Action Buttons</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Show quick actions (e.g. View, Respond) in urgent gig notifications</div>
            </div>
            <button
              onClick={() => urgentGigNotificationsEnabled && updateUrgentGigPref('urgentGigActionButtonsEnabled', !urgentGigActionButtonsEnabled)}
              disabled={urgentGigsPrefsSaving || !urgentGigNotificationsEnabled}
              style={{
                width: '50px',
                height: '24px',
                background: urgentGigActionButtonsEnabled ? 'linear-gradient(45deg, #DC2626, #EC4899)' : '#333',
                borderRadius: '12px',
                border: 'none',
                cursor: urgentGigNotificationsEnabled && !urgentGigsPrefsSaving ? 'pointer' : 'not-allowed',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: urgentGigActionButtonsEnabled ? '26px' : '2px',
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '50%',
                transition: 'all 0.3s ease'
              }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderLocationSettings = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={20} />
          Location Radius
        </h3>
        <p style={{ color: '#999', marginBottom: '1.5rem' }}>
          Choose how far from your location to receive event notifications
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 5, 10, 25].map((radius) => (
            <button
              key={radius}
              onClick={() => updateSettings('locationRadius', radius)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: settings.locationRadius === radius
                  ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => settings.locationRadius !== radius && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => settings.locationRadius !== radius && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MapPin size={20} />
                <span style={{ fontWeight: '600' }}>{radius}km radius</span>
              </div>
              {settings.locationRadius === radius && <Check size={20} />}
            </button>
          ))}
        </div>
      </div>

      {/* Map Preview */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Map size={20} />
          Coverage Area
        </h3>
        <div style={{
          height: '200px',
          background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${(settings.locationRadius / 25) * 200}px`,
            height: `${(settings.locationRadius / 25) * 200}px`,
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, rgba(220, 38, 38, 0.1) 70%, transparent 100%)',
            borderRadius: '50%',
            border: '2px solid rgba(236, 72, 153, 0.5)'
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '8px',
            height: '8px',
            background: '#EC4899',
            borderRadius: '50%',
            boxShadow: '0 0 10px rgba(236, 72, 153, 0.8)'
          }} />
          <div style={{ color: '#999', textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Your Location</div>
            <div style={{ fontSize: '0.8rem' }}>{settings.locationRadius}km coverage</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEventCategories = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Music size={20} />
        Event Categories
      </h3>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>
        Select which types of events you want to be notified about
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {eventCategories.map((category) => {
          const Icon = category.icon;
          const isSelected = settings.eventCategories.includes(category.id);

          return (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: isSelected
                  ? `linear-gradient(45deg, ${category.color}, ${category.color}dd)`
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isSelected ? category.color : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
            >
              <Icon size={20} style={{ color: isSelected ? 'white' : category.color }} />
              <span style={{ fontWeight: '600' }}>{category.name}</span>
              {isSelected && <Check size={16} style={{ marginLeft: 'auto' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTimingSettings = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={20} />
        Notification Timing
      </h3>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>
        Choose when you want to receive event notifications
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {timingOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => updateSettings('notificationTiming', option.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: settings.notificationTiming === option.id
                ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                : 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              width: '100%',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => settings.notificationTiming !== option.id && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => settings.notificationTiming !== option.id && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
          >
            <div>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{option.label}</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>{option.description}</div>
            </div>
            {settings.notificationTiming === option.id && <Check size={20} />}
          </button>
        ))}
      </div>
    </div>
  );

  const renderDeliveryMethods = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Zap size={20} />
        Delivery Methods
      </h3>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>
        Choose how you want to receive notifications
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {deliveryMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = settings.deliveryMethods.includes(method.id);

          return (
            <button
              key={method.id}
              onClick={() => toggleDeliveryMethod(method.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: isSelected
                  ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={20} />
                <div>
                  <div style={{ fontWeight: '600' }}>{method.label}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>{method.description}</div>
                </div>
              </div>
              {isSelected && <Check size={20} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderQuietHours = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Moon size={20} />
        Quiet Hours
      </h3>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>
        Set times when you don&apos;t want to receive notifications
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => updateSettings('quietHours', { ...settings.quietHours, enabled: !settings.quietHours.enabled })}
          style={{
            width: '50px',
            height: '24px',
            background: settings.quietHours.enabled ? 'linear-gradient(45deg, #DC2626, #EC4899)' : '#333',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '2px',
            left: settings.quietHours.enabled ? '26px' : '2px',
            width: '20px',
            height: '20px',
            background: 'white',
            borderRadius: '50%',
            transition: 'all 0.3s ease'
          }} />
        </button>
        <span style={{ color: 'white', fontWeight: '600' }}>
          {settings.quietHours.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {settings.quietHours.enabled && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div>
            <label style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
              Start Time
            </label>
            <input
              type="time"
              value={settings.quietHours.start}
              onChange={(e) => updateSettings('quietHours', { ...settings.quietHours, start: e.target.value })}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '0.5rem',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ color: '#999' }}>to</div>
          <div>
            <label style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
              End Time
            </label>
            <input
              type="time"
              value={settings.quietHours.end}
              onChange={(e) => updateSettings('quietHours', { ...settings.quietHours, end: e.target.value })}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '0.5rem',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderSocialNotifications = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Users size={20} />
        Social Notifications
      </h3>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>
        Manage notifications for social interactions
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          { key: 'follows', label: 'New Followers', icon: UserPlus, description: 'When someone follows you' },
          { key: 'messages', label: 'Messages', icon: MessageSquare, description: 'New messages and comments' },
          { key: 'collaborations', label: 'Collaborations', icon: Share2, description: 'Collaboration requests and updates' },
          { key: 'likes', label: 'Likes & Reactions', icon: Heart, description: 'When someone likes your content' },
          { key: 'shares', label: 'Shares & Reposts', icon: Share2, description: 'When your content is shared' }
        ].map((item) => {
          const Icon = item.icon;
          const isEnabled = settings.socialNotifications[item.key as keyof typeof settings.socialNotifications];

          return (
            <div key={item.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={20} style={{ color: '#EC4899' }} />
                <div>
                  <div style={{ color: 'white', fontWeight: '600' }}>{item.label}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>{item.description}</div>
                </div>
              </div>
              <button
                onClick={() => updateSocialSettings(item.key as keyof typeof settings.socialNotifications, !isEnabled)}
                style={{
                  width: '50px',
                  height: '24px',
                  background: isEnabled ? 'linear-gradient(45deg, #DC2626, #EC4899)' : '#333',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: isEnabled ? '26px' : '2px',
                  width: '20px',
                  height: '20px',
                  background: 'white',
                  borderRadius: '50%',
                  transition: 'all 0.3s ease'
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCreatorActivity = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Mic size={20} />
        Creator Activity
      </h3>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>
        Get notified when creators you follow upload new content or create events
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => updateSettings('creatorActivity', !settings.creatorActivity)}
          style={{
            width: '50px',
            height: '24px',
            background: settings.creatorActivity ? 'linear-gradient(45deg, #DC2626, #EC4899)' : '#333',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '2px',
            left: settings.creatorActivity ? '26px' : '2px',
            width: '20px',
            height: '20px',
            background: 'white',
            borderRadius: '50%',
            transition: 'all 0.3s ease'
          }} />
        </button>
        <span style={{ color: 'white', fontWeight: '600' }}>
          {settings.creatorActivity ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
  );

  const renderCollaborationRequests = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Collaboration Request Types */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Share2 size={20} />
          Collaboration Request Types
        </h3>
        <p style={{ color: '#999', marginBottom: '1.5rem' }}>
          Choose which collaboration request notifications you want to receive
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { key: 'newRequests', label: 'New Requests', icon: Bell, description: 'When someone sends you a collaboration request' },
            { key: 'requestUpdates', label: 'Request Updates', icon: Check, description: 'When requests are accepted, declined, or modified' },
            { key: 'requestReminders', label: 'Request Reminders', icon: Clock, description: 'Reminders for pending requests that need attention' }
          ].map((item) => {
            const Icon = item.icon;
            const isEnabled = settings.collaborationRequests[item.key as keyof typeof settings.collaborationRequests] as boolean;

            return (
              <div key={item.key} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={20} style={{ color: '#EC4899' }} />
                  <div>
                    <div style={{ color: 'white', fontWeight: '600' }}>{item.label}</div>
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>{item.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => updateCollaborationSettings(item.key as keyof typeof settings.collaborationRequests, !isEnabled)}
                  style={{
                    width: '50px',
                    height: '24px',
                    background: isEnabled ? 'linear-gradient(45deg, #DC2626, #EC4899)' : '#333',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: isEnabled ? '26px' : '2px',
                    width: '20px',
                    height: '20px',
                    background: 'white',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Methods for Collaboration Requests */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} />
          Delivery Methods
        </h3>
        <p style={{ color: '#999', marginBottom: '1.5rem' }}>
          Choose how you want to receive collaboration request notifications
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {deliveryMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = settings.collaborationRequests.deliveryMethods.includes(method.id);

            return (
              <button
                key={method.id}
                onClick={() => {
                  const newMethods = isSelected
                    ? settings.collaborationRequests.deliveryMethods.filter(id => id !== method.id)
                    : [...settings.collaborationRequests.deliveryMethods, method.id];
                  updateCollaborationSettings('deliveryMethods', newMethods);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: isSelected
                    ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  width: '100%',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={20} />
                  <div>
                    <div style={{ fontWeight: '600' }}>{method.label}</div>
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>{method.description}</div>
                  </div>
                </div>
                {isSelected && <Check size={20} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={20} />
          Notification Preview
        </h3>
        <p style={{ color: '#999', marginBottom: '1.5rem' }}>
          See how your collaboration request notifications will appear
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}>
              J
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: '600' }}>New Collaboration Request</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>John Doe wants to collaborate with you</div>
            </div>
          </div>
          <div style={{ color: '#999', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            "I'd love to work on a gospel project together. Are you available next week?"
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'location':
        return renderLocationSettings();
      case 'categories':
        return renderEventCategories();
      case 'timing':
        return renderTimingSettings();
      case 'delivery':
        return renderDeliveryMethods();
      case 'quiet-hours':
        return renderQuietHours();
      case 'creator-activity':
        return renderCreatorActivity();
      case 'social':
        return renderSocialNotifications();
      case 'collaboration-requests':
        return renderCollaborationRequests();
      case 'urgent-gigs':
        return renderUrgentGigsSettings();
      default:
        return renderLocationSettings();
    }
  };

  const navigationItems = [
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'categories', label: 'Event Categories', icon: Music },
    { id: 'timing', label: 'Timing', icon: Clock },
    { id: 'delivery', label: 'Delivery Methods', icon: Mail },
    { id: 'quiet-hours', label: 'Quiet Hours', icon: Moon },
    { id: 'creator-activity', label: 'Creator Activity', icon: Mic },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'collaboration-requests', label: 'Collaboration Requests', icon: Share2 },
    { id: 'urgent-gigs', label: 'Urgent Gigs', icon: Zap }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}>
              ←
            </button>
          </Link>
                     <div>
             <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>Notification Preferences</h1>
             <p style={{ color: '#999', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
               Customize your event discovery experience
             </p>
           </div>
           <Link href="/notifications-list" style={{ textDecoration: 'none' }}>
             <button style={{
               background: 'rgba(255, 255, 255, 0.1)',
               color: 'white',
               border: '1px solid rgba(255, 255, 255, 0.2)',
               padding: '0.5rem 1rem',
               borderRadius: '8px',
               cursor: 'pointer',
               fontSize: '0.9rem'
             }}>
               View Notifications
             </button>
           </Link>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
        {/* Sidebar Navigation */}
        <div style={{
          width: '280px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2rem 1.5rem'
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: activeSection === item.id ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => activeSection !== item.id && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseLeave={(e) => activeSection !== item.id && (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={20} />
                  {item.label}
                  <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '2rem' }}>
          {/* Loading State */}
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              color: '#999'
            }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
              Loading notification preferences...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✗
              </div>
              <span>{error}</span>
            </div>
          )}

          {/* Save Status */}
          {saveStatus === 'success' && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              color: '#22C55E',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
              <span>{saveMessage}</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✗
              </div>
              <span>{saveMessage}</span>
            </div>
          )}

          {/* Main Content */}
          {!loading && renderContent()}
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
} 