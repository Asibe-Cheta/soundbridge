import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function MaintenanceScreen() {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 18,
      color: theme.colors.text,
      opacity: 0.8,
      marginBottom: 12,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: theme.colors.text,
      opacity: 0.6,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    contactBox: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      width: '100%',
      alignItems: 'center',
    },
    contactTitle: {
      fontSize: 14,
      color: theme.colors.text,
      opacity: 0.7,
      marginBottom: 8,
    },
    contactEmail: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="construct" size={64} color={theme.colors.primary} />
      </View>

      <Text style={styles.title}>We'll Be Right Back!</Text>
      
      <Text style={styles.subtitle}>Scheduled Maintenance</Text>
      
      <Text style={styles.message}>
        SoundBridge is currently undergoing scheduled maintenance to improve your experience.
        {'\n\n'}
        We should be back online shortly. Thank you for your patience!
      </Text>

      <View style={styles.contactBox}>
        <Text style={styles.contactTitle}>Need urgent support?</Text>
        <Text style={styles.contactEmail}>contact@soundbridge.live</Text>
      </View>
    </View>
  );
}

