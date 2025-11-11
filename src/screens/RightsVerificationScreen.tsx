import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';

interface RightsVerificationScreenProps {
  trackTitle: string;
  artistName: string;
  onVerified: (result: any) => void;
  onCancel: () => void;
}

export default function RightsVerificationScreen({
  trackTitle,
  artistName,
  onVerified,
  onCancel,
}: RightsVerificationScreenProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(false);

  const [formData, setFormData] = useState({
    isOriginalContent: false,
    ownsRights: false,
    hasExclusiveDeals: false,
    isOnOtherPlatforms: false,
    platforms: [] as string[],
    hasSamples: false,
    sampleInfo: {
      isLicensed: false,
      licenseDetails: '',
    },
  });

  const availablePlatforms = [
    'Spotify',
    'Apple Music',
    'YouTube Music',
    'TuneCore',
    'CD Baby',
    'DistroKid',
    'SoundCloud',
    'Amazon Music',
    'Tidal',
  ];

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleVerify = async () => {
    setVerifying(true);

    try {
      // Call web app's verification API
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('https://soundbridge.live/api/upload/verify-rights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          trackTitle,
          artistName,
          isOriginalContent: formData.isOriginalContent,
          ownsRights: formData.ownsRights,
          hasExclusiveDeals: formData.hasExclusiveDeals,
          isOnOtherPlatforms: formData.isOnOtherPlatforms,
          platforms: formData.platforms,
          hasSamples: formData.hasSamples,
          sampleInfo: formData.sampleInfo,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        if (result.data.canUpload) {
          // Show warnings if any
          if (result.data.warnings && result.data.warnings.length > 0) {
            const warningMessages = result.data.warnings
              .map((w: any) => `ÔÇó ${w.message}`)
              .join('\n');

            Alert.alert(
              'Important Notice',
              warningMessages + '\n\n' + result.data.recommendations.join('\n'),
              [
                { text: 'Cancel', style: 'cancel', onPress: onCancel },
                { text: 'Continue Anyway', onPress: () => onVerified(result.data) },
              ]
            );
          } else {
            // No warnings, proceed
            onVerified(result.data);
          }
        } else {
          // Upload blocked - show violations
          const violationMessages = result.data.violations
            .map((v: any) => `ÔÇó ${v.message}`)
            .join('\n');

          const recommendationMessages = result.data.recommendations.join('\n');

          Alert.alert(
            'Upload Blocked',
            `Violations Found:\n${violationMessages}\n\nRecommendations:\n${recommendationMessages}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      console.error('Rights verification error:', error);
      
      // Fallback: Allow upload but flag for review
      Alert.alert(
        'Verification Unavailable',
        'Unable to verify rights at this time. Your upload will be reviewed manually by our team.',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { 
            text: 'Continue', 
            onPress: () => onVerified({ needsReview: true, canUpload: true }) 
          },
        ]
      );
    } finally {
      setVerifying(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    content: {
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    trackInfo: {
      fontSize: 16,
      color: theme.colors.text,
      opacity: 0.7,
      marginBottom: 24,
    },
    checkboxItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 20,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxContent: {
      flex: 1,
    },
    checkboxLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    checkboxDescription: {
      fontSize: 14,
      color: theme.colors.text,
      opacity: 0.7,
    },
    platformsContainer: {
      marginLeft: 36,
      marginTop: 8,
    },
    platformsLabel: {
      fontSize: 14,
      color: theme.colors.text,
      opacity: 0.7,
      marginBottom: 8,
    },
    platformItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    platformCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    platformCheckboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    platformText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    sampleContainer: {
      marginLeft: 36,
      marginTop: 12,
    },
    sampleLicenseItem: {
      marginBottom: 12,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 80,
      textAlignVertical: 'top',
      marginTop: 8,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
    },
    cancelButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    verifyButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    verifyButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={onCancel} style={styles.backButton} />
        <Text style={styles.headerTitle}>Rights Verification</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Verify Your Rights</Text>
        <Text style={styles.trackInfo}>Track: "{trackTitle}" by {artistName}</Text>

        {/* Original Content */}
        <TouchableOpacity
          style={styles.checkboxItem}
          onPress={() => setFormData(prev => ({ ...prev, isOriginalContent: !prev.isOriginalContent }))}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, formData.isOriginalContent && styles.checkboxChecked]}>
            {formData.isOriginalContent && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.checkboxContent}>
            <Text style={styles.checkboxLabel}>This is my original content</Text>
            <Text style={styles.checkboxDescription}>
              I wrote, composed, and recorded this track myself
            </Text>
          </View>
        </TouchableOpacity>

        {/* Owns Rights */}
        <TouchableOpacity
          style={styles.checkboxItem}
          onPress={() => setFormData(prev => ({ ...prev, ownsRights: !prev.ownsRights }))}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, formData.ownsRights && styles.checkboxChecked]}>
            {formData.ownsRights && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.checkboxContent}>
            <Text style={styles.checkboxLabel}>I own the rights to this content</Text>
            <Text style={styles.checkboxDescription}>
              I have the legal right to distribute this content
            </Text>
          </View>
        </TouchableOpacity>

        {/* Exclusive Deals */}
        <TouchableOpacity
          style={styles.checkboxItem}
          onPress={() => setFormData(prev => ({ ...prev, hasExclusiveDeals: !prev.hasExclusiveDeals }))}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, formData.hasExclusiveDeals && styles.checkboxChecked]}>
            {formData.hasExclusiveDeals && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.checkboxContent}>
            <Text style={styles.checkboxLabel}>I have exclusive distribution deals</Text>
            <Text style={styles.checkboxDescription}>
              This content is subject to exclusive distribution agreements (e.g., label deals)
            </Text>
          </View>
        </TouchableOpacity>

        {/* Other Platforms */}
        <TouchableOpacity
          style={styles.checkboxItem}
          onPress={() => setFormData(prev => ({ ...prev, isOnOtherPlatforms: !prev.isOnOtherPlatforms }))}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, formData.isOnOtherPlatforms && styles.checkboxChecked]}>
            {formData.isOnOtherPlatforms && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.checkboxContent}>
            <Text style={styles.checkboxLabel}>This content is on other platforms</Text>
            <Text style={styles.checkboxDescription}>
              This track is already distributed on other streaming services
            </Text>
          </View>
        </TouchableOpacity>

        {/* Platform Selection */}
        {formData.isOnOtherPlatforms && (
          <View style={styles.platformsContainer}>
            <Text style={styles.platformsLabel}>Select platforms where your music is available:</Text>
            {availablePlatforms.map(platform => (
              <TouchableOpacity
                key={platform}
                style={styles.platformItem}
                onPress={() => togglePlatform(platform)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.platformCheckbox,
                  formData.platforms.includes(platform) && styles.platformCheckboxChecked,
                ]}>
                  {formData.platforms.includes(platform) && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.platformText}>{platform}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Samples */}
        <TouchableOpacity
          style={styles.checkboxItem}
          onPress={() => setFormData(prev => ({ ...prev, hasSamples: !prev.hasSamples }))}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, formData.hasSamples && styles.checkboxChecked]}>
            {formData.hasSamples && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.checkboxContent}>
            <Text style={styles.checkboxLabel}>This content contains samples</Text>
            <Text style={styles.checkboxDescription}>
              This track includes samples from other recordings
            </Text>
          </View>
        </TouchableOpacity>

        {/* Sample Licensing */}
        {formData.hasSamples && (
          <View style={styles.sampleContainer}>
            <TouchableOpacity
              style={styles.sampleLicenseItem}
              onPress={() =>
                setFormData(prev => ({
                  ...prev,
                  sampleInfo: {
                    ...prev.sampleInfo,
                    isLicensed: !prev.sampleInfo.isLicensed,
                  },
                }))
              }
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={[
                  styles.platformCheckbox,
                  formData.sampleInfo.isLicensed && styles.platformCheckboxChecked,
                ]}>
                  {formData.sampleInfo.isLicensed && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[styles.platformText, { fontWeight: '600', marginLeft: 8 }]}>
                  All samples are properly licensed
                </Text>
              </View>
              <Text style={[styles.checkboxDescription, { marginLeft: 28 }]}>
                I have obtained proper licenses for all samples used
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Describe your sample licenses (e.g., 'Licensed from Splice', 'Cleared with original artist', etc.)"
              placeholderTextColor={theme.colors.text + '60'}
              multiline
              numberOfLines={4}
              value={formData.sampleInfo.licenseDetails}
              onChangeText={text =>
                setFormData(prev => ({
                  ...prev,
                  sampleInfo: { ...prev.sampleInfo, licenseDetails: text },
                }))
              }
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={verifying}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify Rights & Upload</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

