# Environment Variables Setup for SoundBridge

This guide explains how to properly configure Supabase environment variables for Next.js 15 API routes.

## Required Environment Variables

Create a `.env.local` file in your project root (same level as `package.json`) with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Direct database URL (for advanced use cases)
# SUPABASE_DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# Development settings
NODE_ENV=development
```

## How to Get Your Supabase Keys

### 1. Go to Your Supabase Dashboard
- Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Select your project

### 2. Find Your Project URL
- Go to **Settings** → **API**
- Copy the **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)

### 3. Get Your API Keys
- In the same **Settings** → **API** section
- Copy the **anon public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Copy the **service_role** key (this is your `SUPABASE_SERVICE_ROLE_KEY`)

## File Location and Format

### Correct File Location
```
soundbridge/
├── .env.local          ← Create this file here
├── package.json
├── next.config.ts
└── ...
```

### Correct Format
```bash
# ✅ Correct format (no spaces around =)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ❌ Wrong format (spaces around =)
NEXT_PUBLIC_SUPABASE_URL = https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key-here

# ❌ Wrong format (quotes around values)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

## Environment Variable Types

### Public Variables (Client-Side)
- `NEXT_PUBLIC_SUPABASE_URL` - Available in browser and server
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Available in browser and server

### Private Variables (Server-Side Only)
- `SUPABASE_SERVICE_ROLE_KEY` - Only available in API routes and server components
- `SUPABASE_DATABASE_URL` - Only available in API routes and server components

## Testing Your Configuration

### 1. Check Environment Variables in Development
When you start your development server, you should see:
```
🔧 Environment Variables Check:
NEXT_PUBLIC_SUPABASE_URL: ✅ Set
NEXT_PUBLIC_SUPABASE_ANON_KEY: ✅ Set
SUPABASE_SERVICE_ROLE_KEY: ✅ Set
SUPABASE_DATABASE_URL: ❌ Missing (optional)
```

### 2. Test API Route
Visit `/api/test-db` to test your configuration:
```bash
npm run dev
# Then visit: http://localhost:3000/api/test-db
```

### 3. Expected Response
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "success",
  "tests": {
    "environment": {
      "passed": true,
      "message": "✅ Environment variables configured",
      "error": null
    },
    "connection": {
      "passed": true,
      "message": "✅ Database connection successful",
      "error": null
    }
  },
  "summary": {
    "totalTests": 2,
    "passedTests": 2,
    "failedTests": 0,
    "message": "🎉 Basic database connectivity working!"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. "Missing environment variable" Error
**Problem**: Environment variables not being loaded
**Solution**: 
- Check file location (must be `.env.local` in project root)
- Check file format (no spaces around `=`)
- Restart development server after changes

#### 2. "Cannot find module" Error
**Problem**: Import path issues
**Solution**:
- Use `@/src/lib/supabase` import path
- Check TypeScript path mapping in `tsconfig.json`

#### 3. "Supabase client not configured" Error
**Problem**: Environment variables not available in API routes
**Solution**:
- Ensure `.env.local` is in correct location
- Use `createApiClient()` for API routes
- Check for typos in variable names

#### 4. "Database connection failed" Error
**Problem**: Supabase connection issues
**Solution**:
- Verify Supabase project is active
- Check API keys are correct
- Ensure database is accessible

### Debug Steps

#### 1. Verify File Location
```bash
# Check if .env.local exists in project root
ls -la .env.local
```

#### 2. Check Environment Variables
```bash
# Add this to your API route temporarily
console.log('Environment variables:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
});
```

#### 3. Test Supabase Connection
```bash
# Test direct connection to Supabase
curl -X GET "https://your-project-id.supabase.co/rest/v1/profiles?select=count&limit=1" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

## Security Best Practices

### 1. Never Commit Environment Variables
```bash
# Add to .gitignore
.env.local
.env.production
.env.development
```

### 2. Use Different Keys for Different Environments
- **Development**: Use anon key for most operations
- **Production**: Use service role key for API routes
- **Testing**: Use separate test project

### 3. Rotate Keys Regularly
- Change API keys periodically
- Monitor usage in Supabase dashboard
- Use Row Level Security (RLS) policies

## Production Deployment

### Vercel
1. Go to your Vercel project settings
2. Add environment variables in the dashboard
3. Redeploy your application

### Other Platforms
- Add environment variables in your hosting platform's dashboard
- Ensure all required variables are set
- Test the `/api/test-db` endpoint after deployment

## Next Steps

After setting up environment variables:

1. **Test the configuration**: Visit `/api/test-db`
2. **Set up database schema**: Run the SQL scripts
3. **Configure storage buckets**: Set up file uploads
4. **Test authentication**: Verify login/signup works
5. **Deploy to production**: Add environment variables to hosting platform 