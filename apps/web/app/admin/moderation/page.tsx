'use client';

// Admin Moderation Dashboard
// View and moderate flagged content

import { useEffect, useState } from 'react';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { RefreshCw, Shield, Calendar, Clock } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist_name: string;
  creator_id: string;
  file_url: string;
  moderation_status: string;
  moderation_flagged: boolean;
  flag_reasons: string[];
  moderation_confidence: number;
  moderation_checked_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  transcription: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ModerationStats {
  overview: {
    pending_moderation: number;
    moderation_in_progress: number;
    flagged_content: number;
    clean_content: number;
    approved_content: number;
    rejected_content: number;
    pending_appeals: number;
    moderation_queue_size: number;
  };
  metrics: {
    total_moderated: number;
    flag_rate: number;
    approval_rate: number;
  };
}

// Helper function to format date and time
const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export default function ModerationDashboard() {
  const { user, loading: authLoading } = useAuth(); // Use AuthContext like other admin pages
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'flagged' | 'pending' | 'all'>('flagged');

  // Note: No redirect logic here - let the API handle auth checks
  // This matches the behavior of /admin/dashboard and /admin/copyright

  // Fetch moderation data
  useEffect(() => {
    if (user) {
      // Wait a bit for cookies to sync (especially on mobile)
      const timer = setTimeout(() => {
        loadModerationData();
      }, 500); // 500ms delay for cookie sync
      
      return () => clearTimeout(timer);
    }
  }, [filter, user]);

  async function loadModerationData(retryCount = 0) {
    try {
      setDataLoading(true);

      // Fetch moderation queue
      const queueResponse = await fetch(`/api/admin/moderation/queue?filter=${filter}`, {
        credentials: 'include'
      });
      
      // Check if response is unauthorized or forbidden
      if (queueResponse.status === 401) {
        // Retry once if this is the first attempt (cookie sync might be delayed)
        if (retryCount === 0) {
          console.log('Unauthorized on first attempt - retrying after delay (cookie sync)');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadModerationData(1);
        }
        console.error('Unauthorized after retry - redirecting to login');
        router.push('/login');
        return;
      }
      
      if (queueResponse.status === 403) {
        console.error('Forbidden - user is not admin');
        alert('Access denied. Admin privileges required.');
        router.push('/');
        return;
      }

      const queueData = await queueResponse.json();

      if (queueData.success) {
        setTracks(queueData.tracks);
      } else {
        console.error('API error:', queueData.error);
        // If error is auth-related, redirect to login
        if (queueData.error?.includes('Unauthorized') || queueData.error?.includes('Authentication')) {
          router.push('/login');
          return;
        }
      }

      // Fetch stats
      const statsResponse = await fetch('/api/admin/moderation/stats?days=7', {
        credentials: 'include'
      });
      
      if (statsResponse.status === 401 || statsResponse.status === 403) {
        // Already handled above, just skip stats
        return;
      }
      
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error loading moderation data:', error);
      // Don't redirect on network errors, just log
    } finally {
      setDataLoading(false);
    }
  }

  // Handle review (approve/reject)
  async function handleReview(trackId: string, action: 'approve' | 'reject') {
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/moderation/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          trackId,
          action,
          reason: reviewReason || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        // Remove track from queue
        setTracks(tracks.filter(t => t.id !== trackId));
        setSelectedTrack(null);
        setReviewReason('');

        // Refresh data
        loadModerationData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error reviewing track:', error);
      alert('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">
            {authLoading ? 'Checking authentication...' : 'Loading moderation dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, show message (like /admin/dashboard does)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Admin Access Required</h2>
          <p className="text-gray-400">Please log in with admin privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Content Moderation</h1>
          <p className="text-gray-400">Review and moderate flagged content</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <p className="text-sm text-gray-400 mb-1">Pending Review</p>
              <p className="text-2xl font-bold text-orange-400">
                {stats.overview.pending_moderation}
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <p className="text-sm text-gray-400 mb-1">Flagged Content</p>
              <p className="text-2xl font-bold text-red-400">
                {stats.overview.flagged_content}
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <p className="text-sm text-gray-400 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-400">
                {stats.overview.approved_content}
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <p className="text-sm text-gray-400 mb-1">Flag Rate</p>
              <p className="text-2xl font-bold text-purple-400">
                {stats.metrics.flag_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('flagged')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'flagged'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Flagged ({stats?.overview.flagged_content || 0})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'pending'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Pending ({stats?.overview.pending_moderation || 0})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
        </div>

        {/* Track List */}
        <div className="space-y-4">
          {tracks.length === 0 ? (
            <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-800">
              <p className="text-gray-400">No tracks to review</p>
            </div>
          ) : (
            tracks.map((track) => (
              <div
                key={track.id}
                className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-purple-500 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{track.title}</h3>
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                        FLAGGED
                      </span>
                    </div>
                    <p className="text-gray-400 mb-3">by {track.artist_name}</p>

                    {/* Upload Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span>Uploaded by @{track.profiles.username}</span>
                      <span>•</span>
                      <span>Confidence: {(track.moderation_confidence * 100).toFixed(0)}%</span>
                    </div>

                    {/* Date/Time Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-3 bg-gray-950 rounded-lg border border-gray-800">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">Upload Date:</span>
                        <span className="text-gray-300">{formatDateTime(track.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">Last Updated:</span>
                        <span className="text-gray-300">{formatDateTime(track.updated_at)}</span>
                      </div>
                      {track.moderation_checked_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-orange-400" />
                          <span className="text-gray-400">Checked At:</span>
                          <span className="text-orange-300">{formatDateTime(track.moderation_checked_at)}</span>
                        </div>
                      )}
                      {track.reviewed_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-green-400" />
                          <span className="text-gray-400">Reviewed At:</span>
                          <span className="text-green-300">{formatDateTime(track.reviewed_at)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          track.moderation_status === 'pending_check' ? 'bg-yellow-500/20 text-yellow-400' :
                          track.moderation_status === 'checking' ? 'bg-blue-500/20 text-blue-400' :
                          track.moderation_status === 'flagged' ? 'bg-red-500/20 text-red-400' :
                          track.moderation_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {track.moderation_status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Flag Reasons */}
                    {track.flag_reasons && track.flag_reasons.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-400 mb-2">Flag Reasons:</p>
                        <div className="flex flex-wrap gap-2">
                          {track.flag_reasons.map((reason, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transcription */}
                    {track.transcription && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-400 mb-2">Transcription:</p>
                        <div className="bg-gray-950 rounded p-3 text-sm text-gray-300 max-h-24 overflow-y-auto">
                          {track.transcription}
                        </div>
                      </div>
                    )}

                    {/* Audio Player */}
                    <audio controls className="w-full mb-4" src={track.file_url}>
                      Your browser does not support the audio element.
                    </audio>

                    {/* Review Actions */}
                    {selectedTrack?.id === track.id ? (
                      <div className="mt-4 p-4 bg-gray-950 rounded-lg">
                        <textarea
                          value={reviewReason}
                          onChange={(e) => setReviewReason(e.target.value)}
                          placeholder="Optional: Add a reason for your decision..."
                          className="w-full bg-gray-900 text-white rounded p-3 mb-3 border border-gray-700 focus:border-purple-500 focus:outline-none"
                          rows={3}
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(track.id, 'approve')}
                            disabled={submitting}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            {submitting ? 'Processing...' : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => handleReview(track.id, 'reject')}
                            disabled={submitting}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            {submitting ? 'Processing...' : '✗ Reject'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTrack(null);
                              setReviewReason('');
                            }}
                            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedTrack(track)}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                      >
                        Review Track
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
