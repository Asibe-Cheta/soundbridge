import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';

const { width, height } = Dimensions.get('window');

// Background image component
const BackgroundImage = () => {
  return (
    <Image
      source={require('../../assets/auth-bg.png')}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  );
};

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();
  const navigation = useNavigation();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(-20)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-10)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Animate elements in sequence
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);
  }, []);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    
    try {
      const { success, error } = await resetPassword(email);
      
      if (!success) {
        Alert.alert('Reset Failed', error?.message || 'Failed to send reset email');
      } else {
        Alert.alert(
          'Reset Email Sent', 
          'Check your email for instructions to reset your password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Reset Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const containerBg = 'transparent';
  const cardBg = theme.isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)';
  const inputBg = theme.isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
  const inputText = theme.colors.text;
  const placeholderColor = theme.colors.textSecondary;
  const borderColor = theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const focusedBorderColor = '#EC4899';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: containerBg }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        <BackgroundImage />
        
        <View style={styles.content}>
          <View style={[styles.formContainer, { backgroundColor: cardBg }]}>
            {/* Back Button */}
            <BackButton
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />

            {/* SoundBridge Logo */}
            <Animated.View 
              style={[
                styles.iconContainer,
                {
                  opacity: logoOpacity,
                  transform: [{ translateY: logoTranslateY }],
                }
              ]}
            >
              <Image
                source={require('../../assets/images/logos/logo-trans-lockup.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Title and Description */}
            <Animated.View
              style={{
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              }}
            >
              <Text style={[styles.title, { color: inputText }]}>
                Reset Password
              </Text>
              <Text style={[styles.subtitle, { color: placeholderColor }]}>
                Enter your email to receive reset instructions.
              </Text>
            </Animated.View>

            {/* Email Input */}
            <Animated.View 
              style={[
                styles.form,
                {
                  opacity: formOpacity,
                  transform: [{ translateY: formTranslateY }],
                }
              ]}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: inputBg,
                    color: inputText,
                    borderColor: focusedInput === 'email' ? focusedBorderColor : borderColor,
                    shadowColor: focusedInput === 'email' ? focusedBorderColor : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: focusedInput === 'email' ? 0.5 : 0,
                    shadowRadius: 8,
                  }]}
                  placeholder="Email"
                  placeholderTextColor={placeholderColor}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {/* Send Reset Email Button */}
              <TouchableOpacity
                style={[styles.resetButton, isLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#DC2626', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Sending Reset Email...' : 'Send Reset Email'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Navigation Links */}
              <View style={styles.signUpContainer}>
                <Text style={[styles.signUpText, { color: placeholderColor }]}>
                  Remember your password?{' '}
                  <Text style={[styles.signUpLink, { color: inputText }]} onPress={() => navigation.goBack()}>
                    Back to Login
                  </Text>
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: width * 1.19, // 70% larger than current (0.7 * 1.7 = 1.19)
    height: (width * 1.19 * 113) / 438, // Maintain aspect ratio
    maxWidth: 850,
    maxHeight: 220,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 0,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '400',
    borderWidth: 1,
  },
  resetButton: {
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signUpContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 15,
    lineHeight: 22,
  },
  signUpLink: {
    fontWeight: '700',
  },
});
