import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';

interface UploadEducationScreenProps {
  onContinue: () => void;
  onCancel: () => void;
}

export default function UploadEducationScreen({ onContinue, onCancel }: UploadEducationScreenProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [understoodGuidelines, setUnderstoodGuidelines] = useState(false);

  const canContinue = agreedToTerms && understoodGuidelines;

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
      marginBottom: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    canUploadTitle: {
      color: '#10B981',
    },
    cannotUploadTitle: {
      color: '#EF4444',
    },
    canUploadBox: {
      backgroundColor: '#10B98120',
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#10B981',
    },
    cannotUploadBox: {
      backgroundColor: '#EF444420',
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#EF4444',
    },
    warningBox: {
      backgroundColor: '#F59E0B20',
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
    },
    bulletPoint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    bulletText: {
      fontSize: 14,
      lineHeight: 20,
      marginLeft: 8,
      flex: 1,
    },
    canUploadText: {
      color: '#059669',
    },
    cannotUploadText: {
      color: '#DC2626',
    },
    warningText: {
      color: '#D97706',
    },
    warningTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#D97706',
      marginBottom: 8,
    },
    checkboxContainer: {
      marginTop: 24,
      marginBottom: 24,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
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
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 40,
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
    continueButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    continueButtonDisabled: {
      opacity: 0.5,
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={onCancel} style={styles.backButton} />
        <Text style={styles.headerTitle}>Upload Guidelines</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Upload Guidelines & Rights</Text>

        {/* What You CAN Upload */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.canUploadTitle]}>
            Ô£à You CAN Upload If:
          </Text>
          <View style={styles.canUploadBox}>
            <View style={styles.bulletPoint}>
              <Text style={styles.canUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.canUploadText]}>
                You wrote and recorded the song
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.canUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.canUploadText]}>
                You own the master recording rights
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.canUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.canUploadText]}>
                You have non-exclusive distribution deals (TuneCore, CD Baby, DistroKid)
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.canUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.canUploadText]}>
                Content is already on Spotify, Apple Music (non-exclusive)
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.canUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.canUploadText]}>
                All samples are properly licensed
              </Text>
            </View>
          </View>
        </View>

        {/* What You CANNOT Upload */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.cannotUploadTitle]}>
            ÔØî You CANNOT Upload:
          </Text>
          <View style={styles.cannotUploadBox}>
            <View style={styles.bulletPoint}>
              <Text style={styles.cannotUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.cannotUploadText]}>
                Someone else's copyrighted material
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.cannotUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.cannotUploadText]}>
                Content with exclusive label deals
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.cannotUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.cannotUploadText]}>
                Unlicensed samples or beats
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.cannotUploadText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.cannotUploadText]}>
                Content you don't own the rights to
              </Text>
            </View>
          </View>
        </View>

        {/* Legal Consequences */}
        <View style={styles.section}>
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>ÔÜá´©Å Legal Consequences:</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.warningText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.warningText]}>
                DMCA takedown notices
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.warningText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.warningText]}>
                Account suspension (3 strikes = permanent ban)
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.warningText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.warningText]}>
                Legal action from rights holders
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.warningText}>ÔÇó</Text>
              <Text style={[styles.bulletText, styles.warningText]}>
                Platform liability issues
              </Text>
            </View>
          </View>
        </View>

        {/* Agreement Checkboxes */}
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the SoundBridge Terms of Service and understand that I am legally responsible for the content I upload.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setUnderstoodGuidelines(!understoodGuidelines)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, understoodGuidelines && styles.checkboxChecked]}>
              {understoodGuidelines && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxText}>
              I have read and understood the upload guidelines above.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={onContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>Continue to Verification</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

