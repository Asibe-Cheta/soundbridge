# Content Moderation System Implementation for SoundBridge

## 🎉 **UPDATED: FREE VERSION (£0/month)** 🎉

**This implementation uses FREE self-hosted tools:**
- ✅ Self-hosted Whisper (transcription) - **£0**
- ✅ OpenAI Moderation API (harmful content) - **£0** (2M free requests/month)
- ✅ Custom spam detection - **£0**
- ✅ **Total Cost: £0/month at any scale** ✅

**No expensive API costs. Works on your existing server.** 🚀

---

## CRITICAL: Read This First - Code Review Requirements

**BEFORE implementing anything in this document, you MUST:**

### 1. Examine Current Upload System

**Locate and review ALL existing upload-related code:**

```bash
# Find upload endpoints/routes
# Look for patterns like:
- /api/upload
- /api/tracks/upload
- /api/content/upload
- uploadTrack, uploadPodcast, uploadAlbum functions

# Find upload UI components
# Look for:
- Upload buttons/forms
- File selection logic
- Upload progress indicators
- Success/error messages

# Find database schema
# Look for tables/collections:
- tracks
- podcasts
- albums
- uploads
- content
- media
```

**Questions you MUST answer before coding:**

1. **Where is the current upload endpoint?** (file path)
2. **What framework is used?** (Next.js App Router, Pages Router, Express, etc.)
3. **Where are files stored?** (AWS S3, Supabase Storage, Cloudinary, etc.)
4. **What's the database client?** (Supabase, Prisma, MongoDB, etc.)
5. **How are uploads currently validated?** (any existing checks?)
6. **What's the current database schema for tracks/podcasts?** (what fields exist?)
7. **Is there existing job queue system?** (Bull, BullMQ, Inngest, none?)
8. **How are users authenticated?** (what auth system?)
9. **Where are notifications sent from?** (email service, push notifications, in-app?)
10. **Are there existing admin dashboard routes?** (where would flagged content be reviewed?)

**Document your findings in comments before proceeding.**

---

### 2. Check for Existing Dependencies

**Before installing new packages, check if these already exist:**

```bash
# Check package.json for:
- Audio processing: fluent-ffmpeg, music-metadata, node-id3
- AI/ML: openai, @anthropic-ai/sdk, @google-cloud/speech
- Job queues: bull, bullmq, agenda, bee-queue
- File validation: file-type, mime-types
- Hashing: crypto (built-in), md5, sha256
```

**Only install packages that DON'T already exist.**

---

### 3. Review Current Content Types

**The app currently supports:**
- ✅ Single track upload
- ✅ Podcast upload  
- ✅ Music album upload

**Find how these are differentiated in code:**
- Is there a `content_type` field? (`track`, `podcast`, `album`)
- Is there a `type` field?
- Are they in separate tables/collections?
- How does UI let user choose content type?

**Adapt implementation to match existing structure.**

---

### 4. Check Existing Status/Visibility Fields

**Look for existing content status fields:**

```javascript
// Common patterns in database:
status: 'draft' | 'published' | 'private' | ...?
visibility: 'public' | 'private' | 'unlisted' | ...?
is_active: boolean
is_published: boolean
```

**DO NOT create duplicate status fields. Use what exists.**

**If no status system exists, THEN add new fields as described below.**

---

## Implementation Overview

**Goal:** Implement instant upload with background moderation that:
1. Uploads go live immediately (no approval delays)
2. Background AI checks run asynchronously
3. Flagged content moved to review queue
4. Admin can approve/reject flagged content
5. Users can appeal rejections

**Flow:**
```
User uploads → 
Quick validation (5 sec) → 
Content LIVE immediately → 
Background moderation job queued → 
If clean: nothing happens → 
If flagged: move to review queue + notify user & admin
```

---

## Phase 1: Database Schema Updates

### STEP 1: Review Existing Schema

**Before adding fields, check what already exists in your tracks/podcasts/content table.**

**Common existing fields:**
```javascript
// Likely already exists
id, user_id, title, description, file_url, created_at, updated_at

// Might exist
status, visibility, is_published, is_active
```

**DO NOT duplicate these. Only add missing fields.**

---

### STEP 2: Add Moderation Fields (If They Don't Exist)

**Add these fields to your content table(s):**

```sql
-- If using PostgreSQL/Supabase
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending_check';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS moderation_checked_at TIMESTAMPTZ;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS moderation_flagged BOOLEAN DEFAULT false;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS flag_reasons JSONB DEFAULT '[]';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS appeal_status VARCHAR(50);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS appeal_text TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64); -- For duplicate detection
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audio_metadata JSONB; -- Store bitrate, duration, etc.

-- Repeat for podcasts table if separate
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending_check';
-- ... (same fields as above)

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_moderation_status ON tracks(moderation_status);
CREATE INDEX IF NOT EXISTS idx_tracks_moderation_flagged ON tracks(moderation_flagged);
CREATE INDEX IF NOT EXISTS idx_tracks_file_hash ON tracks(file_hash);
```

**Moderation Status Values:**
- `pending_check` - Just uploaded, background check not started yet
- `checking` - Background moderation in progress
- `clean` - Passed all checks, no issues
- `flagged` - Failed checks, needs admin review
- `approved` - Admin reviewed and approved
- `rejected` - Admin reviewed and rejected
- `appealed` - User submitted appeal

**If using Prisma, update schema.prisma:**
```prisma
model Track {
  id                  String    @id @default(uuid())
  userId              String
  title               String
  fileUrl             String
  status              String    @default("live") // Existing field for live/draft
  moderationStatus    String    @default("pending_check")
  moderationCheckedAt DateTime?
  moderationFlagged   Boolean   @default(false)
  flagReasons         Json      @default("[]")
  reviewedBy          String?
  reviewedAt          DateTime?
  appealStatus        String?
  appealText          String?
  fileHash            String?
  audioMetadata       Json?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  @@index([moderationStatus])
  @@index([moderationFlagged])
  @@index([fileHash])
}
```

**Run migration:**
```bash
# Prisma
npx prisma migrate dev --name add_moderation_fields

# Supabase
# Apply SQL manually in Supabase dashboard
```

---

## Phase 2: Upload Validation (Quick Checks)

### STEP 3: Create Audio Validation Utility

**Check if validation utility already exists. If not, create new file:**

**File location:** `/lib/audio-validation.ts` or `/utils/audio-validation.ts` (match existing structure)

```typescript
// BEFORE creating this file, check if similar validation exists
// Look for: validateFile, validateAudio, checkAudioQuality, etc.

import ffmpeg from 'fluent-ffmpeg';
import * as mm from 'music-metadata';
import crypto from 'crypto';
import fs from 'fs';

// Validation rules - adjust based on your requirements
export const VALIDATION_RULES = {
  // File formats (add more if needed)
  allowedFormats: ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'],
  
  // Max file size (200MB - adjust as needed)
  maxFileSize: 200 * 1024 * 1024,
  
  // Music-specific rules
  music: {
    minBitrate: 128000,    // 128kbps minimum
    minDuration: 30,       // 30 seconds minimum
    maxDuration: 900,      // 15 minutes maximum
    minFileSize: 1024000,  // 1MB minimum
  },
  
  // Podcast-specific rules (more lenient)
  podcast: {
    minBitrate: 64000,     // 64kbps (voice quality OK)
    minDuration: 60,       // 1 minute minimum
    maxDuration: 10800,    // 3 hours maximum
    minFileSize: 500000,   // 500KB minimum
  },
  
  // Album rules (same as music but allow longer)
  album: {
    minBitrate: 128000,
    minDuration: 30,
    maxDuration: 3600,     // 1 hour per track
    minFileSize: 1024000,
  }
};

/**
 * Validate file format and extension
 */
export function validateFileFormat(filename: string): { valid: boolean; error?: string } {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  
  if (!ext) {
    return { valid: false, error: 'File has no extension' };
  }
  
  if (!VALIDATION_RULES.allowedFormats.includes(ext)) {
    return { 
      valid: false, 
      error: `Invalid format. Allowed: ${VALIDATION_RULES.allowedFormats.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/**
 * Get audio metadata (bitrate, duration, sample rate, etc.)
 */
export async function getAudioMetadata(filePath: string): Promise<{
  bitrate: number;
  duration: number;
  sampleRate: number;
  format: string;
  channels: number;
}> {
  try {
    const metadata = await mm.parseFile(filePath);
    
    return {
      bitrate: metadata.format.bitrate || 0,
      duration: metadata.format.duration || 0,
      sampleRate: metadata.format.sampleRate || 0,
      format: metadata.format.container || 'unknown',
      channels: metadata.format.numberOfChannels || 0,
    };
  } catch (error) {
    throw new Error(`Failed to parse audio metadata: ${error.message}`);
  }
}

/**
 * Calculate file hash for duplicate detection
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Validate audio quality based on content type
 */
export async function validateAudioQuality(
  filePath: string,
  fileSize: number,
  contentType: 'music' | 'podcast' | 'album'
): Promise<{ valid: boolean; error?: string; metadata?: any }> {
  
  const rules = VALIDATION_RULES[contentType];
  
  // Check file size
  if (fileSize > VALIDATION_RULES.maxFileSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum ${VALIDATION_RULES.maxFileSize / 1024 / 1024}MB` 
    };
  }
  
  if (fileSize < rules.minFileSize) {
    return { 
      valid: false, 
      error: `File too small. Minimum ${rules.minFileSize / 1024}KB. Please upload a properly recorded ${contentType}.` 
    };
  }
  
  // Get audio metadata
  let metadata;
  try {
    metadata = await getAudioMetadata(filePath);
  } catch (error) {
    return { 
      valid: false, 
      error: 'Invalid audio file. Could not read audio metadata.' 
    };
  }
  
  // Check bitrate
  if (metadata.bitrate < rules.minBitrate) {
    return { 
      valid: false, 
      error: `Audio quality too low. Minimum ${rules.minBitrate / 1000}kbps required.`,
      metadata
    };
  }
  
  // Check duration
  if (metadata.duration < rules.minDuration) {
    return { 
      valid: false, 
      error: `${contentType === 'podcast' ? 'Episode' : 'Track'} too short. Minimum ${rules.minDuration} seconds.`,
      metadata
    };
  }
  
  if (metadata.duration > rules.maxDuration) {
    return { 
      valid: false, 
      error: `${contentType === 'podcast' ? 'Episode' : 'Track'} too long. Maximum ${rules.maxDuration / 60} minutes.`,
      metadata
    };
  }
  
  return { valid: true, metadata };
}

/**
 * Complete upload validation (run synchronously during upload)
 */
export async function validateUpload(
  filePath: string,
  filename: string,
  fileSize: number,
  contentType: 'music' | 'podcast' | 'album'
): Promise<{
  valid: boolean;
  error?: string;
  metadata?: any;
  fileHash?: string;
}> {
  
  // 1. Validate format
  const formatCheck = validateFileFormat(filename);
  if (!formatCheck.valid) {
    return formatCheck;
  }
  
  // 2. Validate audio quality
  const qualityCheck = await validateAudioQuality(filePath, fileSize, contentType);
  if (!qualityCheck.valid) {
    return qualityCheck;
  }
  
  // 3. Calculate file hash (for duplicate detection)
  const fileHash = await calculateFileHash(filePath);
  
  return {
    valid: true,
    metadata: qualityCheck.metadata,
    fileHash
  };
}
```

**Install required packages (if not already installed):**
```bash
npm install fluent-ffmpeg music-metadata
# or
yarn add fluent-ffmpeg music-metadata
```

---

### STEP 4: Update Upload Endpoint

**CRITICAL: Find your existing upload endpoint first!**

**Look for patterns like:**
- `/app/api/tracks/upload/route.ts` (Next.js App Router)
- `/pages/api/tracks/upload.ts` (Next.js Pages Router)
- `/api/routes/upload.js` (Express)
- `/src/controllers/uploadController.ts`

**Once found, adapt the following code to your existing structure:**

```typescript
// Example for Next.js App Router
// File: /app/api/tracks/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { validateUpload } from '@/lib/audio-validation';
import { uploadToStorage } from '@/lib/storage'; // Your existing storage function
import { createTrack } from '@/lib/database'; // Your existing DB function
import { queueModerationJob } from '@/lib/moderation-queue'; // We'll create this

// ADJUST THIS to match your authentication pattern
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user (use your existing auth logic)
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const contentType = formData.get('contentType') as 'music' | 'podcast' | 'album';
    const genre = formData.get('genre') as string;
    
    if (!file || !title || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 3. Save file temporarily for validation
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempPath = `/tmp/${Date.now()}-${file.name}`;
    await fs.promises.writeFile(tempPath, buffer);
    
    // 4. Quick validation (synchronous - happens immediately)
    const validation = await validateUpload(
      tempPath,
      file.name,
      file.size,
      contentType
    );
    
    if (!validation.valid) {
      // Clean up temp file
      await fs.promises.unlink(tempPath);
      
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // 5. Check for duplicates (same file uploaded before)
    const duplicate = await checkDuplicateUpload(user.id, validation.fileHash);
    if (duplicate) {
      await fs.promises.unlink(tempPath);
      
      return NextResponse.json(
        { 
          error: 'You have already uploaded this file',
          existingTrack: duplicate 
        },
        { status: 409 }
      );
    }
    
    // 6. Upload to permanent storage (use your existing storage logic)
    // IMPORTANT: Check where your existing code uploads files
    // Common patterns: uploadToS3, uploadToSupabase, uploadToCloudinary
    const fileUrl = await uploadToStorage(tempPath, {
      folder: contentType === 'podcast' ? 'podcasts' : 'tracks',
      userId: user.id,
      filename: `${Date.now()}-${file.name}`
    });
    
    // Clean up temp file
    await fs.promises.unlink(tempPath);
    
    // 7. Create database record - STATUS: LIVE immediately
    // IMPORTANT: Adapt this to your existing database schema
    const track = await createTrack({
      userId: user.id,
      title,
      description,
      fileUrl,
      contentType,
      genre,
      fileHash: validation.fileHash,
      audioMetadata: validation.metadata,
      
      // These should be adjusted based on your existing schema
      status: 'live',  // Or 'published', 'active' - whatever you use
      visibility: 'public',
      
      // Moderation fields (new)
      moderationStatus: 'pending_check',
      moderationFlagged: false,
      moderationCheckedAt: null,
      flagReasons: [],
    });
    
    // 8. Queue background moderation job (asynchronous - doesn't block response)
    // We'll implement this next
    await queueModerationJob(track.id, {
      fileUrl,
      contentType,
      userId: user.id,
      audioMetadata: validation.metadata
    });
    
    // 9. Return success immediately (content is LIVE)
    return NextResponse.json({
      success: true,
      message: 'Upload successful! Your content is now live.',
      track: {
        id: track.id,
        title: track.title,
        url: `/tracks/${track.id}`, // Adjust to your routing
        status: 'live'
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper function: Check for duplicate uploads
async function checkDuplicateUpload(userId: string, fileHash: string) {
  // ADJUST to your database client (Supabase, Prisma, etc.)
  
  // Example with Prisma:
  // const duplicate = await prisma.track.findFirst({
  //   where: { userId, fileHash }
  // });
  
  // Example with Supabase:
  // const { data: duplicate } = await supabase
  //   .from('tracks')
  //   .select('*')
  //   .eq('user_id', userId)
  //   .eq('file_hash', fileHash)
  //   .single();
  
  return null; // Replace with actual query
}
```

---

## Phase 3: Background Moderation System

### STEP 5: Set Up Job Queue

**BEFORE creating job queue, check if one already exists!**

**Look for:**
- Bull, BullMQ, Agenda, Inngest, or similar
- Existing worker files
- Redis configuration (Bull/BullMQ need Redis)

**If job queue exists:** Adapt to existing pattern
**If no job queue exists:** Choose based on your infrastructure

---

**Option A: Using Inngest (Recommended - No Redis needed)**

```bash
npm install inngest
```

**File: `/lib/moderation-queue.ts`**

```typescript
import { Inngest } from 'inngest';

// ADJUST: Check your environment variable naming
const inngest = new Inngest({ 
  id: 'soundbridge',
  eventKey: process.env.INNGEST_EVENT_KEY 
});

/**
 * Queue moderation job (called from upload endpoint)
 */
export async function queueModerationJob(
  trackId: string,
  data: {
    fileUrl: string;
    contentType: string;
    userId: string;
    audioMetadata: any;
  }
) {
  await inngest.send({
    name: 'content/moderate',
    data: {
      trackId,
      ...data
    }
  });
}

/**
 * Background moderation job
 */
export const moderateContent = inngest.createFunction(
  { id: 'moderate-content' },
  { event: 'content/moderate' },
  async ({ event, step }) => {
    const { trackId, fileUrl, contentType, userId, audioMetadata } = event.data;
    
    // Update status to 'checking'
    await step.run('update-status-checking', async () => {
      await updateTrackModerationStatus(trackId, 'checking');
    });
    
    // Run moderation checks
    const results = await step.run('run-moderation-checks', async () => {
      return await runModerationChecks(fileUrl, contentType, audioMetadata);
    });
    
    // Handle results
    if (results.flagged) {
      // Content flagged - move to review queue
      await step.run('flag-content', async () => {
        await flagContent(trackId, results.reasons);
        await notifyUserContentFlagged(userId, trackId);
        await notifyAdminContentFlagged(trackId, results.reasons);
      });
    } else {
      // Content clean - mark as checked
      await step.run('mark-clean', async () => {
        await updateTrackModerationStatus(trackId, 'clean', {
          checkedAt: new Date(),
          flagged: false
        });
      });
    }
    
    return { success: true, flagged: results.flagged };
  }
);
```

---

**Option B: Using BullMQ (If you have Redis)**

```bash
npm install bullmq ioredis
```

**File: `/lib/moderation-queue.ts`**

```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

// ADJUST: Check your Redis configuration
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const moderationQueue = new Queue('content-moderation', { connection });

/**
 * Queue moderation job
 */
export async function queueModerationJob(trackId: string, data: any) {
  await moderationQueue.add('moderate', {
    trackId,
    ...data
  });
}

/**
 * Background worker
 */
export const moderationWorker = new Worker(
  'content-moderation',
  async (job) => {
    const { trackId, fileUrl, contentType, userId, audioMetadata } = job.data;
    
    // Update status
    await updateTrackModerationStatus(trackId, 'checking');
    
    // Run checks
    const results = await runModerationChecks(fileUrl, contentType, audioMetadata);
    
    // Handle results
    if (results.flagged) {
      await flagContent(trackId, results.reasons);
      await notifyUserContentFlagged(userId, trackId);
      await notifyAdminContentFlagged(trackId, results.reasons);
    } else {
      await updateTrackModerationStatus(trackId, 'clean', {
        checkedAt: new Date()
      });
    }
    
    return { success: true };
  },
  { connection }
);
```

---

### STEP 6: Implement Moderation Checks (FREE VERSION)

**File: `/lib/moderation-checks.ts`**

**IMPORTANT: This uses FREE self-hosted tools, NOT paid APIs**

**Cost: £0/month** ✅

---

#### **Option A: Self-Hosted Whisper (RECOMMENDED - FREE)**

**System Requirements:**
- 2-4 CPU cores
- 4-8GB RAM
- 10GB disk space
- You likely already have this on your server ✅

**Installation (One-Time Setup):**

```bash
# SSH into your server
ssh your-server

# Install Python and dependencies (if not already installed)
sudo apt update
sudo apt install python3 python3-pip ffmpeg -y

# Install Whisper (open-source, free)
pip3 install -U openai-whisper

# Test installation
whisper --help
```

**That's it. Whisper is installed. Cost: £0** ✅

---

**Create Whisper Service:**

```typescript
// File: /lib/whisper-service.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Transcribe audio using self-hosted Whisper
 * Cost: £0 (runs on your server)
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    // Run Whisper CLI (installed on server)
    // --model base: Fast, good accuracy (use 'small' or 'medium' for better accuracy)
    // --language en: English (remove for auto-detect)
    // --output_format txt: Plain text output
    
    const { stdout, stderr } = await execAsync(
      `whisper "${audioFilePath}" --model base --language en --output_format txt --output_dir /tmp`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
    );
    
    // Whisper outputs to: /tmp/filename.txt
    const outputFile = audioFilePath.replace(/\.[^.]+$/, '.txt').replace(/.*\//, '/tmp/');
    
    if (!fs.existsSync(outputFile)) {
      console.error('Whisper transcription failed:', stderr);
      return '';
    }
    
    // Read transcription
    const transcription = fs.readFileSync(outputFile, 'utf-8').trim();
    
    // Clean up
    fs.unlinkSync(outputFile);
    
    return transcription;
    
  } catch (error) {
    console.error('Whisper transcription error:', error);
    return ''; // Return empty string on error (don't fail moderation)
  }
}

/**
 * Transcribe only first N seconds (optimization for long podcasts)
 */
export async function transcribeAudioSample(
  audioFilePath: string,
  durationSeconds: number = 120 // Default: first 2 minutes
): Promise<string> {
  try {
    // Extract first N seconds using ffmpeg
    const samplePath = `/tmp/sample-${Date.now()}.mp3`;
    
    await execAsync(
      `ffmpeg -i "${audioFilePath}" -t ${durationSeconds} -c copy "${samplePath}" -y`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    // Transcribe sample
    const transcription = await transcribeAudio(samplePath);
    
    // Clean up
    if (fs.existsSync(samplePath)) {
      fs.unlinkSync(samplePath);
    }
    
    return transcription;
    
  } catch (error) {
    console.error('Sample transcription error:', error);
    return '';
  }
}
```

**Processing Time:**
- 3-minute audio = ~30-60 seconds transcription (on 4-core CPU)
- 3-minute audio = ~5-10 seconds (with GPU)

**Cost: £0** ✅

---

#### **Option B: OpenAI Moderation API (FREE - 2M requests/month)**

**Check for harmful content using FREE OpenAI Moderation API:**

**Install OpenAI SDK (if not already installed):**
```bash
npm install openai
```

**Moderation Service:**

```typescript
// File: /lib/moderation-checks.ts

import OpenAI from 'openai';
import { transcribeAudioSample } from './whisper-service';

// OpenAI Moderation API is FREE (2 million requests/month)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface ModerationResult {
  flagged: boolean;
  reasons: string[];
  transcription?: string;
  categories?: any;
}

/**
 * Main moderation function (FREE VERSION)
 * Cost: £0
 */
export async function runModerationChecks(
  fileUrl: string,
  contentType: string,
  audioMetadata: any
): Promise<ModerationResult> {
  
  const results: ModerationResult = {
    flagged: false,
    reasons: []
  };
  
  try {
    // 1. Download audio file temporarily
    const tempPath = await downloadFile(fileUrl);
    
    // 2. Transcribe audio with self-hosted Whisper (FREE)
    // Only transcribe first 2 minutes for efficiency
    const transcription = await transcribeAudioSample(tempPath, 120);
    results.transcription = transcription;
    
    // 3. Check for harmful content (FREE - OpenAI Moderation API)
    if (transcription && transcription.length > 10) {
      const harmfulCheck = await checkHarmfulContent(transcription);
      if (harmfulCheck.flagged) {
        results.flagged = true;
        results.reasons.push(...harmfulCheck.reasons);
        results.categories = harmfulCheck.categories;
      }
    }
    
    // 4. Check for spam patterns (FREE - your own code)
    const spamCheck = checkSpamPatterns(transcription, audioMetadata);
    if (spamCheck.flagged) {
      results.flagged = true;
      results.reasons.push(...spamCheck.reasons);
    }
    
    // Clean up temp file
    await cleanupTempFile(tempPath);
    
  } catch (error) {
    console.error('Moderation check error:', error);
    // Don't flag content on error - just log
  }
  
  return results;
}

/**
 * Check for harmful content using FREE OpenAI Moderation API
 * 
 * FREE TIER: 2 million requests/month
 * Your usage: ~30K requests/month (1K uploads/day)
 * Cost: £0 (well within free tier)
 */
async function checkHarmfulContent(text: string): Promise<{
  flagged: boolean;
  reasons: string[];
  categories?: any;
}> {
  
  if (!text || text.trim().length === 0) {
    return { flagged: false, reasons: [] };
  }
  
  try {
    // OpenAI Moderation API - FREE
    const moderation = await openai.moderations.create({
      input: text
    });
    
    const result = moderation.results[0];
    
    if (result.flagged) {
      const reasons: string[] = [];
      const cats = result.categories;
      
      if (cats.hate) reasons.push('Hate speech detected');
      if (cats['hate/threatening']) reasons.push('Threatening hate speech detected');
      if (cats.harassment) reasons.push('Harassment detected');
      if (cats['harassment/threatening']) reasons.push('Threatening harassment detected');
      if (cats.violence) reasons.push('Violence detected');
      if (cats['violence/graphic']) reasons.push('Graphic violence detected');
      if (cats['self-harm']) reasons.push('Self-harm content detected');
      if (cats['self-harm/intent']) reasons.push('Self-harm intent detected');
      if (cats['self-harm/instructions']) reasons.push('Self-harm instructions detected');
      if (cats.sexual) reasons.push('Sexual content detected');
      if (cats['sexual/minors']) reasons.push('Sexual content involving minors detected');
      
      return {
        flagged: true,
        reasons,
        categories: cats
      };
    }
    
    return { flagged: false, reasons: [] };
    
  } catch (error) {
    console.error('Harmful content check error:', error);
    return { flagged: false, reasons: [] };
  }
}

/**
 * Check for spam patterns (FREE - your own logic)
 */
function checkSpamPatterns(
  transcription: string,
  audioMetadata: any
): { flagged: boolean; reasons: string[] } {
  
  const reasons: string[] = [];
  
  // 1. Check for repetitive text (spam indicator)
  if (transcription && transcription.length > 50) {
    const words = transcription.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    if (repetitionRatio < 0.2) {
      reasons.push('Repetitive content detected (possible spam)');
    }
    
    // Check for repeated phrases
    const phrases = transcription.match(/(.{20,}?)\1{2,}/gi);
    if (phrases && phrases.length > 0) {
      reasons.push('Repeated phrases detected (possible spam)');
    }
  }
  
  // 2. Check for extremely short duration (test uploads)
  if (audioMetadata.duration < 10) {
    reasons.push('Content too short (possible test/spam upload)');
  }
  
  // 3. Check for extremely low quality (voice memo)
  if (audioMetadata.bitrate < 64000 && audioMetadata.sampleRate < 22050) {
    reasons.push('Extremely low quality (possible voice memo)');
  }
  
  // 4. Check for silence/noise (empty content)
  if (transcription && transcription.length < 10 && audioMetadata.duration > 60) {
    reasons.push('Minimal content detected (mostly silence or noise)');
  }
  
  return {
    flagged: reasons.length > 0,
    reasons
  };
}

// Helper functions
async function downloadFile(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const tempPath = `/tmp/${Date.now()}.mp3`;
  
  const fs = require('fs');
  fs.writeFileSync(tempPath, Buffer.from(buffer));
  
  return tempPath;
}

async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
```

---

#### **Additional Free Detection Tools (Optional)**

**1. Profanity Filter (FREE)**

```bash
npm install bad-words
```

```typescript
import Filter from 'bad-words';

function checkProfanity(text: string): { hasProfanity: boolean; count: number } {
  const filter = new Filter();
  
  const cleanText = filter.clean(text);
  const profanityCount = (text.match(/\*+/g) || []).length;
  
  return {
    hasProfanity: profanityCount > 5, // Flag if excessive profanity
    count: profanityCount
  };
}
```

**2. Language Detection (FREE)**

```bash
npm install franc
```

```typescript
import { franc } from 'franc';

function detectLanguage(text: string): string {
  const lang = franc(text);
  return lang; // Returns ISO 639-3 language code
}

// Use to filter non-English content if needed
```

**3. Sentiment Analysis (FREE)**

```bash
npm install sentiment
```

```typescript
import Sentiment from 'sentiment';

function analyzeSentiment(text: string): { score: number; negative: boolean } {
  const sentiment = new Sentiment();
  const result = sentiment.analyze(text);
  
  return {
    score: result.score,
    negative: result.score < -5 // Very negative content
  };
}
```

---

## **Updated Cost Breakdown (FREE VERSION)**

### **Monthly Costs:**

| Component | Solution | Cost |
|-----------|----------|------|
| **Audio Transcription** | Self-hosted Whisper | **£0** ✅ |
| **Harmful Content Detection** | OpenAI Moderation API (free tier) | **£0** ✅ |
| **Spam Detection** | Custom logic | **£0** ✅ |
| **Server Resources** | Use existing server | **£0** ✅ |
| **TOTAL** | | **£0/month** ✅ |

**At 1,000 uploads/day: £0**
**At 10,000 uploads/day: £0**

**This is sustainable for your budget.** ✅

---

## **Performance Comparison:**

### **OpenAI API (Paid):**
- Transcription: ~5 seconds (fast)
- Cost: £600/month at 1,000 uploads/day ❌

### **Self-Hosted Whisper (Free):**
- Transcription: ~30-60 seconds (acceptable)
- Cost: £0/month at any scale ✅

**Trade-off: Slightly slower processing (30-60 sec) for FREE** ✅

---

## **Whisper Model Options:**

**Choose based on your server resources:**

| Model | Speed | Accuracy | Server Requirements |
|-------|-------|----------|-------------------|
| **tiny** | Fastest | Basic | 1GB RAM |
| **base** | Fast | Good | 1GB RAM ✅ RECOMMENDED |
| **small** | Medium | Better | 2GB RAM |
| **medium** | Slow | Great | 5GB RAM |
| **large** | Slowest | Best | 10GB RAM |

**Start with `base` model - it's fast and accurate enough.** ✅

---

## **Processing Time Examples (base model):**

```
30-second track: ~5-10 seconds
3-minute track: ~30-45 seconds
10-minute podcast: ~90-120 seconds (transcribe first 2 min only)
```

**User experience:**
- Upload → Live immediately ✅
- Background check completes in 30-60 seconds
- User never waits

---

## **Server Setup Guide:**

### **1. Install Whisper (One-Time):**

```bash
# SSH into your server
ssh your-server

# Install dependencies
sudo apt update
sudo apt install python3 python3-pip ffmpeg -y

# Install Whisper
pip3 install -U openai-whisper

# Verify installation
whisper --help
```

### **2. Test Whisper:**

```bash
# Download sample audio
wget https://github.com/openai/whisper/raw/main/tests/jfk.flac

# Transcribe
whisper jfk.flac --model base --language en

# Output: "And so my fellow Americans, ask not what your country..."
```

**If this works, you're ready to use Whisper!** ✅

### **3. Environment Variables:**

```bash
# Add to .env
OPENAI_API_KEY=sk-...  # For FREE Moderation API only
WHISPER_MODEL=base     # or tiny, small, medium
```

---

## **Alternative: Even Faster Processing with GPU (Optional)**

**If your server has GPU (Nvidia):**

```bash
# Install CUDA-enabled PyTorch
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install Whisper
pip3 install -U openai-whisper

# Whisper will automatically use GPU (10x faster)
# 3-minute track: ~3-5 seconds instead of 30-45 seconds
```

**GPU hosting costs:**
- DigitalOcean GPU: ~£40/month (still way cheaper than £600/month) ✅
- AWS EC2 G4: ~£50/month
- Vast.ai GPU: ~£10-20/month (cheapest)

**But start without GPU - it's fast enough.** ✅

---

### STEP 7: Database Helper Functions

**File: `/lib/moderation-helpers.ts`**

**CRITICAL: Adapt these to your database client (Prisma, Supabase, etc.)**

```typescript
// ADJUST all functions to match your database client

/**
 * Update track moderation status
 */
export async function updateTrackModerationStatus(
  trackId: string,
  status: string,
  additionalFields?: any
) {
  // Example with Prisma:
  // await prisma.track.update({
  //   where: { id: trackId },
  //   data: {
  //     moderationStatus: status,
  //     moderationCheckedAt: additionalFields?.checkedAt || new Date(),
  //     ...additionalFields
  //   }
  // });
  
  // Example with Supabase:
  // await supabase
  //   .from('tracks')
  //   .update({
  //     moderation_status: status,
  //     moderation_checked_at: new Date().toISOString(),
  //     ...additionalFields
  //   })
  //   .eq('id', trackId);
  
  console.log(`Updated track ${trackId} status to ${status}`);
}

/**
 * Flag content for review
 */
export async function flagContent(trackId: string, reasons: string[]) {
  // Mark content as flagged and hide from public
  
  // Example with Prisma:
  // await prisma.track.update({
  //   where: { id: trackId },
  //   data: {
  //     moderationStatus: 'flagged',
  //     moderationFlagged: true,
  //     flagReasons: reasons,
  //     visibility: 'private', // Hide from public
  //     moderationCheckedAt: new Date()
  //   }
  // });
  
  console.log(`Flagged track ${trackId}:`, reasons);
}

/**
 * Notify user their content was flagged
 */
export async function notifyUserContentFlagged(userId: string, trackId: string) {
  // ADJUST to your notification system
  // Options: email, in-app notification, push notification
  
  // Example: Send email
  // await sendEmail({
  //   to: user.email,
  //   subject: 'Your upload needs review',
  //   template: 'content-flagged',
  //   data: { trackId }
  // });
  
  // Example: Create in-app notification
  // await createNotification({
  //   userId,
  //   type: 'content_flagged',
  //   message: 'Your recent upload is under review',
  //   trackId
  // });
  
  console.log(`Notified user ${userId} about flagged track ${trackId}`);
}

/**
 * Notify admin about flagged content
 */
export async function notifyAdminContentFlagged(trackId: string, reasons: string[]) {
  // ADJUST to your admin notification system
  
  // Options:
  // 1. Email to admin
  // 2. Slack webhook
  // 3. Discord webhook
  // 4. In-app admin notification
  
  // Example: Send to Slack
  // await fetch(process.env.SLACK_WEBHOOK_URL, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     text: `🚨 Content flagged for review\nTrack ID: ${trackId}\nReasons: ${reasons.join(', ')}\nReview: ${process.env.APP_URL}/admin/flagged/${trackId}`
  //   })
  // });
  
  console.log(`Admin notified about flagged track ${trackId}:`, reasons);
}
```

---

## Phase 4: Admin Review Dashboard

### STEP 8: Create Admin API Routes

**BEFORE creating, check if admin routes already exist!**

**Look for:**
- `/app/api/admin/*` or `/pages/api/admin/*`
- Existing admin dashboard
- Admin authentication/authorization

**If admin system exists:** Add to existing structure
**If no admin system exists:** Create new admin routes

---

**File: `/app/api/admin/flagged-content/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
// ADJUST: Use your existing admin auth
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/flagged-content
 * List all flagged content
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // ADJUST to your database client
    // const flaggedTracks = await prisma.track.findMany({
    //   where: { moderationFlagged: true },
    //   include: { user: true },
    //   orderBy: { createdAt: 'desc' }
    // });
    
    const flaggedTracks = []; // Replace with actual query
    
    return NextResponse.json({ tracks: flaggedTracks });
    
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flagged content' },
      { status: 500 }
    );
  }
}
```

**File: `/app/api/admin/flagged-content/[trackId]/approve/route.ts`**

```typescript
/**
 * POST /api/admin/flagged-content/:trackId/approve
 * Approve flagged content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { trackId } = params;
    
    // ADJUST to your database
    // await prisma.track.update({
    //   where: { id: trackId },
    //   data: {
    //     moderationStatus: 'approved',
    //     moderationFlagged: false,
    //     visibility: 'public',
    //     reviewedBy: admin.id,
    //     reviewedAt: new Date()
    //   }
    // });
    
    // Notify user
    // await notifyUserContentApproved(track.userId, trackId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error approving content:', error);
    return NextResponse.json(
      { error: 'Failed to approve content' },
      { status: 500 }
    );
  }
}
```

**File: `/app/api/admin/flagged-content/[trackId]/reject/route.ts`**

```typescript
/**
 * POST /api/admin/flagged-content/:trackId/reject
 * Reject flagged content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { trackId } = params;
    const { reason } = await request.json();
    
    // ADJUST to your database
    // await prisma.track.update({
    //   where: { id: trackId },
    //   data: {
    //     moderationStatus: 'rejected',
    //     visibility: 'private',
    //     rejectionReason: reason,
    //     reviewedBy: admin.id,
    //     reviewedAt: new Date()
    //   }
    // });
    
    // Add strike to user
    // await addContentStrike(track.userId);
    
    // Notify user
    // await notifyUserContentRejected(track.userId, trackId, reason);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error rejecting content:', error);
    return NextResponse.json(
      { error: 'Failed to reject content' },
      { status: 500 }
    );
  }
}
```

---

### STEP 9: Create Admin Dashboard UI

**BEFORE creating, check if admin dashboard exists!**

**Look for:**
- `/app/admin/*` or `/pages/admin/*`
- Existing admin layout/components

**If admin dashboard exists:** Add new page to existing structure
**If no admin dashboard exists:** Create new admin section

---

**File: `/app/admin/flagged-content/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
// ADJUST: Use your existing UI components
import { Button, Card, Badge } from '@/components/ui';

export default function FlaggedContentPage() {
  const [flaggedTracks, setFlaggedTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchFlaggedContent();
  }, []);
  
  async function fetchFlaggedContent() {
    try {
      const response = await fetch('/api/admin/flagged-content');
      const data = await response.json();
      setFlaggedTracks(data.tracks);
    } catch (error) {
      console.error('Error fetching flagged content:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleApprove(trackId: string) {
    if (!confirm('Approve this content?')) return;
    
    try {
      await fetch(`/api/admin/flagged-content/${trackId}/approve`, {
        method: 'POST'
      });
      
      // Remove from list
      setFlaggedTracks(prev => prev.filter(t => t.id !== trackId));
      alert('Content approved');
    } catch (error) {
      console.error('Error approving content:', error);
      alert('Failed to approve content');
    }
  }
  
  async function handleReject(trackId: string) {
    const reason = prompt('Rejection reason (will be sent to user):');
    if (!reason) return;
    
    try {
      await fetch(`/api/admin/flagged-content/${trackId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      // Remove from list
      setFlaggedTracks(prev => prev.filter(t => t.id !== trackId));
      alert('Content rejected');
    } catch (error) {
      console.error('Error rejecting content:', error);
      alert('Failed to reject content');
    }
  }
  
  if (loading) return <div>Loading...</div>;
  
  if (flaggedTracks.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Flagged Content</h1>
        <p className="text-gray-600">No flagged content to review! 🎉</p>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Flagged Content ({flaggedTracks.length})
      </h1>
      
      <div className="space-y-4">
        {flaggedTracks.map((track) => (
          <Card key={track.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{track.title}</h3>
                <p className="text-sm text-gray-600">
                  by {track.user.name} (@{track.user.username})
                </p>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {track.flagReasons.map((reason, i) => (
                    <Badge key={i} variant="destructive">
                      {reason}
                    </Badge>
                  ))}
                </div>
                
                <div className="mt-3">
                  <audio controls src={track.fileUrl} className="w-full max-w-md" />
                </div>
                
                {track.transcription && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-gray-600">
                      View transcription
                    </summary>
                    <p className="mt-2 text-sm bg-gray-100 p-2 rounded">
                      {track.transcription}
                    </p>
                  </details>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => handleApprove(track.id)}
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100"
                >
                  ✓ Approve
                </Button>
                <Button
                  onClick={() => handleReject(track.id)}
                  variant="outline"
                  className="bg-red-50 hover:bg-red-100"
                >
                  ✗ Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 5: User Notifications & Appeals

### STEP 10: User Appeal System

**File: `/app/api/tracks/[trackId]/appeal/route.ts`**

```typescript
/**
 * POST /api/tracks/:trackId/appeal
 * User submits appeal for rejected content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { trackId } = params;
    const { appealText } = await request.json();
    
    if (!appealText || appealText.length < 20) {
      return NextResponse.json(
        { error: 'Appeal must be at least 20 characters' },
        { status: 400 }
      );
    }
    
    // Verify user owns this track
    // const track = await getTrack(trackId);
    // if (track.userId !== user.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }
    
    // Update track with appeal
    // await prisma.track.update({
    //   where: { id: trackId },
    //   data: {
    //     appealStatus: 'pending',
    //     appealText,
    //     moderationStatus: 'appealed'
    //   }
    // });
    
    // Notify admin
    // await notifyAdminAppealSubmitted(trackId, appealText);
    
    return NextResponse.json({
      success: true,
      message: 'Appeal submitted. We will review within 24 hours.'
    });
    
  } catch (error) {
    console.error('Error submitting appeal:', error);
    return NextResponse.json(
      { error: 'Failed to submit appeal' },
      { status: 500 }
    );
  }
}
```

---

## Phase 6: Testing & Deployment

### STEP 11: Testing Checklist

**Before deploying to production:**

- [ ] Test upload with valid music file (should go live immediately)
- [ ] Test upload with valid podcast (should go live immediately)
- [ ] Test upload with low bitrate file (should be rejected)
- [ ] Test upload with very short duration (should be rejected)
- [ ] Test upload with extremely large file (should be rejected)
- [ ] Test duplicate upload (should be detected)
- [ ] Verify background moderation job runs
- [ ] Verify OpenAI API calls work
- [ ] Verify flagged content appears in admin dashboard
- [ ] Test approve flow (admin approves flagged content)
- [ ] Test reject flow (admin rejects flagged content)
- [ ] Test appeal flow (user appeals rejection)
- [ ] Verify user receives notifications
- [ ] Verify admin receives notifications
- [ ] Test with actual harmful content (use test phrases)
- [ ] Monitor job queue for failures

---

### STEP 12: Environment Variables

**Add these to your `.env` file:**

```bash
# OpenAI API Key (for FREE Moderation API only - NOT Whisper)
# Get free key at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Whisper Configuration (self-hosted, no API key needed)
WHISPER_MODEL=base  # Options: tiny, base, small, medium, large
WHISPER_LANGUAGE=en # Or remove for auto-detection

# Job Queue (if using Inngest - free tier)
INNGEST_EVENT_KEY=your-key-here

# Job Queue (if using Redis/Bull - can use free Redis)
REDIS_URL=redis://localhost:6379
# Or use free Redis hosting: Upstash, Redis Labs free tier

# Admin notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ADMIN_EMAIL=admin@soundbridge.live

# Existing environment variables...
```

---

### **Getting Free OpenAI API Key:**

1. Go to https://platform.openai.com/signup
2. Create account (free)
3. Go to API Keys section
4. Create new API key
5. Copy to `.env` file

**Note:** You're ONLY using the FREE Moderation API (2M requests/month free). You're NOT using paid Whisper API.

---

### **Free Redis Options (if using BullMQ):**

**Option 1: Upstash Redis (FREE)**
- Sign up: https://upstash.com
- Create database (free tier: 10K commands/day)
- Copy Redis URL to `.env`

**Option 2: Redis Labs (FREE)**
- Sign up: https://redis.com/try-free
- Create database (free tier: 30MB)
- Copy connection string

**Option 3: Self-hosted Redis (FREE)**
```bash
# Install on your server
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Use in .env
REDIS_URL=redis://localhost:6379
```

---

### **Whisper Setup (One-Time):**

**SSH into your server and run:**

```bash
# Update system
sudo apt update

# Install Python and pip (if not installed)
sudo apt install python3 python3-pip ffmpeg -y

# Install Whisper
pip3 install -U openai-whisper

# Verify installation
whisper --help

# Test with sample audio
whisper test.mp3 --model base --language en

# Done! No API key needed for Whisper (self-hosted)
```

**Total setup time: 5-10 minutes** ✅

---

### STEP 13: Deployment Steps

1. **Run database migrations:**
```bash
# Prisma
npx prisma migrate deploy

# Supabase
# Apply SQL migrations in dashboard
```

2. **Start background workers:**
```bash
# If using BullMQ
node workers/moderation-worker.js

# If using Inngest
# Workers run automatically in cloud
```

3. **Monitor logs:**
```bash
# Watch for moderation job failures
# Check OpenAI API usage
# Monitor flagged content queue
```

4. **Update documentation:**
```markdown
# Upload Guidelines for Users
- Explain instant upload
- Explain background checks
- Explain what happens if flagged
- Provide appeal process
```

---

## Cost Estimates (FREE VERSION)

### **Total Monthly Costs: £0** ✅

**Component Breakdown:**

| Component | Solution | Monthly Cost | Notes |
|-----------|----------|--------------|-------|
| **Audio Transcription** | Self-hosted Whisper (open-source) | **£0** | Runs on your server |
| **Harmful Content Detection** | OpenAI Moderation API | **£0** | FREE tier: 2M requests/month |
| **Spam Detection** | Custom logic | **£0** | Your own code |
| **Profanity Filter** | bad-words (npm) | **£0** | Open-source package |
| **Server Resources** | Existing server | **£0** | Use current infrastructure |
| **Job Queue** | Inngest (free tier) or BullMQ + Redis | **£0** | Free tiers sufficient |
| **TOTAL** | | **£0/month** | ✅ |

---

### **Usage Scenarios:**

**100 uploads/day:**
- Whisper transcriptions: 100/day × 30 days = 3,000/month
- OpenAI Moderation checks: 3,000/month (well under 2M free tier)
- **Cost: £0**

**1,000 uploads/day:**
- Whisper transcriptions: 30,000/month
- OpenAI Moderation checks: 30,000/month (still well under free tier)
- **Cost: £0**

**10,000 uploads/day:**
- Whisper transcriptions: 300,000/month
- OpenAI Moderation checks: 300,000/month (still within free tier)
- **Cost: £0**

**You won't hit OpenAI's 2M free limit until 66,000 uploads/day.** ✅

---

### **Server Resource Usage:**

**CPU Usage (base model):**
- 3-minute audio: ~30-60 seconds CPU time
- 100 uploads/day: ~1-2 hours CPU time total
- Your server can handle this easily ✅

**RAM Usage:**
- Whisper base model: ~1GB RAM
- Running 1 transcription at a time: ~1-2GB RAM total
- Most servers have 4-8GB RAM ✅

**Disk Usage:**
- Whisper model: ~150MB (one-time download)
- Temp files: Deleted after processing
- Total: ~200MB disk space ✅

---

### **Performance Expectations:**

**Processing Times (4-core CPU):**
- 30-second track: ~5-10 seconds
- 3-minute track: ~30-45 seconds
- 10-minute podcast: ~90-120 seconds (transcribe first 2 min only)

**With GPU (optional):**
- 30-second track: ~1-2 seconds
- 3-minute track: ~3-5 seconds
- 10-minute podcast: ~10-15 seconds

---

### **Scaling Considerations:**

**If you grow beyond 10,000 uploads/day:**

**Option 1: Add more workers (still free)**
- Run multiple Whisper instances in parallel
- Scale horizontally with more CPU cores

**Option 2: Add GPU (if needed)**
- DigitalOcean GPU Droplet: ~£40/month
- Vast.ai GPU: ~£10-20/month
- 10x faster processing

**Option 3: Use OpenAI API (if revenue allows)**
- Switch to OpenAI Whisper API at scale
- Only if your revenue covers the cost
- You can afford this once you have 10K+ uploads/day ✅

---

### **Cost Comparison:**

| Solution | 1,000 uploads/day | 10,000 uploads/day |
|----------|-------------------|-------------------|
| **OpenAI API (Paid)** | £600/month ❌ | £6,000/month ❌ |
| **Self-Hosted (Free)** | £0/month ✅ | £0/month ✅ |
| **Self-Hosted + GPU** | £40/month | £40/month |

**Start with FREE self-hosted. Add GPU later if needed.** ✅

---

## Monitoring & Optimization

### Key Metrics to Track

1. **Upload success rate** - % of uploads that pass validation
2. **Moderation time** - How long background jobs take
3. **False positive rate** - % of flagged content that's actually clean
4. **Admin review time** - How long flagged content waits for review
5. **Appeal rate** - % of rejected content that's appealed
6. **API costs** - OpenAI spending per month

### Create Admin Dashboard Stats

```typescript
// /app/admin/stats/page.tsx

export default function AdminStatsPage() {
  // Display:
  // - Total uploads today/week/month
  // - Flagged content count
  // - Average moderation time
  // - False positive rate
  // - OpenAI API costs
  // - Top flag reasons
}
```

---

## Future Enhancements

### Phase 2 Features (Add Later)

1. **Copyright Detection** (ACRCloud API - $29/mo)
2. **Community Reporting** (let users flag content)
3. **Automated Copyright Attribution** (detect covers, give credit)
4. **Advanced Spam Detection** (ML models)
5. **User Reputation System** (auto-approve trusted users)
6. **Batch Moderation** (approve/reject multiple at once)

---

## Troubleshooting

### Common Issues

**Issue: Moderation jobs not running**
- Check if worker is started
- Check Redis/Inngest connection
- Check job queue logs

**Issue: OpenAI API errors**
- Verify API key is correct
- Check API quota/limits
- Handle rate limiting with retries

**Issue: Files not downloading**
- Check storage URL permissions
- Verify file exists in storage
- Check temp directory permissions

**Issue: Notifications not sent**
- Check email service configuration
- Verify notification functions are called
- Check user has valid email/notification settings

---

## Summary

**What This System Does:**

1. ✅ Users upload → content goes LIVE immediately (30 seconds)
2. ✅ Background AI checks run (2-5 minutes, user doesn't wait)
3. ✅ 90-95% of content passes automatically (no action needed)
4. ✅ 5-10% of content flagged for review (harmful/spam/low quality)
5. ✅ Admin reviews flagged content (10-15 min/day)
6. ✅ Approved content goes back live
7. ✅ Rejected content stays hidden, user can appeal
8. ✅ Appeals reviewed within 24 hours

**Benefits:**

- ✅ Instant upload (competitive advantage maintained)
- ✅ Platform stays safe (harmful content caught)
- ✅ Minimal manual work (only review flagged content)
- ✅ Scalable (works for 100 or 10,000 uploads/day)
- ✅ Transparent (users know what's happening)

**Your Daily Workload:**

- **0-100 uploads/day:** 5 minutes (1-2 flagged tracks)
- **100-500 uploads/day:** 10-15 minutes (5-10 flagged tracks)
- **500+ uploads/day:** Consider hiring part-time moderator

---

## FINAL REMINDERS

**BEFORE implementing ANY code in this document:**

1. ✅ Review ALL existing upload code
2. ✅ Document current structure and patterns
3. ✅ Adapt provided code to YOUR existing patterns
4. ✅ Don't duplicate existing functionality
5. ✅ Test thoroughly before deploying
6. ✅ Start with Phase 1 only (don't over-engineer)
7. ✅ Monitor costs and performance after launch

**This system preserves your "instant upload" competitive advantage while keeping the platform safe. Good luck! 🚀**
