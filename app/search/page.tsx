'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Footer } from '../../src/components/layout/Footer';
import {
  Search,
  Filter,
  X,
  MapPin,
  Music,
  Users,
  Calendar,
  Mic,
  Play,
  Heart,
  Share2,
  ArrowLeft,
  Sliders,
  Loader2,
  AlertCircle,
  User,
  Clock,
  Eye
} from 'lucide-react';
import Image from 'next/image';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// Loading fallback component
function SearchLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-white mx-auto mb-4" />
            <p className="text-white">Loading search results...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main search content component
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState('creators'); // Start with creators as default
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile responsiveness detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Perform search using enhanced API
  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Searching for:', searchTerm);
      const response = await fetch(`/api/search/enhanced?q=${encodeURIComponent(searchTerm)}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Search results:', data);
        setResults(data.data);
      } else {
        throw new Error('Search failed');
      }
    } catch (err) {
      console.error('❌ Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Search when query changes
  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [query]);

  const handleSearch = (newQuery: string) => {
    setSearchQuery(newQuery);
    router.push(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const getResultCount = (type: string) => {
    if (!results) return 0;
    switch (type) {
      case 'music':
        return results.music?.length || 0;
      case 'creators':
        return results.creators?.length || 0;
      case 'events':
        return results.events?.length || 0;
      case 'podcasts':
        return results.podcasts?.length || 0;
      default:
        return 0;
    }
  };

  const totalResults = getResultCount('music') + getResultCount('creators') + getResultCount('events') + getResultCount('podcasts');

  // Format duration helper
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format play count helper
  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-white mx-auto mb-4" />
            <p className="text-white">Searching...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-white">Error: {error}</p>
          </div>
        </div>
      );
    }

    if (!results || totalResults === 0) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
            <p className="text-gray-400 mb-4">
              Try adjusting your search terms to find what you&apos;re looking for.
            </p>
            <p className="text-gray-400">
              You can search for creators, music, events, or podcasts.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-white">
            Found {totalResults} results for &quot;{query}&quot;
          </p>
        </div>

        {/* Instagram-style Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap'
        }} className="tab-navigation">
          {[
            { id: 'creators', label: 'Creators', icon: Users, count: getResultCount('creators') },
            { id: 'music', label: 'Music', icon: Music, count: getResultCount('music') },
            { id: 'events', label: 'Events', icon: Calendar, count: getResultCount('events') },
            { id: 'podcasts', label: 'Podcasts', icon: Mic, count: getResultCount('podcasts') }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  background: isActive ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'rgba(255, 255, 255, 0.1)',
                  color: isActive ? 'white' : '#ccc',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? '600' : '400',
                  flexShrink: '0',
                  minWidth: 'fit-content',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#ccc';
                  }
                }}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '10px',
                    fontWeight: '500'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results Grid/List */}
        {activeTab === 'creators' && results?.creators && (
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? 'none' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '1rem' : '0',
            flexDirection: isMobile ? 'column' : 'row'
          }} className={isMobile ? 'horizontal-scroll' : ''}>
            {results.creators.map((creator: any) => (
              <Link key={creator.id} href={`/creator/${creator.username}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.5rem',
                      fontWeight: '600'
                    }}>
                      {creator.avatar_url ? (
                        <Image
                          src={creator.avatar_url}
                          alt={creator.display_name}
                          width={60}
                          height={60}
                          style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        creator.display_name?.charAt(0)?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '1rem' }}>
                        {creator.display_name}
                      </h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        @{creator.username}
                      </p>
                      {creator.bio && (
                        <p style={{ color: '#ccc', fontSize: '0.8rem' }}>
                          {creator.bio.length > 100 ? `${creator.bio.substring(0, 100)}...` : creator.bio}
                        </p>
                      )}
                      {creator.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                          <MapPin size={12} color="#9ca3af" />
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{creator.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'music' && results?.music && (
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? 'none' : 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '1rem' : '0',
            flexDirection: isMobile ? 'column' : 'row'
          }} className={isMobile ? 'horizontal-scroll' : ''}>
            {results.music.map((track: any) => (
              <div key={track.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '2rem'
                  }}>
                    {track.cover_art_url ? (
                      <Image
                        src={track.cover_art_url}
                        alt={track.title}
                        width={200}
                        height={200}
                        style={{ borderRadius: '8px', objectFit: 'cover' }}
                      />
                    ) : (
                      '🎵'
                    )}
                  </div>
                  <button style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.7)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer'
                  }}>
                    <Play size={16} fill="currentColor" />
                  </button>
                </div>
                <h3 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '1rem' }}>
                  {track.title}
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  {track.creator?.display_name || 'Unknown Artist'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#ccc', fontSize: '0.8rem' }}>
                    {track.duration ? formatDuration(track.duration) : '0:00'}
                  </span>
                  <span style={{ color: '#ccc', fontSize: '0.8rem' }}>
                    {track.play_count ? formatPlayCount(track.play_count) : '0'} plays
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'events' && results?.events && (
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? 'none' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '1rem' : '0',
            flexDirection: isMobile ? 'column' : 'row'
          }} className={isMobile ? 'horizontal-scroll' : ''}>
            {results.events.map((event: any) => (
              <div key={event.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                    {event.title}
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {event.description || 'No description available'}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} color="#9ca3af" />
                    <span style={{ color: '#ccc', fontSize: '0.9rem' }}>
                      {new Date(event.event_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} color="#9ca3af" />
                    <span style={{ color: '#ccc', fontSize: '0.9rem' }}>
                      {event.venue || event.city || 'Location TBD'}
                    </span>
                  </div>
                  {event.organizer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={14} color="#9ca3af" />
                      <span style={{ color: '#ccc', fontSize: '0.9rem' }}>
                        {event.organizer.display_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'podcasts' && results?.podcasts && (
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? 'none' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '1rem' : '0',
            flexDirection: isMobile ? 'column' : 'row'
          }} className={isMobile ? 'horizontal-scroll' : ''}>
            {results.podcasts.map((podcast: any) => (
              <div key={podcast.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    background: 'linear-gradient(45deg, #F97316, #EC4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem'
                  }}>
                    {podcast.cover_art_url ? (
                      <Image
                        src={podcast.cover_art_url}
                        alt={podcast.title}
                        width={60}
                        height={60}
                        style={{ borderRadius: '8px', objectFit: 'cover' }}
                      />
                    ) : (
                      '🎙️'
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '1rem' }}>
                      {podcast.title}
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      {podcast.creator?.display_name || 'Unknown Host'}
                    </p>
                    {podcast.duration && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} color="#9ca3af" />
                        <span style={{ color: '#ccc', fontSize: '0.8rem' }}>
                          {formatDuration(podcast.duration)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">Search Results</h1>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search size={20} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#9ca3af', 
              zIndex: 1 
            }} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Search creators, music, events, podcasts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
            />
          </div>
        </div>

        {/* Results */}
        {renderContent()}
      </div>
      
      <Footer />
    </div>
  );
}

// Main search page component with Suspense
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}