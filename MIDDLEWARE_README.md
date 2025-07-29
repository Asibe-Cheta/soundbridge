# SoundBridge Middleware Configuration for Next.js 15

This document explains the different middleware options available for handling authentication in Next.js 15 edge runtime.

## Middleware Options

### 1. `middleware.ts` (Current - Fixed)
- **Status**: ✅ Fixed for edge runtime
- **Features**: Full Supabase integration with fallback
- **Use Case**: Production with proper environment variables

### 2. `middleware-simple.ts` (Alternative)
- **Status**: ✅ Edge runtime compatible
- **Features**: Cookie-based auth only
- **Use Case**: When environment variables are not available

### 3. `middleware-edge.ts` (Recommended)
- **Status**: ✅ Optimized for edge runtime
- **Features**: Full Supabase integration with robust fallback
- **Use Case**: Production with better error handling

## Environment Variables Required

Make sure these environment variables are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How to Switch Middleware

### Option A: Use the Fixed Current Middleware
The current `middleware.ts` has been updated to handle edge runtime properly.

### Option B: Use the Simple Middleware
Rename `middleware-simple.ts` to `middleware.ts`:

```bash
mv middleware-simple.ts middleware.ts
```

### Option C: Use the Edge-Optimized Middleware (Recommended)
Rename `middleware-edge.ts` to `middleware.ts`:

```bash
mv middleware-edge.ts middleware.ts
```

## Middleware Features

### Protected Routes
- `/dashboard`
- `/upload`
- `/analytics`
- `/creator`
- `/events/create`
- `/notifications`

### Auth Routes (redirect if authenticated)
- `/login`
- `/signup`
- `/register`
- `/reset-password`

### Root Path
- Redirects authenticated users to `/dashboard`

## Error Handling

### Edge Runtime Issues
If you encounter edge runtime errors:

1. **Environment Variables Not Available**: Use `middleware-simple.ts`
2. **Supabase Client Errors**: Use `middleware-edge.ts` (has fallback)
3. **Performance Issues**: Use `middleware-simple.ts` (faster)

### Debugging
Check the console for middleware warnings:
- `Supabase environment variables not available`
- `Supabase session error`
- `Middleware error`

## Performance Considerations

### Edge Runtime Limitations
- Limited access to Node.js APIs
- Environment variables must be explicitly available
- Smaller memory footprint
- Faster cold starts

### Recommended Approach
1. **Development**: Use `middleware-edge.ts` for full debugging
2. **Production**: Use `middleware-edge.ts` with proper environment variables
3. **Fallback**: Use `middleware-simple.ts` if Supabase integration fails

## Testing Middleware

Test your middleware configuration:

```bash
# Test with environment variables
npm run dev

# Test without environment variables (should fallback gracefully)
NEXT_PUBLIC_SUPABASE_URL="" npm run dev
```

## Troubleshooting

### Common Issues

1. **"Environment variables required" error**
   - Solution: Use `middleware-simple.ts` or ensure env vars are set

2. **Edge runtime errors**
   - Solution: Use `middleware-edge.ts` with fallback handling

3. **Authentication not working**
   - Check environment variables
   - Verify Supabase configuration
   - Use browser dev tools to check cookies

### Debug Steps

1. Check environment variables in browser console
2. Verify Supabase client initialization
3. Test cookie-based auth as fallback
4. Check network requests for auth endpoints

## Migration Guide

### From Next.js 14 to 15

1. Update middleware to handle edge runtime
2. Ensure environment variables are properly set
3. Test authentication flow
4. Use fallback middleware if needed

### From Supabase Auth Helpers v1 to v2

1. Update import statements
2. Use new middleware client syntax
3. Handle session management changes
4. Test all auth flows

## Best Practices

1. **Always have a fallback**: Use cookie-based auth when Supabase fails
2. **Handle errors gracefully**: Don't break the app if middleware fails
3. **Test thoroughly**: Verify all protected routes work
4. **Monitor performance**: Edge runtime has different performance characteristics
5. **Use proper environment variables**: Ensure they're available at build time 