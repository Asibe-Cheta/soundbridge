'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  User,
  Music,
  MapPin,
  Star,
  Users,
  Calendar,
  Upload,
  Bell,
  Settings,
  Home,
  Menu,
  LogOut,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function CreatorsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('followers');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Debounced fetch function
  const fetchCreators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (selectedGenre !== 'all') {
        params.append('genre', selectedGenre);
      }
      if (selectedLocation !== 'all') {
        params.append('location', selectedLocation);
      }
      params.append('sortBy', sortBy);
      params.append('limit', '20');
      
      if (user?.id) {
        params.append('currentUserId', user.id);
      }

      const response = await fetch(`/api/creators?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }

      const result = await response.json();
      setCreators(result.data || []);
    } catch (err) {
      console.error('Error fetching creators:', err);
      setError('Failed to load creators');
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedGenre, selectedLocation, sortBy, user?.id]);

  // Debounce the fetch function
  const debouncedFetchCreators = useCallback(
    debounce(fetchCreators, 300),
    [fetchCreators]
  );

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.getElementById('mobile-menu');
      const mobileMenuButton = document.getElementById('mobile-menu-button');
      if (mobileMenu && mobileMenuButton && 
          !mobileMenu.contains(event.target as Node) && 
          !mobileMenuButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Search will be triggered by useEffect when searchQuery changes
    }
  };

  const handleFollow = async (creatorId: string) => {
    const creator = creators.find(c => c.id === creatorId);
    if (!creator || !user) return;

    try {
      const isFollowing = creator.isFollowing;
      const endpoint = isFollowing ? `/api/follows/${creatorId}` : '/api/follows';
      const method = isFollowing ? 'DELETE' : 'POST';
      const body = isFollowing ? undefined : JSON.stringify({ following_id: creatorId });

      const response = await fetch(endpoint, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} creator`);
      }

      // Update local state
      setCreators(prev => prev.map(c =>
        c.id === creatorId
          ? {
              ...c,
              isFollowing: !isFollowing,
              followers_count: isFollowing 
                ? Math.max(0, c.followers_count - 1)
                : c.followers_count + 1
            }
          : c
      ));
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  const genres = [
    { value: 'all', label: 'All Genres' },
    { value: 'Gospel', label: 'Gospel' },
    { value: 'Afrobeat', label: 'Afrobeat' },
    { value: 'Jazz', label: 'Jazz' },
    { value: 'Christian', label: 'Christian' },
    { value: 'Classical', label: 'Classical' },
    { value: 'Hip-Hop', label: 'Hip-Hop' },
    { value: 'Pop', label: 'Pop' },
    { value: 'Rock', label: 'Rock' }
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'london', label: 'London, UK' },
    { value: 'lagos', label: 'Lagos, Nigeria' },
    { value: 'abuja', label: 'Abuja, Nigeria' },
    { value: 'manchester', label: 'Manchester, UK' },
    { value: 'birmingham', label: 'Birmingham, UK' },
    { value: 'liverpool', label: 'Liverpool, UK' }
  ];

  // Initial load and filter changes
  useEffect(() => {
    fetchCreators();
  }, []);

  // Debounced filter changes
  useEffect(() => {
    debouncedFetchCreators();
  }, [searchQuery, selectedGenre, selectedLocation, sortBy, debouncedFetchCreators]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSortBy('followers');
  };

  const hasActiveFilters = searchQuery || selectedGenre !== 'all' || selectedLocation !== 'all';

  return (
    <>
      <main className="main-container">
        {/* Search and Filters */}
        <section className="section">
          <div className="search-filters">
            <div className="search-bar-container">
              <Search size={20} style={{ color: '#999' }} />
              <input
                type="text"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Filter size={16} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <div className="filter-group">
                <label>Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  {genres.map((genre) => (
                    <option key={genre.value} value={genre.value}>
                      {genre.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  {locations.map((location) => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  <option value="followers">Followers</option>
                  <option value="rating">Rating</option>
                  <option value="tracks">Tracks</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </section>

        {/* Creators Grid */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: '0.72rem' }}>
              {loading ? 'Loading creators...' : `${creators.length} Creators Found`}
            </h2>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              marginBottom: '1rem',
              color: '#ef4444'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: '#EC4899' }} />
            </div>
          ) : creators.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
              <User size={48} style={{ marginBottom: '1rem', opacity: '0.5' }} />
              <h3>No creators found</h3>
              <p>Try adjusting your search criteria or filters.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn-primary" style={{ marginTop: '1rem' }}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Grid Layout */}
              <div className="hidden md:block">
                <div className="grid" style={{ 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1.5rem',
                  padding: '1rem',
                  justifyItems: 'center'
                }}>
                  {creators.map((creator) => (
                    <div key={creator.id} className="card" style={{ 
                      transform: 'scale(0.6)', 
                      transformOrigin: 'center',
                      width: 'fit-content'
                    }}>
                      <div style={{ position: 'relative' }}>
                        {/* Avatar */}
                        <div style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #EC4899, #8B5CF6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '2rem',
                          margin: '0 auto 1rem'
                        }}>
                          {creator.display_name.charAt(0)}
                        </div>

                        {/* Verified Badge */}
                        {creator.is_verified && (
                          <div style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem'
                          }}>
                            ✓
                          </div>
                        )}

                        {/* Creator Info */}
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            {creator.display_name}
                          </h3>
                          <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            {creator.bio || 'No bio available'}
                          </p>
                          
                          {/* Stats */}
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#EC4899' }}>
                              <Users size={12} />
                              {creator.followers_count} followers
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#999' }}>
                              <Music size={12} />
                              {creator.tracks_count} tracks
                            </div>
                          </div>

                          {/* Location and Date */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#999' }}>
                              <MapPin size={12} />
                              {creator.location || 'Unknown'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#999' }}>
                              <Calendar size={12} />
                              {new Date(creator.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Country Badge */}
                          {creator.country && (
                            <div style={{
                              background: 'rgba(236, 72, 153, 0.2)',
                              border: '1px solid rgba(236, 72, 153, 0.3)',
                              borderRadius: '20px',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.8rem',
                              color: '#EC4899',
                              textAlign: 'center',
                              marginBottom: '1rem'
                            }}>
                              {creator.country}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleFollow(creator.id)}
                              className={creator.isFollowing ? 'btn-secondary' : 'btn-primary'}
                              style={{ flex: 1, fontSize: '0.9rem' }}
                            >
                              {creator.isFollowing ? 'Following' : 'Follow'}
                            </button>
                            <Link href={`/creator/${creator.username}`} style={{ textDecoration: 'none', flex: 1 }}>
                              <button className="btn-secondary" style={{ width: '100%', fontSize: '0.9rem' }}>
                                View Profile
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile List Layout - Instagram Style */}
              <div className="block md:hidden">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                  {creators.map((creator) => (
                    <Link 
                      key={creator.id} 
                      href={`/creator/${creator.username}`} 
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'background-color 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #EC4899, #8B5CF6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '1.2rem',
                          marginRight: '1rem',
                          flexShrink: 0,
                          position: 'relative'
                        }}>
                          {creator.display_name.charAt(0)}
                          {/* Verified Badge */}
                          {creator.is_verified && (
                            <div style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              background: '#EC4899',
                              color: 'white',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              border: '2px solid #000'
                            }}>
                              ✓
                            </div>
                          )}
                        </div>

                        {/* Creator Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <h3 style={{ 
                              fontSize: '1rem', 
                              fontWeight: '600', 
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1
                            }}>
                              {creator.display_name}
                            </h3>
                            {creator.country && (
                              <span style={{
                                background: 'rgba(236, 72, 153, 0.2)',
                                color: '#EC4899',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: '500',
                                flexShrink: 0
                              }}>
                                {creator.country}
                              </span>
                            )}
                          </div>

                          <p style={{ 
                            color: '#999', 
                            fontSize: '0.85rem', 
                            margin: '0 0 0.25rem 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {creator.bio || 'Music creator'}
                          </p>

                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            fontSize: '0.75rem', 
                            color: '#666'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Users size={10} />
                              {creator.followers_count} followers
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Music size={10} />
                              {creator.tracks_count} tracks
                            </span>
                            {creator.location && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MapPin size={10} />
                                {creator.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Follow Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleFollow(creator.id);
                          }}
                          style={{
                            background: creator.isFollowing ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(45deg, #DC2626, #EC4899)',
                            color: 'white',
                            border: creator.isFollowing ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                            minWidth: '80px'
                          }}
                          onMouseEnter={(e) => {
                            if (creator.isFollowing) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            } else {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (creator.isFollowing) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            } else {
                              e.currentTarget.style.transform = 'scale(1)';
                            }
                          }}
                        >
                          {creator.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Load More Button - Removed for performance optimization */}
        </section>

        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div className="quick-actions">
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div className="quick-action">Become a Creator</div>
          </Link>
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <div className="quick-action">Browse Events</div>
          </Link>
          <div className="quick-action">Upload Music</div>
          <div className="quick-action">Find Collaborators</div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Creator Categories</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          {genres.slice(1).map((genre) => (
            <button
              key={genre.value}
              onClick={() => setSelectedGenre(genre.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: selectedGenre === genre.value ? '#EC4899' : '#ccc',
                textAlign: 'left',
                cursor: 'pointer',
                padding: '0.25rem 0'
              }}
            >
              {genre.label}
            </button>
          ))}
        </div>
      </FloatingCard>
    </>
  );
}
