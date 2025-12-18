# SoundBridge Whisper Transcription Service

Self-hosted audio transcription service using OpenAI's Whisper model.

## Deployment to Railway

### Prerequisites

1. Railway account (sign up at https://railway.app)
2. Railway CLI installed

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### Step 3: Initialize Project

```bash
cd whisper-service
railway init
```

- Choose "Create new project"
- Name it: "soundbridge-whisper"

### Step 4: Deploy

```bash
railway up
```

This will:
- Build the Docker container
- Install Python, ffmpeg, and Whisper
- Install Node.js dependencies
- Deploy to Railway

### Step 5: Get Service URL

```bash
railway domain
```

Or in Railway dashboard:
1. Go to your project
2. Click "Settings"
3. Click "Generate Domain"
4. Copy the URL (e.g., `https://soundbridge-whisper-production.up.railway.app`)

### Step 6: Set Environment Variable

In Railway dashboard:
1. Go to "Variables" tab
2. Add:
   - `WHISPER_MODEL` = `base`
   - `NODE_ENV` = `production`

### Step 7: Add to Vercel

In Vercel dashboard, add environment variable:
```
WHISPER_SERVICE_URL=https://your-railway-url.up.railway.app
```

## Testing

Test the service:

```bash
curl https://your-railway-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok"
}
```

Test transcription:

```bash
curl -X POST https://your-railway-url.up.railway.app/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/audio.mp3",
    "model": "base",
    "sampleOnly": true,
    "maxDuration": 120
  }'
```

## Endpoints

### GET /

Service information

### GET /health

Health check

### POST /transcribe

Transcribe audio file

**Request:**
```json
{
  "audioUrl": "string (required)",
  "model": "base|tiny|small|medium|large (optional, default: base)",
  "sampleOnly": "boolean (optional, default: true)",
  "maxDuration": "number (optional, default: 120)",
  "language": "string (optional, default: en)"
}
```

**Response:**
```json
{
  "success": true,
  "transcription": "Transcribed text...",
  "metadata": {
    "model": "base",
    "language": "en",
    "sampleOnly": true,
    "maxDuration": 120,
    "processingTime": 12.5,
    "characterCount": 450
  }
}
```

## Monitoring

View logs in Railway:

```bash
railway logs
```

Or in Railway dashboard → Deployments → View Logs

## Cost

Railway Free Tier:
- 500 hours/month
- $5 worth of compute

Estimated usage for SoundBridge:
- 100-500 tracks/day
- ~30-60 seconds per track
- ~240 hours/month
- **Well within free tier!**

## Troubleshooting

### Check if service is running

```bash
railway status
```

### View recent logs

```bash
railway logs --tail 100
```

### Restart service

```bash
railway restart
```

### Check environment variables

```bash
railway variables
```

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Whisper GitHub: https://github.com/openai/whisper
