'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

// Search suggestion types
interface SearchSuggestion {
  id: string;
  type: 'music' | 'creator' | 'event' | 'podcast';
  title: string;
  subtitle: string;
  image?: string;
}

interface SearchDropdownProps {
  placeholder?: string;
  className?: string;
}

export default function SearchDropdown({ placeholder = "Search creators, events, podcasts...", className = "" }: SearchDropdownProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery.trim());
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < searchSuggestions.length) {
            handleSuggestionClick(searchSuggestions[selectedIndex]);
          } else if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, searchSuggestions, selectedIndex, searchQuery, router]);

  const performSearch = async (query: string) => {
    if (query.length < 2) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
      if (response.ok) {
        const data = await response.json();
        const suggestions: SearchSuggestion[] = [];

        // Add music suggestions
        if (data.data?.music) {
          data.data.music.forEach((track: any) => {
            suggestions.push({
              id: track.id,
              type: 'music',
              title: track.title,
              subtitle: track.creator?.display_name || 'Unknown Artist',
              image: track.cover_art_url
            });
          });
        }

        // Add creator suggestions
        if (data.data?.creators) {
          data.data.creators.forEach((creator: any) => {
            suggestions.push({
              id: creator.id,
              type: 'creator',
              title: creator.display_name || creator.username,
              subtitle: `@${creator.username}`,
              image: creator.avatar_url
            });
          });
        }

        // Add event suggestions
        if (data.data?.events) {
          data.data.events.forEach((event: any) => {
            suggestions.push({
              id: event.id,
              type: 'event',
              title: event.title,
              subtitle: event.location || 'No location',
              image: event.image_url
            });
          });
        }

        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'music':
        router.push(`/track/${suggestion.id}`);
        break;
      case 'creator':
        router.push(`/creator/${suggestion.id}`);
        break;
      case 'event':
        router.push(`/event/${suggestion.id}`);
        break;
      case 'podcast':
        router.push(`/podcast/${suggestion.id}`);
        break;
    }
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '600px' }} className={className}>
      <form onSubmit={handleSearchSubmit}>
        <div className="relative">
          <Search size={16} style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#6b7280', 
            zIndex: 1 
          }} />
          <input
            type="text"
            className="search-bar"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            style={{
              width: '100%',
              paddingLeft: '40px',
              paddingRight: searchQuery ? '80px' : '16px',
              paddingTop: '12px',
              paddingBottom: '12px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#374151',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              style={{
                position: 'absolute',
                right: '40px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#3b82f6',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            Search
          </button>
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {isSearching ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : searchSuggestions.length > 0 ? (
            <div>
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: index < searchSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                    background: selectedIndex === index ? '#f3f4f6' : 'white',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Type Icon */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: suggestion.type === 'music' ? '#ef4444' :
                                 suggestion.type === 'creator' ? '#8b5cf6' :
                                 suggestion.type === 'event' ? '#10b981' : '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {suggestion.type === 'music' ? '🎵' :
                       suggestion.type === 'creator' ? '👤' :
                       suggestion.type === 'event' ? '📅' : '🎙️'}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {suggestion.title}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {suggestion.subtitle}
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: suggestion.type === 'music' ? '#ef4444' :
                             suggestion.type === 'creator' ? '#8b5cf6' :
                             suggestion.type === 'event' ? '#10b981' : '#f59e0b',
                      background: suggestion.type === 'music' ? '#fef2f2' :
                                 suggestion.type === 'creator' ? '#f3f4f6' :
                                 suggestion.type === 'event' ? '#ecfdf5' : '#fffbeb',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {suggestion.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No results found for "{searchQuery}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
