# SoundBridge Project Onboarding Guide

Welcome to the SoundBridge project! This document will help you quickly understand the codebase, architecture, and current state of the project.

## Project Overview

SoundBridge is a social music platform with AI-powered content moderation capabilities. The platform allows users to share music posts, which are automatically moderated using OpenAI's moderation API and Whisper transcription. The system includes an admin dashboard for manual review and moderation management.

## Architecture

### Main Application (Next.js + Supabase)
- **Location**: `apps/web/`
- **Framework**: Next.js 15.5.9 with App Router
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth (with email/password, OAuth, and 2FA support)
- **Storage**: Supabase Storage for audio files
- **Deployment**: Vercel (Pro plan for 5-minute cron jobs)
- **Domain**: https://www.soundbridge.live

### Whisper Transcription Service (Python + Flask)
- **Location**: `whisper-service/`
- **Framework**: Flask with Gunicorn
- **AI Model**: OpenAI Whisper (faster-whisper implementation)
- **Deployment**: Railway (Docker)
- **Service URL**: https://soundbridge-whisper-production.up.railway.app

## Project Structure

```
soundbridge/
├── apps/
│   └── web/                      # Main Next.js application
│       ├── app/                  # App Router pages and API routes
│       │   ├── (auth)/          # Auth pages (login, signup, etc.)
│       │   ├── admin/           # Admin dashboard pages
│       │   │   ├── moderation/  # Content moderation dashboard
│       │   │   ├── dashboard/   # Main admin dashboard
│       │   │   ├── copyright/   # Copyright management
│       │   │   └── verification/ # User verification
│       │   ├── api/             # API route handlers
│       │   │   ├── admin/       # Admin API endpoints
│       │   │   ├── cron/        # Cron job endpoints
│       │   │   ├── posts/       # Post management
│       │   │   └── ...          # Other API routes
│       │   └── ...              # Other pages
│       ├── src/
│       │   ├── components/      # React components
│       │   ├── contexts/        # React contexts (Auth, Theme)
│       │   ├── lib/             # Utilities and configs
│       │   │   ├── supabase.ts  # Supabase client setup
│       │   │   ├── api-auth.ts  # Unified auth helper
│       │   │   └── ...          # Other utilities
│       │   └── services/        # Business logic services
│       ├── vercel.json          # Vercel config (cron jobs)
│       └── package.json         # Dependencies
├── whisper-service/             # Audio transcription microservice
│   ├── app.py                   # Flask application
│   └── Dockerfile               # Railway deployment config
└── docs/                        # Documentation
```

## Key Features Implemented

### 1. Content Moderation System ✅
- **Location**: `apps/web/app/api/cron/moderate-content/route.ts`
- **Automated Moderation**: 
  - Cron job runs every 5 minutes (Vercel Pro plan)
  - Processes tracks in `pending_check` status
  - Uses OpenAI Moderation API for content analysis
  - Transcribes audio using Whisper service
  - Flags content based on AI analysis
- **Admin Dashboard**: 
  - View pending, flagged, and all tracks
  - Approve/reject tracks with reason
  - See detailed date/time information
  - Track moderation statistics
- **Status Flow**: `pending_check` → `checking` → `clean`/`flagged` → `approved`/`rejected`

### 2. Admin Dashboard ✅
- **Location**: `apps/web/app/admin/`
- **Pages**:
  - `/admin/dashboard` - Main admin dashboard with overview, content review, user management
  - `/admin/moderation` - Content moderation queue with date/time columns
  - `/admin/copyright` - Copyright reports and flags management
  - `/admin/verification` - User verification management
- **Features**:
  - Date/time columns for all items (created, updated, reviewed)
  - Filter by status, priority, type
  - Search functionality
  - Real-time statistics

### 3. Authentication System ✅
- **Provider**: Supabase Auth
- **Methods**: 
  - Email/password
  - OAuth (Google, Facebook, Apple)
  - 2FA support
- **Context**: `apps/web/src/contexts/AuthContext.tsx`
- **Features**:
  - Cookie-based session storage (works across client/server)
  - Mobile-friendly with retry logic for cookie sync delays
  - Unified auth helper for API routes (`getSupabaseRouteClient`)

### 4. User Roles
- **Admin**: Full system access, can approve/reject content
- **Moderator**: Can review and moderate content
- **User**: Can create posts and appeal flags
- **Storage**: `user_roles` table in Supabase

## Database Schema

### Core Tables (Supabase)
- `profiles` - User profiles and metadata
- `audio_tracks` - Music tracks with moderation fields
- `user_roles` - User role assignments (admin, moderator, user)
- `admin_review_queue` - Queue for admin review items
- `admin_settings` - System configuration
- `content_reports` - User reports
- `content_flags` - Automated flags

### Moderation Fields on `audio_tracks`
- `moderation_status` - Status: `pending_check`, `checking`, `clean`, `flagged`, `approved`, `rejected`
- `moderation_flagged` - Boolean flag for quick filtering
- `moderation_checked_at` - When AI moderation completed
- `moderation_confidence` - AI confidence score (0.0-1.0)
- `flag_reasons` - Array of flag reasons
- `transcription` - AI-generated transcription
- `reviewed_by` - Admin user ID who reviewed
- `reviewed_at` - When admin review completed
- `created_at` - Upload date
- `updated_at` - Last update date

**See**: `database/add_moderation_fields.sql` for complete schema

## Environment Variables

### Required for Local Development

Create `.env.local` in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Direct database URL
SUPABASE_DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# Cron Job Security
CRON_SECRET=your-secret-key-here

# OpenAI (for moderation)
OPENAI_API_KEY=sk-...

# Whisper Service
WHISPER_SERVICE_URL=https://soundbridge-whisper-production.up.railway.app
WHISPER_MODEL=base
WHISPER_ENABLED=true
WHISPER_SAMPLE_DURATION=120

# Development
NODE_ENV=development
```

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## Deployment

### Vercel (Main App)
- **Project**: soundbridge
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Plan**: Pro (required for 5-minute cron jobs)
- **Domain**: https://www.soundbridge.live
- **Cron Jobs**: Configured in `apps/web/vercel.json`
  - Content moderation: Every 5 minutes (`*/5 * * * *`)

### Railway (Whisper Service)
- **Service**: soundbridge-whisper
- **Dockerfile**: `./Dockerfile` (root level)
- **Port**: 3000
- **Public URL**: https://soundbridge-whisper-production.up.railway.app

## Getting Started on Mac

### 1. Clone Repository
```bash
git clone https://github.com/Asibe-Cheta/soundbridge.git
cd soundbridge
```

### 2. Install Dependencies
```bash
cd apps/web
npm install
```

### 3. Setup Environment Variables
```bash
# Create .env.local in project root (not apps/web)
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Run Development Server
```bash
cd apps/web
npm run dev
```

Visit http://localhost:3000

## Recent Work Completed

### Admin Moderation System ✅ (December 2024)
- Fixed cron job to run every 5 minutes (upgraded to Vercel Pro)
- Fixed admin panel API to use service_role key (bypasses RLS)
- Added date/time columns to moderation dashboard
- Fixed authentication issues (cookie sync delays on mobile)
- Unified auth helper for all admin APIs
- Admin can now view, approve, and reject tracks

### Authentication Improvements ✅ (December 2024)
- Fixed redirect loops on login
- Improved session handling with cookie fallback
- Added retry logic for API calls on cookie sync delays
- Mobile-friendly authentication flow

### API Fixes ✅ (December 2024)
- All admin APIs now use unified auth helper
- Fixed 401 errors on mobile devices
- Added proper error handling and retry logic
- Service role client for admin operations

## Testing

### Manual Testing Checklist
1. ✅ Login/logout functionality
2. ✅ Admin dashboard access
3. ✅ View moderation queue
4. ✅ Approve/reject tracks
5. ✅ View date/time information
6. ✅ Filter by status (pending, flagged, all)
7. ✅ Cron job processes pending tracks

### Test Admin Moderation
```bash
# Test moderation queue API
curl https://www.soundbridge.live/api/admin/moderation/queue?filter=pending

# Test moderation stats API
curl https://www.soundbridge.live/api/admin/moderation/stats?days=7

# Test cron endpoint (requires CRON_SECRET)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://www.soundbridge.live/api/cron/moderate-content
```

### Whisper Service Testing
```bash
# Test health endpoint
curl https://soundbridge-whisper-production.up.railway.app/health

# Test transcription
curl -X POST https://soundbridge-whisper-production.up.railway.app/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/audio.mp3",
    "language": "en",
    "sampleOnly": true,
    "maxDuration": 120
  }'
```

## Important Files to Review

### Configuration
- `apps/web/next.config.js` - Next.js configuration
- `apps/web/vercel.json` - Vercel config (cron jobs)
- `apps/web/tsconfig.json` - TypeScript configuration
- `apps/web/package.json` - Dependencies (Next.js 15.5.9)

### Core Business Logic
- `apps/web/app/api/admin/moderation/queue/route.ts` - Moderation queue API
- `apps/web/app/api/admin/moderation/review/route.ts` - Approve/reject API
- `apps/web/app/api/admin/moderation/stats/route.ts` - Statistics API
- `apps/web/app/api/cron/moderate-content/route.ts` - Cron job handler
- `apps/web/src/lib/api-auth.ts` - Unified auth helper
- `apps/web/src/contexts/AuthContext.tsx` - Auth context

### Admin Pages
- `apps/web/app/admin/moderation/page.tsx` - Moderation dashboard
- `apps/web/app/admin/dashboard/page.tsx` - Main admin dashboard
- `apps/web/app/admin/copyright/page.tsx` - Copyright management

### Database
- `database/add_moderation_fields.sql` - Moderation schema
- `database/admin_dashboard_schema.sql` - Admin dashboard schema

## Common Tasks

### Deploy changes to Vercel
```bash
git add .
git commit -m "Description"
git push origin main
# Vercel auto-deploys
```

### Update Whisper service
1. Edit `whisper-service/app.py`
2. Commit and push changes
3. Railway auto-rebuilds from Dockerfile

### View Vercel logs
```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs
```

### View Railway logs
```bash
railway logs --service soundbridge-whisper
```

## Troubleshooting

### "Unauthorized" errors on admin APIs
- **Cause**: Cookie sync delays on mobile
- **Fix**: Already implemented - APIs use unified auth helper with retry logic
- **Check**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel

### Cron job not running
- **Check**: Vercel Pro plan is required for 5-minute schedule
- **Verify**: `apps/web/vercel.json` has correct schedule
- **Test**: Use Vercel dashboard to see cron job execution logs

### Database connection issues
- **Verify**: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- **Check**: Supabase project is active
- **Test**: Visit `/api/test-db` endpoint

### Module not found errors
```bash
# Clear Next.js cache
cd apps/web
rm -rf .next
npm run dev
```

## Tech Stack Summary

**Frontend**:
- Next.js 15.5.9 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Radix UI components
- Lucide React icons

**Backend**:
- Next.js API Routes
- Supabase (Database, Auth, Storage)
- Row Level Security (RLS) policies
- Service role client for admin operations

**External Services**:
- Supabase (Database, Auth, Storage)
- OpenAI API (Content moderation)
- Whisper AI (Audio transcription via Railway)
- Vercel (Hosting + Cron jobs - Pro plan)
- Railway (Whisper service hosting)
- SendGrid (Email notifications)

**AI/ML**:
- faster-whisper (Audio transcription)
- OpenAI Moderation API (Content analysis)

## Cron Jobs

### Content Moderation (`/api/cron/moderate-content`)
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Plan Required**: Vercel Pro
- **Purpose**: Process tracks in `pending_check` status
- **Process**:
  1. Fetch tracks with `moderation_status = 'pending_check'`
  2. Transcribe audio using Whisper service
  3. Check content with OpenAI Moderation API
  4. Update status to `clean` or `flagged`
  5. Send notifications to users

## Admin Access

### Granting Admin Role
1. Go to Supabase SQL Editor
2. Run:
```sql
-- Check if user_roles table exists
SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';

-- Grant admin role
INSERT INTO user_roles (user_id, role, created_at)
VALUES ('YOUR_USER_ID', 'admin', NOW())
ON CONFLICT (user_id, role) DO NOTHING;
```

### Admin Pages
- `/admin/dashboard` - Main dashboard
- `/admin/moderation` - Content moderation
- `/admin/copyright` - Copyright management
- `/admin/verification` - User verification

## Project Status

**Current State**: Production-ready with full moderation system

**Last Updated**: December 23, 2024

**Active Deployments**:
- Main App: Vercel Pro (https://www.soundbridge.live)
- Whisper Service: Railway (https://soundbridge-whisper-production.up.railway.app)

**Recent Fixes**:
- ✅ Cron job running every 5 minutes
- ✅ Admin panel showing pending tracks
- ✅ Date/time columns added to all admin pages
- ✅ Authentication fixes for mobile
- ✅ All admin APIs using unified auth helper

---

## Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/Asibe-Cheta/soundbridge.git
cd soundbridge/apps/web
npm install

# Create .env.local in project root
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# Run development
npm run dev

# Test endpoints
curl http://localhost:3000/api/test-db
curl https://soundbridge-whisper-production.up.railway.app/health
```

Good luck! 🎵
