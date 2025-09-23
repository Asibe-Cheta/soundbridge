'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { UserTrack, UserEvent } from '../../lib/dashboard-service';
import {
  Music,
  Calendar,
  Play,
  Heart,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

interface ContentManagerProps {
  tracks: UserTrack[];
  events: UserEvent[];
  onDeleteTrack: (trackId: string) => Promise<{ success: boolean }>;
  onDeleteEvent: (eventId: string) => Promise<{ success: boolean }>;
  isLoading?: boolean;
}

export function ContentManager({
  tracks,
  events,
  onDeleteTrack,
  onDeleteEvent,
  isLoading = false
}: ContentManagerProps) {
  const [activeTab, setActiveTab] = useState<'tracks' | 'events'>('tracks');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (id: string, type: 'track' | 'event') => {
    setIsDeleting(true);
    try {
      const result = type === 'track'
        ? await onDeleteTrack(id)
        : await onDeleteEvent(id);

      if (result.success) {
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting content:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const TrackCard = ({ track }: { track: UserTrack }) => (
    <div className="track-card glass rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Cover Art */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary-red to-accent-pink">
            {track.cover_art_url ? (
              <img
                src={track.cover_art_url}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <Music size={24} />
              </div>
            )}
          </div>
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">
                {track.title}
              </h3>
              <p className="text-sm text-gray-400 truncate">
                {track.description || 'No description'}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Edit size={16} />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                onClick={() => setShowDeleteConfirm(`track-${track.id}`)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Play size={14} />
              <span>{track.play_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart size={14} />
              <span>{track.like_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{formatDuration(track.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Music size={14} />
              <span>{track.genre}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mt-2">
            <div className={`px-2 py-1 rounded-full text-xs ${track.is_public
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
              }`}>
              {track.is_public ? 'Public' : 'Private'}
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(track.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const EventCard = ({ event }: { event: UserEvent }) => (
    <div className="event-card glass rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Event Image */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-accent-pink to-coral">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <Calendar size={24} />
              </div>
            )}
          </div>
        </div>

        {/* Event Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">
                {event.title}
              </h3>
              <p className="text-sm text-gray-400 truncate">
                {event.description || 'No description'}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Edit size={16} />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                onClick={() => setShowDeleteConfirm(`event-${event.id}`)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Event Details */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>{event.current_attendees}/{event.max_attendees || '∞'}</span>
            </div>
          </div>

          {/* Pricing & Category */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign size={14} />
              <span>
                {event.price_gbp ? `£${event.price_gbp}` : event.price_ngn ? `₦${event.price_ngn}` : 'Free'}
              </span>
            </div>
            <div className="px-2 py-1 rounded-full bg-accent-pink/20 text-accent-pink text-xs">
              {event.category}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="content-manager glass rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-32 h-8 bg-white/10 rounded animate-pulse"></div>
          <div className="w-24 h-8 bg-white/10 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-white/10 rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="w-48 h-6 bg-white/10 rounded animate-pulse"></div>
                  <div className="w-32 h-4 bg-white/10 rounded animate-pulse"></div>
                  <div className="flex gap-4">
                    <div className="w-16 h-4 bg-white/10 rounded animate-pulse"></div>
                    <div className="w-16 h-4 bg-white/10 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="content-manager glass rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Content Management</h2>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('tracks')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tracks'
                  ? 'bg-accent-pink text-white'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-2">
                <Music size={16} />
                Tracks ({tracks.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'events'
                  ? 'bg-accent-pink text-white'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                Events ({events.length})
              </div>
            </button>
          </div>
        </div>

        <Link href={activeTab === 'tracks' ? '/upload' : '/events/create'}>
          <button className="px-4 py-2 bg-gradient-to-r from-primary-red to-accent-pink text-white rounded-lg hover:opacity-90 transition-opacity">
            Add {activeTab === 'tracks' ? 'Track' : 'Event'}
          </button>
        </Link>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {activeTab === 'tracks' ? (
          tracks.length > 0 ? (
            tracks.map(track => (
              <TrackCard key={track.id} track={track} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Music size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No tracks yet</p>
              <p className="text-sm mb-4">Upload your first track to get started</p>
              <Link href="/upload">
                <button className="px-6 py-2 bg-gradient-to-r from-primary-red to-accent-pink text-white rounded-lg hover:opacity-90 transition-opacity">
                  Upload Track
                </button>
              </Link>
            </div>
          )
        ) : (
          events.length > 0 ? (
            events.map(event => (
              <EventCard key={event.id} event={event} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No events yet</p>
              <p className="text-sm mb-4">Create your first event to get started</p>
              <Link href="/events/create">
                <button className="px-6 py-2 bg-gradient-to-r from-primary-red to-accent-pink text-white rounded-lg hover:opacity-90 transition-opacity">
                  Create Event
                </button>
              </Link>
            </div>
          )
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-400" />
              <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this {showDeleteConfirm.startsWith('track') ? 'track' : 'event'}?
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const [type, id] = showDeleteConfirm.split('-');
                  handleDelete(id, type as 'track' | 'event');
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 