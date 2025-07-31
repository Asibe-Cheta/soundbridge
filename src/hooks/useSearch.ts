import { useState, useEffect, useCallback, useRef } from 'react';
import { searchService } from '../lib/search-service';
import type {
  SearchState,
  SearchFilters,
  SearchResult,
  SearchSuggestion,
  SearchPagination
} from '../lib/types/search';

const initialState: SearchState = {
  query: '',
  filters: {},
  results: null,
  loading: false,
  error: null,
  suggestions: [],
  pagination: {
    page: 1,
    limit: 20,
    total_pages: 0,
    has_next: false,
    has_previous: false
  }
};

export function useSearch() {
  const [state, setState] = useState<SearchState>(initialState);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // Debounced search function
  const debouncedSearch = useCallback((query: string, filters: SearchFilters = {}) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Set loading state
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data, error } = await searchService.searchContent(
          query,
          filters,
          1,
          state.pagination.limit
        );

        if (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error.message || 'Search failed'
          }));
          return;
        }

        // Record search analytics
        if (data) {
          await searchService.recordSearchAnalytics(query, filters, data.total_results);
        }

        setState(prev => ({
          ...prev,
          results: data,
          loading: false,
          pagination: {
            ...prev.pagination,
            page: 1,
            has_next: data?.has_more || false,
            has_previous: false
          }
        }));
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled
        }
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Search failed'
        }));
      }
    }, 300); // 300ms debounce
  }, [state.pagination.limit]);

  // Main search function
  const search = useCallback(async (query: string, filters: SearchFilters = {}) => {
    setState(prev => ({ ...prev, query, filters }));
    debouncedSearch(query, filters);
  }, [debouncedSearch]);

  // Get search suggestions
  const getSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    try {
      const { data, error } = await searchService.getSearchSuggestions(query, 5);

      if (error) {
        console.error('Error getting suggestions:', error);
        return;
      }

      setState(prev => ({ ...prev, suggestions: data || [] }));
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  }, []);

  // Load more results
  const loadMore = useCallback(async () => {
    if (!state.results || !state.pagination.has_next || state.loading) {
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const nextPage = state.pagination.page + 1;
      const { data, error } = await searchService.searchContent(
        state.query,
        state.filters,
        nextPage,
        state.pagination.limit
      );

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load more results'
        }));
        return;
      }

      if (data) {
        setState(prev => ({
          ...prev,
          results: {
            music: [...(prev.results?.music || []), ...data.music],
            creators: [...(prev.results?.creators || []), ...data.creators],
            events: [...(prev.results?.events || []), ...data.events],
            podcasts: [...(prev.results?.podcasts || []), ...data.podcasts],
            total_results: data.total_results,
            has_more: data.has_more
          },
          loading: false,
          pagination: {
            ...prev.pagination,
            page: nextPage,
            has_next: data.has_more,
            has_previous: nextPage > 1
          }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load more results'
      }));
    }
  }, [state.query, state.filters, state.results, state.pagination, state.loading]);

  // Clear search
  const clearSearch = useCallback(() => {
    // Clear timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(initialState);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    setState(prev => ({ ...prev, filters: updatedFilters }));

    // Trigger new search with updated filters
    if (state.query.trim()) {
      debouncedSearch(state.query, updatedFilters);
    }
  }, [state.query, state.filters, debouncedSearch]);

  // Get trending content
  const getTrendingContent = useCallback(async (limit = 20) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await searchService.getTrendingContent(limit);

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load trending content'
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        results: data,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load trending content'
      }));
    }
  }, []);

  // Get nearby content
  const getNearbyContent = useCallback(async (
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    filters: SearchFilters = {}
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await searchService.getNearbyContent(
        latitude,
        longitude,
        radiusKm,
        filters
      );

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load nearby content'
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        results: data,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load nearby content'
      }));
    }
  }, []);

  // Auto-suggestions on query change
  useEffect(() => {
    if (state.query.trim()) {
      getSuggestions(state.query);
    } else {
      setState(prev => ({ ...prev, suggestions: [] }));
    }
  }, [state.query, getSuggestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    query: state.query,
    filters: state.filters,
    results: state.results,
    loading: state.loading,
    error: state.error,
    suggestions: state.suggestions,
    pagination: state.pagination,

    // Actions
    search,
    getSuggestions,
    clearSearch,
    loadMore,
    updateFilters,
    getTrendingContent,
    getNearbyContent,

    // Computed values
    hasResults: !!state.results && (
      state.results.music.length > 0 ||
      state.results.creators.length > 0 ||
      state.results.events.length > 0 ||
      state.results.podcasts.length > 0
    ),
    totalResults: state.results?.total_results || 0,
    canLoadMore: state.pagination.has_next && !state.loading
  };
} 