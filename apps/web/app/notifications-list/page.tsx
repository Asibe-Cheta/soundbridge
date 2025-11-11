'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useNotifications } from '../../src/hooks/useNotifications';
import { NotificationBell } from '../../src/components/ui/NotificationBell';
import { Bell, CheckCircle as Check, Trash2, Clock, Users, Share2, MessageSquare, Heart, Calendar, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import type { Notification } from '../../src/lib/types/social';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'collaboration_request':
    case 'collaboration':
      return <Share2 size={20} />;
    case 'follow':
      return <Users size={20} />;
    case 'like':
      return <Heart size={20} />;
    case 'comment':
    case 'message':
      return <MessageSquare size={20} />;
    case 'event':
      return <Calendar size={20} />;
    default:
      return <Bell size={20} />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'collaboration_request':
      return '#EC4899';
    case 'collaboration':
      return '#8B5CF6';
    case 'follow':
      return '#059669';
    case 'like':
      return '#DC2626';
    case 'comment':
    case 'message':
      return '#2563EB';
    case 'event':
      return '#EA580C';
    default:
      return '#6B7280';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationsListPage() {
  const { user } = useAuth();
  const [notificationsState, notificationsActions] = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>Please log in to view your notifications.</p>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const filteredNotifications = filter === 'unread' 
    ? notificationsState.notifications.filter(n => !n.is_read)
    : notificationsState.notifications;

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}>
                <ArrowLeft size={20} />
              </button>
            </Link>
            <div>
              <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>Notifications</h1>
              <p style={{ color: '#999', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                {notificationsState.unreadCount} unread
              </p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      {/* Filter Tabs */}
      <div style={{ padding: '1rem 2rem 0' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              background: filter === 'all' ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            All ({notificationsState.notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={{
              background: filter === 'unread' ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Unread ({notificationsState.unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ padding: '2rem' }}>
        {notificationsState.loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ color: '#EC4899', fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p style={{ color: '#999' }}>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Bell size={64} style={{ color: '#666', marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ color: '#999', marginBottom: '0.5rem' }}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p style={{ color: '#666' }}>
              {filter === 'unread' 
                ? 'You\'re all caught up!' 
                : 'You\'ll see notifications here when you receive them.'
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  background: notification.is_read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = notification.is_read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {/* Icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${getNotificationColor(notification.type)}20`,
                      color: getNotificationColor(notification.type),
                      flexShrink: 0
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          color: notification.is_read ? '#ccc' : 'white', 
                          margin: '0 0 0.5rem 0',
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}>
                          {notification.title}
                        </h3>
                        <p style={{ 
                          color: '#999', 
                          margin: '0 0 0.5rem 0',
                          fontSize: '0.9rem',
                          lineHeight: '1.4'
                        }}>
                          {notification.message}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={14} style={{ color: '#666' }} />
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!notification.is_read && (
                          <button
                            onClick={() => notificationsActions.markAsRead(notification.id)}
                            style={{
                              background: 'rgba(34, 197, 94, 0.2)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              color: '#22c55e',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => notificationsActions.deleteNotification(notification.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete notification"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {filteredNotifications.length >= 20 && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              onClick={() => notificationsActions.fetchNotifications(notificationsState.notifications.length + 20)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
