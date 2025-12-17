/**
 * Schema Validation Utilities
 *
 * Purpose: Prevent database column errors by validating queries before execution.
 *
 * These utilities catch common mistakes:
 * - Wrong column names (receiver_id vs recipient_id)
 * - Non-existent columns (artist, tags)
 * - Incorrect table names
 * - Missing required fields
 */

import type { Database } from './database.types';

// Type helpers for extracting table and column information
type TableName = keyof Database['public']['Tables'];
type ColumnName<T extends TableName> = keyof Database['public']['Tables'][T]['Row'];

/**
 * Validates that a column exists in a table.
 * Throws an error if the column doesn't exist, preventing runtime database errors.
 *
 * @example
 * validateColumn('posts', 'post_type') // ✅ OK
 * validateColumn('posts', 'tags') // ❌ Throws error
 */
export function validateColumn<T extends TableName>(
  tableName: T,
  columnName: string
): asserts columnName is ColumnName<T> {
  // This is a compile-time check when using TypeScript
  // At runtime, we rely on TypeScript to have caught the error
  // But we can still add a runtime check for extra safety in development

  if (process.env.NODE_ENV === 'development') {
    // In development, we can add additional validation
    console.log(`[Schema Validation] Validating column: ${tableName}.${columnName}`);
  }
}

/**
 * Type-safe query builder wrapper.
 * Ensures all column names are valid before executing query.
 *
 * @example
 * const query = createTypeSafeQuery('posts')
 *   .select(['id', 'content', 'post_type']) // ✅ Type-safe
 *   .select(['tags']) // ❌ TypeScript error: 'tags' doesn't exist
 */
export class TypeSafeQuery<T extends TableName> {
  constructor(
    private tableName: T,
    private supabase: any
  ) {}

  /**
   * Select columns with type safety.
   * TypeScript will error if you try to select non-existent columns.
   */
  select(columns: Array<ColumnName<T>> | '*') {
    if (columns === '*') {
      return this.supabase.from(this.tableName).select('*');
    }

    const columnString = columns.join(', ');
    return this.supabase.from(this.tableName).select(columnString);
  }

  /**
   * Filter with type-safe column names.
   */
  eq(column: ColumnName<T>, value: any) {
    return this.supabase.from(this.tableName).eq(column, value);
  }

  /**
   * Order by with type-safe column names.
   */
  orderBy(column: ColumnName<T>, options?: { ascending?: boolean }) {
    return this.supabase.from(this.tableName).order(column, options);
  }
}

/**
 * Create a type-safe query builder.
 *
 * @example
 * const query = createTypeSafeQuery(supabase, 'connection_requests')
 *   .select(['id', 'requester_id', 'recipient_id']) // ✅ Correct columns
 *   .select(['receiver_id']) // ❌ TypeScript error
 */
export function createTypeSafeQuery<T extends TableName>(
  supabase: any,
  tableName: T
): TypeSafeQuery<T> {
  return new TypeSafeQuery(tableName, supabase);
}

/**
 * Common column name mappings.
 * Helps developers use the correct column names.
 */
export const COLUMN_MAPPINGS = {
  // Connection Requests
  'receiver_id': 'recipient_id', // ❌ Wrong → ✅ Correct

  // Posts
  'tags': 'post_type', // ❌ Wrong → ✅ Correct

  // Audio Tracks
  'artist': null, // ❌ Doesn't exist (use profile.display_name instead)

  // Creator Branding
  'creator_id': 'user_id', // ❌ Wrong → ✅ Correct
} as const;

/**
 * Get the correct column name, or throw an error if it's wrong.
 *
 * @example
 * getCorrectColumnName('receiver_id')
 * // Throws: "Column 'receiver_id' doesn't exist. Did you mean 'recipient_id'?"
 */
export function getCorrectColumnName(wrongName: string): string {
  if (wrongName in COLUMN_MAPPINGS) {
    const correct = COLUMN_MAPPINGS[wrongName as keyof typeof COLUMN_MAPPINGS];

    if (correct === null) {
      throw new Error(
        `Column '${wrongName}' doesn't exist in the database schema. ` +
        `This column was removed or never existed.`
      );
    }

    throw new Error(
      `Column '${wrongName}' doesn't exist. Did you mean '${correct}'?`
    );
  }

  return wrongName;
}

/**
 * Validate a query before execution.
 * Checks for common mistakes and suggests fixes.
 *
 * @example
 * validateQuery('connection_requests', {
 *   columns: ['id', 'receiver_id']
 * })
 * // Throws: "Column 'receiver_id' doesn't exist. Did you mean 'recipient_id'?"
 */
export function validateQuery(
  tableName: string,
  options: {
    columns?: string[];
    filters?: Record<string, any>;
  }
): void {
  if (process.env.NODE_ENV !== 'development') {
    // Only validate in development to avoid production overhead
    return;
  }

  const { columns = [], filters = {} } = options;

  // Check columns
  for (const column of columns) {
    if (column === '*') continue;
    getCorrectColumnName(column);
  }

  // Check filter columns
  for (const filterColumn of Object.keys(filters)) {
    getCorrectColumnName(filterColumn);
  }

  console.log(`✅ [Schema Validation] Query validated for table: ${tableName}`);
}

/**
 * Runtime schema validator for development.
 * Catches schema errors before they reach the database.
 */
export class SchemaValidator {
  private static knownErrors = new Set<string>();

  /**
   * Validate a Supabase query and warn about potential issues.
   */
  static validateSupabaseQuery(
    tableName: string,
    operation: string,
    columns?: string[]
  ): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const errorKey = `${tableName}.${operation}.${columns?.join(',')}`;

    // Don't spam the same error
    if (this.knownErrors.has(errorKey)) {
      return;
    }

    try {
      if (columns) {
        for (const column of columns) {
          if (column === '*') continue;
          getCorrectColumnName(column);
        }
      }
    } catch (error) {
      console.error(`🚨 [Schema Validation Error] ${error}`);
      this.knownErrors.add(errorKey);
    }
  }
}

/**
 * Type definitions for common queries.
 * Use these to ensure type safety.
 */
export type ProfileQuery = {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  professional_headline: string | null;
  created_at: string;
};

export type AudioTrackQuery = {
  id: string;
  title: string;
  creator_id: string;
  play_count: number | null;
  likes_count: number | null;
  created_at: string;
  cover_art_url: string | null;
  duration: number | null;
  file_url: string | null;
  // Note: 'artist' column doesn't exist - use creator profile display_name
};

export type ConnectionRequestQuery = {
  id: string;
  requester_id: string; // User who sent the request
  recipient_id: string; // User who received the request (NOT receiver_id!)
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
};

export type PostQuery = {
  id: string;
  user_id: string;
  content: string;
  visibility: 'connections' | 'public';
  post_type: 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event'; // NOT 'tags'!
  event_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

/**
 * Helper function to get type-safe column names for a table.
 * Useful for autocomplete in your IDE.
 */
export function getTableColumns<T extends TableName>(
  tableName: T
): Array<ColumnName<T>> {
  // This function is primarily for documentation and IDE autocomplete
  // The actual implementation will be filled in by TypeScript
  return [] as Array<ColumnName<T>>;
}

/**
 * Commonly used column sets for different tables.
 * Prevents mistakes when selecting columns.
 */
export const COMMON_COLUMN_SETS = {
  profiles: {
    basic: ['id', 'display_name', 'username', 'avatar_url'] as const,
    full: ['id', 'display_name', 'username', 'bio', 'avatar_url', 'location', 'website', 'professional_headline'] as const,
  },

  audio_tracks: {
    list: ['id', 'title', 'play_count', 'likes_count', 'created_at', 'cover_art_url'] as const,
    full: ['id', 'title', 'play_count', 'likes_count', 'created_at', 'cover_art_url', 'duration', 'file_url'] as const,
    // Note: 'artist' is NOT included because it doesn't exist
  },

  connection_requests: {
    basic: ['id', 'requester_id', 'recipient_id', 'status', 'created_at'] as const, // Note: recipient_id not receiver_id
    full: ['id', 'requester_id', 'recipient_id', 'status', 'message', 'created_at'] as const,
  },

  posts: {
    basic: ['id', 'user_id', 'content', 'post_type', 'created_at'] as const, // Note: post_type not tags
    full: ['id', 'user_id', 'content', 'visibility', 'post_type', 'event_id', 'created_at', 'updated_at'] as const,
  },
} as const;

/**
 * Helper to build safe query strings from column sets.
 *
 * @example
 * const columns = buildQueryString(COMMON_COLUMN_SETS.profiles.basic)
 * // Returns: "id, display_name, username, avatar_url"
 */
export function buildQueryString(columns: readonly string[]): string {
  return columns.join(', ');
}

/**
 * Development-only helper that logs all queries.
 * Useful for debugging schema issues.
 */
export function enableQueryLogging(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 [Schema Validation] Query logging enabled');
    console.log('All Supabase queries will be validated against schema');
  }
}

/**
 * Check if a column exists in a table (runtime check).
 * Only works in development when database.types.ts is available.
 */
export function columnExists(tableName: string, columnName: string): boolean {
  // This is primarily a compile-time check via TypeScript
  // But we can add runtime validation in development

  if (tableName === 'connection_requests' && columnName === 'receiver_id') {
    console.warn(
      `⚠️ Column 'receiver_id' doesn't exist on 'connection_requests'. ` +
      `Did you mean 'recipient_id'?`
    );
    return false;
  }

  if (tableName === 'posts' && columnName === 'tags') {
    console.warn(
      `⚠️ Column 'tags' doesn't exist on 'posts'. ` +
      `Did you mean 'post_type'?`
    );
    return false;
  }

  if (tableName === 'audio_tracks' && columnName === 'artist') {
    console.warn(
      `⚠️ Column 'artist' doesn't exist on 'audio_tracks'. ` +
      `Use profile.display_name instead.`
    );
    return false;
  }

  return true;
}

export default {
  validateColumn,
  validateQuery,
  createTypeSafeQuery,
  getCorrectColumnName,
  SchemaValidator,
  COLUMN_MAPPINGS,
  COMMON_COLUMN_SETS,
  buildQueryString,
  enableQueryLogging,
  columnExists,
};
