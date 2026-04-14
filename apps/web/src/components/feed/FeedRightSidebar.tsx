'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Post } from '@/src/lib/types/post';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  TrendingUp, Briefcase, Plus, Radio, Music,
  ExternalLink, Loader2, ArrowRight, Flame
} from 'lucide-react';
import { MessagingWidget } from './MessagingWidget';
import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';
import { getCreatorProfilePath } from '@/src/lib/profile-links';

interface ConnectionSuggestion {
  id: string;
  user: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
    role?: string;
    is_verified?: boolean;
  };
  reason: string;
  mutual_connections?: number;
}

interface FeedRightSidebarProps {
  userId?: string;
}

export const FeedRightSidebar = React.memo(function FeedRightSidebar({ userId }: FeedRightSidebarProps) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Post[]>([]);
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const hasLoadedRef = useRef(false);
  
  // Use prop userId if provided, otherwise fall back to auth user
  const effectiveUserId = userId || user?.id;

  const loadOpportunitiesRef = useRef<() => Promise<void>>();
  const loadSuggestionsRef = useRef<() => Promise<void>>();

  const fetchJsonWithTimeout = useCallback(async (url: string, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      return { ok: res.ok, json };
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  loadOpportunitiesRef.current = async () => {
    try {
      setLoadingOpportunities(true);

      console.log('🚀 Loading sidebar opportunities using direct Supabase query...');
      const startTime = Date.now();

      const { ok, json } = await fetchJsonWithTimeout('/api/opportunities?limit=3', 12000);
      if (ok && json?.items) {
        const mapped = (json.items as any[]).slice(0, 3).map((item) => ({
          id: item.id,
          content: item.title || item.description || 'Opportunity',
          author: null,
        })) as unknown as Post[];
        setOpportunities(mapped);
        console.log(`✅ Sidebar opportunities loaded in ${Date.now() - startTime}ms`);
      }
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  loadSuggestionsRef.current = async () => {
    if (!effectiveUserId) return;

    try {
      setLoadingSuggestions(true);

      console.log('🚀 Loading sidebar suggestions using direct Supabase query...');
      const startTime = Date.now();

      const { ok, json } = await fetchJsonWithTimeout('/api/connections/suggestions?limit=5', 12000);

      if (ok && json?.success && json?.data?.suggestions) {
        const formattedSuggestions = (json.data.suggestions as any[]).map((suggestion) => ({
          id: suggestion.id,
          user: {
            id: suggestion.user?.id,
            name: suggestion.user?.name || 'User',
            username: suggestion.user?.username,
            avatar_url: suggestion.user?.avatar_url,
            role: suggestion.user?.role || 'creator',
            is_verified: suggestion.user?.is_verified || false,
          },
          reason: suggestion.reason || 'Suggested for you',
          mutual_connections: suggestion.mutual_connections || 0,
        }));

        setSuggestions(formattedSuggestions.slice(0, 5));
        console.log(`✅ Sidebar suggestions loaded in ${Date.now() - startTime}ms`);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    // Load opportunities once regardless of auth
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadOpportunitiesRef.current?.();
    }
  }, []);

  useEffect(() => {
    // Load suggestions when auth user becomes available
    if (effectiveUserId) {
      loadSuggestionsRef.current?.();
    } else {
      setLoadingSuggestions(false);
    }
  }, [effectiveUserId, fetchJsonWithTimeout]);

  return (
    <aside className="w-80 flex-shrink-0 hidden lg:block sticky top-24">
      <div 
        className="flex flex-col" 
        style={{ height: 'calc(100vh - 120px)' }}
      >
        {/* Scrollable top section */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Link
                href="/live?create=true"
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
              >
                <Radio size={18} className="text-red-400" />
                <span className="text-sm text-gray-300 group-hover:text-white">Start Live Session</span>
              </Link>
              <Link
                href="/events?create=true"
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
              >
                <Plus size={18} className="text-red-400" />
                <span className="text-sm text-gray-300 group-hover:text-white">Create Event</span>
              </Link>
              <div className="border-t border-white/10 my-2" />
              <Link
                href="/gigs/new"
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
              >
                <Briefcase size={18} className="text-red-400" />
                <span className="text-sm text-gray-300 group-hover:text-white">Post a gig</span>
              </Link>
            </div>
          </div>

          {/* Opportunities */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Opportunities</h4>
              <Link
                href="/gigs/my"
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                See all
                <ArrowRight size={12} />
              </Link>
            </div>
            {loadingOpportunities ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              </div>
            ) : opportunities.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 text-center py-2">No gigs yet</p>
                <Link
                  href="/gigs/new"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <Briefcase size={16} className="text-red-400" />
                  Post a gig
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <Link
                    key={opp.id}
                    href={`/post/${opp.id}`}
                    className="block p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Briefcase size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-300 line-clamp-2 group-hover:text-white transition-colors">
                        {opp.content}
                      </p>
                    </div>
                    {opp.author && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="relative w-5 h-5 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500">
                          {opp.author.avatar_url ? (
                            <Image
                              src={opp.author.avatar_url}
                              alt={opp.author.name || opp.author.username || 'User'}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs">
                              {(opp.author.name || opp.author.username || 'U').charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                          <span>{opp.author.name || opp.author.username || 'User'}</span>
                          {opp.author.is_verified ? <VerifiedBadge size={10} /> : null}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Connection Suggestions */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">People You May Know</h4>
              <Link
                href="/network?tab=suggestions"
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                See all
                <ArrowRight size={12} />
              </Link>
            </div>
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No suggestions yet</p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <Link
                    key={suggestion.id}
                    href={getCreatorProfilePath({
                      username: suggestion.user.username,
                      id: suggestion.user.id,
                    })}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                      {suggestion.user.avatar_url ? (
                        <Image
                          src={suggestion.user.avatar_url}
                          alt={suggestion.user.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                          {suggestion.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-red-400 transition-colors truncate inline-flex items-center gap-1">
                        <span>{suggestion.user.name}</span>
                        {suggestion.user.is_verified ? <VerifiedBadge size={12} /> : null}
                      </p>
                      {suggestion.user.role && (
                        <p className="text-xs text-gray-400 truncate">{suggestion.user.role}</p>
                      )}
                      {suggestion.mutual_connections && (
                        <p className="text-xs text-gray-500">
                          {suggestion.mutual_connections} mutual connection{suggestion.mutual_connections !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Fixed messaging widget at bottom */}
        <div className="flex-shrink-0 pt-4 border-t border-white/10">
          <MessagingWidget />
        </div>
      </div>
    </aside>
  );
});

