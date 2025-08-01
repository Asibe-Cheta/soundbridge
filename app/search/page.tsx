'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { AdvancedFilters } from '../../src/components/ui/AdvancedFilters';
import { useSearch } from '../../src/hooks/useSearch';
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
  MessageCircle,
  Star,
  Clock,
  TrendingUp,
  ArrowLeft,
  Sliders,
  Loader2,
  AlertCircle
} from 'lucide-react';

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

// Main search content component that uses useSearchParams
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState('music');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState<'all' | 'today' | 'week' | 'month' | 'next-month'>('all');
  const [selectedPrice, setSelectedPrice] = useState<'all' | 'free' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'trending' | 'latest' | 'popular' | 'nearest'>('relevance');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);

  // Use the search hook
  const {
    results,
    loading,
    error,
    suggestions,
    search,
    updateFilters,
    loadMore,
    hasResults,
    totalResults,
    canLoadMore
  } = useSearch();

  // Initialize search when component mounts or query changes
  useEffect(() => {
    if (query.trim()) {
      const filters = {
        genre: selectedGenre !== 'all' ? selectedGenre : undefined,
        location: selectedLocation !== 'all' ? selectedLocation : undefined,
        date_range: selectedDate !== 'all' ? selectedDate : undefined,
        price_range: selectedPrice !== 'all' ? selectedPrice : undefined,
        sort_by: sortBy,
        content_types: [activeTab as 'music' | 'creators' | 'events' | 'podcasts']
      };
      search(query, filters);
    }
  }, [query, selectedGenre, selectedLocation, selectedDate, selectedPrice, sortBy, activeTab, search]);

  const genres = [
    { value: 'all', label: 'All Genres' },
    { value: 'afrobeats', label: 'Afrobeats' },
    { value: 'gospel', label: 'Gospel' },
    { value: 'uk-drill', label: 'UK Drill' },
    { value: 'highlife', label: 'Highlife' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'hip-hop', label: 'Hip Hop' }
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'london', label: 'London, UK' },
    { value: 'lagos', label: 'Lagos, Nigeria' },
    { value: 'abuja', label: 'Abuja, Nigeria' },
    { value: 'manchester', label: 'Manchester, UK' },
    { value: 'birmingham', label: 'Birmingham, UK' }
  ];

  const dateRanges = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'next-month', label: 'Next Month' }
  ];

  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free' },
    { value: 'low', label: 'Under £10' },
    { value: 'medium', label: '£10 - £50' },
    { value: 'high', label: 'Over £50' }
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'trending', label: 'Trending' },
    { value: 'latest', label: 'Latest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'nearest', label: 'Nearest' }
  ];

  const categories = [
    { id: 'all', label: 'All', icon: Filter },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'creators', label: 'Creators', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'podcasts', label: 'Podcasts', icon: Mic }
  ];

  const handleClearFilters = () => {
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSelectedDate('all');
    setSelectedPrice('all');
    setSortBy('relevance');
    setAppliedFilters([]);
  };

  const handleGenreChange = (value: string) => {
    setSelectedGenre(value);
    if (value !== 'all') {
      setAppliedFilters(prev => [...prev.filter(f => !f.startsWith('genre:')), `genre:${value}`]);
    } else {
      setAppliedFilters(prev => prev.filter(f => !f.startsWith('genre:')));
    }
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    if (value !== 'all') {
      setAppliedFilters(prev => [...prev.filter(f => !f.startsWith('location:')), `location:${value}`]);
    } else {
      setAppliedFilters(prev => prev.filter(f => !f.startsWith('location:')));
    }
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value as any);
    if (value !== 'all') {
      setAppliedFilters(prev => [...prev.filter(f => !f.startsWith('date:')), `date:${value}`]);
    } else {
      setAppliedFilters(prev => prev.filter(f => !f.startsWith('date:')));
    }
  };

  const handlePriceChange = (value: string) => {
    setSelectedPrice(value as any);
    if (value !== 'all') {
      setAppliedFilters(prev => [...prev.filter(f => !f.startsWith('price:')), `price:${value}`]);
    } else {
      setAppliedFilters(prev => prev.filter(f => !f.startsWith('price:')));
    }
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as any);
  };

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

  const renderContent = () => {
    if (loading && !results) {
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

    if (!hasResults) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Search className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-white">No results found for "{query}"</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search terms or filters</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-white">
            Found {totalResults} results for "{query}"
          </p>
          {appliedFilters.length > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Active Filters */}
        {appliedFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {appliedFilters.map((filter, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-sm rounded-full"
              >
                {filter.split(':')[1]}
                <button
                  onClick={() => {
                    const [type, value] = filter.split(':');
                    setAppliedFilters(prev => prev.filter(f => f !== filter));
                    // Reset the corresponding filter
                    switch (type) {
                      case 'genre':
                        setSelectedGenre('all');
                        break;
                      case 'location':
                        setSelectedLocation('all');
                        break;
                      case 'date':
                        setSelectedDate('all');
                        break;
                      case 'price':
                        setSelectedPrice('all');
                        break;
                    }
                  }}
                  className="ml-1 hover:text-red-300"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {[
            { id: 'music', label: 'Music', icon: Music, count: getResultCount('music') },
            { id: 'creators', label: 'Creators', icon: Users, count: getResultCount('creators') },
            { id: 'events', label: 'Events', icon: Calendar, count: getResultCount('events') },
            { id: 'podcasts', label: 'Podcasts', icon: Mic, count: getResultCount('podcasts') }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeTab === 'music' && results?.music?.map((track) => (
            <FloatingCard key={track.id} title={track.title || 'Untitled Track'} className="group">
              <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden mb-4">
                <img
                  src={track.cover_art_url || '/placeholder-cover.jpg'}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-600 p-3 rounded-full">
                    <Play size={20} className="text-white" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1 truncate">{track.title}</h3>
              <p className="text-gray-400 text-sm mb-2">{track.creator?.display_name}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{track.duration}</span>
                <div className="flex items-center gap-2">
                  <button className="text-gray-400 hover:text-red-400 transition-colors">
                    <Heart size={16} />
                  </button>
                  <button className="text-gray-400 hover:text-purple-400 transition-colors">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </FloatingCard>
          ))}

          {activeTab === 'creators' && results?.creators?.map((creator) => (
            <FloatingCard key={creator.id} title={creator.display_name || 'Unknown Creator'} className="group">
              <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden mb-4">
                <img
                  src={creator.avatar_url || '/placeholder-avatar.jpg'}
                  alt={creator.display_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-600 p-3 rounded-full">
                    <Users size={20} className="text-white" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1 truncate">{creator.display_name}</h3>
              <p className="text-gray-400 text-sm mb-2">@{creator.username}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{creator.followers_count} followers</span>
                <div className="flex items-center gap-2">
                  <button className="text-gray-400 hover:text-red-400 transition-colors">
                    <Heart size={16} />
                  </button>
                  <button className="text-gray-400 hover:text-purple-400 transition-colors">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </FloatingCard>
          ))}

          {activeTab === 'events' && results?.events?.map((event) => (
            <FloatingCard key={event.id} title={event.title || 'Untitled Event'} className="group">
              <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden mb-4">
                <img
                  src={event.image_url || '/placeholder-event.jpg'}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-600 p-3 rounded-full">
                    <Calendar size={20} className="text-white" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1 truncate">{event.title}</h3>
              <p className="text-gray-400 text-sm mb-2">{event.formatted_date}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <MapPin size={14} />
                  {event.location}
                </span>
                <div className="flex items-center gap-2">
                  <button className="text-gray-400 hover:text-red-400 transition-colors">
                    <Heart size={16} />
                  </button>
                  <button className="text-gray-400 hover:text-purple-400 transition-colors">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </FloatingCard>
          ))}

          {activeTab === 'podcasts' && results?.podcasts?.map((podcast) => (
            <FloatingCard key={podcast.id} title={podcast.title || 'Untitled Podcast'} className="group">
              <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden mb-4">
                <img
                  src={podcast.cover_art_url || '/placeholder-podcast.jpg'}
                  alt={podcast.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-600 p-3 rounded-full">
                    <Mic size={20} className="text-white" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1 truncate">{podcast.title}</h3>
              <p className="text-gray-400 text-sm mb-2">{podcast.creator?.display_name}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{podcast.duration || 'Unknown duration'}</span>
                <div className="flex items-center gap-2">
                  <button className="text-gray-400 hover:text-red-400 transition-colors">
                    <Heart size={16} />
                  </button>
                  <button className="text-gray-400 hover:text-purple-400 transition-colors">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </FloatingCard>
          ))}
        </div>

        {/* Load More Button */}
        {canLoadMore && (
          <div className="text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Loading...
                </div>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-white hover:text-purple-400 transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  placeholder="Search for music, creators, events..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-lg transition-colors ${showFilters ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
            >
              <Sliders size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <AdvancedFilters
          categories={categories}
          genres={genres}
          locations={locations}
          dateRanges={dateRanges}
          priceRanges={priceRanges}
          sortOptions={sortOptions}
          selectedCategory={activeTab}
          selectedGenre={selectedGenre}
          selectedLocation={selectedLocation}
          selectedDate={selectedDate}
          selectedPrice={selectedPrice}
          sortBy={sortBy}
          onCategoryChange={setActiveTab}
          onGenreChange={handleGenreChange}
          onLocationChange={handleLocationChange}
          onDateChange={handleDateChange}
          onPriceChange={handlePriceChange}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {renderContent()}
      </div>

      <Footer />
    </div>
  );
}

// Main page component with Suspense boundary
export default function SearchResultsPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
} 