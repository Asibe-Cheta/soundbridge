# Performance Optimization Guide - Professional Networking Features

**Date:** November 24, 2025  
**Purpose:** Best practices and optimizations for the professional networking features

---

## Overview

This guide covers performance optimizations implemented for the professional networking features, including database indexes, query optimization, caching strategies, and best practices.

---

## 1. Database Indexes

### Indexes Created

We've created comprehensive indexes to optimize common query patterns:

#### Posts
- `idx_posts_user_visibility_created` - Feed queries by user, visibility, and date
- `idx_posts_type_visibility_created` - Opportunity feeds and type filtering
- `idx_posts_content_trgm` - Full-text search on post content

#### Reactions & Comments
- `idx_post_reactions_post_user` - Quick user reaction lookup
- `idx_post_reactions_post_type` - Reaction count queries
- `idx_post_comments_post_parent` - Comments with replies
- `idx_post_comments_post_created` - Comment count and sorting

#### Connections
- `idx_connection_requests_recipient_status` - Pending requests lookup
- `idx_connection_requests_requester_status` - Sent requests lookup
- `idx_connections_user_connected` - Bidirectional connection lookup

#### Profiles
- `idx_profiles_display_name_trgm` - Name search (fuzzy matching)
- `idx_profiles_username_trgm` - Username search
- `idx_profiles_headline_trgm` - Headline search
- `idx_profiles_country_location` - Location-based queries

#### Profile Data
- `idx_profile_experience_user_dates` - Experience sorting
- `idx_profile_skills_user_skill` - Skills lookup
- `idx_profile_instruments_user_instrument` - Instruments lookup

### Running the Index Migration

```sql
-- Run this in Supabase SQL Editor
\i database/professional_networking_performance_indexes.sql
```

Or copy the contents of `database/professional_networking_performance_indexes.sql` into the SQL Editor.

---

## 2. Query Optimization

### Batch Operations

**❌ Bad: N+1 Query Problem**
```typescript
// Don't do this
for (const post of posts) {
  const { data: author } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', post.user_id)
    .single();
}
```

**✅ Good: Batch Queries**
```typescript
// Do this instead
const userIds = [...new Set(posts.map(p => p.user_id))];
const { data: authors } = await supabase
  .from('profiles')
  .select('*')
  .in('id', userIds);

const authorMap = new Map();
authors.forEach(a => authorMap.set(a.id, a));
```

### Use Select Filters

**❌ Bad: Fetching All Columns**
```typescript
const { data } = await supabase
  .from('posts')
  .select('*');
```

**✅ Good: Select Only Needed Columns**
```typescript
const { data } = await supabase
  .from('posts')
  .select('id, content, user_id, created_at');
```

### Limit Result Sets

**❌ Bad: Fetching Unlimited Results**
```typescript
const { data } = await supabase
  .from('posts')
  .select('*');
```

**✅ Good: Use Pagination**
```typescript
const limit = 20;
const offset = (page - 1) * limit;
const { data } = await supabase
  .from('posts')
  .select('*')
  .range(offset, offset + limit - 1);
```

### Use Partial Indexes

For frequently filtered queries, use partial indexes:

```sql
-- Only index non-deleted posts
CREATE INDEX idx_posts_active 
ON posts(created_at DESC) 
WHERE deleted_at IS NULL;
```

---

## 3. Caching Strategies

### Client-Side Caching

For frequently accessed data that doesn't change often:

```typescript
// Cache user profile data
const profileCache = new Map<string, Profile>();

async function getProfile(userId: string): Promise<Profile> {
  if (profileCache.has(userId)) {
    return profileCache.get(userId)!;
  }
  
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  profileCache.set(userId, data);
  return data;
}
```

### API Response Caching

Use Next.js caching for static/semi-static data:

```typescript
// In API route
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  // Response will be cached for 60 seconds
  return NextResponse.json(data);
}
```

### Real-Time Subscriptions

Use Supabase Real-Time for live data instead of polling:

```typescript
// Instead of polling every 5 seconds
const channel = supabase
  .channel('posts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts'
  }, (payload) => {
    // Update UI immediately
  })
  .subscribe();
```

---

## 4. Feed Algorithm Optimization

### Current Implementation

The feed algorithm:
1. Fetches up to 200 posts
2. Ranks them in memory
3. Applies pagination

### Optimization Tips

1. **Pre-compute Rankings**: Consider a materialized view or background job
2. **Cache Feed Results**: Cache first page for 30-60 seconds
3. **Incremental Loading**: Load more posts as user scrolls

### Example: Cached Feed

```typescript
// Cache feed for 30 seconds
const CACHE_TTL = 30 * 1000;
const feedCache = new Map<string, { data: any, timestamp: number }>();

async function getFeed(userId: string, page: number) {
  const cacheKey = `${userId}:${page}`;
  const cached = feedCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFeed(userId, page);
  feedCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

---

## 5. Search Optimization

### Full-Text Search

Use PostgreSQL's full-text search for better performance:

```sql
-- Create search index
CREATE INDEX idx_posts_content_search 
ON posts USING gin(to_tsvector('english', content));

-- Search query
SELECT * FROM posts 
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'search term');
```

### Fuzzy Matching

Use `pg_trgm` extension for fuzzy matching:

```sql
-- Already included in performance indexes
CREATE INDEX idx_posts_content_trgm 
ON posts USING gin(content gin_trgm_ops);

-- Query with similarity
SELECT *, similarity(content, 'search term') as sim
FROM posts
WHERE content % 'search term'
ORDER BY sim DESC;
```

---

## 6. Connection Suggestions Optimization

### Current Algorithm

1. Get user's connections
2. Get connections of connections
3. Score candidates
4. Sort and return top N

### Optimization

- **Cache mutual connections**: Calculate once, cache for 5-10 minutes
- **Pre-compute suggestions**: Background job to update suggestions daily
- **Limit candidate set**: Only consider users with shared location/interests

---

## 7. Monitoring & Performance Metrics

### Key Metrics to Monitor

1. **Query Performance**
   - Average query time
   - Slow queries (> 500ms)
   - Index usage

2. **API Performance**
   - Response times
   - Error rates
   - Request throughput

3. **Database Performance**
   - Connection pool usage
   - Query cache hit rate
   - Index scan vs sequential scan ratio

### Monitoring Queries

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0;
```

---

## 8. Best Practices

### Do's ✅

1. **Always use pagination** for list endpoints
2. **Batch related queries** instead of N+1 patterns
3. **Use indexes** for frequently queried columns
4. **Cache static/semi-static data** appropriately
5. **Monitor query performance** regularly
6. **Use real-time subscriptions** for live data
7. **Limit result sets** to reasonable sizes

### Don'ts ❌

1. **Don't fetch all columns** when you only need a few
2. **Don't query without indexes** on filtered columns
3. **Don't poll** when real-time subscriptions are available
4. **Don't ignore pagination** for large datasets
5. **Don't create too many indexes** (balance read vs write performance)
6. **Don't cache sensitive data** without expiration

---

## 9. Performance Checklist

Before deploying to production:

- [ ] All database indexes created
- [ ] Query performance tested (< 200ms for most queries)
- [ ] Pagination implemented on all list endpoints
- [ ] N+1 query problems eliminated
- [ ] Caching strategy implemented where appropriate
- [ ] Real-time subscriptions used for live data
- [ ] Search queries optimized (full-text or fuzzy matching)
- [ ] Database statistics updated (ANALYZE)
- [ ] Monitoring queries set up
- [ ] Load testing completed

---

## 10. Future Optimizations

### Potential Improvements

1. **Materialized Views**: Pre-compute feed rankings
2. **Read Replicas**: Separate read/write traffic
3. **CDN Caching**: Cache static profile images
4. **GraphQL**: Reduce over-fetching with precise queries
5. **Background Jobs**: Pre-compute suggestions, rankings
6. **Database Partitioning**: Partition large tables by date

---

**Note:** These optimizations should be implemented gradually and monitored for impact. Start with indexes and query optimization, then add caching as needed.

