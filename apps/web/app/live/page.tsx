'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { 
  Radio, 
  Mic, 
  Users, 
  Calendar, 
  Clock,
  DollarSign,
  MessageCircle,
  Smartphone,
  Download
} from 'lucide-react';

interface LiveSession {
  id: string;
  title: string;
  description: string;
  session_type: 'broadcast' | 'interactive';
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduled_start_time: string | null;
  actual_start_time: string | null;
  peak_listener_count: number;
  total_tips_amount: number;
  total_comments_count: number;
  created_at: string;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
  _participant_count?: number;
}

export default function LiveSessionsPage() {
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [pastSessions, setPastSessions] = useState<LiveSession[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient();

  useEffect(() => {
    loadSessions();
    
    // Set up real-time subscription for live sessions
    const channel = supabase
      .channel('live_sessions_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
        },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);

      // Load live sessions
      const { data: live } = await supabase
        .from('live_sessions')
        .select(`
          *,
          creator:profiles!live_sessions_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('status', 'live')
        .order('actual_start_time', { ascending: false });

      // Load upcoming sessions
      const { data: upcoming } = await supabase
        .from('live_sessions')
        .select(`
          *,
          creator:profiles!live_sessions_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_start_time', new Date().toISOString())
        .order('scheduled_start_time', { ascending: true })
        .limit(20);

      // Load past sessions (with recordings)
      const { data: past } = await supabase
        .from('live_sessions')
        .select(`
          *,
          creator:profiles!live_sessions_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('status', 'ended')
        .not('recording_url', 'is', null)
        .order('end_time', { ascending: false })
        .limit(20);

      // Get participant counts for live sessions
      if (live && live.length > 0) {
        const liveWithCounts = await Promise.all(
          live.map(async (session) => {
            const { count } = await supabase
              .from('live_session_participants')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', session.id)
              .is('left_at', null);
            
            return { ...session, _participant_count: count || 0 };
          })
        );
        setLiveSessions(liveWithCounts);
      } else {
        setLiveSessions([]);
      }

      setUpcomingSessions(upcoming || []);
      setPastSessions(past || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'TBA';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return 'TBA';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const SessionCard = ({ session, isLive = false }: { session: LiveSession; isLive?: boolean }) => (
    <div className="bg-[#2a2a2a] rounded-lg p-6 hover:bg-[#333] transition-colors border border-[#3a3a3a]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Creator Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DC2626] to-[#EC4899] flex items-center justify-center text-white font-bold text-lg">
            {session.creator.avatar_url ? (
              <img 
                src={session.creator.avatar_url} 
                alt={session.creator.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              session.creator.display_name[0].toUpperCase()
            )}
          </div>
          
          <div>
            <h3 className="text-white font-semibold">{session.creator.display_name}</h3>
            <p className="text-gray-400 text-sm">@{session.creator.username}</p>
          </div>
        </div>

        {/* Live Badge */}
        {isLive && (
          <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            LIVE
          </div>
        )}

        {/* Session Type Badge */}
        {!isLive && (
          <div className="flex items-center gap-1 bg-[#3a3a3a] text-gray-300 px-3 py-1 rounded-full text-sm">
            {session.session_type === 'broadcast' ? (
              <>
                <Radio size={14} />
                <span>Broadcast</span>
              </>
            ) : (
              <>
                <Mic size={14} />
                <span>Interactive</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Title & Description */}
      <h2 className="text-xl font-bold text-white mb-2">{session.title}</h2>
      {session.description && (
        <p className="text-gray-400 mb-4 line-clamp-2">{session.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
        {isLive && session._participant_count !== undefined && (
          <div className="flex items-center gap-1">
            <Users size={16} />
            <span>{session._participant_count} listening</span>
          </div>
        )}
        
        {session.total_comments_count > 0 && (
          <div className="flex items-center gap-1">
            <MessageCircle size={16} />
            <span>{session.total_comments_count}</span>
          </div>
        )}
        
        {session.total_tips_amount > 0 && (
          <div className="flex items-center gap-1">
            <DollarSign size={16} />
            <span>${session.total_tips_amount.toFixed(0)}</span>
          </div>
        )}

        {!isLive && session.scheduled_start_time && (
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{formatTime(session.scheduled_start_time)}</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-[#3a3a3a]">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Smartphone size={16} />
          <span>Mobile app required</span>
        </div>
        
        <button className="bg-gradient-to-r from-[#DC2626] to-[#EC4899] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
          <Download size={16} />
          {isLive ? 'Join Now' : 'Get App'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#DC2626] to-[#EC4899] py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Radio size={40} />
            <h1 className="text-4xl font-bold">Live Audio Sessions</h1>
          </div>
          <p className="text-xl text-white/90 mb-6">
            Join live audio experiences with your favorite creators. Listen to DJ sets, attend vocal lessons, 
            participate in Q&A sessions, and more.
          </p>
          
          {/* Download CTA */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Download the SoundBridge App</h3>
              <p className="text-white/80">Join live sessions, interact with creators, and send tips in real-time.</p>
            </div>
            <button className="bg-white text-[#DC2626] px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors flex items-center gap-2">
              <Download size={20} />
              Download App
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        <div className="flex gap-4 border-b border-[#3a3a3a]">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'live'
                ? 'text-[#DC2626]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔴 Live Now
            {liveSessions.length > 0 && (
              <span className="ml-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                {liveSessions.length}
              </span>
            )}
            {activeTab === 'live' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#DC2626]"></div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'upcoming'
                ? 'text-[#DC2626]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📅 Upcoming
            {activeTab === 'upcoming' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#DC2626]"></div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('past')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'past'
                ? 'text-[#DC2626]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎧 Recordings
            {activeTab === 'past' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#DC2626]"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
            <p className="text-gray-400 mt-4">Loading sessions...</p>
          </div>
        ) : (
          <>
            {/* Live Sessions */}
            {activeTab === 'live' && (
              <div className="space-y-4">
                {liveSessions.length === 0 ? (
                  <div className="text-center py-16">
                    <Radio size={64} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      No Live Sessions Right Now
                    </h3>
                    <p className="text-gray-500">
                      Check back soon or browse upcoming sessions!
                    </p>
                  </div>
                ) : (
                  liveSessions.map(session => (
                    <SessionCard key={session.id} session={session} isLive />
                  ))
                )}
              </div>
            )}

            {/* Upcoming Sessions */}
            {activeTab === 'upcoming' && (
              <div className="space-y-4">
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar size={64} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      No Upcoming Sessions
                    </h3>
                    <p className="text-gray-500">
                      Creators haven't scheduled any sessions yet.
                    </p>
                  </div>
                ) : (
                  upcomingSessions.map(session => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )}
              </div>
            )}

            {/* Past Sessions (Recordings) */}
            {activeTab === 'past' && (
              <div className="space-y-4">
                {pastSessions.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageCircle size={64} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      No Recordings Available
                    </h3>
                    <p className="text-gray-500">
                      Past sessions with recordings will appear here.
                    </p>
                  </div>
                ) : (
                  pastSessions.map(session => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

