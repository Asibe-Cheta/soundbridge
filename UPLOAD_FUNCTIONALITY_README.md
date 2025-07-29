# SoundBridge Audio Upload Functionality

## Overview

This document describes the implementation of basic audio upload functionality for SoundBridge, connecting the existing upload interface to Supabase storage and database systems.

## ✅ Completed Features

### 1. **Supabase Storage Integration**
- ✅ Connected to `audio-tracks` storage bucket
- ✅ Connected to `cover-art` storage bucket
- ✅ Proper file validation (MP3, WAV, M4A, AAC, FLAC - max 50MB)
- ✅ Unique filename generation with user-based organization
- ✅ Signed URLs for private audio files
- ✅ Public URLs for cover art

### 2. **File Upload System**
- ✅ Drag & drop interface with visual feedback
- ✅ File type validation with user-friendly error messages
- ✅ File size validation (50MB limit for audio, 5MB for images)
- ✅ Real-time upload progress indicators
- ✅ Cancel upload functionality
- ✅ Audio preview with play/pause controls
- ✅ Cover art upload with preview

### 3. **Database Integration**
- ✅ Audio track records creation in `audio_tracks` table
- ✅ Proper metadata storage (title, description, genre, tags, duration)
- ✅ Creator association via user authentication
- ✅ Privacy settings (public, followers, private)
- ✅ Publishing options (now, schedule, draft)

### 4. **Authentication & Security**
- ✅ User authentication required for uploads
- ✅ Proper session management
- ✅ User-specific file organization
- ✅ Secure file access with signed URLs
- ✅ API route authentication

### 5. **User Experience**
- ✅ Glassmorphism design maintained
- ✅ Responsive upload interface
- ✅ Real-time progress tracking
- ✅ Error handling with user feedback
- ✅ Success messages and form reset
- ✅ Audio preview functionality

## 🏗️ Architecture

### Core Components

#### 1. **Upload Service** (`src/lib/upload-service.ts`)
```typescript
class AudioUploadService {
  // File validation
  validateAudioFile(file: File): { isValid: boolean; errors: string[] }
  validateImageFile(file: File): { isValid: boolean; errors: string[] }
  
  // File upload
  uploadAudioFile(file: File, userId: string, onProgress?: Function)
  uploadCoverArt(file: File, userId: string, onProgress?: Function)
  
  // Database operations
  createAudioTrackRecord(trackData: TrackData)
  uploadTrack(trackData: TrackUploadData, userId: string)
}
```

#### 2. **Upload Hook** (`src/hooks/useAudioUpload.ts`)
```typescript
function useAudioUpload(): [UploadState, UploadActions] {
  // State management for upload process
  // File validation and handling
  // Progress tracking
  // Error handling
}
```

#### 3. **API Route** (`app/api/upload/route.ts`)
```typescript
// POST /api/upload - Create track record
// GET /api/upload - Fetch user's tracks
```

#### 4. **Upload Interface** (`app/upload/page.tsx`)
- Drag & drop file upload
- Form validation
- Progress indicators
- Audio preview
- Cover art upload

## 📁 File Structure

```
src/
├── lib/
│   ├── upload-service.ts          # Core upload service
│   ├── supabase.ts               # Supabase client configuration
│   └── types/
│       └── upload.ts             # Upload type definitions
├── hooks/
│   └── useAudioUpload.ts         # Upload state management hook
├── components/
│   └── ui/
│       └── AudioPlayer.tsx       # Audio player component
└── contexts/
    └── AuthContext.tsx           # Authentication context

app/
├── upload/
│   └── page.tsx                  # Main upload interface
├── upload-test/
│   └── page.tsx                  # Test page for uploaded tracks
└── api/
    └── upload/
        └── route.ts              # Upload API endpoints
```

## 🗄️ Database Schema

### Audio Tracks Table
```sql
CREATE TABLE audio_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    cover_art_url TEXT,
    duration INTEGER, -- in seconds
    genre VARCHAR(100),
    tags TEXT[],
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage Buckets
```sql
-- Audio tracks bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audio-tracks', 'audio-tracks', false, 52428800, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', ...]);

-- Cover art bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cover-art', 'cover-art', true, 5242880, ARRAY['image/jpeg', 'image/png', ...]);
```

## 🔧 Configuration

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Storage Bucket Setup
1. Run `storage_buckets.sql` to create buckets
2. Run `storage_policies.sql` to set up access policies
3. Ensure RLS (Row Level Security) is enabled

## 🚀 Usage

### 1. **Upload a Track**
```typescript
import { useAudioUpload } from '@/src/hooks/useAudioUpload';

const [uploadState, uploadActions] = useAudioUpload();

// Set audio file
uploadActions.setAudioFile(file);

// Set cover art (optional)
uploadActions.setCoverArtFile(imageFile);

// Upload track
const success = await uploadActions.uploadTrack({
  title: 'My Track',
  description: 'Track description',
  genre: 'Hip Hop',
  tags: ['rap', 'beats'],
  privacy: 'public',
  publishOption: 'now'
});
```

### 2. **Display Uploaded Tracks**
```typescript
import { AudioPlayer } from '@/src/components/ui/AudioPlayer';

<AudioPlayer
  src={track.file_url}
  title={track.title}
  artist={track.creator?.display_name}
  coverArt={track.cover_art_url}
/>
```

## 🎯 Features in Detail

### File Validation
- **Audio files**: MP3, WAV, M4A, AAC, FLAC (max 50MB)
- **Image files**: JPG, PNG, WebP, AVIF (max 5MB)
- **Real-time validation** with user-friendly error messages

### Upload Progress
- **Real-time progress bars** for both audio and cover art
- **Cancel functionality** with abort controller
- **Speed and time remaining** calculations
- **Visual feedback** with loading states

### Audio Preview
- **Built-in audio player** with play/pause controls
- **Progress bar** with seek functionality
- **Duration display** in MM:SS format
- **Volume control** with mute toggle

### Database Integration
- **Automatic metadata extraction** (duration, bitrate, format)
- **Creator association** via user authentication
- **Privacy settings** (public, followers, private)
- **Tag support** with array storage
- **Genre categorization**

### Security Features
- **Authentication required** for all uploads
- **User-specific file organization** (`userId/timestamp_filename.ext`)
- **Signed URLs** for private audio files
- **Public URLs** for cover art
- **File type validation** on both client and server

## 🧪 Testing

### Test Pages
1. **Upload Interface**: `/upload` - Main upload functionality
2. **Test Page**: `/upload-test` - View uploaded tracks

### Test Scenarios
- ✅ File validation (valid/invalid types, sizes)
- ✅ Upload progress tracking
- ✅ Cancel upload functionality
- ✅ Audio preview and playback
- ✅ Cover art upload and preview
- ✅ Form validation and submission
- ✅ Error handling and user feedback
- ✅ Authentication requirements

## 🔄 API Endpoints

### POST `/api/upload`
Create a new audio track record.

**Request:**
```json
{
  "title": "Track Title",
  "description": "Track description",
  "genre": "Hip Hop",
  "tags": ["rap", "beats"],
  "privacy": "public",
  "publishOption": "now",
  "audioFileUrl": "signed_url_to_audio_file",
  "coverArtUrl": "public_url_to_cover_art",
  "duration": 180
}
```

**Response:**
```json
{
  "success": true,
  "track": {
    "id": "uuid",
    "title": "Track Title",
    "file_url": "signed_url",
    "cover_art_url": "public_url",
    "duration": 180,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET `/api/upload`
Fetch user's uploaded tracks.

**Response:**
```json
{
  "success": true,
  "tracks": [
    {
      "id": "uuid",
      "title": "Track Title",
      "description": "Description",
      "file_url": "signed_url",
      "cover_art_url": "public_url",
      "duration": 180,
      "genre": "Hip Hop",
      "tags": ["rap", "beats"],
      "is_public": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 🎨 UI Components

### Upload Interface
- **Drag & drop area** with visual feedback
- **File validation** with error messages
- **Progress indicators** for uploads
- **Audio preview** with controls
- **Cover art upload** with preview
- **Form validation** and submission

### Audio Player
- **Play/pause controls** with loading states
- **Progress bar** with seek functionality
- **Volume control** with mute toggle
- **Time display** in MM:SS format
- **Cover art display** (optional)
- **Error handling** for failed loads

## 🔧 Future Enhancements

### Planned Features
- [ ] **Batch upload** support
- [ ] **Resumable uploads** for large files
- [ ] **Audio waveform visualization**
- [ ] **Advanced audio processing** (normalization, compression)
- [ ] **Playlist creation** from uploaded tracks
- [ ] **Social features** (likes, comments, sharing)
- [ ] **Analytics** (play counts, engagement metrics)
- [ ] **Advanced privacy** (password protection, expiration)
- [ ] **Collaboration** (co-creation, remixes)
- [ ] **Monetization** (premium content, subscriptions)

### Technical Improvements
- [ ] **Chunked uploads** for very large files
- [ ] **Background processing** for audio analysis
- [ ] **CDN integration** for global delivery
- [ ] **Caching strategies** for better performance
- [ ] **WebSocket integration** for real-time updates
- [ ] **PWA features** for offline support

## 🐛 Troubleshooting

### Common Issues

1. **Upload fails with authentication error**
   - Ensure user is logged in
   - Check session validity
   - Verify environment variables

2. **File validation errors**
   - Check file type and size limits
   - Ensure proper MIME type detection
   - Verify browser support for file types

3. **Database insert failures**
   - Check database connection
   - Verify table schema
   - Ensure proper user permissions

4. **Audio playback issues**
   - Check file format compatibility
   - Verify signed URL validity
   - Ensure proper CORS configuration

### Debug Steps
1. Check browser console for errors
2. Verify Supabase dashboard for storage issues
3. Test API endpoints directly
4. Check network tab for failed requests
5. Validate environment variables

## 📚 Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [React Hooks Documentation](https://react.dev/reference/react/hooks)

---

**Status**: ✅ **COMPLETE** - Basic audio upload functionality fully implemented and tested.

**Next Steps**: Deploy to production and gather user feedback for iterative improvements. 