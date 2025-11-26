'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Post } from '@/src/lib/types/post';
import { 
  TrendingUp, Briefcase, Plus, Radio, Music, 
  ExternalLink, Loader2, ArrowRight 
} from 'lucide-react';

interface ConnectionSuggestion {
  id: string;
  user: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
    role?: string;
  };
  reason: string;
  mutual_connections?: number;
}

export function FeedRightSidebar() {
  const [opportunities, setOpportunities] = useState<Post[]>([]);
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    loadOpportunities();
    loadSuggestions();
  }, []);

  const loadOpportunities = async () => {
    try {
      setLoadingOpportunities(true);
      const response = await fetch('/api/posts/opportunities?limit=3');
      const data = await response.json();
      if (data.success && data.data?.opportunities) {
        setOpportunities(data.data.opportunities.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const response = await fetch('/api/connections/suggestions?limit=5');
      const data = await response.json();
      if (data.success && data.data?.suggestions) {
        setSuggestions(data.data.suggestions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  return (
    <aside className="w-80 flex-shrink-0 hidden xl:block">
      <div className="space-y-4">
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
          </div>
        </div>

        {/* Opportunities Feed */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase">Opportunities</h4>
            <Link
              href="/network?tab=opportunities"
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
            <p className="text-sm text-gray-400 text-center py-4">No opportunities yet</p>
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
                            alt={opp.author.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs">
                            {opp.author.name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{opp.author.name}</span>
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
                  href={`/creator/${suggestion.user.username || suggestion.user.id}`}
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
                    <p className="text-sm font-medium text-white group-hover:text-red-400 transition-colors truncate">
                      {suggestion.user.name}
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
    </aside>
  );
}

