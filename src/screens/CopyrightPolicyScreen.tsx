import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';

export default function CopyrightPolicyScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

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
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    section: {
      marginBottom: 24,
    },
    heading: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
      marginTop: 8,
    },
    text: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      opacity: 0.8,
      marginBottom: 12,
    },
    bulletPoint: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      opacity: 0.8,
      marginLeft: 16,
      marginBottom: 8,
    },
    highlight: {
      backgroundColor: theme.colors.primary + '20',
      padding: 16,
      borderRadius: 8,
      marginVertical: 12,
    },
    highlightText: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      fontWeight: '600',
    },
    email: {
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    warning: {
      backgroundColor: '#FF6B6B20',
      padding: 16,
      borderRadius: 8,
      marginVertical: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#FF6B6B',
    },
    warningText: {
      fontSize: 16,
      lineHeight: 24,
      color: '#FF6B6B',
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
        <Text style={styles.headerTitle}>Copyright Policy</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Copyright & DMCA Policy</Text>

        <View style={styles.section}>
          <Text style={styles.text}>
            SoundBridge respects intellectual property rights and expects all users to do the same.
            This policy outlines our approach to copyright protection and the DMCA (Digital Millennium Copyright Act) process.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>­ƒôï User Responsibility</Text>
          <Text style={styles.text}>
            By uploading content to SoundBridge, you confirm that:
          </Text>
          <Text style={styles.bulletPoint}>ÔÇó You own all rights to the music or have obtained proper licenses</Text>
          <Text style={styles.bulletPoint}>ÔÇó The content does not infringe any third-party copyrights, trademarks, or other intellectual property rights</Text>
          <Text style={styles.bulletPoint}>ÔÇó You have full authority to grant SoundBridge a license to host, distribute, and display the content</Text>
          <Text style={styles.bulletPoint}>ÔÇó All metadata (title, artist name, album) is accurate and truthful</Text>
        </View>

        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ÔÜá´©Å Uploading copyrighted material without permission is illegal and will result in immediate account termination.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>­ƒöì DMCA Takedown Process</Text>
          <Text style={styles.text}>
            If you believe your copyright has been infringed on SoundBridge, please send a DMCA notice to:
          </Text>
          <View style={styles.highlight}>
            <Text style={styles.highlightText}>
              <Text style={styles.email}>dmca@soundbridge.live</Text>
            </Text>
          </View>
          <Text style={styles.text}>
            Your notice must include:
          </Text>
          <Text style={styles.bulletPoint}>1. Identification of the copyrighted work claimed to be infringed</Text>
          <Text style={styles.bulletPoint}>2. Location of the infringing material (URL or track ID)</Text>
          <Text style={styles.bulletPoint}>3. Your contact information (name, address, phone, email)</Text>
          <Text style={styles.bulletPoint}>4. A statement that you have a good faith belief that the use is not authorized</Text>
          <Text style={styles.bulletPoint}>5. A statement under penalty of perjury that the information is accurate</Text>
          <Text style={styles.bulletPoint}>6. Your physical or electronic signature</Text>
          
          <Text style={styles.text}>
            We will respond within 48 hours and remove infringing content immediately upon verification.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>ÔÜû´©Å Three-Strike Policy</Text>
          <Text style={styles.text}>
            SoundBridge operates a strict three-strike copyright policy:
          </Text>
          <Text style={styles.bulletPoint}>ÔÇó <Text style={{ fontWeight: 'bold' }}>Strike 1:</Text> Warning + content removed</Text>
          <Text style={styles.bulletPoint}>ÔÇó <Text style={{ fontWeight: 'bold' }}>Strike 2:</Text> Temporary suspension (7 days) + content removed</Text>
          <Text style={styles.bulletPoint}>ÔÇó <Text style={{ fontWeight: 'bold' }}>Strike 3:</Text> Permanent ban from SoundBridge</Text>
          
          <View style={styles.highlight}>
            <Text style={styles.highlightText}>
              Users who receive three valid copyright strikes will be permanently banned from the platform with no refunds for any active subscriptions.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>­ƒöä Counter-Notice Procedure</Text>
          <Text style={styles.text}>
            If you believe your content was wrongly removed due to a DMCA notice, you may file a counter-notice by emailing:
          </Text>
          <View style={styles.highlight}>
            <Text style={styles.highlightText}>
              <Text style={styles.email}>dmca@soundbridge.live</Text>
            </Text>
          </View>
          <Text style={styles.text}>
            Your counter-notice must include:
          </Text>
          <Text style={styles.bulletPoint}>1. Identification of the removed material and its location before removal</Text>
          <Text style={styles.bulletPoint}>2. A statement under penalty of perjury that you have a good faith belief the material was removed by mistake</Text>
          <Text style={styles.bulletPoint}>3. Your name, address, phone number, and email</Text>
          <Text style={styles.bulletPoint}>4. Consent to jurisdiction of your local federal court</Text>
          <Text style={styles.bulletPoint}>5. Your physical or electronic signature</Text>
          
          <Text style={styles.text}>
            We will forward your counter-notice to the original complainant. If they do not file a court action within 10-14 business days, we may restore your content.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>­ƒøí´©Å Our Commitment</Text>
          <Text style={styles.text}>
            SoundBridge is committed to:
          </Text>
          <Text style={styles.bulletPoint}>ÔÇó Responding to all valid DMCA notices within 48 hours</Text>
          <Text style={styles.bulletPoint}>ÔÇó Removing infringing content immediately upon verification</Text>
          <Text style={styles.bulletPoint}>ÔÇó Maintaining a database of repeat infringers</Text>
          <Text style={styles.bulletPoint}>ÔÇó Cooperating with rights holders and law enforcement</Text>
          <Text style={styles.bulletPoint}>ÔÇó Protecting legitimate users from false claims</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>­ƒô× Contact Information</Text>
          <Text style={styles.text}>
            For copyright-related inquiries:
          </Text>
          <View style={styles.highlight}>
            <Text style={styles.highlightText}>
              Email: <Text style={styles.email}>dmca@soundbridge.live</Text>
            </Text>
          </View>
          <Text style={styles.text}>
            For general support:
          </Text>
          <View style={styles.highlight}>
            <Text style={styles.highlightText}>
              Email: <Text style={styles.email}>contact@soundbridge.live</Text>
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>­ƒôà Policy Updates</Text>
          <Text style={styles.text}>
            This policy was last updated on October 21, 2025. We reserve the right to modify this policy at any time. Continued use of SoundBridge after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

