# Mobile Team: Upload Structure & Database Schema Request

**Date:** January 8, 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Priority:** High - Blocking Upload Fix  
**Subject:** Upload Database Schema Alignment

---

## 🚨 **URGENT REQUEST**

We're fixing upload failures on the web app and need to align our database schema with your mobile app implementation. The upload is failing because we're trying to insert data into columns that may not exist or may be structured differently.

---

## 📋 **Current Upload Issue**

**Error:** `"Could not find the 'audioQuality' column of 'audio_tracks' in the schema cache"`

**Problem:** Web app is trying to insert these fields:
- `audioQuality` / `audio_quality`
- `bitrate`
- `sampleRate` / `sample_rate`
- `channels`
- `codec`
- `processing_status`
- `processing_completed_at`

---

## ❓ **Questions for Mobile Team**

### **1. Current Upload Structure**
- What fields does your mobile app currently save when uploading tracks?
- Do you use any audio quality/enhancement fields?
- What's your current upload API payload structure?

### **2. Database Schema**
- What columns currently exist in your `audio_tracks` table?
- Do you have any audio quality tracking?
- What's your current database schema for uploads?

### **3. Audio Quality System**
- Are you planning to implement audio quality features?
- Do you need the Pro/Enterprise tier quality system?
- What's your timeline for audio enhancement features?

### **4. Lyrics Feature**
- Do you want to implement lyrics on mobile?
- Should we coordinate the lyrics database schema?
- What's your preferred approach for lyrics display?

---

## 🎯 **What We Need**

### **Immediate (Upload Fix)**
Please share your current upload database schema so we can:
1. Align web app upload API with your structure
2. Fix the HTTP 400 upload errors
3. Ensure consistency across platforms

### **Future (Feature Alignment)**
1. Coordinate audio quality system implementation
2. Align lyrics feature development
3. Share upload validation logic

---

## 📊 **Current Web App Upload Fields**

```typescript
// What we're currently trying to save:
{
  title: string,
  artist_name: string,
  description: string,
  creator_id: string,
  file_url: string,
  cover_art_url: string,
  duration: number,
  genre: string,
  tags: string,
  lyrics: string,           // NEW
  lyrics_language: string,  // NEW
  is_public: boolean,
  
  // Audio Quality (causing errors):
  audio_quality: string,
  bitrate: number,
  sample_rate: number,
  channels: number,
  codec: string,
  processing_status: string,
  processing_completed_at: timestamp
}
```

---

## 🔄 **Proposed Approach**

### **Option 1: Minimal Fix (Recommended)**
- Add only essential columns that both platforms need
- Keep it simple for now
- Add advanced features later when coordinated

### **Option 2: Full Feature Set**
- Implement complete audio quality system
- Add lyrics support
- Coordinate with mobile team timeline

### **Option 3: Mobile-First**
- Wait for mobile team to define structure
- Web app adapts to mobile schema
- Ensures mobile compatibility

---

## 📞 **Next Steps**

1. **Mobile Team Response Needed:**
   - Current upload schema
   - Planned features timeline
   - Preferred approach (Option 1, 2, or 3)

2. **Web App Action:**
   - Apply minimal fix to get uploads working
   - Coordinate with mobile team for future features
   - Ensure platform consistency

---

## 🚀 **Timeline**

- **Immediate:** Upload fix (within 24 hours)
- **Short-term:** Feature alignment (1-2 weeks)
- **Long-term:** Coordinated development (ongoing)

---

**Please respond with your current upload structure and preferred approach so we can fix the upload issue and align our development!**

**Contact:** Web App Team  
**Urgency:** High - Users cannot upload tracks  
**Status:** Waiting for mobile team response

---

*This coordination will ensure both platforms work seamlessly together and users have a consistent experience across web and mobile.*
