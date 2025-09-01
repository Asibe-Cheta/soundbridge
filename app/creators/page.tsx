'use client';

import React, { useState, useEffect } from 'react';
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
import { useCreators } from '../../src/hooks/useCreators';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';

export default function CreatorsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [creatorsState, creatorsActions] = useCreators();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('followers');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      creatorsActions.updateFilters({ search: searchQuery.trim() });
    }
  };

  const handleFollow = async (creatorId: string) => {
    const creator = creatorsState.creators.find(c => c.id === creatorId);
    if (!creator) return;

    if (creator.isFollowing) {
      const result = await creatorsActions.unfollowCreator(creatorId);
      if (!result.success) {
        console.error('Failed to unfollow:', result.error);
      }
    } else {
      const result = await creatorsActions.followCreator(creatorId);
      if (!result.success) {
        console.error('Failed to follow:', result.error);
      }
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

  // Update filters when they change
  useEffect(() => {
    creatorsActions.updateFilters({
      search: searchQuery,
      genre: selectedGenre !== 'all' ? selectedGenre : undefined,
      location: selectedLocation !== 'all' ? selectedLocation : undefined,
      sortBy: sortBy as any
    });
  }, [searchQuery, selectedGenre, selectedLocation, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSortBy('followers');
  };

  const hasActiveFilters = searchQuery || selectedGenre !== 'all' || selectedLocation !== 'all';

  return (
    <>
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
            <h2 className="section-title">
              {creatorsState.loading ? 'Loading creators...' : `${creatorsState.creators.length} Creators Found`}
            </h2>
          </div>

          {/* Error Display */}
          {creatorsState.error && (
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
              <span>{creatorsState.error}</span>
            </div>
          )}

          {creatorsState.loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: '#EC4899' }} />
            </div>
          ) : creatorsState.creators.length === 0 ? (
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
            <div className="grid grid-4">
              {creatorsState.creators.map((creator) => (
                <div key={creator.id} className="card">
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
                        @{creator.username}
                      </p>
                      <p style={{ color: '#999', fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '1rem' }}>
                        {creator.bio}
                      </p>
                    </div>

                                         {/* Stats */}
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                       <div style={{ textAlign: 'center' }}>
                         <div style={{ color: '#EC4899', fontWeight: '600', fontSize: '1.1rem' }}>
                           {creator.followers_count.toLocaleString()}
                         </div>
                         <div style={{ color: '#999', fontSize: '0.8rem' }}>Followers</div>
                       </div>
                       <div style={{ textAlign: 'center' }}>
                         <div style={{ color: '#EC4899', fontWeight: '600', fontSize: '1.1rem' }}>
                           {creator.tracks_count}
                         </div>
                         <div style={{ color: '#999', fontSize: '0.8rem' }}>Tracks</div>
                       </div>
                       <div style={{ textAlign: 'center' }}>
                         <div style={{ color: '#EC4899', fontWeight: '600', fontSize: '1.1rem' }}>
                           {creator.events_count}
                         </div>
                         <div style={{ color: '#999', fontSize: '0.8rem' }}>Events</div>
                       </div>
                     </div>

                     {/* Additional Info */}
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem' }}>
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
              ))}
            </div>
          )}

          {/* Load More Button */}
          {creatorsState.pagination.hasMore && !creatorsState.loading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={creatorsActions.loadMore}
                className="btn-secondary"
              >
                Load More Creators
              </button>
            </div>
          )}
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
