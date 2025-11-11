import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import CopyrightDetectionService from '../services/CopyrightDetectionService';

interface ReportContentModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'audio_track' | 'event' | 'user';
  contentTitle?: string;
}

export default function ReportContentModal({
  visible,
  onClose,
  contentId,
  contentType,
  contentTitle,
}: ReportContentModalProps) {
  const { theme } = useTheme();
  const [reportDetails, setReportDetails] = useState('');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    { id: 'copyright', label: 'ÔÜû´©Å Copyright Infringement', description: 'This content uses copyrighted material without permission' },
    { id: 'inappropriate', label: '­ƒÜ½ Inappropriate Content', description: 'Contains offensive or inappropriate material' },
    { id: 'spam', label: '­ƒôº Spam', description: 'Spam, scam, or misleading content' },
    { id: 'harassment', label: '­ƒÿí Harassment', description: 'Bullying, threats, or harassment' },
    { id: 'impersonation', label: '­ƒÄ¡ Impersonation', description: 'Pretending to be someone else' },
    { id: 'other', label: '­ƒôØ Other', description: 'Other violation not listed above' },
  ];

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    if (selectedReason === 'copyright' && !reportDetails.trim()) {
      Alert.alert('Error', 'Please provide details about the copyright infringement');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in to report content');
        return;
      }

      // Submit report using CopyrightDetectionService
      await CopyrightDetectionService.reportContent(
        contentId,
        contentType,
        selectedReason,
        reportDetails.trim() || 'No additional details provided',
        user.id
      );

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our team will review it shortly and take appropriate action if necessary.',
        [{ text: 'OK', onPress: handleClose }]
      );

    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setReportDetails('');
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    content: {
      padding: 20,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.text,
      opacity: 0.7,
      marginBottom: 20,
    },
    contentInfo: {
      backgroundColor: theme.colors.background,
      padding: 12,
      borderRadius: 8,
      marginBottom: 20,
    },
    contentTitle: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    reasonButton: {
      backgroundColor: theme.colors.background,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedReason: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    reasonLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    reasonDescription: {
      fontSize: 14,
      color: theme.colors.text,
      opacity: 0.7,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 16,
      color: theme.colors.text,
      fontSize: 16,
      minHeight: 120,
      textAlignVertical: 'top',
      marginTop: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
      marginBottom: 20,
    },
    cancelButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    submitButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    copyrightWarning: {
      backgroundColor: '#FF6B6B20',
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#FF6B6B',
    },
    copyrightWarningText: {
      fontSize: 14,
      color: '#FF6B6B',
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Report Content</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.subtitle}>
              Help us keep SoundBridge safe by reporting content that violates our policies.
            </Text>

            {contentTitle && (
              <View style={styles.contentInfo}>
                <Text style={styles.contentTitle}>Reporting: {contentTitle}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Why are you reporting this?</Text>

            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.id && styles.selectedReason,
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <Text style={styles.reasonLabel}>{reason.label}</Text>
                <Text style={styles.reasonDescription}>{reason.description}</Text>
              </TouchableOpacity>
            ))}

            {selectedReason && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Additional Details {selectedReason === 'copyright' ? '(Required)' : '(Optional)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    selectedReason === 'copyright'
                      ? 'Please provide details about the copyrighted work and evidence of ownership...'
                      : 'Provide any additional information that will help us review your report...'
                  }
                  placeholderTextColor={theme.colors.text + '60'}
                  multiline
                  numberOfLines={6}
                  value={reportDetails}
                  onChangeText={setReportDetails}
                />

                {selectedReason === 'copyright' && (
                  <View style={styles.copyrightWarning}>
                    <Text style={styles.copyrightWarningText}>
                      ÔÜá´©Å False copyright claims may result in legal consequences. Only report content if you own the copyright or represent the copyright holder.
                    </Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={submitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedReason || submitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

