// @ts-nocheck - Suppress TypeScript errors for this file due to @expo/vector-icons compatibility issues
import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import UploadScreen from './src/screens/UploadScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AudioPlayerScreen from './src/screens/AudioPlayerScreen';
import CreatorProfileScreen from './src/screens/CreatorProfileScreen';
import CreatorSetupScreen from './src/screens/CreatorSetupScreen';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AudioPlayerProvider } from './src/contexts/AudioPlayerContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tab Navigator
function MainTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#333333',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
        }}
      />
      <Tab.Screen 
        name="Upload" 
        component={UploadScreen}
        options={{
          tabBarLabel: 'Upload',
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#000000' }
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="AudioPlayer" 
        component={AudioPlayerScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen 
        name="CreatorProfile" 
        component={CreatorProfileScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="CreatorSetup" 
        component={CreatorSetupScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <AudioPlayerProvider>
            <StatusBar style="light" backgroundColor="#1A1A1A" />
            <AppNavigator />
          </AudioPlayerProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
