import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      console.log('💬 Loading messages from database...');
      
      // Since there's no messaging system implemented yet, simulate loading
      setTimeout(() => {
        setMessages([]);
        setIsLoading(false);
        console.log('📭 No messages found - messaging system needs to be implemented');
      }, 1000);
    } catch (error) {
      console.error('Error loading messages:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newMessageButton}>
          <Ionicons name="create-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Empty State */}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#666" />
          </View>
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptyText}>
            The messaging system is ready to be implemented.{'\n'}
            When users start connecting, their conversations will appear here.
          </Text>
          
          <View style={styles.featureList}>
            <Text style={styles.featureTitle}>Coming Soon:</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#DC2626" />
              <Text style={styles.featureText}>Direct messaging between users</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#DC2626" />
              <Text style={styles.featureText}>Audio message sharing</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#DC2626" />
              <Text style={styles.featureText}>Group chats for collaborations</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#DC2626" />
              <Text style={styles.featureText}>Real-time notifications</Text>
            </View>
          </View>

          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userInfoText}>
                Logged in as: {user.email}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  newMessageButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  featureList: {
    width: '100%',
    marginBottom: 40,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginLeft: 12,
    flex: 1,
  },
  userInfo: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  userInfoText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});