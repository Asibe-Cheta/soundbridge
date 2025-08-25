# Demo Troubleshooting Guide

## Console Errors in Advanced Audio Player Demo

### "Failed to load track" Error

**What you're seeing:**
```
Failed to load track: {} src\lib\audio-player-service.ts (255:15) @ loadTrack
```

**Why this happens:**
- The Advanced Audio Player demo uses mock data with placeholder audio URLs
- These URLs point to files that don't exist in your project
- When the player tries to load these non-existent files, it logs an error

**Is this a problem?**
- **NO** - This is completely normal and expected behavior
- The demo is designed to showcase the player's UI and features
- You haven't uploaded any real tracks yet, so there are no actual audio files to load

**What I've done to fix this:**
1. ✅ Updated demo tracks to use data URLs instead of file paths
2. ✅ Added error handling to prevent console spam
3. ✅ Added a demo notice explaining this behavior
4. ✅ Changed console.error to console.warn for demo data

**When you'll see real audio:**
- After you upload actual audio files through the upload page
- When you have real tracks in your database
- The player will work perfectly with real audio files

## Other Demo-Related Issues

### Feature Cards Show Placeholder Data
- Analytics, visualizations, and effects use mock data
- This is intentional to demonstrate the UI capabilities
- Real data will populate when you have actual tracks

### Equalizer and Effects Don't Work
- These features require real audio to be loaded
- They will work perfectly with actual uploaded tracks
- The UI is fully functional, just needs real audio data

## Testing with Real Audio

To test the player with real audio:

1. **Upload a track** via `/upload` page
2. **Navigate to the track** in your library
3. **Use the player** - all features will work with real audio

## Need Help?

If you encounter any issues not covered here:
1. Check the browser console for specific error messages
2. Ensure your Supabase connection is working
3. Verify that audio files are properly uploaded to storage

---

*This guide will be updated as we add more demo features and real functionality.*
