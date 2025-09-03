'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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

// Virtual grid constants
const DESKTOP_CARD_WIDTH = 240;   // Width of each desktop card
const DESKTOP_CARD_HEIGHT = 300;  // Height of each desktop card (increased to fit buttons)
const MOBILE_ITEM_HEIGHT = 70;    // Height of each mobile list item
const CONTAINER_HEIGHT = 600;     // Height of the virtual grid container
const GRID_GAP = 16;              // Gap between grid items

// Creator card component for virtual grid
interface VirtualCreatorItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    creators: any[];
    isMobile: boolean;
    columnsCount: number;
    handleFollow: (creatorId: string) => void;
  };
}

const VirtualCreatorItem = ({ columnIndex, rowIndex, style, data }: VirtualCreatorItemProps) => {
  const { creators, isMobile, columnsCount, handleFollow } = data;
  const index = rowIndex * columnsCount + columnIndex;
  const creator = creators[index];

  if (!creator) {
    // Empty cell (no creator data)
    return <div style={style}></div>;
  }

  if (isMobile) {
    // Mobile list item (same as existing mobile layout)
    return (
      <div style={style}>
        <Link 
          href={`/creator/${creator.username}`} 
          style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'background-color 0.2s ease',
            cursor: 'pointer',
            height: '100%'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {/* Avatar */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #EC4899, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '1.1rem',
              marginRight: '0.75rem',
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
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
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
                padding: '0.375rem 0.75rem',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                minWidth: '70px'
              }}
            >
              {creator.isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        </Link>
      </div>
    );
  }

  // Desktop grid item (adjusted for grid layout)
  return (
    <div style={{...style, padding: `${GRID_GAP / 2}px`}}>
      <div className="creator-card" style={{ 
        width: '100%',
        height: `${DESKTOP_CARD_HEIGHT - GRID_GAP}px`,
        transform: 'none',
        padding: '1rem 0.75rem'
      }}>
        <div style={{ position: 'relative' }}>
          {/* Avatar */}
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #EC4899, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '1.5rem',
            margin: '0 auto 0.75rem'
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
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              {creator.display_name}
            </h3>
            <p style={{ 
              color: '#ccc', 
              fontSize: '0.75rem', 
              marginBottom: '0.5rem', 
              lineHeight: '1.2',
              height: '2.25rem', // Fixed height for 2 lines
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as any
            }}>
              {creator.bio && creator.bio.length > 30 ? creator.bio.substring(0, 30) + '...' : creator.bio || 'Music creator'}
            </p>
            
            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.375rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#EC4899' }}>
                <Users size={10} />
                {creator.followers_count}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#999' }}>
                <Music size={10} />
                {creator.tracks_count}
              </div>
            </div>

            {/* Location */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.25rem', 
              fontSize: '0.7rem', 
              marginBottom: '0.375rem', 
              color: '#999',
              height: '1rem' // Fixed height
            }}>
              <MapPin size={10} />
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                maxWidth: '120px' // Limit location width
              }}>
                {creator.location && creator.location.length > 15 ? creator.location.substring(0, 15) + '...' : creator.location || 'Unknown'}
              </span>
            </div>

            {/* Country Badge - Removed to give buttons more space */}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFollow(creator.id);
                }}
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  background: creator.isFollowing ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  ...(creator.isFollowing && { border: '1px solid rgba(255, 255, 255, 0.2)' })
                }}
              >
                {creator.isFollowing ? 'Following' : 'Follow'}
              </button>
              <Link href={`/creator/${creator.username}`} style={{ textDecoration: 'none', flex: 1 }}>
                <button 
                  className="view-button"
                  style={{
                    width: '100%',
                    fontSize: '0.75rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '400',
                    transition: 'all 0.2s ease',
                    background: 'transparent'
                  }}
                >
                  View
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CreatorsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('followers');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, hasMore: false });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [columnsCount, setColumnsCount] = useState(4); // Number of columns in grid

  // Fetch creators function - supports both initial load and pagination
  const fetchCreators = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setCreators([]); // Clear existing creators for new search
      }
      setError(null);

      let response;
      
      // Check if we're using the hot creators algorithm
      if (sortBy === 'hot') {
        // Use the hot creators API endpoint
        const params = new URLSearchParams({
          limit: pagination.limit.toString()
        });
        response = await fetch(`/api/creators/hot?${params.toString()}`);
      } else {
        // Use the regular creators API
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
        params.append('limit', pagination.limit.toString());
        params.append('offset', loadMore ? pagination.offset.toString() : '0');
        
        if (user?.id) {
          params.append('currentUserId', user.id);
        }

        response = await fetch(`/api/creators?${params.toString()}`);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch creators: ${response.status}`);
      }

      const result = await response.json();
      
      if (loadMore) {
        // Append new creators to existing list
        setCreators(prev => [...prev, ...(result.data || [])]);
      } else {
        // Replace creators list
        setCreators(result.data || []);
      }
      
      setPagination(result.pagination || { total: 0, limit: 20, offset: 0, hasMore: false });
    } catch (err) {
      console.error('Error fetching creators:', err);
      setError('Failed to load creators');
      if (!loadMore) {
        setCreators([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedGenre, selectedLocation, sortBy, user?.id, pagination.limit]);

  // Debounce the fetch function
  const debouncedFetchCreators = useCallback(
    debounce(() => fetchCreators(false), 300),
    [fetchCreators]
  );

  // Load more function for virtual scrolling
  const loadMoreCreators = useCallback(() => {
    if (!loadingMore && pagination.hasMore) {
      // Update offset for next page
      const nextOffset = pagination.offset + pagination.limit;
      setPagination(prev => ({ ...prev, offset: nextOffset }));
      fetchCreators(true);
    }
  }, [loadingMore, pagination.hasMore, pagination.offset, pagination.limit, fetchCreators]);

  // Check if item is loaded for virtual scrolling
  const isItemLoaded = useCallback((index: number) => {
    return !!creators[index];
  }, [creators]);

  // Calculate grid dimensions
  const rowCount = Math.ceil(creators.length / columnsCount);

  // Calculate columns based on container width
  const calculateColumns = useCallback((containerWidth: number) => {
    if (isMobile) return 1;
    const availableWidth = containerWidth - GRID_GAP;
    const cardWidthWithGap = DESKTOP_CARD_WIDTH + GRID_GAP;
    return Math.max(1, Math.floor(availableWidth / cardWidthWithGap));
  }, [isMobile]);

  // Handle mobile responsiveness and column calculation
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Calculate columns for desktop
      if (!mobile) {
        const containerWidth = Math.min(window.innerWidth - 100, 1200); // Max container width
        setColumnsCount(calculateColumns(containerWidth));
      } else {
        setColumnsCount(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateColumns]);

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
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} creator: ${errorText}`);
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
      // Silently fail to avoid UI disruption
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

  // Removed global unhandled rejection handler to prevent console noise

  // Initial load
  useEffect(() => {
    fetchCreators(false);
  }, []);

  // Reset pagination and fetch when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    debouncedFetchCreators();
  }, [searchQuery, selectedGenre, selectedLocation, sortBy, debouncedFetchCreators]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSortBy('followers');
    setPagination(prev => ({ ...prev, offset: 0 }));
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
                  <option value="hot">🔥 Hot Creators</option>
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
              {loading ? 'Loading creators...' : `${creators.length} of ${pagination.total} Creators Found`}
            </h2>
            {pagination.total > 0 && !loading && (
              <p style={{ fontSize: '0.6rem', color: '#999', marginTop: '0.25rem' }}>
                Showing {Math.min(creators.length, pagination.total)} creators
                {pagination.hasMore && ` • ${pagination.total - creators.length} more available`}
              </p>
            )}
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
              {/* Virtual Grid Container */}
              <div style={{
                width: '100%',
                height: `${CONTAINER_HEIGHT}px`,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <AutoSizer>
                  {({ height, width }) => {
                    // Recalculate columns based on actual container width
                    const actualColumns = calculateColumns(width);
                    if (actualColumns !== columnsCount) {
                      setColumnsCount(actualColumns);
                    }
                    
                    return (
                      <Grid
                        columnCount={columnsCount}
                        columnWidth={isMobile ? width : (width - GRID_GAP) / columnsCount}
                        height={height}
                        rowCount={rowCount}
                        rowHeight={isMobile ? MOBILE_ITEM_HEIGHT : DESKTOP_CARD_HEIGHT}
                        width={width}
                        itemData={{
                          creators,
                          isMobile,
                          columnsCount,
                          handleFollow
                        }}
                      >
                        {VirtualCreatorItem}
                      </Grid>
                    );
                  }}
                </AutoSizer>
              </div>

              {/* End of Results Indicator */}
              {!pagination.hasMore && creators.length > 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#999',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  marginTop: '2rem'
                }}>
                  <p>You've seen all {pagination.total} creators!</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Try adjusting your filters to discover more creators.
                  </p>
                </div>
              )}

              {/* Performance Info (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginTop: '2rem',
                  fontSize: '0.8rem',
                  color: '#22c55e'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#22c55e' }}>🚀 Virtual Grid Active</h4>
                  <p style={{ margin: '0.25rem 0' }}>• Only rendering ~{Math.ceil(CONTAINER_HEIGHT / (isMobile ? MOBILE_ITEM_HEIGHT : DESKTOP_CARD_HEIGHT)) * columnsCount} items instead of {creators.length}</p>
                  <p style={{ margin: '0.25rem 0' }}>• Grid: {columnsCount} columns × {rowCount} rows</p>
                  <p style={{ margin: '0.25rem 0' }}>• Memory usage: ~{Math.round(((Math.ceil(CONTAINER_HEIGHT / (isMobile ? MOBILE_ITEM_HEIGHT : DESKTOP_CARD_HEIGHT)) * columnsCount) / Math.max(1, creators.length)) * 100)}% of traditional rendering</p>
                  <p style={{ margin: '0.25rem 0' }}>• Supports {pagination.total} creators without performance loss</p>
                </div>
              )}
            </>
          )}
        </section>

        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Star size={18} color="white" />
              Become a Creator
            </div>
          </Link>
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Calendar size={18} color="white" />
              Browse Events
            </div>
          </Link>
          <div style={{
            background: 'transparent',
            border: '1px solid white',
            padding: '0.375rem 0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          >
            <Music size={18} color="white" />
            Upload Music
          </div>
          <div style={{
            background: 'transparent',
            border: '1px solid white',
            padding: '0.375rem 0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          >
            <Users size={18} color="white" />
            Find Collaborators
          </div>
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
                color: selectedGenre === genre.value ? '#EC4899' : 'rgba(255, 255, 255, 0.7)',
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
