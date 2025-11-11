// src/services/EventCategoryService.ts
// Service to fetch and manage event categories from backend

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENT_CATEGORIES } from '../constants/eventCategories';

export interface EventCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  examples: string[];
  sortOrder: number;
}

export interface MusicGenre {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface EventCategoriesResponse {
  event_categories: EventCategory[];
  music_genres: MusicGenre[];
  version: string;
  last_updated: string;
}

const CACHE_KEY = 'event_categories_cache';
const CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours

class EventCategoryService {
  private cachedCategories: EventCategoriesResponse | null = null;

  /**
   * Fetch event categories from backend API
   * Uses local fallback if API fails
   */
  async fetchCategories(forceRefresh: boolean = false): Promise<EventCategoriesResponse> {
    try {
      // Check cache first
      if (!forceRefresh && this.cachedCategories) {
        console.log('Ô£à Using cached event categories');
        return this.cachedCategories;
      }

      // Try to get from AsyncStorage
      const cached = await this.getCachedCategories();
      if (!forceRefresh && cached && !this.isCacheExpired(cached.last_updated)) {
        console.log('Ô£à Using cached event categories from storage');
        this.cachedCategories = cached;
        return cached;
      }

      // Fetch from API
      console.log('­ƒîÉ Fetching event categories from API...');
      const response = await fetch('https://soundbridge.live/api/event-categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid API response format');
      }

      const categoriesData = result.data as EventCategoriesResponse;

      // Cache the result
      await this.cacheCategories(categoriesData);
      this.cachedCategories = categoriesData;

      console.log('Ô£à Event categories fetched and cached successfully');
      console.log(`­ƒôè Categories: ${categoriesData.event_categories.length}, Genres: ${categoriesData.music_genres.length}`);

      return categoriesData;
    } catch (error) {
      console.error('ÔØî Error fetching event categories:', error);
      console.log('ÔÜá´©Å Falling back to local categories');

      // Return local fallback
      return this.getLocalFallback();
    }
  }

  /**
   * Get event categories (tries API first, falls back to local)
   */
  async getEventCategories(): Promise<EventCategory[]> {
    const data = await this.fetchCategories();
    return data.event_categories;
  }

  /**
   * Get music genres
   */
  async getMusicGenres(): Promise<MusicGenre[]> {
    const data = await this.fetchCategories();
    return data.music_genres;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<EventCategory | undefined> {
    const categories = await this.getEventCategories();
    return categories.find(cat => cat.id === id);
  }

  /**
   * Get music genre by ID
   */
  async getGenreById(id: string): Promise<MusicGenre | undefined> {
    const genres = await this.getMusicGenres();
    return genres.find(genre => genre.id === id);
  }

  /**
   * Force refresh categories from API
   */
  async refreshCategories(): Promise<EventCategoriesResponse> {
    return this.fetchCategories(true);
  }

  /**
   * Clear cached categories
   */
  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
    this.cachedCategories = null;
    console.log('Ô£à Event categories cache cleared');
  }

  // ===== PRIVATE METHODS =====

  private async getCachedCategories(): Promise<EventCategoriesResponse | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      return JSON.parse(cached) as EventCategoriesResponse;
    } catch (error) {
      console.error('ÔØî Error reading cached categories:', error);
      return null;
    }
  }

  private async cacheCategories(data: EventCategoriesResponse): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('ÔØî Error caching categories:', error);
    }
  }

  private isCacheExpired(lastUpdated: string): boolean {
    const lastUpdatedTime = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

    return (now - lastUpdatedTime) > expiryTime;
  }

  /**
   * Local fallback using our constants
   */
  private getLocalFallback(): EventCategoriesResponse {
    // Convert our local EVENT_CATEGORIES to API format
    const eventCategories: EventCategory[] = EVENT_CATEGORIES
      .filter(cat => cat.id !== 'other_events') // Exclude "other" from main list
      .map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon.replace('-outline', ''), // Remove -outline suffix
        examples: this.getExamplesForCategory(cat.id),
        sortOrder: index + 1,
      }));

    // Add "other_events" at the end
    const otherCategory = EVENT_CATEGORIES.find(cat => cat.id === 'other_events');
    if (otherCategory) {
      eventCategories.push({
        id: otherCategory.id,
        name: otherCategory.name,
        description: otherCategory.description,
        icon: otherCategory.icon.replace('-outline', ''),
        examples: ['Miscellaneous events'],
        sortOrder: 99,
      });
    }

    // Music genres fallback
    const musicGenres: MusicGenre[] = [
      { id: 'gospel', name: 'Gospel', description: 'Gospel music events', sortOrder: 1 },
      { id: 'afrobeat', name: 'Afrobeat', description: 'Afrobeat music events', sortOrder: 2 },
      { id: 'jazz', name: 'Jazz', description: 'Jazz music events', sortOrder: 3 },
      { id: 'hip_hop', name: 'Hip-Hop', description: 'Hip-hop music events', sortOrder: 4 },
      { id: 'classical', name: 'Classical', description: 'Classical music events', sortOrder: 5 },
      { id: 'rock', name: 'Rock', description: 'Rock music events', sortOrder: 6 },
      { id: 'pop', name: 'Pop', description: 'Pop music events', sortOrder: 7 },
      { id: 'r_b', name: 'R&B', description: 'R&B music events', sortOrder: 8 },
      { id: 'reggae', name: 'Reggae', description: 'Reggae music events', sortOrder: 9 },
      { id: 'soul', name: 'Soul', description: 'Soul music events', sortOrder: 10 },
      { id: 'blues', name: 'Blues', description: 'Blues music events', sortOrder: 11 },
      { id: 'electronic', name: 'Electronic', description: 'Electronic music events', sortOrder: 12 },
      { id: 'country', name: 'Country', description: 'Country music events', sortOrder: 13 },
      { id: 'other', name: 'Other', description: 'Other music genres', sortOrder: 14 },
    ];

    return {
      event_categories: eventCategories,
      music_genres: musicGenres,
      version: '1.0.0-local',
      last_updated: new Date().toISOString(),
    };
  }

  private getExamplesForCategory(categoryId: string): string[] {
    const examples: Record<string, string[]> = {
      concerts_live_music: ['Gospel concerts', 'Afrobeat shows', 'Jazz nights', 'Rock concerts'],
      festivals_carnivals: ['Cultural festivals', 'Street parties', 'Carnival celebrations'],
      comedy_entertainment: ['Stand-up comedy', 'Comedy clubs', 'Entertainment shows'],
      parties_celebrations: ['Birthday parties', 'Anniversary celebrations', 'Get-togethers'],
      networking_meetups: ['Business networking', 'Professional meetups', 'Community events'],
      religious_spiritual: ['Church services', 'Prayer meetings', 'Gospel events', 'Worship nights'],
      conferences_seminars: ['Tech conferences', 'Business summits', 'Industry seminars'],
      workshops_training: ['Skill workshops', 'Training sessions', 'Educational seminars'],
      business_entrepreneurship: ['Startup events', 'Business launches', 'Entrepreneur forums'],
      arts_exhibitions: ['Art galleries', 'Photo exhibitions', 'Creative showcases'],
      theater_performances: ['Theater plays', 'Stage performances', 'Drama shows'],
      sports_fitness: ['Sports tournaments', 'Fitness classes', 'Athletic events'],
      food_dining: ['Food festivals', 'Wine tasting', 'Chef dinners'],
      charity_fundraising: ['Charity galas', 'Fundraising events', 'Community service'],
      tech_innovation: ['Tech meetups', 'Hackathons', 'Product launches'],
    };

    return examples[categoryId] || [];
  }

  /**
   * Check if categories are in sync with backend
   */
  async checkCategoryVersion(): Promise<{ isLatest: boolean; version: string }> {
    try {
      const data = await this.fetchCategories();
      const isLatest = data.version !== '1.0.0-local'; // Local fallback version

      return {
        isLatest,
        version: data.version,
      };
    } catch (error) {
      return {
        isLatest: false,
        version: '1.0.0-local',
      };
    }
  }
}

// Export singleton instance
export const eventCategoryService = new EventCategoryService();

