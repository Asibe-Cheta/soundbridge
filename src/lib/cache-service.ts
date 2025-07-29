import { createBrowserClient } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache database queries
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    const data = await queryFn();
    this.set(key, data, ttl);
    return data;
  }

  // Invalidate cache by pattern
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();

// Optimized database service with caching
export class OptimizedDatabaseService {
  private supabase = createBrowserClient();

  // Cached user profile
  async getUserProfile(userId: string) {
    return cacheService.cachedQuery(
      `profile:${userId}`,
      async () => {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return data;
      },
      10 * 60 * 1000 // 10 minutes
    );
  }

  // Cached tracks
  async getPublicTracks(limit = 20) {
    return cacheService.cachedQuery(
      `tracks:public:${limit}`,
      async () => {
        const { data, error } = await this.supabase
          .from('audio_tracks')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data;
      },
      2 * 60 * 1000 // 2 minutes
    );
  }

  // Cached events
  async getUpcomingEvents(limit = 20) {
    return cacheService.cachedQuery(
      `events:upcoming:${limit}`,
      async () => {
        const { data, error } = await this.supabase
          .from('events')
          .select('*')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(limit);

        if (error) throw error;
        return data;
      },
      5 * 60 * 1000 // 5 minutes
    );
  }

  // Invalidate user-related cache
  invalidateUserCache(userId: string): void {
    cacheService.invalidatePattern(`profile:${userId}`);
    cacheService.invalidatePattern('tracks:');
    cacheService.invalidatePattern('events:');
  }

  // Invalidate content cache
  invalidateContentCache(): void {
    cacheService.invalidatePattern('tracks:');
    cacheService.invalidatePattern('events:');
  }
}

export const optimizedDbService = new OptimizedDatabaseService(); 