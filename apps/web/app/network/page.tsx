'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { PostCard } from '@/src/components/posts/PostCard';
import { NetworkSidebar } from '@/src/components/network/NetworkSidebar';
import { Post } from '@/src/lib/types/post';
import { 
  Users2, UserPlus, Loader2, AlertCircle, Check, X, Search, 
  MapPin, Briefcase, ArrowRight, User
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface ConnectionRequest {
  id: string;
  requester: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
    role?: string;
    mutual_connections: number;
  };
  message?: string;
  created_at: string;
}

interface ConnectionSuggestion {
  id: string;
  user: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
    role?: string;
    location?: string;
  };
  reason: string;
  mutual_connections?: number;
}

interface Connection {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  role?: string;
  location?: string;
  connected_at: string;
}

export default function NetworkPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'requests' | 'suggestions' | 'opportunities' | 'connections'>('requests');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle URL query parameters for tab navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['requests', 'suggestions', 'opportunities', 'connections'].includes(tab)) {
        setActiveTab(tab as 'requests' | 'suggestions' | 'opportunities' | 'connections');
      }
    }
  }, []);
  
  // Connection Requests
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  
  // Suggestions
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  
  // Opportunities
  const [opportunities, setOpportunities] = useState<Post[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(true);
  
  // Connections
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectionCount, setConnectionCount] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/network');
    }
  }, [user, authLoading, router]);

  // Fetch connection requests
  useEffect(() => {
    if (user && activeTab === 'requests') {
      fetchConnectionRequests();
    }
  }, [user, activeTab]);

  // Fetch suggestions
  useEffect(() => {
    if (user && activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [user, activeTab]);

  // Fetch opportunities
  useEffect(() => {
    if (user && activeTab === 'opportunities') {
      fetchOpportunities();
    }
  }, [user, activeTab]);

  // Fetch connections
  useEffect(() => {
    if (user && activeTab === 'connections') {
      fetchConnections();
    }
  }, [user, activeTab, searchQuery]);

  const fetchConnectionRequests = async () => {
    try {
      setLoadingRequests(true);

      // Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/connections/requests?type=received', {
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setRequests(data.data?.requests || []);
      } else {
        console.warn('No connection requests data');
        setRequests([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
      setRequests([]); // Set empty array on error
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true);

      // Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/connections/suggestions?limit=20', {
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data?.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchOpportunities = async () => {
    try {
      setLoadingOpportunities(true);

      // Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/posts/opportunities?page=1&limit=15', {
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setOpportunities(data.data?.opportunities || []);
      } else {
        setOpportunities([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch opportunities:', err);
      setOpportunities([]); // Set empty array on error
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const fetchConnections = async () => {
    try {
      setLoadingConnections(true);

      // Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const url = searchQuery
        ? `/api/connections?page=1&limit=50&search=${encodeURIComponent(searchQuery)}`
        : '/api/connections?page=1&limit=50';

      const response = await fetch(url, {
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setConnections(data.data?.connections || []);
        setConnectionCount(data.data?.pagination?.total || 0);
      } else {
        setConnections([]);
        setConnectionCount(0);
      }
    } catch (err: any) {
      console.error('Failed to fetch connections:', err);
      setConnections([]); // Set empty array on error
      setConnectionCount(0);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/connections/${requestId}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        // Refresh connections count
        if (activeTab === 'connections') {
          fetchConnections();
        }
      }
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/connections/${requestId}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipient_id: userId }),
      });
      const data = await response.json();
      if (data.success) {
        // Remove from suggestions and show success
        setSuggestions(prev => prev.filter(s => s.user.id !== userId));
      }
    } catch (err) {
      console.error('Failed to send request:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <NetworkSidebar />

          {/* Main Content - Narrower Center Column */}
          <main className="flex-1 max-w-3xl">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">My Network</h1>
              <p className="text-gray-400">Connect with professionals in the music industry</p>
            </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10">
          <button
            onClick={() => {
              setActiveTab('requests');
              router.push('/network?tab=requests', { scroll: false });
            }}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'requests'
                ? 'text-red-400 border-red-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            Invitations {requests.length > 0 && `(${requests.length})`}
          </button>
          <button
            onClick={() => {
              setActiveTab('suggestions');
              router.push('/network?tab=suggestions', { scroll: false });
            }}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'suggestions'
                ? 'text-red-400 border-red-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            Suggestions
          </button>
          <button
            onClick={() => {
              setActiveTab('opportunities');
              router.push('/network?tab=opportunities', { scroll: false });
            }}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'opportunities'
                ? 'text-red-400 border-red-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            Opportunities
          </button>
          <button
            onClick={() => {
              setActiveTab('connections');
              router.push('/network?tab=connections', { scroll: false });
            }}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'connections'
                ? 'text-red-400 border-red-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            My Connections {connectionCount > 0 && `(${connectionCount})`}
          </button>
        </div>

        {/* Connection Requests Tab */}
        {activeTab === 'requests' && (
          <div>
            {loadingRequests ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-8 text-center">
                <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No pending connection requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6"
                  >
                    <div className="flex items-start gap-4">
                      <Link href={`/creator/${request.requester.username || request.requester.id}`}>
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                          {request.requester.avatar_url ? (
                            <Image
                              src={request.requester.avatar_url}
                              alt={request.requester.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                              {request.requester.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1">
                        <Link href={`/creator/${request.requester.username || request.requester.id}`}>
                          <h3 className="text-white font-semibold hover:text-red-400 transition-colors">
                            {request.requester.name}
                          </h3>
                        </Link>
                        {request.requester.role && (
                          <p className="text-gray-400 text-sm mb-1">{request.requester.role}</p>
                        )}
                        {request.requester.mutual_connections > 0 && (
                          <p className="text-gray-500 text-xs mb-2">
                            {request.requester.mutual_connections} mutual connection
                            {request.requester.mutual_connections > 1 ? 's' : ''}
                          </p>
                        )}
                        {request.message && (
                          <p className="text-gray-300 text-sm mt-2">{request.message}</p>
                        )}
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-colors font-medium"
                          >
                            <Check size={16} />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-white/10 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            <X size={16} />
                            Ignore
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div>
            {loadingSuggestions ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-8 text-center">
                <Users2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No suggestions available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.user.id}
                    className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <Link href={`/creator/${suggestion.user.username || suggestion.user.id}`}>
                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                          {suggestion.user.avatar_url ? (
                            <Image
                              src={suggestion.user.avatar_url}
                              alt={suggestion.user.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                              {suggestion.user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/creator/${suggestion.user.username || suggestion.user.id}`}>
                          <h3 className="text-white font-semibold hover:text-red-400 transition-colors mb-1">
                            {suggestion.user.name}
                          </h3>
                        </Link>
                        {suggestion.user.role && (
                          <p className="text-gray-400 text-sm mb-1 line-clamp-2">{suggestion.user.role}</p>
                        )}
                        {suggestion.user.location && (
                          <p className="text-gray-500 text-xs flex items-center gap-1 mb-2">
                            <MapPin size={12} />
                            {suggestion.user.location}
                          </p>
                        )}
                        <p className="text-gray-400 text-xs mb-2">{suggestion.reason}</p>
                        {suggestion.mutual_connections && suggestion.mutual_connections > 0 && (
                          <p className="text-gray-500 text-xs mb-3">
                            {suggestion.mutual_connections} mutual connection
                            {suggestion.mutual_connections > 1 ? 's' : ''}
                          </p>
                        )}
                        <button
                          onClick={() => handleSendRequest(suggestion.user.id)}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-colors font-medium text-sm"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === 'opportunities' && (
          <div>
            {loadingOpportunities ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            ) : opportunities.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-8 text-center">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No opportunities available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connections..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
                />
              </div>
            </div>

            {loadingConnections ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            ) : connections.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-8 text-center">
                <Users2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchQuery ? 'No connections found' : 'No connections yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <Link href={`/creator/${connection.username || connection.id}`}>
                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                          {connection.avatar_url ? (
                            <Image
                              src={connection.avatar_url}
                              alt={connection.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                              {connection.name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/creator/${connection.username || connection.id}`}>
                          <h3 className="text-white font-semibold hover:text-red-400 transition-colors mb-1">
                            {connection.name}
                          </h3>
                        </Link>
                        {connection.role && (
                          <p className="text-gray-400 text-sm mb-1 line-clamp-2">{connection.role}</p>
                        )}
                        {connection.location && (
                          <p className="text-gray-500 text-xs flex items-center gap-1 mb-3">
                            <MapPin size={12} />
                            {connection.location}
                          </p>
                        )}
                        <Link
                          href={`/creator/${connection.username || connection.id}`}
                          className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium"
                        >
                          View Profile
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </main>
        </div>
      </div>
    </div>
  );
}

