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
  X,
  LogOut,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import { Footer } from '../../src/components/layout/Footer';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import SearchDropdown from '@/src/components/search/SearchDropdown';

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
      {/* Header */}
      <header className="header">
        {isMobile ? (
          /* Mobile Header - Apple Music Style */
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%'
          }}>
            {/* LEFT - Hamburger Menu */}
            <button
              id="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Menu size={24} color="white" />
            </button>

            {/* CENTER - Small Logo */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flex: 1
            }}>
              <Link href="/">
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={80}
                  height={22}
                  priority
                  style={{ height: 'auto' }}
                />
              </Link>
            </div>

            {/* RIGHT - Sign In / Profile */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button
                    id="user-menu-button"
                    onClick={(e) => {
                      e.preventDefault();
                      try {
                        const menu = document.getElementById('user-menu');
                        if (menu) {
                          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                        }
                      } catch (error) {
                        console.error('Error toggling user menu:', error);
                      }
                    }}
                    style={{
                      background: 'var(--bg-card)',
                      border: '2px solid var(--accent-primary)',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--hover-bg)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-card)';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <User size={20} color="var(--accent-primary)" />
                  </button>
                </div>
              ) : (
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button
                    style={{
                      background: 'var(--accent-primary)',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'white',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
                  >
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Desktop Header - Original Style */
          <div className="navbar-main" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%',
            gap: '1rem'
          }}>
            {/* LEFT SIDE */}
            <div className="navbar-left" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              flexShrink: 0
            }}>
              <div className="logo">
                <Link href="/">
                  <Image
                    src="/images/logos/logo-trans-lockup.png"
                    alt="SoundBridge Logo"
                    width={120}
                    height={32}
                    priority
                    style={{ height: 'auto' }}
                  />
                </Link>
              </div>
              {/* Desktop Navigation */}
              <nav className="nav" style={{ display: 'flex', gap: '0.5rem' }}>
                <Link href="/" style={{ 
                  textDecoration: 'none', 
                  color: 'var(--text-primary)',
                  transition: 'all 0.3s ease',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  For You
                </Link>
                <Link href="/discover" style={{ 
                  textDecoration: 'none', 
                  color: 'var(--text-primary)',
                  transition: 'all 0.3s ease',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Discover
                </Link>
                <Link href="/events" style={{ 
                  textDecoration: 'none', 
                  color: 'var(--text-primary)',
                  transition: 'all 0.3s ease',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Events
                </Link>
                <Link href="/creators" className="active" style={{ 
                  textDecoration: 'none', 
                  color: 'var(--text-primary)',
                  transition: 'all 0.3s ease',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Creators
                </Link>
                <Link href="/about" style={{ 
                  textDecoration: 'none', 
                  color: 'var(--text-primary)',
                  transition: 'all 0.3s ease',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  About
                </Link>
              </nav>
              
              {/* Spacer between navigation and search */}
              <div style={{ width: '0.25rem' }}></div>
            </div>

            {/* CENTER - Search Bar */}
            <div className="navbar-center">
              <SearchDropdown placeholder="Search creators, events, podcasts..." />
            </div>

            {/* RIGHT SIDE */}
            <div className="navbar-right" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              flexShrink: 0
            }}>
              {/* Upload Button */}
              <Link href="/upload" style={{ textDecoration: 'none' }}>
                <button 
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  <Upload size={16} />
                  Upload
                </button>
              </Link>

              {/* User Menu */}
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button
                    id="user-menu-button"
                    onClick={(e) => {
                      e.preventDefault();
                      try {
                        const menu = document.getElementById('user-menu');
                        if (menu) {
                          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                        }
                      } catch (error) {
                        console.error('Error toggling user menu:', error);
                      }
                    }}
                    style={{
                      background: 'var(--bg-card)',
                      border: '2px solid var(--accent-primary)',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--hover-bg)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-card)';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <User size={20} color="var(--accent-primary)" />
                  </button>
                  
                  <div
                    id="user-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '0.5rem',
                      minWidth: '200px',
                      display: 'none',
                      zIndex: 1000,
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Home size={16} />
                        Dashboard
                      </div>
                    </Link>
                    <Link href="/notifications" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Bell size={16} />
                        Notifications
                      </div>
                    </Link>
                    <Link href="/profile" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <User size={16} />
                        Profile
                      </div>
                    </Link>
                    <Link href="/settings" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Settings size={16} />
                        Settings
                      </div>
                    </Link>
                   
                   {/* Theme Toggle */}
                   <ThemeToggle />
                   
                   <div style={{ height: '1px', background: 'var(--border-primary)', margin: '0.5rem 0' }}></div>
                   <button
                     onClick={handleSignOut}
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.75rem',
                       padding: '0.75rem',
                       color: '#FCA5A5',
                       background: 'none',
                       border: 'none',
                       width: '100%',
                       textAlign: 'left',
                       borderRadius: '8px',
                       cursor: 'pointer',
                       transition: 'all 0.3s ease'
                     }}
                     onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                     onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                   >
                     <LogOut size={16} />
                     Sign Out
                   </button>
                  </div>
                </div>
              ) : (
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button
                    style={{
                      background: 'var(--accent-primary)',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'white',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
                  >
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay - Apple Music Style */}
      {isMobile && isMobileMenuOpen && (
        <div
          id="mobile-menu"
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {/* Mobile Menu Header - Apple Music Style */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            padding: '1rem 0'
          }}>
            <div className="logo">
              <Link href="/">
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={100}
                  height={28}
                  priority
                  style={{ height: 'auto' }}
                />
              </Link>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <X size={16} color="white" />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <Home size={20} />
                For You
              </div>
            </Link>
            
            <Link href="/discover" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <Search size={20} />
                Discover
              </div>
            </Link>
            
            <Link href="/events" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <Calendar size={20} />
                Events
              </div>
            </Link>
            
            <Link href="/creators" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                color: 'var(--text-primary)',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                <Users size={20} />
                Creators
              </div>
            </Link>
            
            <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <User size={20} />
                About
              </div>
            </Link>
          </div>

          {/* Mobile User Actions */}
          {user ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              marginTop: 'auto',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Link href="/upload" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  color: 'white',
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: '600',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Upload size={20} />
                  Upload Content
                </div>
              </Link>
              
              <button
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  handleSignOut(e);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  color: '#FCA5A5',
                  background: 'rgba(220, 38, 38, 0.08)',
                  border: 'none',
                  borderRadius: '12px',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '17px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)'}
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ 
              marginTop: 'auto',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  color: 'white',
                  background: 'var(--accent-primary)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
                >
                  Sign In
                </div>
              </Link>
            </div>
          )}
        </div>
      )}

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

    </>
  );
}
