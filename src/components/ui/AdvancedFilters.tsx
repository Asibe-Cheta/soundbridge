'use client';

import React, { useState } from 'react';
import { 
  Filter, 
  X, 
  MapPin, 
  Music, 
  Calendar, 
  DollarSign, 
  Clock,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface AdvancedFiltersProps {
  genres: FilterOption[];
  locations: FilterOption[];
  dateRanges: FilterOption[];
  priceRanges: FilterOption[];
  sortOptions: FilterOption[];
  selectedGenre: string;
  selectedLocation: string;
  selectedDate: string;
  selectedPrice: string;
  sortBy: string;
  onGenreChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function AdvancedFilters({
  genres,
  locations,
  dateRanges,
  priceRanges,
  sortOptions,
  selectedGenre,
  selectedLocation,
  selectedDate,
  selectedPrice,
  sortBy,
  onGenreChange,
  onLocationChange,
  onDateChange,
  onPriceChange,
  onSortChange,
  onClearFilters,
  showFilters,
  onToggleFilters
}: AdvancedFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    genre: false,
    location: false,
    date: false,
    price: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const hasActiveFilters = selectedGenre !== 'all' || selectedLocation !== 'all' || selectedDate !== 'all' || selectedPrice !== 'all';

  const getActiveFilters = () => {
    const filters = [];
    if (selectedGenre !== 'all') {
      const genre = genres.find(g => g.value === selectedGenre);
      if (genre) filters.push({ type: 'genre', label: genre.label, value: selectedGenre });
    }
    if (selectedLocation !== 'all') {
      const location = locations.find(l => l.value === selectedLocation);
      if (location) filters.push({ type: 'location', label: location.label, value: selectedLocation });
    }
    if (selectedDate !== 'all') {
      const date = dateRanges.find(d => d.value === selectedDate);
      if (date) filters.push({ type: 'date', label: date.label, value: selectedDate });
    }
    if (selectedPrice !== 'all') {
      const price = priceRanges.find(p => p.value === selectedPrice);
      if (price) filters.push({ type: 'price', label: price.label, value: selectedPrice });
    }
    return filters;
  };

  const removeFilter = (type: string) => {
    switch (type) {
      case 'genre':
        onGenreChange('all');
        break;
      case 'location':
        onLocationChange('all');
        break;
      case 'date':
        onDateChange('all');
        break;
      case 'price':
        onPriceChange('all');
        break;
    }
  };

  const activeFilters = getActiveFilters();

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Filter Toggle and Sort */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <button
          onClick={onToggleFilters}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: showFilters ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          <Sliders size={16} />
          Advanced Filters
          {hasActiveFilters && (
            <span style={{
              background: '#EC4899',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '0.5rem'
            }}>
              {activeFilters.length}
            </span>
          )}
        </button>
        
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '0.5rem', 
          marginBottom: '1rem',
          alignItems: 'center'
        }}>
          <span style={{ color: '#999', fontSize: '0.9rem' }}>Active filters:</span>
          {activeFilters.map((filter) => (
            <div
              key={filter.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                background: 'rgba(236, 72, 153, 0.2)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                borderRadius: '20px',
                color: '#EC4899',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => removeFilter(filter.type)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.2)'}
            >
              {filter.label}
              <X size={12} />
            </div>
          ))}
          <button
            onClick={onClearFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textDecoration: 'underline'
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {/* Genre Filter */}
            <div>
              <button
                onClick={() => toggleSection('genre')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem 0',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Music size={16} />
                  Genre
                </div>
                {expandedSections.genre ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSections.genre && (
                <div style={{ marginTop: '0.5rem' }}>
                  {genres.map((genre) => (
                    <label
                      key={genre.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: selectedGenre === genre.value ? '#EC4899' : '#ccc'
                      }}
                    >
                      <input
                        type="radio"
                        name="genre"
                        value={genre.value}
                        checked={selectedGenre === genre.value}
                        onChange={(e) => onGenreChange(e.target.value)}
                        style={{ accentColor: '#EC4899' }}
                      />
                      {genre.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Location Filter */}
            <div>
              <button
                onClick={() => toggleSection('location')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem 0',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} />
                  Location
                </div>
                {expandedSections.location ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSections.location && (
                <div style={{ marginTop: '0.5rem' }}>
                  {locations.map((location) => (
                    <label
                      key={location.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: selectedLocation === location.value ? '#EC4899' : '#ccc'
                      }}
                    >
                      <input
                        type="radio"
                        name="location"
                        value={location.value}
                        checked={selectedLocation === location.value}
                        onChange={(e) => onLocationChange(e.target.value)}
                        style={{ accentColor: '#EC4899' }}
                      />
                      {location.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Date Filter */}
            <div>
              <button
                onClick={() => toggleSection('date')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem 0',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} />
                  Date Range
                </div>
                {expandedSections.date ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSections.date && (
                <div style={{ marginTop: '0.5rem' }}>
                  {dateRanges.map((date) => (
                    <label
                      key={date.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: selectedDate === date.value ? '#EC4899' : '#ccc'
                      }}
                    >
                      <input
                        type="radio"
                        name="date"
                        value={date.value}
                        checked={selectedDate === date.value}
                        onChange={(e) => onDateChange(e.target.value)}
                        style={{ accentColor: '#EC4899' }}
                      />
                      {date.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Price Filter */}
            <div>
              <button
                onClick={() => toggleSection('price')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem 0',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DollarSign size={16} />
                  Price Range
                </div>
                {expandedSections.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSections.price && (
                <div style={{ marginTop: '0.5rem' }}>
                  {priceRanges.map((price) => (
                    <label
                      key={price.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: selectedPrice === price.value ? '#EC4899' : '#ccc'
                      }}
                    >
                      <input
                        type="radio"
                        name="price"
                        value={price.value}
                        checked={selectedPrice === price.value}
                        onChange={(e) => onPriceChange(e.target.value)}
                        style={{ accentColor: '#EC4899' }}
                      />
                      {price.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 