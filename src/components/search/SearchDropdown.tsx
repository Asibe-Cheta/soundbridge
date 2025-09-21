'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

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
  onFocusSuccess?: () => void;
}

export default function SearchDropdown({ placeholder = "Search creators, events, podcasts...", className = "", onFocusSuccess }: SearchDropdownProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for global focus events from mobile menu
  useEffect(() => {
    const handleGlobalFocusRequest = () => {
      console.log('SearchDropdown: Global focus request received');
      
      // Try ref first
      if (inputRef.current) {
        console.log('SearchDropdown: Using ref to focus input');
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.click();
          setShowSuggestions(true);
          console.log('SearchDropdown: Focus successful via ref');
          onFocusSuccess?.();
        }, 100);
      } else {
        // Fallback to DOM query
        console.log('SearchDropdown: Ref not available, using DOM query');
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            console.log('SearchDropdown: Found input via DOM query');
            searchInput.focus();
            searchInput.click();
            setShowSuggestions(true);
            console.log('SearchDropdown: Focus successful via DOM query');
            onFocusSuccess?.();
          } else {
            console.log('SearchDropdown: Could not find search input');
          }
        }, 100);
      }
    };

    window.addEventListener('focusSearchInput', handleGlobalFocusRequest);
    return () => window.removeEventListener('focusSearchInput', handleGlobalFocusRequest);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    console.log('🎯 Clicking suggestion:', suggestion);
    
    switch (suggestion.type) {
      case 'music':
        console.log('🎵 Navigating to music:', `/track/${suggestion.id}`);
        router.push(`/track/${suggestion.id}`);
        break;
      case 'creator':
        const username = suggestion.subtitle.replace('@', '');
        console.log('👤 Navigating to creator:', `/creator/${username}`);
        router.push(`/creator/${username}`);
        break;
      case 'event':
        console.log('📅 Navigating to event:', `/events/${suggestion.id}`);
        router.push(`/events/${suggestion.id}`);
        break;
      case 'podcast':
        console.log('🎙️ Navigating to podcast:', `/podcast/${suggestion.id}`);
        router.push(`/podcast/${suggestion.id}`);
        break;
    }
    setShowSuggestions(false);
    setSearchQuery('');
  }, [router]);

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
  }, [showSuggestions, searchSuggestions, selectedIndex, searchQuery, router, handleSuggestionClick]);

  const performSearch = async (query: string) => {
    if (query.length < 1) return; // Trigger on single character like Instagram

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search/enhanced?q=${encodeURIComponent(query)}&limit=8`);
      if (response.ok) {
        const data = await response.json();
        const suggestions: SearchSuggestion[] = [];

        // Prioritize creators first (as requested)
        if (data.data?.creators) {
          data.data.creators.forEach((creator: { id: string; display_name?: string; username: string; avatar_url?: string }) => {
            suggestions.push({
              id: creator.id,
              type: 'creator',
              title: creator.display_name || creator.username,
              subtitle: `@${creator.username}`,
              image: creator.avatar_url
            });
          });
        }

        // Add music suggestions
        if (data.data?.music) {
          data.data.music.forEach((track: { id: string; title: string; creator?: { display_name?: string }; cover_art_url?: string }) => {
            suggestions.push({
              id: track.id,
              type: 'music',
              title: track.title,
              subtitle: track.creator?.display_name || 'Unknown Artist',
              image: track.cover_art_url
            });
          });
        }

        // Add event suggestions
        if (data.data?.events) {
          data.data.events.forEach((event: { id: string; title: string; venue?: string; city?: string; image_url?: string }) => {
            suggestions.push({
              id: event.id,
              type: 'event',
              title: event.title,
              subtitle: event.venue || event.city || 'No location',
              image: event.image_url
            });
          });
        }

        // Add podcast suggestions
        if (data.data?.podcasts) {
          data.data.podcasts.forEach((podcast: { id: string; title: string; creator?: { display_name?: string }; cover_art_url?: string }) => {
            suggestions.push({
              id: podcast.id,
              type: 'podcast',
              title: podcast.title,
              subtitle: podcast.creator?.display_name || 'Unknown Host',
              image: podcast.cover_art_url
            });
          });
        }

        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Enhanced search error:', error);
    } finally {
      setIsSearching(false);
    }
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
            color: '#9ca3af', 
            zIndex: 1 
          }} />
          <input
            ref={inputRef}
            type="text"
            className="search-bar placeholder-gray-400"
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
              paddingRight: searchQuery ? '40px' : '16px',
              paddingTop: '12px',
              paddingBottom: '12px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #374151',
              background: '#1f2937',
              color: '#f9fafb',
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
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {isSearching ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto mb-2"></div>
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
                    borderBottom: index < searchSuggestions.length - 1 ? '1px solid #374151' : 'none',
                    background: selectedIndex === index ? '#374151' : '#1f2937',
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
                        color: '#f9fafb',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {suggestion.title}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#9ca3af',
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
          ) : searchQuery.length >= 1 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              No results found for &quot;{searchQuery}&quot;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
