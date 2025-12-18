# SoundBridge Project Onboarding Guide

Welcome to the SoundBridge project! This document will help you quickly understand the codebase, architecture, and current state of the project.

## Project Overview

SoundBridge is a social music platform with content moderation capabilities. The platform allows users to share music posts, which can be moderated based on content guidelines. The system includes automated AI-powered transcription for audio content.

## Architecture

### Main Application (Next.js + Prisma)
- **Location**: `apps/web/`
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: Clerk
- **Deployment**: Vercel
- **Storage**: AWS S3 for audio files

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
│       ├── src/
│       │   ├── app/              # App Router pages
│       │   ├── components/       # React components
│       │   ├── lib/              # Utilities and configs
│       │   └── server/           # Server-side code
│       │       ├── actions/      # Server Actions
│       │       ├── api/          # API route handlers
│       │       └── db/           # Database (Prisma)
│       └── prisma/
│           └── schema.prisma     # Database schema
├── whisper-service/              # Audio transcription microservice
│   ├── app.py                    # Flask application
│   ├── index.js                  # Legacy Node.js version (not used)
│   └── package.json              # Legacy dependencies
├── Dockerfile                    # Railway deployment config
├── .dockerignore                 # Docker build context
└── docs/                         # Documentation

```

## Key Features Implemented

### 1. Content Moderation System
- **Location**: `apps/web/src/server/actions/moderation.ts`
- Automated flagging based on configurable rules
- Manual review workflow for moderators
- Appeal system for users
- Support for text and audio content

### 2. Audio Transcription
- **Service**: Whisper AI (faster-whisper)
- **Integration**: `apps/web/src/lib/services/whisper.ts`
- Transcribes audio posts for content moderation
- Sample-based processing (first 120 seconds by default)
- Language detection and metadata

### 3. Post Management
- Create, read, update, delete posts
- Support for text and audio content
- S3 integration for audio file storage
- Automated moderation on post creation

### 4. User Roles
- **Admin**: Full system access
- **Moderator**: Can review and moderate content
- **User**: Can create posts and appeal flags

## Database Schema

### Core Tables
- `User` - User profiles and authentication
- `Post` - Music posts (text and audio)
- `ModerationFlag` - Flagged content records
- `ModerationReview` - Moderator review decisions
- `ModerationAppeal` - User appeals
- `ModerationRule` - Configurable moderation rules

**See**: `apps/web/prisma/schema.prisma` for complete schema

## Environment Variables

### Required for Local Development

Create `apps/web/.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="soundbridge-audio"

# OpenAI (for moderation)
OPENAI_API_KEY="sk-..."

# Whisper Service
WHISPER_SERVICE_URL="https://soundbridge-whisper-production.up.railway.app"
WHISPER_MODEL="base"
WHISPER_ENABLED="true"
WHISPER_SAMPLE_DURATION="120"
```

## Deployment

### Vercel (Main App)
- **Project**: soundbridge
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Environment Variables**: Set in Vercel dashboard

### Railway (Whisper Service)
- **Service**: soundbridge-whisper
- **Dockerfile**: `./Dockerfile` (root level)
- **Port**: 3000
- **Public URL**: Auto-generated domain
- **Environment Variables**: Set in Railway dashboard

## Getting Started on Mac

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/soundbridge.git
cd soundbridge
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Or if using workspace
cd apps/web
npm install
```

### 3. Setup Database
```bash
cd apps/web

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

### 4. Setup Environment Variables
```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 5. Run Development Server
```bash
cd apps/web
npm run dev
```

Visit http://localhost:3000

## Recent Work Completed

### Phase 1-5: Content Moderation System ✅
- Implemented moderation flag creation
- Built review workflow for moderators
- Created appeal system
- Added admin tools for rule management
- Integrated audio transcription

### Whisper Service Deployment ✅
- Created Python Flask microservice
- Used faster-whisper for lightweight transcription
- Deployed to Railway with Docker
- Optimized image size (under 4GB)
- Integrated with main application

## Testing

### Manual Testing Checklist
1. Create a post with text content
2. Create a post with audio content
3. Verify audio transcription works
4. Test moderation flagging
5. Test moderator review workflow
6. Test user appeal system
7. Test admin rule configuration

### Whisper Service Testing
```bash
# Test health endpoint
curl https://soundbridge-whisper-production.up.railway.app/health

# Test transcription (example)
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
- `apps/web/prisma/schema.prisma` - Database schema
- `Dockerfile` - Whisper service deployment
- `apps/web/tsconfig.json` - TypeScript configuration

### Core Business Logic
- `apps/web/src/server/actions/moderation.ts` - Moderation actions
- `apps/web/src/server/actions/posts.ts` - Post management
- `apps/web/src/lib/services/whisper.ts` - Whisper integration
- `apps/web/src/lib/services/s3.ts` - S3 file uploads

### API Routes
- `apps/web/src/app/api/moderation/` - Moderation endpoints
- `apps/web/src/app/api/posts/` - Post endpoints

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- `docs/00-MASTER-INDEX.md` - Complete documentation index
- `docs/phases-1-5-summary.md` - Implementation summary
- `docs/mobile-team-guide.md` - Guide for mobile developers
- `docs/moderation-faq.md` - Quick answers for common questions

## Common Tasks

### Add a new database model
1. Edit `apps/web/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Run `npx prisma generate`

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

### View Railway logs
```bash
railway logs --service soundbridge-whisper
```

## Troubleshooting

### "Prisma Client not found"
```bash
cd apps/web
npx prisma generate
```

### "Module not found"
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Whisper service timeout
- Check Railway service status
- Verify WHISPER_SERVICE_URL in Vercel
- Test health endpoint: `curl https://soundbridge-whisper-production.up.railway.app/health`

### Database connection issues
- Verify DATABASE_URL in .env.local
- Check if PostgreSQL is running
- Confirm database exists

## Tech Stack Summary

**Frontend**:
- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Radix UI components

**Backend**:
- Next.js API Routes
- Server Actions
- Prisma ORM
- PostgreSQL

**External Services**:
- Clerk (Authentication)
- AWS S3 (File storage)
- OpenAI API (Content moderation)
- Railway (Whisper service hosting)
- Vercel (Main app hosting)

**AI/ML**:
- faster-whisper (Audio transcription)
- OpenAI Moderation API (Content analysis)

## Next Steps / Roadmap

### Immediate Tasks
- [ ] Test audio transcription end-to-end
- [ ] Add automated tests for moderation
- [ ] Implement rate limiting
- [ ] Add logging and monitoring

### Future Enhancements
- [ ] Real-time moderation dashboard
- [ ] Batch processing for audio transcription
- [ ] Advanced search with transcription
- [ ] User reputation system
- [ ] Machine learning-based auto-moderation

## Support & Resources

### Internal Documentation
- See `docs/` directory for detailed guides
- Check `docs/00-MASTER-INDEX.md` for complete reference

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [faster-whisper GitHub](https://github.com/guillaumekln/faster-whisper)
- [Railway Documentation](https://docs.railway.app)

## Project Status

**Current State**: Production-ready MVP with content moderation system

**Last Updated**: December 18, 2024

**Active Deployments**:
- Main App: Vercel (soundbridge.vercel.app or custom domain)
- Whisper Service: Railway (soundbridge-whisper-production.up.railway.app)

---

## Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/soundbridge.git
cd soundbridge/apps/web
npm install
cp .env.example .env.local
npx prisma generate
npx prisma migrate dev

# Run development
npm run dev

# Test Whisper service
curl https://soundbridge-whisper-production.up.railway.app/health
```

Good luck! 🎵
