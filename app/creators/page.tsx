'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Search,
  Filter,
  User,
  Music,
  MapPin,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import { Footer } from '../../src/components/layout/Footer';


// Virtual grid constants
const DESKTOP_CARD_WIDTH = 240;   // Width of each desktop card
const DESKTOP_CARD_HEIGHT = 300;  // Height of each desktop card (increased to fit buttons)
const CONTAINER_HEIGHT = 600;     // Height of the virtual grid container
const GRID_GAP = 16;              // Gap between grid items

// Creator card component for virtual grid
interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  followers_count: number;
  tracks_count: number;
  location?: string;
  is_verified: boolean;
  isFollowing: boolean;
  avatar_url?: string;
}

interface VirtualCreatorItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    creators: Creator[];
    columnsCount: number;
    handleFollow: (creatorId: string) => void;
  };
}

const VirtualCreatorItem = ({ columnIndex, rowIndex, style, data }: VirtualCreatorItemProps) => {
  const { creators, columnsCount, handleFollow } = data;
  const index = rowIndex * columnsCount + columnIndex;
  const creator = creators[index];

  if (!creator) {
    // Empty cell (no creator data)
    return <div style={style}></div>;
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
            background: creator.avatar_url ? `url(${creator.avatar_url})` : 'linear-gradient(45deg, #EC4899, #8B5CF6)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '1.5rem',
            margin: '0 auto 0.75rem',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }}>
            {!creator.avatar_url && creator.display_name.charAt(0)}
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
              WebkitBoxOrient: 'vertical' as const
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

// Mobile list item component for Instagram-style layout
interface MobileCreatorItemProps {
  creator: Creator;
  handleFollow: (creatorId: string) => void;
}

const MobileCreatorItem = ({ creator, handleFollow }: MobileCreatorItemProps) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0.75rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      gap: '0.75rem'
    }}>
      {/* Profile Picture */}
      <div style={{
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: creator.avatar_url ? `url(${creator.avatar_url})` : 'linear-gradient(45deg, #EC4899, #8B5CF6)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '600',
        fontSize: '1.2rem',
        flexShrink: 0,
        position: 'relative',
        border: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        {!creator.avatar_url && creator.display_name.charAt(0)}
        {/* Verified Badge */}
        {creator.is_verified && (
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
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
            fontSize: '0.9rem', 
            fontWeight: '600', 
            color: 'white',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {creator.display_name}
          </h3>
        </div>
        
        {/* Followed by info */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          marginBottom: '0.25rem'
        }}>
          <span style={{ 
            color: '#999', 
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <Users size={12} />
            {creator.followers_count} followers
          </span>
          {creator.location && (
            <span style={{ 
              color: '#999', 
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <MapPin size={12} />
              {creator.location.length > 15 ? creator.location.substring(0, 15) + '...' : creator.location}
            </span>
          )}
        </div>
        
        {/* Bio */}
        {creator.bio && (
          <p style={{ 
            color: '#ccc', 
            fontSize: '0.75rem', 
            margin: 0,
            lineHeight: '1.3',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical' as const
          }}>
            {creator.bio}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFollow(creator.id);
          }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.8rem',
            transition: 'all 0.2s ease',
            background: creator.isFollowing ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            ...(creator.isFollowing && { border: '1px solid rgba(255, 255, 255, 0.2)' })
          }}
        >
          {creator.isFollowing ? 'Following' : 'Follow'}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: '#999',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function CreatorsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('followers');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, hasMore: false });
  const [columnsCount, setColumnsCount] = useState(4); // Number of columns in grid
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch creators function - supports both initial load and pagination
  const fetchCreators = useCallback(async (loadMore = false) => {
    try {
      if (!loadMore) {
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
    }
  }, [searchQuery, selectedGenre, selectedLocation, sortBy, user?.id, pagination.limit, pagination.offset]);

  // Debounce the fetch function
  const debouncedFetchCreators = useCallback(() => {
    const timeoutId = setTimeout(() => fetchCreators(false), 300);
    return () => clearTimeout(timeoutId);
  }, [fetchCreators]);

  // Fetch search suggestions
  const fetchSearchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`/api/search/enhanced?q=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        const suggestions = data.data?.creators?.map((creator: { display_name?: string; username: string }) => creator.display_name || creator.username) || [];
        setSearchSuggestions(suggestions.slice(0, 5));
        setShowSearchSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
    }
  }, []);

  // Debounced search suggestions
  const debouncedSearchSuggestions = useCallback(() => {
    const timeoutId = setTimeout(() => fetchSearchSuggestions(searchQuery), 200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchSearchSuggestions]);


  // Calculate grid dimensions
  const rowCount = Math.ceil(creators.length / columnsCount);

  // Calculate columns based on container width
  const calculateColumns = useCallback((containerWidth: number) => {
    // For now, assume desktop layout (can be enhanced later with proper mobile detection)
    const availableWidth = containerWidth - GRID_GAP;
    const cardWidthWithGap = DESKTOP_CARD_WIDTH + GRID_GAP;
    return Math.max(1, Math.floor(availableWidth / cardWidthWithGap));
  }, []);




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
  }, [fetchCreators]);

  // Reset pagination and fetch when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    debouncedFetchCreators();
  }, [searchQuery, selectedGenre, selectedLocation, sortBy, debouncedFetchCreators]);

  // Trigger search suggestions when query changes
  useEffect(() => {
    debouncedSearchSuggestions();
  }, [searchQuery, debouncedSearchSuggestions]);

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
          <div className="search-filters" style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '1rem' : '1rem',
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
            <div className="search-bar-container" style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: isMobile ? '0.75rem' : '1rem',
                gap: '0.75rem'
              }}>
                <Search size={isMobile ? 18 : 20} style={{ color: '#999', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search creators by name, username, or bio..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    debouncedSearchSuggestions();
                  }}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSearchSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking on them
                    setTimeout(() => setShowSearchSuggestions(false), 200);
                  }}
                  style={{ 
                    flex: 1, 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'white', 
                    outline: 'none',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchSuggestions(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#999',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'rgba(0, 0, 0, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  marginTop: '0.25rem',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setShowSearchSuggestions(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.9rem' : '1rem',
                        borderBottom: index < searchSuggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: isMobile ? '0.5rem' : '0.5rem',
                padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                fontSize: isMobile ? '0.9rem' : '1rem',
                whiteSpace: 'nowrap',
                minWidth: isMobile ? 'auto' : '120px',
                justifyContent: 'center'
              }}
            >
              <Filter size={isMobile ? 16 : 16} />
              {isMobile ? 'Filters' : 'Filters'}
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: isMobile ? '1rem' : '1.5rem',
              marginTop: '1rem',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? '1rem' : '1.5rem'
            }}>
              <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ 
                  fontSize: isMobile ? '0.8rem' : '0.9rem', 
                  fontWeight: '600', 
                  color: '#EC4899' 
                }}>
                  Genre
                </label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  style={{ 
                    background: '#333', 
                    color: 'white', 
                    border: '1px solid #555', 
                    borderRadius: '8px', 
                    padding: isMobile ? '0.75rem' : '0.75rem',
                    fontSize: isMobile ? '0.8rem' : '0.9rem'
                  }}
                >
                  {genres.map((genre) => (
                    <option key={genre.value} value={genre.value}>
                      {genre.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ 
                  fontSize: isMobile ? '0.8rem' : '0.9rem', 
                  fontWeight: '600', 
                  color: '#EC4899' 
                }}>
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  style={{ 
                    background: '#333', 
                    color: 'white', 
                    border: '1px solid #555', 
                    borderRadius: '8px', 
                    padding: isMobile ? '0.75rem' : '0.75rem',
                    fontSize: isMobile ? '0.8rem' : '0.9rem'
                  }}
                >
                  {locations.map((location) => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ 
                  fontSize: isMobile ? '0.8rem' : '0.9rem', 
                  fontWeight: '600', 
                  color: '#EC4899' 
                }}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ 
                    background: '#333', 
                    color: 'white', 
                    border: '1px solid #555', 
                    borderRadius: '8px', 
                    padding: isMobile ? '0.75rem' : '0.75rem',
                    fontSize: isMobile ? '0.8rem' : '0.9rem'
                  }}
                >
                  <option value="hot">🔥 Hot Creators</option>
                  <option value="followers">👥 Most Followers</option>
                  <option value="tracks">🎵 Most Tracks</option>
                  <option value="name">🔤 Name (A-Z)</option>
                  <option value="created_at">🆕 Newest</option>
                </select>
              </div>

              {hasActiveFilters && (
                <div style={{ 
                  gridColumn: isMobile ? '1' : '1 / -1',
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: isMobile ? '0.5rem' : '0'
                }}>
                  <button
                    onClick={clearFilters}
                    className="btn-secondary"
                    style={{ 
                      width: isMobile ? '100%' : '200px',
                      padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
                      fontSize: isMobile ? '0.8rem' : '0.9rem'
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Creators Grid */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title" style={{ 
              fontSize: isMobile ? '1rem' : '1.25rem',
              marginBottom: isMobile ? '0.5rem' : '0.75rem'
            }}>
              {loading ? (
                'Searching creators...'
              ) : searchQuery.trim() ? (
                `Found ${creators.length} of ${pagination.total} creators matching "${searchQuery}"`
              ) : hasActiveFilters ? (
                `Found ${creators.length} of ${pagination.total} creators with current filters`
              ) : (
                `Showing ${creators.length} of ${pagination.total} creators`
              )}
            </h2>
            {pagination.total > 0 && !loading && (
              <p style={{ 
                fontSize: isMobile ? '0.8rem' : '0.9rem', 
                color: '#999', 
                marginTop: '0.25rem',
                lineHeight: '1.4'
              }}>
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
              {/* Mobile List View */}
              {isMobile ? (
                <div style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {creators.map((creator) => (
                    <Link key={creator.id} href={`/creator/${creator.username}`} style={{ textDecoration: 'none' }}>
                      <MobileCreatorItem creator={creator} handleFollow={handleFollow} />
                    </Link>
                  ))}
                </div>
              ) : (
                /* Desktop Grid View */
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
                          columnWidth={(width - GRID_GAP) / columnsCount}
                          height={height}
                          rowCount={rowCount}
                          rowHeight={DESKTOP_CARD_HEIGHT}
                          width={width}
                          itemData={{
                            creators,
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
              )}

              {/* End of Results Indicator */}
              {!pagination.hasMore && creators.length > 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#999',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  marginTop: '2rem'
                }}>
                  <p>You&apos;ve seen all {pagination.total} creators!</p>
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
                  <p style={{ margin: '0.25rem 0' }}>• Only rendering ~{Math.ceil(CONTAINER_HEIGHT / DESKTOP_CARD_HEIGHT) * columnsCount} items instead of {creators.length}</p>
                  <p style={{ margin: '0.25rem 0' }}>• Grid: {columnsCount} columns × {rowCount} rows</p>
                  <p style={{ margin: '0.25rem 0' }}>• Memory usage: ~{Math.round(((Math.ceil(CONTAINER_HEIGHT / DESKTOP_CARD_HEIGHT) * columnsCount) / Math.max(1, creators.length)) * 100)}% of traditional rendering</p>
                  <p style={{ margin: '0.25rem 0' }}>• Supports {pagination.total} creators without performance loss</p>
                </div>
              )}
            </>
          )}
        </section>

        <Footer />
      </main>

    </>
  );
}
