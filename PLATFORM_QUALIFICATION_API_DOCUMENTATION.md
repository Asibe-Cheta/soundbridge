# 🎵 Platform Qualification System - API Documentation

**Date:** January 2025  
**Version:** 1.0  
**Status:** ✅ **PRODUCTION READY**

---

## 📋 **API OVERVIEW**

The Platform Qualification System provides comprehensive APIs for qualifying SoundBridge as a destination platform for external distribution services. This system includes ISRC generation, content quality testing, platform readiness tracking, and analytics.

**Base URL:** `https://soundbridge.live/api`

**Authentication:** Bearer token in Authorization header
**Content-Type:** `application/json`

---

## 🔑 **AUTHENTICATION**

All APIs (except public ISRC validation) require authentication:

```typescript
// Required headers
{
  "Authorization": "Bearer <user_token>",
  "Content-Type": "application/json"
}
```

**Token Sources:**
- Mobile app: Supabase auth token
- Web app: Session cookie
- Admin operations: Admin role required

---

## 🎵 **ISRC MANAGEMENT APIs**

### **Generate ISRC**

**Endpoint:** `POST /api/isrc/generate`

**Description:** Generates a unique ISRC code for a track.

**Request Body:**
```typescript
{
  "trackId": "string",      // Required: UUID of the track
  "trackTitle": "string",   // Required: Title of the track
  "artistName": "string"    // Required: Name of the artist
}
```

**Response:**
```typescript
{
  "success": true,
  "isrc": "GB-SBR-25-12345",
  "status": "generated" | "existing",
  "trackInfo": {
    "title": "Song Title",
    "artist": "Artist Name",
    "isrc": "GB-SBR-25-12345"
  }
}
```

**Error Responses:**
- `400`: Missing required fields
- `401`: Authentication required
- `404`: Track not found or access denied
- `500`: ISRC generation failed

**Example:**
```bash
curl -X POST https://soundbridge.live/api/isrc/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "trackId": "123e4567-e89b-12d3-a456-426614174000",
    "trackTitle": "My Awesome Song",
    "artistName": "John Doe"
  }'
```

### **Get User's ISRCs**

**Endpoint:** `GET /api/isrc/generate`

**Description:** Retrieves all ISRCs for the authenticated user.

**Query Parameters:**
- `trackId` (optional): Filter by specific track
- `status` (optional): Filter by status (`active`, `retired`, `replaced`)

**Response:**
```typescript
{
  "success": true,
  "isrcs": [
    {
      "trackId": "uuid",
      "isrc": "GB-SBR-25-12345",
      "status": "active",
      "trackTitle": "Song Title",
      "artistName": "Artist Name",
      "createdAt": "2025-01-15T10:30:00Z",
      "generatedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### **Validate ISRC**

**Endpoint:** `POST /api/isrc/validate`

**Description:** Validates ISRC format and checks existence in registry.

**Request Body:**
```typescript
{
  "isrc": "string"  // Required: ISRC code to validate
}
```

**Response:**
```typescript
{
  "success": true,
  "isValid": true,
  "trackInfo": {
    "title": "Song Title",
    "artist": "Artist Name",
    "platform": "SoundBridge",
    "status": "active",
    "generatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Format Validation Only:**
**Endpoint:** `GET /api/isrc/validate?isrc=GB-SBR-25-12345`

---

## 📊 **PLATFORM QUALIFICATION APIs**

### **Get Qualification Status**

**Endpoint:** `GET /api/qualification/status`

**Description:** Retrieves platform qualification status and progress.

**Query Parameters:**
- `platform` (optional): Filter by platform (`TuneCore`, `DistroKid`, `CD Baby`)
- `category` (optional): Filter by category (`technical`, `legal`, `business`, `content`)

**Response:**
```typescript
{
  "success": true,
  "qualifications": [
    {
      "id": "uuid",
      "platformName": "TuneCore",
      "requirementType": "technical",
      "requirementName": "RESTful API",
      "description": "Implement RESTful API for track management",
      "isMet": true,
      "evidenceUrl": "https://docs.soundbridge.live/api",
      "verifiedAt": "2025-01-15T10:30:00Z",
      "verifiedBy": "uuid",
      "priority": "high",
      "estimatedEffortHours": 40,
      "dependencies": [],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "overallStatus": "qualified" | "partially_qualified" | "not_qualified",
  "completionPercentage": 75,
  "totalRequirements": 25,
  "completedRequirements": 19,
  "platformProgress": [
    {
      "platform": "TuneCore",
      "totalRequirements": 25,
      "completedRequirements": 19,
      "completionPercentage": 76,
      "status": "partially_qualified",
      "categories": [
        {
          "category": "technical",
          "total": 5,
          "completed": 4,
          "percentage": 80
        }
      ]
    }
  ],
  "summary": {
    "totalPlatforms": 4,
    "totalCategories": 4,
    "averageCompletion": 75
  }
}
```

### **Update Qualification**

**Endpoint:** `PUT /api/qualification/[qualificationId]`

**Description:** Updates qualification status (Admin only).

**Request Body:**
```typescript
{
  "isMet": true,                    // Required: Boolean
  "evidenceUrl": "string",          // Optional: Link to evidence
  "notes": "string"                 // Optional: Additional notes
}
```

**Response:**
```typescript
{
  "success": true,
  "qualification": {
    "id": "uuid",
    "platformName": "TuneCore",
    "requirementType": "technical",
    "requirementName": "RESTful API",
    "description": "Implement RESTful API for track management",
    "isMet": true,
    "evidenceUrl": "https://docs.soundbridge.live/api",
    "verifiedAt": "2025-01-15T10:30:00Z",
    "verifiedBy": "uuid",
    "priority": "high",
    "estimatedEffortHours": 40,
    "dependencies": [],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

---

## 🧪 **CONTENT QUALITY APIs**

### **Get Content Quality Standards**

**Endpoint:** `GET /api/qualification/content-standards`

**Description:** Retrieves content quality standards and implementation status.

**Query Parameters:**
- `category` (optional): Filter by category (`audio`, `metadata`, `artwork`, `legal`)

**Response:**
```typescript
{
  "success": true,
  "standards": [
    {
      "id": "uuid",
      "standardName": "Audio Bitrate",
      "description": "Minimum 320 kbps bitrate for MP3",
      "category": "audio",
      "isImplemented": true,
      "implementationDetails": {
        "minBitrate": 320,
        "supportedFormats": ["mp3", "wav", "flac"]
      },
      "testResults": {
        "lastTest": "2025-01-15T10:30:00Z",
        "averageScore": 85
      },
      "minScore": 80.0,
      "maxScore": 100.0,
      "weight": 1.0,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "implementedCount": 15,
  "totalCount": 20,
  "implementationPercentage": 75,
  "categoryStats": [
    {
      "category": "audio",
      "total": 5,
      "implemented": 4,
      "percentage": 80
    }
  ],
  "summary": {
    "totalCategories": 4,
    "averageImplementation": 75
  }
}
```

### **Test Content Quality**

**Endpoint:** `POST /api/qualification/content-standards`

**Description:** Tests content against quality standards.

**Request Body:**
```typescript
{
  "standardId": "uuid",     // Required: ID of the standard to test
  "testData": {             // Required: Test data object
    "trackId": "uuid",      // Optional: Track ID
    "bitrate": 320,         // Audio quality data
    "sampleRate": 44100,
    "title": "Song Title",  // Metadata
    "artist": "Artist Name",
    "genre": "Pop",
    "resolution": "3000x3000", // Artwork data
    "format": "jpg",
    "copyrightOwnership": true // Legal data
  }
}
```

**Response:**
```typescript
{
  "success": true,
  "testResults": {
    "passed": true,
    "score": 85,
    "details": {
      "bitrate": 320,
      "sampleRate": 44100,
      "channels": "stereo",
      "duration": "3:45"
    },
    "recommendations": [
      "Ensure audio bitrate is at least 320 kbps",
      "Use 44.1 kHz or higher sample rate"
    ],
    "standardName": "Audio Bitrate",
    "minScore": 80,
    "testId": "uuid"
  }
}
```

### **Get Content Quality Results**

**Endpoint:** `GET /api/qualification/content-quality/results`

**Description:** Retrieves content quality test results and analytics.

**Query Parameters:**
- `standardId` (optional): Filter by specific standard
- `startDate` (optional): Start date for results (ISO 8601)
- `endDate` (optional): End date for results (ISO 8601)

**Response:**
```typescript
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "standardName": "Audio Bitrate",
      "category": "audio",
      "trackTitle": "Song Title",
      "artistName": "Artist Name",
      "testDate": "2025-01-15T10:30:00Z",
      "passed": true,
      "score": 85,
      "minScore": 80,
      "details": { /* test details */ },
      "recommendations": [ /* improvement suggestions */ ],
      "retestRequired": false,
      "retestDate": null
    }
  ],
  "summary": {
    "totalTests": 150,
    "passedTests": 135,
    "averageScore": 82,
    "improvementTrend": "up",
    "retestRequired": 15,
    "retestPercentage": 10
  },
  "resultsByStandard": [
    {
      "standardName": "Audio Bitrate",
      "category": "audio",
      "total": 50,
      "passed": 45,
      "averageScore": 85,
      "percentage": 90
    }
  ],
  "resultsByCategory": [
    {
      "category": "audio",
      "total": 50,
      "passed": 45,
      "averageScore": 85,
      "percentage": 90,
      "standardCount": 5
    }
  ],
  "topRecommendations": [
    {
      "recommendation": "Ensure audio bitrate is at least 320 kbps",
      "count": 25
    }
  ],
  "trends": {
    "improvementTrend": "up",
    "recentAverage": 85,
    "olderAverage": 80,
    "scoreRange": {
      "min": 60,
      "max": 100
    }
  }
}
```

---

## 📋 **PLATFORM READINESS APIs**

### **Get Platform Readiness Checklist**

**Endpoint:** `GET /api/qualification/readiness`

**Description:** Retrieves platform readiness checklist items.

**Query Parameters:**
- `category` (optional): Filter by category (`technical`, `legal`, `business`, `content`)
- `status` (optional): Filter by status (`pending`, `in_progress`, `completed`, `failed`)
- `priority` (optional): Filter by priority (`low`, `medium`, `high`, `critical`)

**Response:**
```typescript
{
  "success": true,
  "checklist": [
    {
      "id": "uuid",
      "checklistItem": "API Infrastructure Complete",
      "category": "technical",
      "status": "completed",
      "priority": "critical",
      "completionDate": "2025-01-15T10:30:00Z",
      "notes": "All API endpoints implemented and tested",
      "assignedTo": "uuid",
      "assignedToName": "John Doe",
      "assignedToEmail": "john@example.com",
      "estimatedCompletionDate": "2025-01-20T00:00:00Z",
      "dependencies": ["uuid1", "uuid2"],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "progress": {
    "completed": 15,
    "total": 25,
    "percentage": 60,
    "inProgress": 5,
    "pending": 4,
    "failed": 1
  },
  "categoryProgress": [
    {
      "category": "technical",
      "total": 8,
      "completed": 6,
      "inProgress": 1,
      "pending": 1,
      "failed": 0,
      "percentage": 75
    }
  ],
  "priorityProgress": {
    "critical": 5,
    "high": 8,
    "medium": 7,
    "low": 5,
    "criticalCompleted": 4,
    "highCompleted": 6,
    "criticalPercentage": 80,
    "highPercentage": 75
  },
  "summary": {
    "totalCategories": 4,
    "averageCompletion": 60,
    "criticalItemsRemaining": 1,
    "highItemsRemaining": 2
  }
}
```

### **Update Readiness Item**

**Endpoint:** `PUT /api/qualification/readiness`

**Description:** Updates readiness checklist item status.

**Request Body:**
```typescript
{
  "itemId": "uuid",                    // Required: ID of the item to update
  "status": "completed",               // Required: New status
  "notes": "string",                   // Optional: Additional notes
  "completionDate": "2025-01-15T10:30:00Z"  // Optional: Completion date
}
```

**Valid Status Values:**
- `pending`: Not started
- `in_progress`: Currently being worked on
- `completed`: Finished successfully
- `failed`: Failed to complete

**Response:**
```typescript
{
  "success": true,
  "item": {
    "id": "uuid",
    "checklistItem": "API Infrastructure Complete",
    "category": "technical",
    "status": "completed",
    "priority": "critical",
    "completionDate": "2025-01-15T10:30:00Z",
    "notes": "All API endpoints implemented and tested",
    "assignedTo": "uuid",
    "assignedToName": "John Doe",
    "assignedToEmail": "john@example.com",
    "estimatedCompletionDate": "2025-01-20T00:00:00Z",
    "dependencies": ["uuid1", "uuid2"],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

---

## 📊 **ANALYTICS APIs**

### **Get Qualification Analytics**

**Endpoint:** `GET /api/qualification/analytics`

**Description:** Retrieves comprehensive qualification analytics and trends.

**Query Parameters:**
- `platform` (optional): Filter by specific platform
- `category` (optional): Filter by requirement category
- `startDate` (optional): Start date for analytics (ISO 8601)
- `endDate` (optional): End date for analytics (ISO 8601)

**Response:**
```typescript
{
  "success": true,
  "progress": {
    "totalRequirements": 100,
    "completedRequirements": 75,
    "completionPercentage": 75,
    "byPlatform": [
      {
        "platform": "TuneCore",
        "completed": 19,
        "total": 25,
        "percentage": 76,
        "criticalCompleted": 4,
        "criticalTotal": 5,
        "criticalPercentage": 80,
        "estimatedHours": 200,
        "completedHours": 150,
        "remainingHours": 50
      }
    ],
    "byCategory": [
      {
        "category": "technical",
        "completed": 20,
        "total": 25,
        "percentage": 80,
        "platformCount": 4
      }
    ]
  },
  "trends": [
    {
      "date": "2025-01-01",
      "completed": 10,
      "total": 25,
      "percentage": 40
    },
    {
      "date": "2025-01-02",
      "completed": 12,
      "total": 25,
      "percentage": 48
    }
  ],
  "velocity": 0.5,  // Requirements completed per day
  "estimatedCompletionDate": "2025-03-15T00:00:00Z",
  "qualitySummary": {
    "totalTests": 500,
    "passedTests": 450,
    "averageScore": 85,
    "improvementTrend": "up"
  },
  "qualityByStandard": [
    {
      "standardName": "Audio Bitrate",
      "category": "audio",
      "total": 100,
      "passed": 90,
      "averageScore": 88,
      "percentage": 90
    }
  ],
  "summary": {
    "totalPlatforms": 4,
    "totalCategories": 4,
    "averageCompletion": 75,
    "criticalItemsRemaining": 5,
    "totalEstimatedHours": 800,
    "completedHours": 600
  }
}
```

---

## 🚨 **ERROR HANDLING**

### **Standard Error Response Format**

```typescript
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

### **HTTP Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

### **Common Error Scenarios**

**Authentication Errors:**
```typescript
{
  "success": false,
  "error": "Authentication required"
}
```

**Validation Errors:**
```typescript
{
  "success": false,
  "error": "Track ID, title, and artist name are required"
}
```

**Permission Errors:**
```typescript
{
  "success": false,
  "error": "Admin access required"
}
```

**Not Found Errors:**
```typescript
{
  "success": false,
  "error": "Track not found or access denied"
}
```

---

## 🔧 **RATE LIMITING**

**Current Limits:**
- **ISRC Generation**: 10 requests per minute per user
- **Quality Testing**: 20 requests per minute per user
- **Analytics**: 5 requests per minute per user
- **General APIs**: 100 requests per minute per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

**Rate Limit Exceeded Response:**
```typescript
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 60  // seconds
}
```

---

## 📱 **MOBILE INTEGRATION EXAMPLES**

### **React Native Integration**

```typescript
// ISRC Management Service
class ISRCService {
  private baseURL = 'https://soundbridge.live/api';
  
  async generateISRC(trackId: string, trackTitle: string, artistName: string) {
    const response = await fetch(`${this.baseURL}/isrc/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trackId, trackTitle, artistName })
    });
    
    return response.json();
  }
  
  async getUserISRCs(status?: string) {
    const url = status 
      ? `${this.baseURL}/isrc/generate?status=${status}`
      : `${this.baseURL}/isrc/generate`;
      
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
    
    return response.json();
  }
}

// Content Quality Service
class ContentQualityService {
  async testContentQuality(standardId: string, testData: any) {
    const response = await fetch(`${this.baseURL}/qualification/content-standards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ standardId, testData })
    });
    
    return response.json();
  }
}

// Qualification Analytics Service
class QualificationService {
  async getQualificationStatus(platform?: string, category?: string) {
    const params = new URLSearchParams();
    if (platform) params.append('platform', platform);
    if (category) params.append('category', category);
    
    const response = await fetch(`${this.baseURL}/qualification/status?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
    
    return response.json();
  }
  
  async getAnalytics(platform?: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (platform) params.append('platform', platform);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${this.baseURL}/qualification/analytics?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
    
    return response.json();
  }
}
```

---

## 🎯 **BEST PRACTICES**

### **1. Error Handling**
```typescript
try {
  const result = await isrcService.generateISRC(trackId, title, artist);
  if (result.success) {
    // Handle success
    console.log('ISRC generated:', result.isrc);
  } else {
    // Handle API error
    console.error('API Error:', result.error);
  }
} catch (error) {
  // Handle network error
  console.error('Network Error:', error);
}
```

### **2. Caching**
```typescript
// Cache qualification status for 5 minutes
const cacheKey = `qualification-status-${platform}-${category}`;
const cached = await AsyncStorage.getItem(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const result = await qualificationService.getQualificationStatus(platform, category);
await AsyncStorage.setItem(cacheKey, JSON.stringify(result), 300000); // 5 minutes
```

### **3. Retry Logic**
```typescript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## 📞 **SUPPORT**

**API Status:** ✅ Production Ready  
**Documentation:** Complete with examples  
**Testing:** All endpoints tested and verified  
**Performance:** Optimized for mobile usage  

**Ready for mobile integration!** 🚀

For technical support or questions about the Platform Qualification System APIs, please contact the Web App Team.
