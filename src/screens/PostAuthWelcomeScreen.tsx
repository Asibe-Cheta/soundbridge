import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function PostAuthWelcomeScreen() {
  const { user, dismissPostAuthWelcome } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Animation refs (same as onboarding screen)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Reset animation values
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);

    // Start entrance animation (same as onboarding screen step 1)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    // Dismiss the welcome screen and proceed to onboarding
    dismissPostAuthWelcome();
    // The navigation will automatically show onboarding due to needsOnboarding being true
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.surface]}
          style={styles.gradient}
        >
          {/* Background decorative elements */}
          <View style={[styles.decorativeCircle1, { backgroundColor: theme.colors.primary + '20' }]} />
          <View style={[styles.decorativeCircle2, { backgroundColor: theme.colors.accent + '15' }]} />

          <Animated.View 
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="musical-notes" size={40} color="white" />
              </View>
              <Text style={[styles.appName, { color: theme.colors.text }]}>
                SOUNDBRIDGE
              </Text>
            </View>

            {/* Welcome Content */}
            <View style={styles.welcomeContent}>
              <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
                Welcome to SoundBridge!
              </Text>
              
              <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
                You're now part of a community of creators and music lovers. Let's personalize your experience to discover amazing content tailored just for you.
              </Text>

              {/* User info if available */}
              {user?.email && (
                <View style={[styles.userInfoContainer, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={[styles.userInfoText, { color: theme.colors.textSecondary }]}>
                    Signed in as {user.email}
                  </Text>
                </View>
              )}
            </View>

            {/* Get Started Button */}
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Additional Info */}
            <Text style={[styles.additionalInfo, { color: theme.colors.textSecondary }]}>
              This will only take a few minutes to set up your preferences
            </Text>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'System',
  },
  welcomeContent: {
    alignItems: 'center',
    marginBottom: 50,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: width * 0.8,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
  },
  userInfoText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  getStartedButton: {
    width: width * 0.8,
    height: 56,
    borderRadius: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  additionalInfo: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
