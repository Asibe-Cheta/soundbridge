// src/hooks/useEventCategories.ts
// Hook to fetch and manage event categories

import { useState, useEffect } from 'react';
import { eventCategoryService, EventCategory, MusicGenre } from '../services/EventCategoryService';

export interface UseEventCategoriesResult {
  categories: EventCategory[];
  musicGenres: MusicGenre[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isLatestVersion: boolean;
  version: string;
}

export function useEventCategories(): UseEventCategoriesResult {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [musicGenres, setMusicGenres] = useState<MusicGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState('1.0.0-local');
  const [isLatestVersion, setIsLatestVersion] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories from API (with local fallback)
      const [categoriesData, versionInfo] = await Promise.all([
        eventCategoryService.fetchCategories(),
        eventCategoryService.checkCategoryVersion(),
      ]);

      setCategories(categoriesData.event_categories);
      setMusicGenres(categoriesData.music_genres);
      setVersion(categoriesData.version);
      setIsLatestVersion(versionInfo.isLatest);

      console.log(`Ô£à Event categories loaded: ${categoriesData.event_categories.length} categories`);
    } catch (err) {
      const errorObj = err as Error;
      console.error('ÔØî Error loading event categories:', errorObj);
      setError(errorObj);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchCategories();
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    musicGenres,
    loading,
    error,
    refresh,
    isLatestVersion,
    version,
  };
}

// Hook to get a single category by ID
export function useEventCategory(categoryId: string | null): {
  category: EventCategory | undefined;
  loading: boolean;
} {
  const [category, setCategory] = useState<EventCategory | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      return;
    }

    const fetchCategory = async () => {
      try {
        const cat = await eventCategoryService.getCategoryById(categoryId);
        setCategory(cat);
      } catch (error) {
        console.error('Error fetching category:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId]);

  return { category, loading };
}

// Hook to get a single music genre by ID
export function useMusicGenre(genreId: string | null): {
  genre: MusicGenre | undefined;
  loading: boolean;
} {
  const [genre, setGenre] = useState<MusicGenre | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!genreId) {
      setLoading(false);
      return;
    }

    const fetchGenre = async () => {
      try {
        const genreData = await eventCategoryService.getGenreById(genreId);
        setGenre(genreData);
      } catch (error) {
        console.error('Error fetching genre:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGenre();
  }, [genreId]);

  return { genre, loading };
}

