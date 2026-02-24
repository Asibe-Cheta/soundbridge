'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, Trash2, Clock, Users, Share2, MessageSquare, Heart, Calendar, Flame } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification } from '../../lib/types/social';

/** Urgent gig / project notification types — deep link to the right page (w.md §9) */
function getNotificationUrl(notification: Notification): string | null {
  const type = notification.type;
  const meta = notification.metadata ?? notification.data ?? {};
  const gigId = meta.gig_id;
  const projectId = meta.project_id ?? notification.related_id;
  const disputeId = meta.dispute_id;
  const rateeId = meta.ratee_id;
  const rateeName = meta.ratee_name ?? '';

  switch (type) {
    case 'urgent_gig':
    case 'gig_confirmed':
    case 'gig_starting_soon':
      return gigId ? `/gigs/${gigId}/detail` : null;
    case 'gig_accepted':
      return gigId ? `/gigs/${gigId}/responses` : null;
    case 'confirm_completion':
    case 'opportunity_project_completed':
      return projectId ? `/projects/${projectId}` : null;
    case 'opportunity_project_disputed':
      return disputeId ? `/dispute/view/${disputeId}` : null;
    case 'rating_prompt':
      return projectId && rateeId ? `/rate/${projectId}?rateeId=${encodeURIComponent(rateeId)}&rateeName=${encodeURIComponent(rateeName)}` : null;
    default:
      return null;
  }
}

interface NotificationBellProps {
  className?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'urgent_gig':
    case 'gig_accepted':
    case 'gig_confirmed':
    case 'gig_starting_soon':
    case 'gig_filled':
      return <Flame size={16} />;
    case 'collaboration_request':
    case 'collaboration':
      return <Share2 size={16} />;
    case 'follow':
      return <Users size={16} />;
    case 'like':
      return <Heart size={16} />;
    case 'comment':
    case 'message':
      return <MessageSquare size={16} />;
    case 'event':
      return <Calendar size={16} />;
    default:
      return <Bell size={16} />;
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

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const router = useRouter();
  const [notificationsState, notificationsActions] = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await notificationsActions.markAsRead(notification.id);
    }
    setIsOpen(false);
    const url = getNotificationUrl(notification);
    if (url) router.push(url);
  };

  const handleMarkAllAsRead = async () => {
    await notificationsActions.markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await notificationsActions.deleteNotification(notificationId);
  };

  const unreadCount = notificationsState.unreadCount;
  const notifications = notificationsState.notifications;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        style={{ position: 'relative' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50"
          style={{
            background: 'rgba(17, 24, 39, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(55, 65, 81, 0.5)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notificationsState.loading ? (
              <div className="p-4 text-center text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <Bell size={24} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-800 ${
                    !notification.is_read ? 'bg-gray-800/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${getNotificationColor(notification.type)}20` }}
                    >
                      <div style={{ color: getNotificationColor(notification.type) }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${!notification.is_read ? 'text-white' : 'text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock size={12} className="text-gray-500" />
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                notificationsActions.markAsRead(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-gray-400 hover:text-white transition-colors"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
