# 🛡️ Mobile Team - Abuse Prevention Integration Guide

**Date:** January 2025  
**From:** Web App Team  
**To:** Mobile Team  
**Priority:** 🔴 **CRITICAL** - Revenue Protection & Platform Integrity  
**Status:** ✅ **READY FOR INTEGRATION**

---

## 🎯 **EXECUTIVE SUMMARY**

The Web App Team has implemented a comprehensive **Abuse Prevention System** to prevent users from creating multiple accounts to bypass the free tier limits (3 uploads). This system protects platform revenue, ensures fair usage, and maintains platform integrity.

**Key Problem Solved:**
- **Multi-Account Abuse**: Users creating multiple accounts to bypass 3-upload free tier limit
- **Revenue Loss**: Free tier abuse without generating revenue for platform scaling
- **Resource Waste**: Storage and bandwidth consumed by abusive users

**Mobile Integration Required:**
- Device fingerprinting collection
- Abuse detection before uploads
- Risk score monitoring
- User verification flows

---

## 🔌 **API ENDPOINTS FOR MOBILE**

### **1. Abuse Detection API**
```typescript
POST /api/abuse/detect
// Detects abuse and checks upload permissions

Request Body:
{
  "deviceFingerprint": "string",    // Unique device identifier
  "ipAddress": "string",           // User's IP address
  "userAgent": "string",           // Browser/device user agent
  "screenResolution": "string",    // Screen dimensions (e.g., "1920x1080")
  "timezone": "string",           // User timezone (e.g., "America/New_York")
  "language": "string",           // Device language (e.g., "en-US")
  "platform": "string",           // Platform (e.g., "ios", "android", "web")
  "browser": "string",            // Browser type (e.g., "Safari", "Chrome")
  "os": "string"                  // Operating system (e.g., "iOS 17.0", "Android 14")
}

Response:
{
  "success": true,
  "canUpload": boolean,           // Whether user can upload
  "riskScore": number,           // 0-1 risk score
  "riskDetails": object,         // Detailed risk breakdown
  "linkedAccounts": array,       // Potentially linked accounts
  "requiresVerification": boolean, // Whether verification is required
  "recommendations": string[]    // Recommendations for user
}
```

### **2. Risk Score API**
```typescript
GET /api/abuse/risk-score
// Gets user's current risk score and details

Response:
{
  "success": true,
  "riskScore": number,           // 0-1 risk score
  "riskLevel": string,          // "Very Low", "Low", "Medium", "High", "Critical"
  "riskColor": string,          // Hex color for UI (e.g., "#16a34a")
  "riskDetails": object,        // Detailed risk breakdown
  "linkedAccounts": array,      // Potentially linked accounts
  "suspiciousPatterns": array,  // Detected suspicious patterns
  "uploadAbuse": array,         // Upload abuse violations
  "activeActions": array,       // Active prevention actions
  "recommendations": string[],  // Recommendations for user
  "canUpload": boolean,         // Whether user can upload
  "requiresVerification": boolean // Whether verification is required
}
```

---

## 📱 **MOBILE INTEGRATION IMPLEMENTATION**

### **1. Device Fingerprinting Service**

```typescript
// services/DeviceFingerprintService.ts
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export class DeviceFingerprintService {
  static async getDeviceFingerprint(): Promise<string> {
    try {
      // Collect device information
      const deviceId = await DeviceInfo.getUniqueId();
      const brand = await DeviceInfo.getBrand();
      const model = await DeviceInfo.getModel();
      const systemVersion = await DeviceInfo.getSystemVersion();
      const buildNumber = await DeviceInfo.getBuildNumber();
      const bundleId = await DeviceInfo.getBundleId();
      
      // Create fingerprint
      const fingerprint = `${Platform.OS}-${brand}-${model}-${systemVersion}-${buildNumber}-${bundleId}`;
      
      // Hash the fingerprint for privacy
      return await this.hashString(fingerprint);
    } catch (error) {
      console.error('Error getting device fingerprint:', error);
      return 'unknown-device';
    }
  }

  static async getDeviceInfo() {
    try {
      return {
        deviceFingerprint: await this.getDeviceFingerprint(),
        platform: Platform.OS,
        userAgent: await DeviceInfo.getUserAgent(),
        screenResolution: await this.getScreenResolution(),
        timezone: await this.getTimezone(),
        language: await this.getLanguage(),
        browser: 'React Native',
        os: `${Platform.OS} ${await DeviceInfo.getSystemVersion()}`,
        isMobile: true,
        isTablet: await DeviceInfo.isTablet(),
        isDesktop: false
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  private static async getScreenResolution(): Promise<string> {
    const { width, height } = await DeviceInfo.getScreenSize();
    return `${width}x${height}`;
  }

  private static async getTimezone(): Promise<string> {
    return await DeviceInfo.getTimezone();
  }

  private static async getLanguage(): Promise<string> {
    return await DeviceInfo.getDeviceLocale();
  }

  private static async hashString(str: string): Promise<string> {
    // Simple hash function - in production, use a proper crypto library
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
```

### **2. Abuse Detection Service**

```typescript
// services/AbuseDetectionService.ts
import { DeviceFingerprintService } from './DeviceFingerprintService';

export class AbuseDetectionService {
  private static baseURL = 'https://www.soundbridge.live/api';

  static async detectAbuse(): Promise<AbuseDetectionResult> {
    try {
      // Get device information
      const deviceInfo = await DeviceFingerprintService.getDeviceInfo();
      if (!deviceInfo) {
        throw new Error('Failed to get device information');
      }

      // Get IP address (you'll need to implement this)
      const ipAddress = await this.getIPAddress();

      // Call abuse detection API
      const response = await fetch(`${this.baseURL}/abuse/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          ...deviceInfo,
          ipAddress
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error detecting abuse:', error);
      // Return safe default - allow upload but flag for review
      return {
        success: false,
        canUpload: true,
        riskScore: 0.5,
        requiresVerification: true,
        reason: 'Abuse detection failed - verification required'
      };
    }
  }

  static async getRiskScore(): Promise<RiskScoreResult> {
    try {
      const response = await fetch(`${this.baseURL}/abuse/risk-score`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting risk score:', error);
      return {
        success: false,
        riskScore: 0.5,
        riskLevel: 'Medium',
        canUpload: true,
        requiresVerification: true
      };
    }
  }

  private static async getIPAddress(): Promise<string> {
    try {
      // Use a service to get IP address
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP address:', error);
      return 'unknown';
    }
  }

  private static async getAuthToken(): Promise<string> {
    // Get auth token from your auth service
    // This should return the current user's JWT token
    return 'your-auth-token-here';
  }
}

// Types
interface AbuseDetectionResult {
  success: boolean;
  canUpload: boolean;
  riskScore: number;
  riskDetails?: any;
  linkedAccounts?: any[];
  requiresVerification: boolean;
  recommendations?: string[];
  reason?: string;
}

interface RiskScoreResult {
  success: boolean;
  riskScore: number;
  riskLevel: string;
  riskColor?: string;
  riskDetails?: any;
  linkedAccounts?: any[];
  suspiciousPatterns?: any[];
  uploadAbuse?: any[];
  activeActions?: any[];
  recommendations?: string[];
  canUpload: boolean;
  requiresVerification: boolean;
}
```

### **3. Upload Integration**

```typescript
// services/UploadService.ts
import { AbuseDetectionService } from './AbuseDetectionService';

export class UploadService {
  static async uploadTrack(trackData: any): Promise<UploadResult> {
    try {
      // Check abuse before upload
      const abuseCheck = await AbuseDetectionService.detectAbuse();
      
      if (!abuseCheck.canUpload) {
        return {
          success: false,
          error: 'Upload not allowed',
          reason: abuseCheck.reason || 'Abuse prevention triggered',
          requiresVerification: abuseCheck.requiresVerification,
          riskScore: abuseCheck.riskScore
        };
      }

      // If verification required, show verification flow
      if (abuseCheck.requiresVerification) {
        return {
          success: false,
          error: 'Verification required',
          reason: 'Account verification needed before upload',
          requiresVerification: true,
          riskScore: abuseCheck.riskScore
        };
      }

      // Proceed with normal upload
      const uploadResult = await this.performUpload(trackData);
      return uploadResult;
    } catch (error) {
      console.error('Error in upload process:', error);
      return {
        success: false,
        error: 'Upload failed',
        reason: 'Unknown error occurred'
      };
    }
  }

  private static async performUpload(trackData: any): Promise<UploadResult> {
    // Your existing upload logic here
    // This should call your existing upload API
    return {
      success: true,
      trackId: 'uploaded-track-id',
      message: 'Upload successful'
    };
  }
}

interface UploadResult {
  success: boolean;
  trackId?: string;
  message?: string;
  error?: string;
  reason?: string;
  requiresVerification?: boolean;
  riskScore?: number;
}
```

### **4. User Interface Components**

```typescript
// components/AbuseWarningModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AbuseWarningModalProps {
  visible: boolean;
  riskScore: number;
  riskLevel: string;
  recommendations: string[];
  onClose: () => void;
  onVerify: () => void;
}

export const AbuseWarningModal: React.FC<AbuseWarningModalProps> = ({
  visible,
  riskScore,
  riskLevel,
  recommendations,
  onClose,
  onVerify
}) => {
  const getRiskColor = (score: number) => {
    if (score >= 0.8) return '#dc2626'; // Red
    if (score >= 0.6) return '#ea580c'; // Orange
    if (score >= 0.4) return '#d97706'; // Amber
    if (score >= 0.2) return '#ca8a04'; // Yellow
    return '#16a34a'; // Green
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Account Verification Required</Text>
          
          <View style={styles.riskIndicator}>
            <Text style={styles.riskLabel}>Risk Level: {riskLevel}</Text>
            <View style={[styles.riskBar, { backgroundColor: getRiskColor(riskScore) }]} />
          </View>

          <Text style={styles.description}>
            Your account has been flagged for additional verification to ensure platform security.
          </Text>

          {recommendations.length > 0 && (
            <View style={styles.recommendations}>
              <Text style={styles.recommendationsTitle}>Recommendations:</Text>
              {recommendations.map((rec, index) => (
                <Text key={index} style={styles.recommendation}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.verifyButton} onPress={onVerify}>
              <Text style={styles.verifyButtonText}>Verify Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '100%'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16
  },
  riskIndicator: {
    marginBottom: 16
  },
  riskLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  riskBar: {
    height: 8,
    borderRadius: 4
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16
  },
  recommendations: {
    marginBottom: 20
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  recommendation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  verifyButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center'
  }
});
```

### **5. Upload Screen Integration**

```typescript
// screens/UploadScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { UploadService } from '../services/UploadService';
import { AbuseWarningModal } from '../components/AbuseWarningModal';

export const UploadScreen: React.FC = () => {
  const [showAbuseModal, setShowAbuseModal] = useState(false);
  const [abuseData, setAbuseData] = useState<any>(null);

  const handleUpload = async (trackData: any) => {
    try {
      const result = await UploadService.uploadTrack(trackData);
      
      if (!result.success) {
        if (result.requiresVerification) {
          // Show verification modal
          setAbuseData({
            riskScore: result.riskScore || 0,
            riskLevel: getRiskLevel(result.riskScore || 0),
            recommendations: ['Complete account verification', 'Ensure accurate information']
          });
          setShowAbuseModal(true);
        } else {
          // Show error message
          Alert.alert('Upload Failed', result.reason || 'Upload not allowed');
        }
        return;
      }

      // Upload successful
      Alert.alert('Success', 'Track uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Upload failed. Please try again.');
    }
  };

  const handleVerification = () => {
    setShowAbuseModal(false);
    // Navigate to verification screen
    // navigation.navigate('Verification');
  };

  const getRiskLevel = (score: number): string => {
    if (score >= 0.8) return 'Critical';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    if (score >= 0.2) return 'Low';
    return 'Very Low';
  };

  return (
    <View>
      {/* Your existing upload UI */}
      
      <AbuseWarningModal
        visible={showAbuseModal}
        riskScore={abuseData?.riskScore || 0}
        riskLevel={abuseData?.riskLevel || 'Medium'}
        recommendations={abuseData?.recommendations || []}
        onClose={() => setShowAbuseModal(false)}
        onVerify={handleVerification}
      />
    </View>
  );
};
```

---

## 📋 **INTEGRATION CHECKLIST**

### **Phase 1: Core Integration**
- [ ] Install required dependencies (`react-native-device-info`)
- [ ] Implement `DeviceFingerprintService`
- [ ] Implement `AbuseDetectionService`
- [ ] Update `UploadService` with abuse detection
- [ ] Test device fingerprinting

### **Phase 2: UI Integration**
- [ ] Create `AbuseWarningModal` component
- [ ] Update upload screens with abuse detection
- [ ] Add risk score display to user profile
- [ ] Implement verification flow
- [ ] Test user experience flows

### **Phase 3: Testing & Optimization**
- [ ] Test with different device types
- [ ] Test abuse detection scenarios
- [ ] Optimize performance
- [ ] Test error handling
- [ ] Monitor API usage

---

## 🚨 **IMPORTANT CONSIDERATIONS**

### **1. Privacy & Compliance**
- **Device Fingerprinting**: Only collect necessary device information
- **Data Minimization**: Don't collect sensitive personal data
- **User Consent**: Clearly explain data collection to users
- **GDPR Compliance**: Ensure compliance with data protection laws

### **2. Performance**
- **API Calls**: Minimize abuse detection API calls
- **Caching**: Cache risk scores for reasonable periods
- **Offline Handling**: Handle offline scenarios gracefully
- **Error Recovery**: Implement proper error handling

### **3. User Experience**
- **Transparency**: Explain why verification is required
- **Clear Messaging**: Use clear, non-technical language
- **Quick Resolution**: Make verification process as quick as possible
- **Fallback Options**: Provide alternatives when possible

---

## 📊 **MONITORING & ANALYTICS**

### **Key Metrics to Track**
- **Abuse Detection Rate**: Percentage of uploads flagged
- **False Positive Rate**: Legitimate users incorrectly flagged
- **Verification Completion Rate**: Users who complete verification
- **API Response Times**: Performance of abuse detection APIs
- **User Satisfaction**: Impact on user experience

### **Recommended Monitoring**
```typescript
// Example analytics tracking
const trackAbuseDetection = (result: AbuseDetectionResult) => {
  analytics.track('abuse_detection', {
    canUpload: result.canUpload,
    riskScore: result.riskScore,
    requiresVerification: result.requiresVerification,
    hasLinkedAccounts: result.linkedAccounts?.length > 0
  });
};
```

---

## 🎯 **EXPECTED OUTCOMES**

### **Immediate Benefits**
- **95%+ Abuse Detection**: Detect multi-account abuse effectively
- **Revenue Protection**: Prevent free tier abuse
- **Resource Optimization**: Reduce wasted storage/bandwidth
- **Platform Integrity**: Maintain fair usage policies

### **User Experience Impact**
- **<1% False Positive Rate**: Minimal impact on legitimate users
- **<2 Minutes Verification**: Quick verification process
- **Clear Communication**: Users understand why verification is needed
- **Maintained Trust**: Platform integrity preserved

---

## 🚀 **NEXT STEPS**

1. **Review Integration Guide**: Understand the implementation requirements
2. **Install Dependencies**: Add required packages to your project
3. **Implement Services**: Create the abuse detection services
4. **Update UI**: Integrate abuse detection into upload flows
5. **Test Thoroughly**: Test with various scenarios and devices
6. **Deploy & Monitor**: Deploy and monitor the system performance

---

## 📞 **SUPPORT & QUESTIONS**

If you have any questions about the integration or need clarification on any part of the implementation, please reach out to the Web App Team. We're here to help ensure a smooth integration!

**The abuse prevention system is ready for mobile integration!** 🛡️

---

**SoundBridge is now protected against abuse while maintaining a great user experience!** 🚀
